(function () {
  try {
    //******************************************
    // UAT-only behavior script
    // - HubSpot + notifications/header offsets
    // - Registers cleanup hook for main.js
    //******************************************

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

    var getHeaderEl = function () {
      return document.querySelector("#header");
    };

    var getNotificationsEl = function () {
      return document.querySelector(".notifications");
    };

    // Only treat as "HubSpot banner page" if the NON-MODAL overlay CTA container exists.
    var getHubspotBannerContainerEl = function () {
      var topAnchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!topAnchor) return null;

      var el = topAnchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );

      return el || null;
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

    var measureElHeight = function (el) {
      if (!el) return 0;
      var rect = null;
      try { rect = el.getBoundingClientRect(); } catch (e) {}
      return rect && rect.height ? rect.height : 0;
    };

    // Body top handling (safe)
    var clearBodyTop = function () {
      try {
        if (document.body && document.body.style) document.body.style.top = "";
      } catch (e) {}
    };

    var setBodyTopIfPositioned = function (px) {
      try {
        if (!document.body) return;
        var pos = "static";
        try { pos = window.getComputedStyle(document.body).position; } catch (e) {}
        if (pos && pos !== "static") document.body.style.top = Math.max(0, Math.round(px || 0)) + "px";
        else clearBodyTop();
      } catch (e) {}
    };

    // Applies:
    // - header top: X
    // - body top: Y
    // - suppressNotifications ONLY when bannerContainer exists on THIS page
    var setOffsets = function (headerTopPx, bodyTopPx, suppressNotifications) {
      var ht = Math.max(0, Math.round(headerTopPx || 0));
      var bt = Math.max(0, Math.round(bodyTopPx || 0));
      var style = ensureStyleTag();

      style.textContent =
        '#header{ top: 0px; }\n' +
        (suppressNotifications ? ('.notifications .notification{ display:none; }\n') : '');

      setBodyTopIfPositioned(bt);
    };

    var applyHeaderOffsetRules = function () {
      var bannerContainer = getHubspotBannerContainerEl();

      // If banner container exists (open OR closed/no-height), hide notifications ONLY on this page.
      if (bannerContainer) {
        var bannerActive = !!(isHubspotBannerActiveByClass(bannerContainer) && measureElHeight(bannerContainer) > 0);

        if (bannerActive) {
          setOffsets(measureElHeight(bannerContainer), 0, true);
        } else {
          setOffsets(0, 0, true);
        }
        return;
      }

      // No HubSpot banner container on this page -> native notifications allowed
      var notifications = getNotificationsEl();
      var header = getHeaderEl();

      var notifHeight = measureElHeight(notifications);
      var headerHeight = measureElHeight(header);

      // Header top matches notifications height
      // Body top compensates: notifHeight - headerHeight
      var bodyTop = notifHeight - headerHeight;
      if (bodyTop < 0) bodyTop = 0;

      setOffsets(notifHeight, bodyTop, false);
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
    // Register cleanup so main.js can safely switch to PROD
    //******************************************
    window.__UAT_MODE_CLEANUP__ = function () {
      try { stopHeaderOffsetObserver(); } catch (e) {}
      try { clearHeaderOffsets(); } catch (e) {}
      try { clearBodyTop(); } catch (e) {}
    };

    // Initial run for UAT behavior
    startHeaderOffsetObserver();

    // Optional: if main.js broadcasts mode changes, we can self-clean when switching away
    window.addEventListener("uat:mode", function (ev) {
      try {
        var m = (ev && ev.detail && ev.detail.mode) || "";
        if (m === "prod") window.__UAT_MODE_CLEANUP__();
      } catch (e) {}
    });

  } catch (e) {}
})();
