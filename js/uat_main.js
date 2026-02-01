(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var lastHsOpen = false;

    //******************************************
    // HubSpot banner helpers
    //******************************************
    var getHubspotBannerContainer = function () {
      var anchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!anchor) return null;

      return anchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );
    };

    var isHubspotOpen = function (el) {
      try {
        if (!el || !el.classList) return false;
        if (!el.classList.contains("hs-cta-embed__loaded")) return false;

        var goCount = 0;
        el.classList.forEach(function (c) {
          if (/^go\d+$/.test(c)) goCount++;
        });
        return goCount >= 2;
      } catch (e) {
        return false;
      }
    };

    //******************************************
    // Countdown promo helpers
    //******************************************
    var getCountdownPromo = function () {
      return document.querySelector(
        ".notifications .notification.countdown-promo, .url_notifications .notification.countdown-promo"
      );
    };

    var getCountdownPromoCloseBtn = function () {
      return document.querySelector(
        ".notifications .notification.countdown-promo button.close, " +
          ".url_notifications .notification.countdown-promo button.close"
      );
    };

    //******************************************
    // Set promo-<data-id>=disabled (backup persistence)
    //******************************************
    var setPromoDisabledCookie = function (id) {
      try {
        if (!id) return;

        var d = new Date();
        d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);

        document.cookie =
          "promo-" + id + "=disabled" +
          "; expires=" + d.toUTCString() +
          "; domain=.margaritavilleatsea.com" +
          "; path=/" +
          "; SameSite=Lax" +
          (location.protocol === "https:" ? "; Secure" : "");
      } catch (e) {}
    };

    var setPromoDisabledCookieFromDom = function () {
      try {
        var promo = getCountdownPromo();
        if (!promo) return;

        var id = (promo.getAttribute("data-id") || "").trim();
        if (!id) return;

        setPromoDisabledCookie(id);
      } catch (e) {}
    };

    //******************************************
    // Trigger native close button in a compatible way:
    // - dispatch bubbling click (for delegated listeners)
    // - also call .click() as backup
    //******************************************
    var triggerCountdownPromoClose = function () {
      try {
        var btn = getCountdownPromoCloseBtn();
        if (!btn) return;

        // Capture ID before DOM changes
        try {
          var promo = btn.closest(".notification.countdown-promo");
          var id = promo ? (promo.getAttribute("data-id") || "").trim() : "";
          if (id) setPromoDisabledCookie(id);
        } catch (e) {}

        // Delegated handlers often require a bubbled event
        try {
          btn.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
          );
        } catch (e) {}

        // Direct click fallback
        try {
          if (typeof btn.click === "function") btn.click();
        } catch (e) {}
      } catch (e) {}
    };

    //******************************************
    // On HS open -> closed, close native countdown promo + set cookie
    //******************************************
    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      if (!open && lastHsOpen) {
        // Set cookie (persistence) then trigger native close path
        setPromoDisabledCookieFromDom();
        triggerCountdownPromoClose();
      }

      lastHsOpen = open;
    };

    //******************************************
    // Observe DOM for HS state changes
    //******************************************
    var obs = new MutationObserver(function () {
      try { apply(); } catch (e) {}
    });

    if (document.body) {
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    }

    // Initial run
    apply();
  } catch (e) {}
})();
