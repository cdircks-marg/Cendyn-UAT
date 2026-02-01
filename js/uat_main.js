(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var HTML_GATE_CLASS = "hs-page-hide-countdown";

    var ranOnce = false;

    var getHubspotBannerContainer = function () {
      var anchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!anchor) return null;

      return anchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );
    };

    var getCountdownPromo = function () {
      return document.querySelector(
        ".notifications .notification.countdown-promo, .url_notifications .notification.countdown-promo"
      );
    };

    var setPromoDisabledCookieFromDom = function () {
      try {
        var promo = getCountdownPromo();
        if (!promo) return;

        var id = (promo.getAttribute("data-id") || "").trim();
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

    // This is the critical part for your screenshot: remove inline display:block
    var removeInlineDisplay = function () {
      try {
        var promo = getCountdownPromo();
        if (!promo) return;

        promo.style.removeProperty("display");

        // If the system put display:block on an inner wrapper too, strip that as well:
        var inner = promo.querySelector(".inner-wrapper");
        if (inner) inner.style.removeProperty("display");
      } catch (e) {}
    };

    // Optional gate: ONLY on HS pages, you can add CSS with !important safely
    var addGateClass = function () {
      try {
        document.documentElement.classList.add(HTML_GATE_CLASS);
      } catch (e) {}
    };

    var closeCountdownPromoImmediately = function () {
      try {
        setPromoDisabledCookieFromDom();
        removeInlineDisplay();
        addGateClass();
      } catch (e) {}
    };

    var apply = function () {
      if (ranOnce) return;

      // HS found on page => immediately close notifications
      var hs = getHubspotBannerContainer();
      if (hs) {
        ranOnce = true;
        closeCountdownPromoImmediately();
      }
    };

    var obs = new MutationObserver(function () {
      try { apply(); } catch (e) {}
    });

    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }

    apply();
  } catch (e) {}
})();
