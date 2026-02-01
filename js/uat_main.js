(function () {
  try {
    //******************************************
    // UAT-only behavior script (final goal)
    // - Let NATIVE notifications own their own height + CSS calculation by default
    // - If HubSpot TOP banner exists + is open:
    //    - Hide native notifications (so they don't stack)
    //    - Set --notification-height to HubSpot banner height (so native CSS can position header/photos)
    // - When HubSpot closes:
    //    - Clear our --notification-height override (hand control back to native)
    //    - Trigger native notification close button (so native removes classes + sets its cookie)
    //    - Also set promo-<data-id>=disabled as a backup
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
    // Track HubSpot open -> closed so we only fire close/cookie once
    //******************************************
    var lastHsOpen = false;

    //******************************************
    // HubSpot banner "open" state is indicated by hs-cta-embed__loaded AND >= 2 go* classes.
    // When it closes, HubSpot removes the last go* class.
    //******************************************
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
    // Only treat as "HubSpot banner page" if the NON-MODAL overlay CTA container exists.
    //******************************************
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
    // Style tag ONLY used to hide/show notifications while HS is open
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
    // - When HS is open: set --notification-height = HS height (native CSS uses it)
    // - When HS is not open: remove our override so native notifications can manage it
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
        document.documentElement.style.removeProperty(NOTIF_VAR);
      } catch (e) {}
    };

    //******************************************
    // Get native promo id (data-id) and set cookie promo-<id>=disabled as backup
    //******************************************
    var setNativePromoDisabledCookieFromDom = function () {
      try {
        var notif = document.querySelector('.notifications .notification[data-id]');
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

        var domain = "; domain=.margaritavilleatsea.com";
        var path = "; path=/";
        var secure = (location && location.protocol === "https:") ? "; Secure" : "";
        var sameSite = "; SameSite=Lax";

        document.cookie = name + "=" + value + expires + domain + path + sameSite + secure;
      } catch (e) {}
    };

    //******************************************
    // Trigger native close button (best way to let native remove classes + recalc)
    //******************************************
    var closeNativeNotificationIfPresent = function () {
      try {
        var notif = document.querySelector('.notifications .notification[data-id]');
        if (!notif) return;

        var closeBtn = notif.querySelector('button.close');
        if (!closeBtn) return;

        closeBtn.click();
      } catch (e) {}
    };

    //******************************************
    // Apply rules:
    // - If HS top banner exists:
    //    - If HS is OPEN: hide notifications + set --notification-height to HS height
    //    - If HS is CLOSED: show notifications + clear our var override + close native promo (once)
    // - Else (no HS): allow native notifications fully (no hide, no var override)
    //******************************************
    var applyRules = function () {
      var bannerContainer = getHubspotBannerContainerEl();

      // ---- HUBSPOT PRESENT ----
      if (bannerContainer) {
        var h = measureElHeight(bannerContainer);
        var open = !!(isHubspotBannerActiveByClass(bannerContainer) && h > 0);

        if (open) {
          //******************************************
          // HS open: hide native notifications and let native CSS use --notification-height
          //******************************************
          var style = ensureStyleTag();
          style.textContent = ".notifications{ display:none; }\n";
          setNotifVar(h);
        } else {
          //******************************************
          // HS closed: show native notifications again and return control to native calculations
          //******************************************
          clearStyleTag();
          clearNotifVar();

          //******************************************
          // If HS just transitioned open -> closed, close native promo (so it cleans up its classes)
          //******************************************
          if (lastHsOpen === true) {
            // Close it the "native" way
            closeNativeNotificationIfPresent();

            // Backup: set the same cookie native uses (promo-<id>=disabled)
            setNativePromoDisabledCookieFromDom();
          }
        }

        lastHsOpen = !!open;
        return;
      }

      // ---- NO HUBSPOT ----
      //******************************************
      // No HS on page: allow native notifications 100% (no hide, no var override)
      //******************************************
      clearStyleTag();
      clearNotifVar();
      lastHsOpen = false;
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
