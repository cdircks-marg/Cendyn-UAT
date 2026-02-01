(function () {
  try {
    //******************************************
    // UAT-only behavior script (reliable var-driven layout)
    // - Single source of truth for header offset: --notification-height
    // - HS open: hide native notifications + set var to HS height
    // - HS closed: show native notifications + set var to native notifications height (or 0)
    // - HS closing edge: click native close + set promo cookie (backup)
    // - Native close click: re-measure and set var so header snaps back up
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
    // Track HS open -> closed edge
    //******************************************
    var lastHsOpen = false;

    //******************************************
    // Detect HS banner container (non-modal overlay CTA)
    //******************************************
    var getHubspotBannerContainerEl = function () {
      var topAnchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!topAnchor) return null;

      return (
        topAnchor.querySelector(
          'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
        ) || null
      );
    };

    //******************************************
    // HS open state by class (do NOT require height > 0)
    //******************************************
    var isHubspotBannerOpen = function (el) {
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
    // Height measurement helpers (more robust than rect.height only)
    //******************************************
    var measureHeight = function (el) {
      try {
        if (!el) return 0;
        var rect = null;
        try { rect = el.getBoundingClientRect(); } catch (e) {}
        var h1 = rect && rect.height ? rect.height : 0;
        var h2 = el.offsetHeight || 0;
        var h3 = el.scrollHeight || 0;
        return Math.max(h1, h2, h3, 0);
      } catch (e) {
        return 0;
      }
    };

    var measureHubspotHeight = function (bannerContainer) {
      try {
        if (!bannerContainer) return 0;

        // Try iframe first (often the real height)
        var iframe = bannerContainer.querySelector("iframe");
        var h = iframe ? measureHeight(iframe) : 0;

        // Fallback to container
        if (!h) h = measureHeight(bannerContainer);

        return Math.max(0, Math.round(h || 0));
      } catch (e) {
        return 0;
      }
    };

    var measureNativeNotificationsHeight = function () {
      try {
        var wrap = document.querySelector(".notifications");
        if (!wrap) return 0;

        // If notifications container is display:none, treat as 0
        try {
          var cs = window.getComputedStyle(wrap);
          if (cs && cs.display === "none") return 0;
        } catch (e) {}

        // Prefer an actual visible notification
        var notif =
          wrap.querySelector('.notification[style*="display: block"]') ||
          wrap.querySelector(".notification");

        if (!notif) return 0;

        return Math.max(0, Math.round(measureHeight(wrap) || 0));
      } catch (e) {
        return 0;
      }
    };

    //******************************************
    // Style tag to hide native notifications while HS is open
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
    // Set var (do NOT remove it; keep deterministic control for header CSS)
    //******************************************
    var setNotifVar = function (px) {
      try {
        document.documentElement.style.setProperty(
          NOTIF_VAR,
          Math.max(0, Math.round(px || 0)) + "px"
        );
      } catch (e) {}
    };

    //******************************************
    // Backup cookie: promo-<data-id>=disabled on parent domain
    //******************************************
    var setNativePromoDisabledCookieFromDom = function () {
      try {
        var notif = document.querySelector(".notifications .notification[data-id]");
        if (!notif) return;

        var id = (notif.getAttribute("data-id") || "").trim();
        if (!id) return;

        var name = "promo-" + id;
        var value = "disabled";

        var d = new Date();
        d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);

        var expires = "; expires=" + d.toUTCString();
        var domain = "; domain=.margaritavilleatsea.com";
        var path = "; path=/";
        var secure = (location && location.protocol === "https:") ? "; Secure" : "";
        var sameSite = "; SameSite=Lax";

        document.cookie = name + "=" + value + expires + domain + path + sameSite + secure;
      } catch (e) {}
    };

    //******************************************
    // Click native close button (lets native remove classes + do its own cleanup)
    //******************************************
    var closeNativeNotificationIfPresent = function () {
      try {
        var notif = document.querySelector(".notifications .notification[data-id]");
        if (!notif) return;

        var closeBtn = notif.querySelector("button.close");
        if (!closeBtn) return;

        closeBtn.click();
      } catch (e) {}
    };

    //******************************************
    // Main rule application (var-driven)
    //******************************************
    var applyRules = function () {
      var bannerContainer = getHubspotBannerContainerEl();

      // ---- HUBSPOT PRESENT ----
      if (bannerContainer) {
        var open = !!isHubspotBannerOpen(bannerContainer);

        if (open) {
          // HS open: hide native + set var to HS height
          var style = ensureStyleTag();
          style.textContent = ".notifications{ display:none; }\n";

          var hsH = measureHubspotHeight(bannerContainer);
          setNotifVar(hsH);

        } else {
          // HS closed: show native + set var to native notifications height
          clearStyleTag();

          // If HS just transitioned open -> closed, close native promo + cookie backup
          if (lastHsOpen === true) {
            closeNativeNotificationIfPresent();
            setNativePromoDisabledCookieFromDom();

            // After native close has a moment to run, re-measure and set var (header snaps up)
            setTimeout(function () {
              try { setNotifVar(measureNativeNotificationsHeight()); } catch (e) {}
            }, 0);
          } else {
            setNotifVar(measureNativeNotificationsHeight());
          }
        }

        lastHsOpen = open;
        return;
      }

      // ---- NO HUBSPOT ----
      clearStyleTag();
      lastHsOpen = false;

      // Native-only page: set var to native notifications height (or 0)
      setNotifVar(measureNativeNotificationsHeight());
    };

    //******************************************
    // Run twice to catch post-animation sizing
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

    //******************************************
    // Native close listener (event delegation)
    // When user closes native promo, re-measure and set var so header moves up
    //******************************************
    var onDocClick = function (e) {
      try {
        var t = e && e.target;
        if (!t || !t.closest) return;

        var btn = t.closest(".notifications .notification button.close");
        if (!btn) return;

        // Let native close logic run first, then re-measure
        setTimeout(function () {
          try { setNotifVar(measureNativeNotificationsHeight()); } catch (e) {}
        }, 0);
      } catch (e) {}
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
      try { document.addEventListener("click", onDocClick, true); } catch (e) {}
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
      try { document.removeEventListener("click", onDocClick, true); } catch (e) {}

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
      try { setNotifVar(0); } catch (e) {}
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
