(function () {
  try {
    var HS_PUSH_ANCHOR_ID = "hs-web-interactives-top-push-anchor";
    var HIDE_CLASS = "hs-found-hide";
    var didApply = false;

    function hsExists() {
      return !!document.getElementById(HS_PUSH_ANCHOR_ID);
    }

    function setPromoDisabledCookieFromDom() {
      try {
        var promo = document.querySelector(
          ".notifications .notification.countdown-promo[data-id], " +
          ".url_notifications .notification.countdown-promo[data-id]"
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

    function addHideClassToParents() {
      try {
        var nodes = document.querySelectorAll(".notifications, .url_notifications");
        if (!nodes || !nodes.length) return;

        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i] && nodes[i].classList) {
            nodes[i].classList.add(HIDE_CLASS);
          }
        }
      } catch (e) {}
    }

    function applyOnceWhenHsFound() {
      if (didApply) return;

      if (hsExists()) {
        didApply = true;

        // 1) Persist dismissal
        setPromoDisabledCookieFromDom();

        // 2) Hide notification containers safely
        addHideClassToParents();
      }
    }

    // Observe DOM until HS exists, then run once
    var obs = new MutationObserver(function () {
      try { applyOnceWhenHsFound(); } catch (e) {}
    });

    if (document.documentElement) {
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }

    applyOnceWhenHsFound();
  } catch (e) {}
})();
