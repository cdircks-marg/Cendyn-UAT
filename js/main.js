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
          //******************************************
          // One overrides file for BOTH uat/prod (branch controls which version)
          //******************************************
          "css/cms-overrides.css"
        ],
        js: []
      },
      "reservations.margaritavilleatsea.com": {
        css: [
          //******************************************
          // One overrides file for BOTH uat/prod (branch controls which version)
          //******************************************
          "css/booking-overrides.css"
        ],
        js: [
          "js/booking-filter.js"
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

    var cdnUrl = function (path) {
      return CDN + encodeURIComponent(currentBranch()) + "/" + path;
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
        document.head.appendChild(link);
      } catch (e) {}
    };

    var ensureJs = function (id, src) {
      try {
        var el = document.getElementById(id);
        if (el && el.getAttribute("src") === src) return;

        // If removing a prior UAT-owned script, run cleanup first
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
        var host = (window.location.hostname || "").toLowerCase();
        var cfg = DOMAIN_ASSETS[host];

        // If not one of the supported hosts, do nothing (safe)
        if (!cfg) return;

        // CSS
        var css = cfg.css || [];
        for (var i = 0; i < css.length; i++) {
          //******************************************
          // deterministic id, based on index + filename
          //******************************************
          var id = "mode-css-" + i + "-" + css[i].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureCss(id, cdnUrl(css[i]));
        }

        // JS
        var js = cfg.js || [];
        for (var j = 0; j < js.length; j++) {
          var jid = "mode-js-" + j + "-" + js[j].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          ensureJs(jid, cdnUrl(js[j]));
        }

        //******************************************
        // Tell downstream scripts which mode is active
        //******************************************
        try {
          window.dispatchEvent(new CustomEvent("uat:mode", { detail: { mode: currentMode(), host: host } }));
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

    //******************************************
    // If no param, honor persisted localStorage and restore session for this tab
    //******************************************
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
