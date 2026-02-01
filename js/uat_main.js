(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var lastOpen = null;

    function getPushAnchor() {
      return document.getElementById(HS_PUSH_ANCHOR_ID);
    }

    function countGoClasses(el) {
      try {
        if (!el || !el.classList) return 0;
        var n = 0;
        for (var i = 0; i < el.classList.length; i++) {
          if (/^go\d+$/.test(el.classList[i])) n++;
        }
        return n;
      } catch (e) {
        return 0;
      }
    }

    // "Open" = 2+ go* classes. "Closed" = 1 go* class.
    function isHsOpenByPushAnchor(el) {
      return countGoClasses(el) >= 2;
    }

    function getNativeCountdownCloseBtn() {
      return document.querySelector(
        '.notifications .notification.countdown-promo button.close[aria-label="Close Banner"],' +
          '.url_notifications .notification.countdown-promo button.close[aria-label="Close Banner"],' +
          ".notifications .notification.countdown-promo button.close," +
          ".url_notifications .notification.countdown-promo button.close"
      );
    }

    // Try to trigger close using bubbled events + .click()
    function triggerClose(btn) {
      if (!btn) return;

      try {
        btn.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
        );
      } catch (e) {}

      try {
        if (typeof btn.click === "function") btn.click();
      } catch (e) {}
    }

    // Run close attempts a few times right after HS closes (covers render timing)
    function closeNativeNotificationsAfterHsClose() {
      var tries = 0;
      var maxTries = 10; // ~1.5s total
      var timer = setInterval(function () {
        tries++;

        var btn = getNativeCountdownCloseBtn();
        if (btn) {
          triggerClose(btn);
          clearInterval(timer);
          return;
        }

        if (tries >= maxTries) {
          clearInterval(timer);
        }
      }, 150);
    }

    function handleMaybeTransition() {
      var el = getPushAnchor();
      if (!el) return;

      var open = isHsOpenByPushAnchor(el);

      if (lastOpen === null) {
        lastOpen = open;
        return;
      }

      // Transition: OPEN -> CLOSED
      if (lastOpen === true && open === false) {
        // Click native close right after HS "go*" class disappears
        closeNativeNotificationsAfterHsClose();
      }

      lastOpen = open;
    }

    // Observe for push anchor existence + class changes
    var obs = new MutationObserver(function (mutations) {
      try {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];

          // If the push anchor is added, start tracking state immediately
          if (m.type === "childList") {
            handleMaybeTransition();
          }

          // If class changes on the anchor, check for open->closed transition
          if (m.type === "attributes") {
            if (m.target && m.target.id === HS_PUSH_ANCHOR_ID) {
              handleMaybeTransition();
            }
          }
        }
      } catch (e) {}
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    // Initial state check
    handleMaybeTransition();
  } catch (e) {}
})();
