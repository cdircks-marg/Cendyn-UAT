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

    //******************************************
    // Track HubSpot "open -> closed" edge so we can set promo cookie once.
    //******************************************
    var lastHsOpen = false; // 👈 ADD THIS

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
        //document.documentElement.style.removeProperty(NOTIF_VAR);
      } catch (e) {}
    };

    //******************************************
    // Force header back to 0px (inline) once
    //******************************************
    var forceHeaderTopZeroOnce = function () { // 👈 ADD THIS
      try {
        var header = document.querySelector("#header.navipandora");
        if (!header) return;
        header.style.top = "0px";
      } catch (e) {}
    };

    //******************************************
    // Set native promo cookie based on visible .notification[data-id]
    // Creates cookie: promo-<id>=disabled on domain .margaritavilleatsea.com
    //******************************************
    var setNativePromoDisabledCookieFromDom = function () { // 👈 ADD THIS
      try {
        var notif = document.querySelector(
          '.notifications .notification[data-id][style*="display: block"],' +
          '.notifications .notification[data-id]:not([style*="display: none"])'
        );

        // Fallback: first notification with data-id
        if (!notif) {
          notif = document.querySelector('.notifications .notification[data-id]');
        }
        if (!notif) return;

        var id = (notif.getAttribute("data-id") || "").trim();
        if (!id) return;

        var name = "promo-" + id;
        var value = "disabled";

        var days = 365;
        var expires = "";
        try {
          var d = new Date();
          d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + d.toUTCString();
        } catch (e) {}

        // Ensure cookie works for both www + reservations by writing to parent domain
        var domain = "; domain=.margaritavilleatsea.com";
        var path = "; path=/";

        // Secure / SameSite - safe defaults for HTTPS
        var secure = (location && location.protocol === "https:") ? "; Secure" : "";
        var sameSite = "; SameSite=Lax";

        document.cookie = name + "=" + value + expires + domain + path + sameSite + secure;
      } catch (e) {}
    };

    //******************************************
    // Apply rules:
    // - If HS top banner container exists: hide native notifications + set --notification-height to HS height (or 0)
    // - Else: allow native notifications fully (no display none, no var override)
    //******************************************
    var applyRules = function () {
      var bannerContainer = getHubspotBannerContainerEl();

      // ---- HUBSPOT PRESENT ----
      if (bannerContainer) {
        var style = ensureStyleTag();
        style.textContent = ".notifications{ display:none; }\n";

        var h = measureElHeight(bannerContainer);
        var open = !!(isHubspotBannerActiveByClass(bannerContainer) && h > 0);

        if (open) {
          setNotifVar(h);
        } else {
          // HS closed
          setNotifVar(0);
          forceHeaderTopZeroOnce(); // 👈 existing line you had

          //******************************************
          // If HS just transitioned from open -> closed,
          // disable the native promo via the same cookie it sets on close.
          //******************************************
          if (lastHsOpen === true) { // 👈 ADD THIS
            setNativePromoDisabledCookieFromDom(); // 👈 ADD THIS
          }
        }

        //******************************************
        // Update lastHsOpen state while HS container exists
        //******************************************
        lastHsOpen = !!open; // 👈 ADD THIS
        return;
      }

      // ---- NO HUBSPOT ----
      clearStyleTag();
      clearNotifVar();

      //******************************************
      // Reset state when HS container is gone
      //******************************************
      lastHsOpen = false; // 👈 ADD THIS

      // Native notifications just closed
      forceHeaderTopZeroOnce(); // 👈 existing line you had
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
