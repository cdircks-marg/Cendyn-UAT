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

    // Finds EXACTLY: <button class="close" aria-label="Close Banner">...</button>
    // inside the countdown promo notification
    var getNativeCountdownCloseBtn = function () {
      return document.querySelector(
        '.notifications .notification.countdown-promo button.close[aria-label="Close Banner"],' +
        '.url_notifications .notification.countdown-promo button.close[aria-label="Close Banner"]'
      );
    };

    // Fire a realistic sequence (covers delegated + pointer-based handlers)
    var triggerCloseButton = function (btn) {
      if (!btn) return;

      try {
        // Pointer events (modern)
        if (typeof PointerEvent === "function") {
          btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
        }
      } catch (e) {}

      try {
        // Mouse events (legacy/delegated)
        btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      } catch (e) {}

      try {
        // Direct click fallback
        if (typeof btn.click === "function") btn.click();
      } catch (e) {}
    };

    var apply = function () {
      var hs = getHubspotBannerContainer();
      var open = !!(hs && isHubspotOpen(hs));

      // HS just closed -> trigger native notification close button
      if (!open && lastHsOpen) {
        var btn = getNativeCountdownCloseBtn();
        if (btn) triggerCloseButton(btn);
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
