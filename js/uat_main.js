(function () {
  try {
    var HS_TOP_ANCHOR_ID = "hs-web-interactives-top-anchor";
    var DID_TRY_CLOSE = false;
    var RETRY_MS = 150;
    var MAX_RETRIES = 40; // ~6 seconds total

    var getHubspotBannerContainer = function () {
      var anchor = document.getElementById(HS_TOP_ANCHOR_ID);
      if (!anchor) return null;

      return anchor.querySelector(
        'div[id^="hs-overlay-cta-"]:not([role="dialog"]):not([aria-modal="true"])'
      );
    };

    var getNativeCloseBtn = function () {
      return document.querySelector(
        '.notifications .notification.countdown-promo button.close[aria-label="Close Banner"],' +
        '.url_notifications .notification.countdown-promo button.close[aria-label="Close Banner"],' +
        ".notifications .notification.countdown-promo button.close," +
        ".url_notifications .notification.countdown-promo button.close"
      );
    };

    var fire = function (el, type, EventCtor, props) {
      try {
        var ev = null;
        if (EventCtor && typeof EventCtor === "function") {
          ev = new EventCtor(type, props || { bubbles: true, cancelable: true });
        } else {
          ev = document.createEvent("Event");
          ev.initEvent(type, true, true);
        }
        el.dispatchEvent(ev);
      } catch (e) {}
    };

    var attemptClose = function () {
      try {
        var btn = getNativeCloseBtn();
        if (!btn) return false;

        // Try a realistic sequence that covers most handlers
        fire(btn, "pointerdown", window.PointerEvent, { bubbles: true, cancelable: true, pointerType: "mouse" });
        fire(btn, "pointerup", window.PointerEvent, { bubbles: true, cancelable: true, pointerType: "mouse" });

        fire(btn, "mousedown", window.MouseEvent, { bubbles: true, cancelable: true, view: window });
        fire(btn, "mouseup", window.MouseEvent, { bubbles: true, cancelable: true, view: window });
        fire(btn, "click", window.MouseEvent, { bubbles: true, cancelable: true, view: window });

        fire(btn, "touchstart", window.TouchEvent, { bubbles: true, cancelable: true });
        fire(btn, "touchend", window.TouchEvent, { bubbles: true, cancelable: true });

        // Direct fallback
        try { btn.click(); } catch (e) {}

        return true;
      } catch (e) {
        return false;
      }
    };

    var startCloseOnceHubspotIsSeen = function () {
      if (DID_TRY_CLOSE) return;
      DID_TRY_CLOSE = true;

      var tries = 0;
      var timer = setInterval(function () {
        tries++;

        var ok = attemptClose();
        if (ok || tries >= MAX_RETRIES) {
          try { clearInterval(timer); } catch (e) {}
        }
      }, RETRY_MS);
    };

    var apply = function () {
      var hs = getHubspotBannerContainer();
      if (hs) startCloseOnceHubspotIsSeen();
    };

    // Watch for HubSpot being injected
    var obs = new MutationObserver(function () {
      try { apply(); } catch (e) {}
    });

    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }

    apply();
  } catch (e) {}
})();
