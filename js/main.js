(function () {
  try {
    //******************************************
    // CONFIG
    //******************************************
    var REPO = "cdircks-marg/Cendyn-UAT";
    var CDN  = "https://cdn.jsdelivr.net/gh/" + REPO + "@";

    var BRANCH_BY_MODE = { uat: "uat", prod: "main" };

    var DOMAIN_ASSETS = {
      "www.margaritavilleatsea.com": {
        css: [
          "css/tailwind.css",
          "css/slideshow.css",
          "css/footer.css",
          "css/cms-overrides.css"
        ],
        js: []
      },
      "reservations.margaritavilleatsea.com": {
        css: [
          "css/booking-overrides.css"
        ],
        js: [
          "js/booking-filter.js"
          //"js/hs-banner.js"
        ]
      }
    };

    //******************************************
    // Storage keys
    //******************************************
    var SS_KEY = "uat_enabled_session";
    var LS_KEY = "uat_enabled_local";

    var UAT_STORAGE_PREFIXES = ["uat_", "UAT_", "cendyn_uat_", "CENDYN_UAT_"];

    //******************************************
    // Badge
    //******************************************
    var BADGE_ID = "uat-toggle-badge";

    // WWW logo selector (existing)
    var WWW_HOST = "www.margaritavilleatsea.com";
    var WWW_LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';

    // Reservations logo target (your HTML block)
    var RES_HOST = "reservations.margaritavilleatsea.com";
    var RES_LOGO_IMG_SELECTOR = "div.MuiBox-root.css-0 a[href^='https://margaritavilleatsea.com/'] img.bp-logo";

    //******************************************
    // Observers
    //******************************************
    var obsWWW = null;
    var obsRES = null;

    //******************************************
    // Helpers
    //******************************************
    var DEBUG = true;
    var log = function () { try { if (DEBUG && console && console.log) console.log.apply(console, arguments); } catch (e) {} };
    var warn = function () { try { if (DEBUG && console && console.warn) console.warn.apply(console, arguments); } catch (e) {} };

    var hostName = function () {
      try { return (window.location.hostname || "").toLowerCase(); } catch (e) {}
      return "";
    };

    var getUatParam = function () {
      var params = new URLSearchParams(window.location.search);
      return (params.get("UAT") || params.get("uat") || "").toLowerCase();
    };

    var isEnabled = function () {
      try {
        var ss = false, ls = false;
        try { ss = sessionStorage.getItem(SS_KEY) === "1"; } catch (e) {}
        try { ls = localStorage.getItem(LS_KEY) === "1"; } catch (e) {}
        return ss || ls;
      } catch (e) {}
      return false;
    };

    var currentMode = function () {
      return isEnabled() ? "uat" : "prod";
    };

    var currentBranch = function () {
      return BRANCH_BY_MODE[currentMode()] || "main";
    };

    // FIX: currentRef used by purge/cdnUrl
    var currentRef = function () {
      return currentBranch();
    };

    //******************************************
    // Cleanup hook called when switching away from UAT
    //******************************************
    var runUatCleanupIfPresent = function () {
      try {
        if (typeof window.__UAT_MODE_CLEANUP__ === "function") {
          window.__UAT_MODE_CLEANUP__();
        }
      } catch (e) {}
      try { window.__UAT_MODE_CLEANUP__ = null; } catch (e) {}
    };

    //******************************************
    // Targeted storage clearing helpers
    //******************************************
    var clearStorageByPrefixes = function (storage, prefixes) {
      try {
        if (!storage || !prefixes || !prefixes.length) return;

        var keys = [];
        for (var i = 0; i < storage.length; i++) {
          var k = storage.key(i);
          if (k) keys.push(k);
        }

        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          for (var p = 0; p < prefixes.length; p++) {
            if (key.indexOf(prefixes[p]) === 0) {
              try { storage.removeItem(key); } catch (e) {}
              break;
            }
          }
        }
      } catch (e) {}
    };

    //******************************************
    // Central enable/disable persists to BOTH session + local storage
    //******************************************
    var setEnabled = function (enabled) {
      try {
        if (enabled) {
          try { sessionStorage.setItem(SS_KEY, "1"); } catch (e) {}
          try { localStorage.setItem(LS_KEY, "1"); } catch (e) {}
        } else {
          runUatCleanupIfPresent();

          try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
          try { localStorage.removeItem(LS_KEY); } catch (e) {}

          clearStorageByPrefixes(localStorage, UAT_STORAGE_PREFIXES);
          clearStorageByPrefixes(sessionStorage, UAT_STORAGE_PREFIXES);
        }
      } catch (e) {}
    };

    //******************************************
    // UAT-only jsDelivr purge (fire-and-forget)
    //******************************************
    var purgeJsDelivr = function (path) {
      try {
        if (currentMode() !== "uat") return;

        var ref = currentRef();
        var purgeUrl = "https://purge.jsdelivr.net/gh/" + REPO + "@" + ref + "/" + path;

        var img = new Image();
        img.src = purgeUrl + "?t=" + Date.now();
      } catch (e) {}
    };

    //******************************************
    // CDN URL builder with UAT-only purge + cache bust
    //******************************************
    var cdnUrl = function (path) {
      var ref = currentRef();
      var baseUrl = CDN + encodeURIComponent(ref) + "/" + path;

      if (currentMode() === "uat") {
        purgeJsDelivr(path);
        return baseUrl + (baseUrl.indexOf("?") > -1 ? "&" : "?") + "v=" + Date.now();
      }
      return baseUrl;
    };

    //******************************************
    // Asset injection
    //******************************************
    var ensureCss = function (id, href) {
      try {
        var el = document.getElementById(id);
        if (el && el.getAttribute("href") === href) return;

        if (el && el.parentNode) el.parentNode.removeChild(el);

        var link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      } catch (e) {}
    };

    var ensureJs = function (id, src) {
      try {
        var el = document.getElementById(id);
        if (el && el.getAttribute("src") === src) return;

        // If removing a prior script, run cleanup first
        if (el) {
          try { runUatCleanupIfPresent(); } catch (e) {}
        }

        if (el && el.parentNode) el.parentNode.removeChild(el);

        var s = document.createElement("script");
        s.id = id;
        s.src = src;
        s.async = true;
        document.head.appendChild(s);
      } catch (e) {}
    };

    var applyDomainAssets = function () {
      try {
        var host = hostName();
        var cfg = DOMAIN_ASSETS[host];
        if (!cfg) return;

        var css = cfg.css || [];
        for (var i = 0; i < css.length; i++) {
          var id = "mode-css-" + i + "-" + css[i].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureCss(id, cdnUrl(css[i]));
        }

        var js = cfg.js || [];
        for (var j = 0; j < js.length; j++) {
          var jid = "mode-js-" + j + "-" + js[j].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureJs(jid, cdnUrl(js[j]));
        }
      } catch (e) {}
    };

    //******************************************
    // Reservations-only: ensure logo outbound link keeps uat=on when enabled
    // (because reservations removes uat param from its own URL)
    //******************************************
    var getReservationsLogoAnchor = function () {
      try {
        var img = document.querySelector(RES_LOGO_IMG_SELECTOR);
        if (!img) return null;
        return img.closest("a") || null;
      } catch (e) {}
      return null;
    };

    var patchReservationsLogoLinkIfEnabled = function () {
      try {
        if (hostName() !== RES_HOST) return;

        // If param shows up briefly, persist immediately
        var p = getUatParam();
        if (p === "on") setEnabled(true);
        if (p === "off") setEnabled(false);

        if (!isEnabled()) return;

        var a = getReservationsLogoAnchor();
        if (!a) return;

        var href = a.getAttribute("href") || "";
        if (!href) return;

        var u = new URL(href, window.location.origin);

        if ((u.searchParams.get("uat") || "").toLowerCase() !== "on") {
          u.searchParams.set("uat", "on");
          a.setAttribute("href", u.toString());
        }
      } catch (e) {}
    };

    var unpatchReservationsLogoLink = function () {
      try {
        if (hostName() !== RES_HOST) return;
        var a = getReservationsLogoAnchor();
        if (!a) return;

        var href = a.getAttribute("href") || "";
        if (!href) return;

        var u = new URL(href, window.location.origin);
        u.searchParams.delete("uat");
        u.searchParams.delete("UAT");
        a.setAttribute("href", u.toString());
      } catch (e) {}
    };

    //******************************************
    // Badge helpers
    //******************************************
    var removeBadge = function () {
      try {
        var b = document.getElementById(BADGE_ID);
        if (b && b.parentNode) b.parentNode.removeChild(b);
      } catch (e) {}
    };

    var getBadgeInsertTarget = function () {
      try {
        var host = hostName();

        // WWW: insert after main logo
        if (host === WWW_HOST) {
          return document.querySelector(WWW_LOGO_SELECTOR) || null;
        }

        // RES: insert after the reservations logo anchor (your block)
        if (host === RES_HOST) {
          return getReservationsLogoAnchor();
        }
      } catch (e) {}
      return null;
    };

    var injectBadgeIfEnabled = function () {
      try {
        if (!isEnabled()) {
          removeBadge();
          return;
        }

        if (document.getElementById(BADGE_ID)) return;

        var target = getBadgeInsertTarget();
        if (!target) return;

        var wrap = document.createElement("div");
        wrap.id = BADGE_ID;
        wrap.style.marginTop = "8px";
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "8px";
        wrap.style.position = "relative";
        wrap.style.zIndex = "10000000";

        // Reservations header layout is different; make it visible and stable
        if (hostName() === RES_HOST) {
          wrap.style.position = "relative";
          wrap.style.display = "flex";
        }

        var pill = document.createElement("span");
        pill.textContent = "UAT MODE";
        pill.style.padding = "4px 10px";
        pill.style.borderRadius = "999px";
        pill.style.background = "#C8102E";
        pill.style.color = "#fff";
        pill.style.fontWeight = "800";
        pill.style.fontSize = "12px";
        pill.style.lineHeight = "1";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "SWITCH TO PROD";
        btn.style.cursor = "pointer";
        btn.style.padding = "4px 10px";
        btn.style.borderRadius = "999px";
        btn.style.border = "1px solid #C8102E";
        btn.style.background = "#fff";
        btn.style.color = "#C8102E";
        btn.style.fontWeight = "800";
        btn.style.fontSize = "12px";
        btn.style.lineHeight = "1";

        btn.addEventListener("click", function () {
          try {
            // Turn off UAT + cleanup
            setEnabled(false);

            // Remove badge immediately
            removeBadge();

            // Reservations: remove uat=on from the outbound logo link too
            unpatchReservationsLogoLink();

            // Swap assets to PROD
            applyDomainAssets();

            // Remove URL param (no reload) if present
            var url = new URL(window.location.href);
            url.searchParams.delete("UAT");
            url.searchParams.delete("uat");
            window.history.replaceState({}, "", url.toString());
          } catch (e) {}
        });

        wrap.appendChild(pill);
        wrap.appendChild(btn);

        // Insert directly under the logo
        try { target.insertAdjacentElement("afterend", wrap); } catch (e) {}
      } catch (e) {}
    };

    //******************************************
    // Observers
    //******************************************
    var startWWWObserver = function () {
      try {
        if (obsWWW) return;
        if (hostName() !== WWW_HOST) return;

        var root = document.querySelector("#header") || document.documentElement;
        obsWWW = new MutationObserver(function () {
          injectBadgeIfEnabled();
        });
        obsWWW.observe(root, { childList: true, subtree: true });
      } catch (e) {}
    };

    var startRESObserver = function () {
      try {
        if (obsRES) return;
        if (hostName() !== RES_HOST) return;

        var root = document.body || document.documentElement;
        if (!root) return;

        obsRES = new MutationObserver(function () {
          // Keep link patched and badge visible on re-renders
          patchReservationsLogoLinkIfEnabled();
          injectBadgeIfEnabled();
        });

        obsRES.observe(root, { childList: true, subtree: true });
      } catch (e) {}
    };

    //******************************************
    // SPA-safe URL change detection
    //******************************************
    var hookHistory = function () {
      if (window.__uatHistoryHooked) return;
      window.__uatHistoryHooked = true;

      var _push = history.pushState;
      var _replace = history.replaceState;

      history.pushState = function () {
        var r = _push.apply(this, arguments);
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
        return r;
      };

      history.replaceState = function () {
        var r = _replace.apply(this, arguments);
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
        return r;
      };

      window.addEventListener("popstate", function () {
        try { window.dispatchEvent(new Event("uat:urlchange")); } catch (e) {}
      });
    };

    //******************************************
    // Initial param-driven state
    //******************************************
    var p0 = getUatParam();
    if (p0 === "on") setEnabled(true);
    if (p0 === "off") setEnabled(false);

    // If no param, honor persisted localStorage and restore session for this tab
    try {
      if (!p0 && isEnabled()) {
        try { sessionStorage.setItem(SS_KEY, "1"); } catch (e) {}
      }
    } catch (e) {}

    hookHistory();

    window.addEventListener("uat:urlchange", function () {
      var p = getUatParam();
      if (p === "on") setEnabled(true);
      if (p === "off") setEnabled(false);

      applyDomainAssets();

      // Reservations: keep UAT alive even if param disappears + patch outbound link
      patchReservationsLogoLinkIfEnabled();

      // Badge: show on BOTH www + reservations
      injectBadgeIfEnabled();
    });

    // Initial run
    applyDomainAssets();
    patchReservationsLogoLinkIfEnabled();
    injectBadgeIfEnabled();
    startWWWObserver();
    startRESObserver();

  } catch (e) {}
})();
