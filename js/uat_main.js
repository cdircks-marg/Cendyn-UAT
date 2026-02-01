(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var HIDE_CLASS = "hs-found-hide";
    var didApply = false;

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
      return countGoClasses(el) === 1;
    }

    function addHideClassToNotifications() {
      var nodes = document.querySelectorAll(".notifications, .url_notifications");
      if (!nodes || !nodes.length) return false;

      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.add(HIDE_CLASS);
        nodes[i].setAttribute("data-hs-hide-applied", "true");
      }
      return true;
    }

    function applyIfReady() {
      if (didApply) return;

      var anchor = getAnchor();
      if (!anchor) return;

      if (!isHsClosed(anchor)) return;

      // notifications may render after HS anchor, so retry a few times
      var tries = 0;
      var maxTries = 20; // ~3s
      var timer = setInterval(function () {
        tries++;

        if (addHideClassToNotifications()) {
          didApply = true;
          clearInterval(timer);
          return;
        }

        if (tries >= maxTries) {
          clearInterval(timer);
        }
      }, 150);
    }

    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];

        // 1) If nodes are inserted/removed, re-check (covers anchor insertion)
        if (m.type === "childList") {
          applyIfReady();
          continue;
        }

        // 2) If the anchor's class changes, re-check (covers open->closed)
        if (
          m.type === "attributes" &&
          m.target &&
          m.target.id === HS_PUSH_ANCHOR_ID &&
          m.attributeName === "class"
        ) {
          applyIfReady();
        }
      }
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    // initial attempt
    applyIfReady();
  } catch (e) {}
})();
