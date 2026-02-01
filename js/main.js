(function () {
  try {
    //******************************************
    // CONFIG
    //******************************************
    var ASSETS = {
      uat: {
        css: "https://cdn.jsdelivr.net/gh/cdircks-marg/Cendyn-UAT/css/uat_overrides.css",
        js:  "https://cdn.jsdelivr.net/gh/cdircks-marg/Cendyn-UAT/js/uat_main.js"
      },
      prod: {
        css: "https://cdn.jsdelivr.net/gh/cdircks-marg/Cendyn-UAT/css/prod_overrides.css",
        js:  "https://cdn.jsdelivr.net/gh/cdircks-marg/Cendyn-UAT/js/prod_main.js"
      }
    };

    var SS_KEY = "uat_enabled_session";
    var MODE_CSS_ID = "main-mode-css-link";
    var MODE_JS_ID  = "main-mode-js-script";

    var BADGE_ID = "uat-toggle-badge";
    var LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';

    var obs = null;

    var getUatParam = function () {
      var params = new URLSearchParams(window.location.search);
      return (params.get("UAT") || params.get("uat") || "").toLowerCase();
    };

    var setEnabled = function (enabled) {
      if (enabled) sessionStorage.setItem(SS_KEY, "1");
      else sessionStorage.removeItem(SS_KEY);
    };

    var isEnabled = function () {
      return sessionStorage.getItem(SS_KEY) === "1";
    };

    var currentMode = function () {
      return isEnabled() ? "uat" : "prod";
    };

    //******************************************
    // Cleanup hook called when switching away from UAT
    //******************************************
    var runUatCleanupIfPresent = function () {
      try {
        if (typeof window.__UAT_MODE_CLEANUP__ === "function") {
          window.__UAT_MODE_CLEANUP__();
        }
      } catch (e) {}
      try { window.__UAT_MODE_CLEANUP__ = null; } catch (e) {}
    };

    //******************************************
    // Asset loaders
    //******************************************
    var addModeCss = function (mode) {
      try {
        var url = (ASSETS[mode] && ASSETS[mode].css) || "";
        if (!url) return;

        var existing = document.getElementById(MODE_CSS_ID);
        if (existing && existing.getAttribute("href") === url) return;

        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var link = document.createElement("link");
        link.id = MODE_CSS_ID;
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
      } catch (e) {}
    };

    var addModeJs = function (mode) {
      try {
        var url = (ASSETS[mode] && ASSETS[mode].js) || "";
        if (!url) return;

        var existing = document.getElementById(MODE_JS_ID);
        if (existing && existing.getAttribute("src") === url) return;

        // If leaving UAT, cleanup before removing UAT script
        if (existing && existing.getAttribute("src") === (ASSETS.uat && ASSETS.uat.js)) {
          runUatCleanupIfPresent();
        }

        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var s = document.createElement("script");
        s.id = MODE_JS_ID;
        s.src = url;
        s.async = true;
        document.head.appendChild(s);
      } catch (e) {}
    };

    var applyModeAssets = function () {
      var mode = currentMode();
      addModeCss(mode);
      addModeJs(mode);

      try {
        window.dispatchEvent(new CustomEvent("uat:mode", { detail: { mode: mode } }));
      } catch (e) {}
    };

    //******************************************
    // Badge (ONLY when UAT enabled)
    //******************************************
    var removeBadge = function () {
      var b = document.getElementById(BADGE_ID);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    };

    var injectBadgeIfEnabled = function () {
      //******************************************
      // Only show badge in UAT
      //******************************************
      if (!isEnabled()) {
        removeBadge();
        return;
      }

      if (document.getElementById(BADGE_ID)) return;

      var logo = document.querySelector(LOGO_SELECTOR);
      if (!logo) return;

      var wrap = document.createElement("div");
      wrap.id = BADGE_ID;
      wrap.style.marginTop = "56px";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "8px";
      wrap.style.position = "fixed";
      wrap.style.zIndex = "10000000";

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
      btn.textContent = "SWITCH TO PROD";
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
          // switch off UAT
          setEnabled(false);

          // swap assets + cleanup uat-only logic via main loader
          applyModeAssets();

          // remove badge immediately
          removeBadge();

          // Optional: remove UAT param from URL (no reload)
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

    var startObserver = function () {
      if (obs) return;
      var root = document.querySelector("#header") || document.documentElement;

      obs = new MutationObserver(function () {
        //******************************************
        // Keep badge ONLY if enabled; remove if not
        //******************************************
        injectBadgeIfEnabled();
      });

      obs.observe(root, { childList: true, subtree: true });
    };

    //******************************************
    // SPA-safe URL change detection
    //******************************************
    var hookHistory = function () {
      if (window.__uatHistoryHooked) return;
      window.__uatHistoryHooked = true;

      var _push = history.pushState;
      var _replace = history.replaceState;

      history.pushState = function () {
        var r = _push.apply(this, arguments);
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
        return r;
      };

      history.replaceState = function () {
        var r = _replace.apply(this, arguments);
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
        return r;
      };

      window.addEventListener("popstate", function () {
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
      });
    };

    // Param-driven state update (initial)
    var p0 = getUatParam();
    if (p0 === "on") setEnabled(true);
    if (p0 === "off") setEnabled(false);

    hookHistory();

    window.addEventListener("uat:urlchange", function () {
      var p = getUatParam();
      if (p === "on") setEnabled(true);
      if (p === "off") setEnabled(false);

      applyModeAssets();
      injectBadgeIfEnabled();
    });

    // Initial run
    applyModeAssets();
    injectBadgeIfEnabled();
    startObserver();

  } catch (e) {}
})();
