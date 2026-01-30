(function () {
  try {
    var LS_KEY = "uat_enabled";
    var CSS_ID = "uat-css-link";
    var CSS_URL = "https://raw.githubusercontent.com/cdircks-marg/Cendyn-UAT/main/uat_overrides.css";
    var BADGE_ID = "uat-toggle-badge";
    var LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';

    var params = new URLSearchParams(window.location.search);
    var uatParam = (params.get("UAT") || params.get("uat") || "").toLowerCase();

    // --- Param-driven state ---
    if (uatParam === "on") localStorage.setItem(LS_KEY, "1");
    if (uatParam === "off") localStorage.removeItem(LS_KEY);

    var isEnabled = function () {
      return localStorage.getItem(LS_KEY) === "1";
    };

    // --- CSS control ---
    var addCss = function () {
      if (document.getElementById(CSS_ID)) return;
      var link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      link.href = CSS_URL;
      document.head.appendChild(link);
    };

    var removeCss = function () {
      var link = document.getElementById(CSS_ID);
      if (link && link.parentNode) link.parentNode.removeChild(link);
    };

    // --- Badge + OFF button ---
    var removeBadge = function () {
      var b = document.getElementById(BADGE_ID);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    };

    var injectBadge = function () {
      if (document.getElementById(BADGE_ID)) return;

      var logo = document.querySelector(LOGO_SELECTOR);
      if (!logo) return;

      var wrap = document.createElement("div");
      wrap.id = BADGE_ID;
      wrap.style.marginTop = "6px";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "8px";

      var pill = document.createElement("span");
      pill.textContent = "UAT MODE";
      pill.style.padding = "4px 10px";
      pill.style.borderRadius = "999px";
      pill.style.background = "#C8102E";
      pill.style.color = "#fff";
      pill.style.fontWeight = "800";
      pill.style.fontSize = "12px";
      pill.style.lineHeight = "1";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "UAT OFF";
      btn.style.cursor = "pointer";
      btn.style.padding = "4px 10px";
      btn.style.borderRadius = "999px";
      btn.style.border = "1px solid #C8102E";
      btn.style.background = "#fff";
      btn.style.color = "#C8102E";
      btn.style.fontWeight = "800";
      btn.style.fontSize = "12px";
      btn.style.lineHeight = "1";

      btn.addEventListener("click", function () {
        try {
          localStorage.removeItem(LS_KEY);
          removeCss();
          removeBadge();

          // clean URL (no reload)
          var url = new URL(window.location.href);
          url.searchParams.delete("UAT");
          url.searchParams.delete("uat");
          window.history.replaceState({}, "", url.toString());
        } catch (e) {}
      });

      wrap.appendChild(pill);
      wrap.appendChild(btn);
      logo.insertAdjacentElement("afterend", wrap);
    };

    // --- Apply state ---
    var apply = function () {
      if (isEnabled()) {
        addCss();
        injectBadge();
      } else {
        removeCss();
        removeBadge();
      }
    };

    // Initial run
    apply();

    // Re-apply if header re-renders
    var root = document.querySelector("#header") || document.documentElement;
    var obs = new MutationObserver(function () {
      apply();
    });
    obs.observe(root, { childList: true, subtree: true });

  } catch (e) {}
})();