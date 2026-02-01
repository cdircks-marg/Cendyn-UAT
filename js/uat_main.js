(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var lastGoCount = null;
    var armed = false;

    var notifObs = null;

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

    function setCookieFromAnyCountdownPromo() {
      try {
        var promo = document.querySelector(
          ".notifications .notification.countdown-promo[data-id], .url_notifications .notification.countdown-promo[data-id]"
        );
        if (!promo) return;

        var id = (promo.getAttribute("data-id") || "").trim();
        if (!id) return;

        setPromoDisabledCookieById(id);
      } catch (e) {}
    }

    function clearNotificationContainers() {
      try {
        // set cookie BEFORE clearing (so we still can read data-id)
        setCookieFromAnyCountdownPromo();

        var containers = document.querySelectorAll(".notifications, .url_notifications");
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          while (c.firstChild) c.removeChild(c.firstChild);
        }
      } catch (e) {}
    }

    function startKeepingNotificationsEmpty() {
      if (notifObs) return;

      // Clear immediately once
      clearNotificationContainers();

      notifObs = new MutationObserver(function () {
        // Any time something is injected back in, wipe it again
        clearNotificationContainers();
      });

      // Observe only the notification containers (more efficient than whole document)
      // If containers don't exist yet, observe document until they do.
      var containers = document.querySelectorAll(".notifications, .url_notifications");
      if (containers && containers.length) {
        for (var i = 0; i < containers.length; i++) {
          notifObs.observe(containers[i], { childList: true, subtree: false });
        }
      } else {
        // Fallback: observe the doc and clear when containers appear
        notifObs.observe(document.documentElement, { childList: true, subtree: true });
      }
    }

    function onHsStateCheck() {
      var anchor = getAnchor();
      if (!anchor) return;

      var goCount = countGoClasses(anchor);

      if (lastGoCount === null) {
        lastGoCount = goCount;
        return;
      }

      // HS closed signal: went from 2+ go* classes -> exactly 1
      if (!armed && lastGoCount >= 2 && goCount === 1) {
        armed = true;
        startKeepingNotificationsEmpty();
      }

      lastGoCount = goCount;
    }

    var hsObs = new MutationObserver(function () {
      try { onHsStateCheck(); } catch (e) {}
    });

    hsObs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    onHsStateCheck();
  } catch (e) {}
})();
