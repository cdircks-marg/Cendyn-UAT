(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var HEADER_SELECTOR = "#header.navipandora";
    var OFFSET_CLASS = "navipandora--offset";
    var STYLE_ID = "uat-hide-native-notifs-when-hs-open";

    var lastHsOpen = false;

    var getHeader = function () {
      return document.querySelector(HEADER_SELECTOR);
    };

    var setHeaderOffsetClass = function (on) {
      try {
        var h = getHeader();
        if (!h) return;
        h.classList.toggle(OFFSET_CLASS, !!on);
      } catch (e) {}
    };

    var ensureHideStyle = function () {
      var s = document.getElementById(STYLE_ID);
      if (!s) {
        s = document.createElement("style");
        s.id = STYLE_ID;
        document.head.appendChild(s);
      }
      s.textContent = ".notifications{display:none !important;}";
    };

    var clearHideStyle = function () {
      var s = document.getElementById(STYLE_ID);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    };

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

    var closeNativeNotificationIfPresent = function () {
      try {
        var btn = document.querySelector(".notifications .notification button.close");
        if (btn) btn.click();
      } catch (e) {}
    };

    var setNativePromoCookie = function () {
      try {
        var n = document.querySelector(".notifications .notification[data-id]");
        if (!n) return;

        var id = (n.getAttribute("data-id") || "").trim();
        if (!id) return;

        var d = new Date();
        d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);

        document.cookie =
          "promo-" + id + "=disabled" +
          "; expires=" + d.toUTCString() +
          "; domain=.margaritavilleatsea.com; path=/; SameSite=Lax; Secure";
      } catch (e) {}
    };

    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      if (open) {
        // HS open
        ensureHideStyle();
        setHeaderOffsetClass(true);
      } else {
        // HS closed
        clearHideStyle();
        setHeaderOffsetClass(false);

        if (lastHsOpen) {
          closeNativeNotificationIfPresent();
          setNativePromoCookie();
        }
      }

      lastHsOpen = open;
    };

    var obs = new MutationObserver(function () {
      try { apply(); } catch (e) {}
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    apply();
  } catch (e) {}
})();
