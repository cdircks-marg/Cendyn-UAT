(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var lastGoCount = null;
    var armed = false;

    var lockObs = null;

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

    function getNotificationContainer() {
      return document.querySelector(".notifications") ||
             document.querySelector(".url_notifications");
    }

    function forceHideContainer() {
      try {
        // cookie first (needs data-id while DOM exists)
        setPromoDisabledCookieFromDom();

        var c = getNotificationContainer();
        if (!c) return;

        // hard lock: inline + important beats their CSS and their inline display:block
        c.style.setProperty("display", "none", "important");

        // optional: stop timers/dom churn
        while (c.firstChild) c.removeChild(c.firstChild);
      } catch (e) {}
    }

    function startLockingContainer() {
      // do once immediately
      forceHideContainer();

      // then keep it locked if their JS flips it back
      if (lockObs) return;

      lockObs = new MutationObserver(function () {
        try { forceHideContainer(); } catch (e) {}
      });

      // observe whole doc until container exists; once it does, this still works
      lockObs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    }

    function checkHsTransition() {
      var a = getAnchor();
      if (!a) return;

      var goCount = countGoClasses(a);

      if (lastGoCount === null) {
        lastGoCount = goCount;
        return;
      }

      // HS closed: 2+ go* classes -> exactly 1 go* class
      if (!armed && lastGoCount >= 2 && goCount === 1) {
        armed = true;
        startLockingContainer();
      }

      lastGoCount = goCount;
    }

    var hsObs = new MutationObserver(function () {
      try { checkHsTransition(); } catch (e) {}
    });

    hsObs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    checkHsTransition();
  } catch (e) {}
})();
