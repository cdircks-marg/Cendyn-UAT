(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var lastHsOpen = false;

    var getHubspotBannerContainer = function () {
      var anchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!anchor) return null;

      return anchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );
    };

    var isHubspotOpen = function (el) {
      if (!el || !el.classList) return false;
      if (!el.classList.contains("hs-cta-embed__loaded")) return false;

      var goCount = 0;
      el.classList.forEach(function (c) {
        if (/^go\d+$/.test(c)) goCount++;
      });
      return goCount >= 2;
    };

    //******************************************
    // Close native notification via its real close button
    //******************************************
    var closeNativeNotificationIfPresent = function () {
      try {
        var btn = document.querySelector(
          ".notifications .notification button.close, .url_notifications .notification button.close"
        );
        if (btn) btn.click();
      } catch (e) {}
    };

    //******************************************
    // Set native promo disable cookie (backup / persistence)
    // Creates: promo-<data-id>=disabled on domain .margaritavilleatsea.com
    //******************************************
    var setNativePromoDisabledCookieFromDom = function () {
      try {
        var notif = document.querySelector(
          ".notifications .notification[data-id], .url_notifications .notification[data-id]"
        );
        if (!notif) return;

        var id = (notif.getAttribute("data-id") || "").trim();
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

    //******************************************
    // Hard-hide individual notifications after dismissal (visual safety net)
    //******************************************
    var hideNotificationsHard = function () {
      try {
        var style = document.getElementById("uat-hide-native-notifications");
        if (!style) {
          style = document.createElement("style");
          style.id = "uat-hide-native-notifications";
          style.textContent =
            ".notifications .notification, .url_notifications .notification { display: none !important; }";
          document.head.appendChild(style);
        }
      } catch (e) {}
    };

    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      //******************************************
      // HS just closed → dismiss native promo once
      //******************************************
      if (!open && lastHsOpen) {
        closeNativeNotificationIfPresent();
        setNativePromoDisabledCookieFromDom();
        hideNotificationsHard();
      }

      lastHsOpen = open;
    };

    var obs = new MutationObserver(function () {
      apply();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    apply();
  } catch (e) {}
})();
