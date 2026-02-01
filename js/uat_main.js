(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var HTML_CLASS = "hs-closed-hide-countdown";
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

    var countdownPromoExists = function () {
      return !!document.querySelector(
        ".notifications .notification.countdown-promo, .url_notifications .notification.countdown-promo"
      );
    };

    var closeCountdownPromoIfPresent = function () {
      try {
        var btn = document.querySelector(
          ".notifications .notification.countdown-promo button.close, .url_notifications .notification.countdown-promo button.close"
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

    // Remove native "open" state classes from <html> after HS close (fallback cleanup)
    var cleanupNativeHtmlState = function () {
      try {
        if (!htmlEl || !htmlEl.classList) return;

        htmlEl.classList.remove("notifications-open");
        htmlEl.classList.remove("countdown-timer-bar-show");

        // Also clear the inline var if it's stuck (safe, since HS just closed)
        try { htmlEl.style.removeProperty("--notification-height"); } catch (e) {}
      } catch (e) {}
    };

    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      // HS just closed
      if (!open && lastHsOpen) {
        if (countdownPromoExists()) {
          // 1) Trigger native close FIRST
          closeCountdownPromoIfPresent();

          // 2) Add your gating class to <html> (so your CSS can key off it safely)
          try { htmlEl.classList.add(HTML_CLASS); } catch (e) {}

          // 3) After native close runs, cleanup native html "open" classes (fallback)
          setTimeout(function () {
            try { cleanupNativeHtmlState(); } catch (e) {}
          }, 0);
        }
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
        attributeFilter: ["class"]
      });
    }

    apply();
  } catch (e) {}
})();
