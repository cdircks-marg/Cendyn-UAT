(function () {
  try {
    //******************************************
    // CONFIG
    //******************************************
    // jsDelivr format:
    // https://cdn.jsdelivr.net/gh/USERNAME/REPO@BRANCH/path/to/file.ext
    var REPO = "cdircks-marg/Cendyn-UAT";
    var CDN  = "https://cdn.jsdelivr.net/gh/" + REPO + "@";

    //******************************************
    // 1 overrides file total (same file name for both modes)
    // - PROD loads from @main branch
    // - UAT loads from @uat branch
    //******************************************
    var BRANCH_BY_MODE = { uat: "uat", prod: "main" };

    //******************************************
    // Domain-specific assets
    //******************************************
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

    //******************************************
    // Optional prefixes for “UAT-owned” storage keys to clear on OFF
    // Keep this tight.
    //******************************************
    var UAT_STORAGE_PREFIXES = ["uat_", "UAT_", "cendyn_uat_", "CENDYN_UAT_"];

    //******************************************
    // Badge (only in UAT)
    //******************************************
    var BADGE_ID = "uat-toggle-badge";
    var LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';

    var obs = null;

    //******************************************
    // Helpers
    //******************************************
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

    //******************************************
    // FIX: currentRef() used by purge/cdnUrl
    // For now, ref is just the current branch ("uat" or "main")
    //******************************************
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
    // UAT-only jsDelivr purge (fire-and-forget)
    // Uses image beacon to bypass CORS
    //******************************************
    var purgeJsDelivr = function (path) {
      try {
        if (currentMode() !== "uat") return;

        var ref = currentRef();
        var purgeUrl = "https://purge.jsdelivr.net/gh/" + REPO + "@" + ref + "/" + path;

        var img = new Image();
        img.src = purgeUrl + "?t=" + Date.now();

        try { console.log("[UAT Loader] Purging:", purgeUrl); } catch (e) {}
      } catch (e) {}
    };

    //******************************************
    // CDN URL builder with UAT-only purge + cache bust
    //******************************************
    var cdnUrl = function (path) {
      var ref = currentRef();
      var baseUrl = CDN + encodeURIComponent(ref) + "/" + path;

      if (currentMode() === "uat") {
        // Purge first
        purgeJsDelivr(path);

        // Then force cache bust
        return baseUrl + (baseUrl.indexOf("?") > -1 ? "&" : "?") + "v=" + Date.now();
      }

      return baseUrl;
    };

    //******************************************
    // Debug logger (prints current mode + exact CSS/JS URLs being loaded)
    //******************************************
    var DEBUG = true; // flip to false to silence logs

    var logAssetSummary = function (host, mode, branch, cssUrls, jsUrls) {
      try {
        if (!DEBUG || !window.console) return;

        var title = "[UAT Loader] host=" + host + " mode=" + mode + " branch=" + branch;
        try { console.groupCollapsed(title); } catch (e) { console.log(title); }

        console.log("Param uat=", getUatParam());
        console.log("Enabled=", isEnabled());

        console.log("CSS (" + cssUrls.length + "):");
        for (var i = 0; i < cssUrls.length; i++) console.log("  - " + cssUrls[i]);

        console.log("JS (" + jsUrls.length + "):");
        for (var j = 0; j < jsUrls.length; j++) console.log("  - " + jsUrls[j]);

        // Show injected DOM tags
        try {
          var injectedCss = document.querySelectorAll("link[id^='mode-css-']");
          var injectedJs  = document.querySelectorAll("script[id^='mode-js-']");
          console.log("DOM injected CSS tags found:", injectedCss.length);
          for (var c = 0; c < injectedCss.length; c++) console.log("  * " + injectedCss[c].id + " => " + (injectedCss[c].href || ""));
          console.log("DOM injected JS tags found:", injectedJs.length);
          for (var s = 0; s < injectedJs.length; s++) console.log("  * " + injectedJs[s].id + " => " + (injectedJs[s].src || ""));
        } catch (e) {}

        try { console.groupEnd(); } catch (e) {}
      } catch (e) {}
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
    // Asset injection
    // - We inject multiple CSS files and (optionally) JS files
    // - IDs are deterministic so re-run swaps branch URLs cleanly
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

        // DEBUG
        if (DEBUG) {
          link.onload = function () { try { console.log("[UAT Loader] CSS loaded:", href); } catch (e) {} };
          link.onerror = function (ev) { try { console.warn("[UAT Loader] CSS failed/blocked:", href, ev); } catch (e) {} };
        }

        document.head.appendChild(link);

        if (DEBUG) {
          try { console.log("[UAT Loader] injected CSS:", href); } catch (e) {}
        }
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

        // DEBUG
        if (DEBUG) {
          s.onload = function () { try { console.log("[UAT Loader] JS loaded:", src); } catch (e) {} };
          s.onerror = function (ev) { try { console.warn("[UAT Loader] JS failed/blocked:", src, ev); } catch (e) {} };
        }

        document.head.appendChild(s);

        if (DEBUG) {
          try { console.log("[UAT Loader] injected JS:", src); } catch (e) {}
        }
      } catch (e) {}
    };

    var applyDomainAssets = function () {
      try {
        var host = (window.location.hostname || "").toLowerCase();
        var cfg = DOMAIN_ASSETS[host];

        // If not one of the supported hosts, do nothing (safe)
        if (!cfg) {
          try { console.warn("[UAT Loader] No DOMAIN_ASSETS match for host:", host); } catch (e) {}
          return;
        }

        var mode = currentMode();
        var branch = currentBranch();

        // Build URLs (for logging + injection)
        var css = cfg.css || [];
        var js  = cfg.js || [];

        var cssUrls = [];
        for (var i = 0; i < css.length; i++) cssUrls.push(cdnUrl(css[i]));

        var jsUrls = [];
        for (var j = 0; j < js.length; j++) jsUrls.push(cdnUrl(js[j]));

        // CSS inject
        for (var ci = 0; ci < css.length; ci++) {
          var id = "mode-css-" + ci + "-" + css[ci].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureCss(id, cssUrls[ci]);
        }

        // JS inject
        for (var ji = 0; ji < js.length; ji++) {
          var jid = "mode-js-" + ji + "-" + js[ji].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureJs(jid, jsUrls[ji]);
        }

        // Log summary
        logAssetSummary(host, mode, branch, cssUrls, jsUrls);

        // Tell downstream scripts which mode is active
        try {
          window.dispatchEvent(new CustomEvent("uat:mode", { detail: { mode: mode, host: host } }));
        } catch (e) {}
      } catch (e) {}
    };

    //******************************************
    // Badge (ONLY when UAT enabled)
    //******************************************
    var removeBadge = function () {
      var b = document.getElementById(BADGE_ID);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    };

    var injectBadgeIfEnabled = function () {
      if (!isEnabled()) {
        removeBadge();
        return;
      }
      if (document.getElementById(BADGE_ID)) return;

      // Only show on www.margaritavilleatsea.com (safe)
      var host = (window.location.hostname || "").toLowerCase();
      if (host !== "www.margaritavilleatsea.com") return;

      var logo = document.querySelector(LOGO_SELECTOR);
      if (!logo) return;

      var wrap = document.createElement("div");
      wrap.id = BADGE_ID;
      wrap.style.marginTop = "56px";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "8px";
      wrap.style.position = "fixed";
      wrap.style.zIndex = "10000000";

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
          setEnabled(false);

          // swap assets (loads @main versions)
          applyDomainAssets();

          removeBadge();

          // remove URL param (no reload)
          var url = new URL(window.location.href);
          url.searchParams.delete("UAT");
          url.searchParams.delete("uat");
          window.history.replaceState({}, "", url.toString());
        } catch (e) {}
      });

      wrap.appendChild(pill);
      wrap.appendChild(btn);
      logo.insertAdjacentElement("afterend", wrap);
    };

    var startObserver = function () {
      if (obs) return;
      var root = document.querySelector("#header") || document.documentElement;

      obs = new MutationObserver(function () {
        injectBadgeIfEnabled();
      });

      obs.observe(root, { childList: true, subtree: true });
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
      injectBadgeIfEnabled();
    });

    // Initial run
    applyDomainAssets();
    injectBadgeIfEnabled();
    startObserver();

  } catch (e) {}
})();
