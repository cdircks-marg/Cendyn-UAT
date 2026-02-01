(function () {
  try {
    //******************************************
    // UAT-only behavior script
    // - Allows native notifications to operate normally by default
    // - If HubSpot TOP banner exists: hide native notifications + drive header via --notification-height
    // - Registers cleanup hook for main.js
    //******************************************

    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var HS_STYLE_ID = "uat-hs-notifications-style";
    var NOTIF_VAR = "--notification-height";

    var hsObs = null;
    var hsResizeTimer = null;
    var raf1 = null;
    var raf2 = null;

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

    // Only treat as "HubSpot banner page" if the NON-MODAL overlay CTA container exists.
    var getHubspotBannerContainerEl = function () {
      var topAnchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!topAnchor) return null;

      // Find the top banner container (NOT the popup)
      var el = topAnchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );

      return el || null;
    };

    var measureElHeight = function (el) {
      if (!el) return 0;
      var rect = null;
      try { rect = el.getBoundingClientRect(); } catch (e) {}
      return rect && rect.height ? rect.height : 0;
    };

    //******************************************
    // Style tag: ONLY used to hide/show notifications container
    // (we do NOT set #header top in CSS anymore)
    //******************************************
    var ensureStyleTag = function () {
      var style = document.getElementById(HS_STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = HS_STYLE_ID;
        document.head.appendChild(style);
      }
      return style;
    };

    var clearStyleTag = function () {
      var style = document.getElementById(HS_STYLE_ID);
      if (style && style.parentNode) style.parentNode.removeChild(style);
    };

    //******************************************
    // Variable control:
    // - When HS present: we override --notification-height on :root
    // - When HS not present: we REMOVE our override (native system takes over)
    //******************************************
    var setNotifVar = function (px) {
      try {
        document.documentElement.style.setProperty(
          NOTIF_VAR,
          Math.max(0, Math.round(px || 0)) + "px"
        );
      } catch (e) {}
    };

    var clearNotifVar = function () {
      try {
        // remove inline override so native CSS/JS can manage it
        document.documentElement.style.removeProperty(NOTIF_VAR);
      } catch (e) {}
    };

    //******************************************
    // Apply rules:
    // - If HS top banner container exists: hide native notifications + set --notification-height to HS height (or 0)
    // - Else: allow native notifications fully (no display none, no var override)
    //******************************************
    var applyRules = function () {
      var bannerContainer = getHubspotBannerContainerEl();

      if (bannerContainer) {
        var style = ensureStyleTag();
        style.textContent = ".notifications{ display:none; }\n";

        var h = measureElHeight(bannerContainer);
        var open = !!(isHubspotBannerActiveByClass(bannerContainer) && h > 0);

        if (open) setNotifVar(h);
        else setNotifVar(0);

        return;
      }

      // No HS banner container -> restore native notifications behavior
      clearStyleTag();
      clearNotifVar();
    };

    //******************************************
    // Run twice (some banners animate height after first mutation)
    //******************************************
    var applyRulesTwice = function () {
      try {
        if (raf1) cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      } catch (e) {}

      raf1 = requestAnimationFrame(function () {
        try { applyRules(); } catch (e) {}
        raf2 = requestAnimationFrame(function () {
          try { applyRules(); } catch (e) {}
        });
      });
    };

    var onResize = function () {
      try { if (hsResizeTimer) clearTimeout(hsResizeTimer); } catch (e) {}
      hsResizeTimer = setTimeout(function () {
        try { applyRulesTwice(); } catch (e) {}
      }, 100);
    };

    var startObserver = function () {
      if (hsObs) return;

      applyRulesTwice();

      var root = document.body || document.documentElement;
      if (!root) return;

      hsObs = new MutationObserver(function () {
        try { applyRulesTwice(); } catch (e) {}
      });

      hsObs.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "id"]
      });

      try { window.addEventListener("resize", onResize); } catch (e) {}
    };

    var stopObserver = function () {
      if (hsObs) {
        try { hsObs.disconnect(); } catch (e) {}
        hsObs = null;
      }
      if (hsResizeTimer) {
        try { clearTimeout(hsResizeTimer); } catch (e) {}
        hsResizeTimer = null;
      }
      try { window.removeEventListener("resize", onResize); } catch (e) {}

      try {
        if (raf1) cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      } catch (e) {}
      raf1 = null;
      raf2 = null;
    };

    //******************************************
    // Cleanup hook used by main.js when switching to PROD
    //******************************************
    window.__UAT_MODE_CLEANUP__ = function () {
      try { stopObserver(); } catch (e) {}
      try { clearStyleTag(); } catch (e) {}
      try { clearNotifVar(); } catch (e) {}
    };

    // Start
    startObserver();

    // If main.js broadcasts mode changes, clean up when switching away
    window.addEventListener("uat:mode", function (ev) {
      try {
        var m = (ev && ev.detail && ev.detail.mode) || "";
        if (m === "prod") window.__UAT_MODE_CLEANUP__();
      } catch (e) {}
    });

  } catch (e) {}
})();
