(function () {
  try {
    var SS_KEY = "uat_enabled_session";
    var CSS_ID = "uat-css-link";
    var CSS_URL = "https://cdn.jsdelivr.net/gh/cdircks-marg/Cendyn-UAT/css/uat_overrides.css";
    var BADGE_ID = "uat-toggle-badge";
    var LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';

    var obs = null;

    //******************************************
    // HubSpot + Notifications driven header/body offset (ignore modal popup)
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var HS_STYLE_ID = "uat-header-offset-style";
    var hsObs = null;
    var hsResizeTimer = null;

    // HubSpot banner "open" state is indicated by having hs-cta-embed__loaded AND >= 2 go* classes.
    // When it closes, HubSpot removes the last go* class.
    var isHubspotBannerActiveByClass = function (el) {
      try {
        if (!el || !el.classList) return false;
        if (!el.classList.contains("hs-cta-embed__loaded")) return false;

        var goCount = 0;
        for (var i = 0; i < el.classList.length; i++) {
          if (/^go\d+$/.test(el.classList[i])) goCount++;
        }
        return goCount >= 2;
      } catch (e) {
        return false;
      }
    };
    //******************************************

    var getUatParam = function () {
      var params = new URLSearchParams(window.location.search);
      return (params.get("UAT") || params.get("uat") || "").toLowerCase();
    };

    // --- state helpers ---
    var setEnabled = function (enabled) {
      if (enabled) sessionStorage.setItem(SS_KEY, "1");
      else sessionStorage.removeItem(SS_KEY);
    };

    var isEnabled = function () {
      return sessionStorage.getItem(SS_KEY) === "1";
    };

    // --- param-driven state update (only changes state when param exists) ---
    var uatParam = getUatParam();
    if (uatParam === "on") setEnabled(true);
    if (uatParam === "off") setEnabled(false);

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

    // --- Badge control ---
    var removeBadge = function () {
      var b = document.getElementById(BADGE_ID);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    };

    var stopObserver = function () {
      if (obs) {
        try { obs.disconnect(); } catch (e) {}
        obs = null;
      }
    };

    var injectBadge = function () {
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
          // Turn off session UAT
          setEnabled(false);

          // Clean up immediately
          stopObserver();
          removeCss();
          removeBadge();

          //******************************************
          // Clean up HubSpot/header/body offset logic
          stopHeaderOffsetObserver();
          clearHeaderOffsets();
          //******************************************

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

    // --- Observer (re-inject badge only when enabled) ---
    var startObserver = function () {
      if (obs) return;

      var root = document.querySelector("#header") || document.documentElement;

      obs = new MutationObserver(function () {
        if (isEnabled()) injectBadge();
      });

      obs.observe(root, { childList: true, subtree: true });
    };

    //******************************************
    // HubSpot + Notifications logic (IMPORTANT: do NOT override/clear notifications unless HubSpot banner is OPEN)

    var getHeaderEl = function () {
      return document.querySelector("#header");
    };

    var getNotificationsEl = function () {
      return document.querySelector(".notifications");
    };

    var getHubspotBannerEl = function () {
      var topAnchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!topAnchor) return null;

      // HubSpot injects multiple hs-overlay-cta-... divs. Ignore the MODAL popup.
      var candidates = topAnchor.querySelectorAll('div[id^="hs-overlay-cta-"]');

      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];

        // Ignore modal popup wrapper
        if (el.getAttribute("role") === "dialog") continue;
        if (((el.getAttribute("aria-modal") || "") + "").toLowerCase() === "true") continue;

        return el; // banner container (we validate open/closed via classes + height)
      }

      return null;
    };

    var ensureStyleTag = function () {
      var style = document.getElementById(HS_STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = HS_STYLE_ID;
        document.head.appendChild(style);
      }
      return style;
    };

    var clearHeaderOffsets = function () {
      var style = document.getElementById(HS_STYLE_ID);
      if (style && style.parentNode) style.parentNode.removeChild(style);
    };

    var clearNotificationsChildren = function () {
      var n = getNotificationsEl();
      if (!n) return;

      // Delete children only (keep the container in DOM)
      try {
        while (n.firstChild) n.removeChild(n.firstChild);
      } catch (e) {}
    };

    var measureElHeight = function (el) {
      if (!el) return 0;
      var rect = null;
      try { rect = el.getBoundingClientRect(); } catch (e) {}
      return rect && rect.height ? rect.height : 0;
    };

    //******************************************
    // Applies:
    // - header top: X
    // - body top: Y
    // - ONLY when bannerActive: neutralize notifications so it can't affect layout
    var setOffsets = function (headerTopPx, bodyTopPx, bannerActive) {
      var ht = Math.max(0, Math.round(headerTopPx || 0));
      var bt = Math.max(0, Math.round(bodyTopPx || 0));
      var style = ensureStyleTag();

      style.textContent =
        '#header{ top:' + ht + 'px !important; }\n' +
        'body{ top:' + bt + 'px !important; }\n' +
        (bannerActive
          ? ('.notifications{ height:0 !important; overflow:hidden !important; padding:0 !important; margin:0 !important; }\n')
          : '');
    };
    //******************************************

    var applyHeaderOffsetRules = function () {
      if (!isEnabled()) {
        clearHeaderOffsets();
        return;
      }

      var banner = getHubspotBannerEl();
      var notifications = getNotificationsEl();
      var header = getHeaderEl();

      //******************************************
      // IMPORTANT FIX:
      // If HubSpot banner exists in DOM but is "closed" OR has no height, we MUST fall back to native notifications
      // (otherwise notifications get covered by header and appear "gone").
      var bannerActive = !!(banner && isHubspotBannerActiveByClass(banner) && measureElHeight(banner) > 0);
      //******************************************

      if (bannerActive) {
        // HubSpot banner open -> header = banner height, body = 0, and ONLY here neutralize notifications
        var bannerHeight = measureElHeight(banner);

        // ONLY clear notifications when HubSpot banner is truly open
        clearNotificationsChildren();

        setOffsets(bannerHeight, 0, true);
        return;
      }

      //******************************************
      // No ACTIVE HubSpot banner -> use native notifications (notifications stays functional, cookie close works)
      var notifHeight = measureElHeight(notifications);

      // Header top should match notifications height
      // Body top should be: notificationsHeight - headerHeight (your 263 -> 176 example)
      var headerHeight = measureElHeight(header);
      var bodyTop = notifHeight - headerHeight;
      if (bodyTop < 0) bodyTop = 0;

      setOffsets(notifHeight, bodyTop, false);
      //******************************************
    };

    var onHeaderOffsetResize = function () {
      try { if (hsResizeTimer) clearTimeout(hsResizeTimer); } catch (e) {}
      hsResizeTimer = setTimeout(function () {
        try { applyHeaderOffsetRules(); } catch (e) {}
      }, 100);
    };

    var startHeaderOffsetObserver = function () {
      if (hsObs) return;

      applyHeaderOffsetRules();

      var root = document.body || document.documentElement;
      if (!root) return;

      hsObs = new MutationObserver(function () {
        try { applyHeaderOffsetRules(); } catch (e) {}
      });

      hsObs.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "id"]
      });

      try { window.addEventListener("resize", onHeaderOffsetResize); } catch (e) {}
    };

    var stopHeaderOffsetObserver = function () {
      if (hsObs) {
        try { hsObs.disconnect(); } catch (e) {}
        hsObs = null;
      }
      if (hsResizeTimer) {
        try { clearTimeout(hsResizeTimer); } catch (e) {}
        hsResizeTimer = null;
      }
      try { window.removeEventListener("resize", onHeaderOffsetResize); } catch (e) {}
    };
    //******************************************

    var enable = function () {
      addCss();
      injectBadge();
      startObserver();

      //******************************************
      startHeaderOffsetObserver();
      //******************************************
    };

    var disable = function () {
      stopObserver();
      removeCss();
      removeBadge();

      //******************************************
      stopHeaderOffsetObserver();
      clearHeaderOffsets();
      //******************************************
    };

    var apply = function () {
      if (isEnabled()) enable();
      else disable();
    };

    // --- SPA-safe URL change detection (keeps state across internal nav) ---
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

    hookHistory();

    window.addEventListener("uat:urlchange", function () {
      // only change session state when param explicitly present on the new URL
      var p = getUatParam();
      if (p === "on") setEnabled(true);
      if (p === "off") setEnabled(false);

      apply();

      //******************************************
      try { applyHeaderOffsetRules(); } catch (e) {}
      //******************************************
    });

    // Initial run
    apply();

  } catch (e) {}
})();
