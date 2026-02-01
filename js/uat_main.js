(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var lastGoCount = null;
    var didRun = false;

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

    function setPromoDisabledCookieById(id) {
      try {
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
    }

    function setPromoDisabledCookieFromDom() {
      try {
        // Countdown promo is the one that has data-id
        var promo = document.querySelector(
          ".notifications .notification.countdown-promo[data-id], .url_notifications .notification.countdown-promo[data-id]"
        );
        if (!promo) return;

        var id = (promo.getAttribute("data-id") || "").trim();
        if (!id) return;

        setPromoDisabledCookieById(id);
      } catch (e) {}
    }

    function deleteNotificationChildren() {
      try {
        var containers = document.querySelectorAll(".notifications, .url_notifications");
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          while (c.firstChild) c.removeChild(c.firstChild);
        }
      } catch (e) {}
    }

    // After HS closes, notifications/promo may be injected slightly later.
    // Retry a few times to ensure we catch the promo data-id for cookie + clear DOM.
    function enforceForMs(ms) {
      var end = Date.now() + ms;
      var timer = null;

      var tick = function () {
        try {
          setPromoDisabledCookieFromDom();
          deleteNotificationChildren();
        } catch (e) {}

        if (Date.now() < end) {
          timer = setTimeout(tick, 150);
        }
      };

      tick();
      return function () {
        try { if (timer) clearTimeout(timer); } catch (e) {}
      };
    }

    var stopEnforce = null;

    function applyIfHsClosed() {
      if (didRun) return;

      var anchor = getAnchor();
      if (!anchor) return;

      var goCount = countGoClasses(anchor);

      if (lastGoCount === null) {
        lastGoCount = goCount;
        return;
      }

      // HS CLOSED: went from 2+ go* classes → exactly 1
      if (lastGoCount >= 2 && goCount === 1) {
        didRun = true;

        // Run immediately + for a short window to catch late-injected promos
        if (stopEnforce) { try { stopEnforce(); } catch (e) {} }
        stopEnforce = enforceForMs(4000);
      }

      lastGoCount = goCount;
    }

    var obs = new MutationObserver(function () {
      try { applyIfHsClosed(); } catch (e) {}
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    applyIfHsClosed();
  } catch (e) {}
})();
