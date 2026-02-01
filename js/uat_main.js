(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var lastHsOpen = false;

    var htmlEl = document.documentElement;

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

    // Countdown promo element (native notification)
    var getCountdownPromo = function () {
      return document.querySelector(
        ".notifications .notification.countdown-promo, .url_notifications .notification.countdown-promo"
      );
    };

    // Set promo-<data-id>=disabled cookie
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

    // Force the same end-state as "closed"
    var forceNativeClosedState = function () {
      try {
        // 1) Remove the promo element (strongest / cleanest)
        var promo = getCountdownPromo();
        if (promo && promo.parentNode) {
          promo.parentNode.removeChild(promo);
        }

        // 2) Remove native "open" state classes (these drive header/layout)
        if (htmlEl && htmlEl.classList) {
          htmlEl.classList.remove("notifications-open");
          htmlEl.classList.remove("countdown-timer-bar-show");
        }

        // 3) Clear the inline CSS var (native uses this)
        try { htmlEl.style.removeProperty("--notification-height"); } catch (e) {}
      } catch (e) {}
    };

    // Because their JS may re-insert or re-open, enforce for a short window after HS close
    var enforceForMs = function (ms) {
      var end = Date.now() + ms;
      var timer = null;

      var tick = function () {
        try {
          forceNativeClosedState();
        } catch (e) {}

        if (Date.now() < end) {
          timer = setTimeout(tick, 100);
        }
      };

      tick();
      return function () {
        try { if (timer) clearTimeout(timer); } catch (e) {}
      };
    };

    var stopEnforce = null;

    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      // HS just closed
      if (!open && lastHsOpen) {
        // Persist it
        setPromoDisabledCookieFromDom();

        // Force immediate close state
        forceNativeClosedState();

        // Enforce for 3 seconds in case native JS re-opens/re-inserts
        if (stopEnforce) { try { stopEnforce(); } catch (e) {} }
        stopEnforce = enforceForMs(3000);
      }

      lastHsOpen = open;
    };

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

    apply();
  } catch (e) {}
})();
