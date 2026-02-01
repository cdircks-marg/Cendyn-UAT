(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";

    //******************************************
    // Body class you will use in CSS:
    // body.hs-closed-hide-countdown .notifications .notification.countdown-promo { display:none !important; }
    // body.hs-closed-hide-countdown .url_notifications .notification.countdown-promo { display:none !important; }
    //******************************************
    var BODY_CLASS = "hs-closed-hide-countdown";

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
    // Countdown promo presence + native close trigger
    //******************************************
    var countdownPromoExists = function () {
      return !!document.querySelector(
        ".notifications .notification.countdown-promo, " +
        ".url_notifications .notification.countdown-promo"
      );
    };

    //******************************************
    // Trigger the NATIVE close button for the countdown promo
    // - dispatch bubbled click (covers delegated handlers)
    // - also call .click() as backup
    //******************************************
    var closeCountdownPromoIfPresent = function () {
      try {
        var btn = document.querySelector(
          ".notifications .notification.countdown-promo button.close, " +
          ".url_notifications .notification.countdown-promo button.close"
        );
        if (!btn) return;

        try {
          btn.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
          );
        } catch (e) {}

        try {
          if (typeof btn.click === "function") btn.click();
        } catch (e) {}
      } catch (e) {}
    };

    //******************************************
    // Apply logic:
    // - Detect HS open -> closed edge
    // - If countdown promo exists, trigger its native close
    // - Add BODY_CLASS so your CSS display:none!important only applies in this condition
    //******************************************
    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      // HS just closed
      if (!open && lastHsOpen) {
        if (countdownPromoExists()) {
          closeCountdownPromoIfPresent();

          // Add class AFTER attempting native close (CSS acts as safety net)
          try { document.body.classList.add(BODY_CLASS); } catch (e) {}
        }
      }

      lastHsOpen = open;
    };

    //******************************************
    // Observe for HS state changes
    //******************************************
    var obs = new MutationObserver(function () {
      try { apply(); } catch (e) {}
    });

    if (document.body) {
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    // Initial run
    apply();
  } catch (e) {}
})();
