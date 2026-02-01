(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var HIDE_CLASS = "hs-found-hide";
    var didHide = false;

    function getAnchor() {
      return document.getElementById(HS_PUSH_ANCHOR_ID);
    }

    function countGoClasses(el) {
      if (!el || !el.classList) return 0;
      var count = 0;
      for (var i = 0; i < el.classList.length; i++) {
        if (/^go\d+$/.test(el.classList[i])) count++;
      }
      return count;
    }

    function isHsClosed(el) {
      // CLOSED = exactly 1 go* class
      return countGoClasses(el) === 1;
    }

    function addHideClassToNotifications() {
      try {
        var nodes = document.querySelectorAll(".notifications, .url_notifications");
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].classList.add(HIDE_CLASS);
        }
      } catch (e) {}
    }

    function applyIfClosed() {
      if (didHide) return;

      var anchor = getAnchor();
      if (!anchor) return;

      if (isHsClosed(anchor)) {
        didHide = true;
        addHideClassToNotifications();
      }
    }

    // Observe class changes on the anchor
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (
          m.type === "attributes" &&
          m.target &&
          m.target.id === HS_PUSH_ANCHOR_ID &&
          m.attributeName === "class"
        ) {
          applyIfClosed();
        }
      }
    });

    // Watch for anchor insertion + class changes
    if (document.documentElement) {
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    // Initial check (in case HS already closed before observer ran)
    applyIfClosed();

  } catch (e) {}
})();
