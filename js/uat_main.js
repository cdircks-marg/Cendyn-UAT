(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var lastGoCount = null;
    var started = false;

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

    function setPromoDisabledCookieFromDom() {
      try {
        var promo = document.querySelector(
          ".notifications .notification.countdown-promo[data-id], .url_notifications .notification.countdown-promo[data-id]"
        );
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
    }

    function suppressNotificationsOnce() {
      try {
        // Always try to set the cookie first (needs data-id before DOM is emptied)
        setPromoDisabledCookieFromDom();

        var containers = document.querySelectorAll(".notifications, .url_notifications");
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          if (!c) continue;

          // Inline hide beats their CSS + avoids !important
          c.style.display = "none";

          // Also clear children so timers/DOM don’t keep running
          while (c.firstChild) c.removeChild(c.firstChild);
        }
      } catch (e) {}
    }

    // Enforce for a short window because their script may re-inject repeatedly
    function enforceSuppression(ms) {
      var end = Date.now() + ms;

      (function tick() {
        suppressNotificationsOnce();
        if (Date.now() < end) {
          setTimeout(tick, 100);
        }
      })();
    }

    function onHsStateCheck() {
      var anchor = getAnchor();
      if (!anchor) return;

      var goCount = countGoClasses(anchor);

      if (lastGoCount === null) {
        lastGoCount = goCount;
        return;
      }

      // HS closed signal: 2+ go* -> 1 go*
      if (!started && lastGoCount >= 2 && goCount === 1) {
        started = true;

        // Suppress immediately + enforce briefly to beat reinjection
        enforceSuppression(5000);
      }

      lastGoCount = goCount;
    }

    var obs = new MutationObserver(function () {
      try { onHsStateCheck(); } catch (e) {}
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    onHsStateCheck();
  } catch (e) {}
})();
