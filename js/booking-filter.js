(function () {
  //******************************************
  // CONFIG
  //******************************************
  var BTN_SELECTOR = "div.btn[role='button']"; // your month pills
  var APPLY_SELECTOR = "button, .btn, [role='button']"; // we'll hide by text match
  var APPLY_TEXT_REGEX = /^\s*apply\s*$/i;

  //******************************************
  // NEW: Year tabs selector (2026 / 2027 buttons)
  //******************************************
  var YEAR_TAB_SELECTOR = ".active-dep-dates-drpdwn-btn.btn";

  // Map the visible pill text -> month number used in API/URL (YYYY/M)
  var MONTH_MAP = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  };

  //******************************************
  // Helpers
  //******************************************
  function log() {
    try {
      console.log.apply(console, ["[month-override]"].concat([].slice.call(arguments)));
    } catch (e) {}
  }

  function getMonthLabel(el) {
    // textContent includes the check SVG sometimes; take first token
    var txt = (el && el.textContent ? el.textContent : "").trim().toUpperCase();
    // "SEP" or "SEP ✓" -> "SEP"
    var token = txt.split(/\s+/)[0];
    return token;
  }

  function parseYearMonthParam(val) {
    if (!val) return [];
    return val
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .filter(function (s) { return /^\d{4}\/\d{1,2}$/.test(s); });
  }

  function inferYear(existingYearMonths) {
    // Try to infer from existing selected months in URL, else use current year
    if (existingYearMonths && existingYearMonths.length) {
      var m = existingYearMonths[0].match(/^(\d{4})\//);
      if (m) return parseInt(m[1], 10);
    }
    return new Date().getFullYear();
  }

  //******************************************
  // NEW: Detect active year tab (border-bottom)
  //******************************************
  function getActiveYearFromTabs() {
    var tabs = document.querySelectorAll(YEAR_TAB_SELECTOR);
    if (!tabs || !tabs.length) return null;

    for (var i = 0; i < tabs.length; i++) {
      var el = tabs[i];

      // Prefer computed style (most reliable vs inline style string)
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;

      var borderStyle = cs ? cs.borderBottomStyle : (el.style ? el.style.borderBottomStyle : "");
      var borderWidth = cs ? cs.borderBottomWidth : (el.style ? el.style.borderBottomWidth : "");
      var borderColor = cs ? cs.borderBottomColor : (el.style ? el.style.borderBottomColor : "");

      var isActive =
        (borderStyle && borderStyle !== "none") &&
        (borderWidth && borderWidth !== "0px") &&
        (borderColor && borderColor !== "rgba(0, 0, 0, 0)");

      if (isActive) {
        var yearTxt = (el.textContent || "").trim();
        var yearNum = parseInt(yearTxt, 10);
        if (!isNaN(yearNum)) return yearNum;
      }

      // Fallback for cases where computed style doesn't reflect the inline border-bottom
      var inline = (el.getAttribute("style") || "").toLowerCase();
      if (inline.indexOf("border-bottom") !== -1) {
        var yearTxt2 = (el.textContent || "").trim();
        var yearNum2 = parseInt(yearTxt2, 10);
        if (!isNaN(yearNum2)) return yearNum2;
      }
    }

    return null;
  }

  function toggleYearMonthInUrl(targetYearMonth) {
    var url = new URL(window.location.href);
    var current = parseYearMonthParam(url.searchParams.get("year_month"));
    var has = current.indexOf(targetYearMonth) !== -1;

    var next = has
      ? current.filter(function (x) { return x !== targetYearMonth; })
      : current.concat([targetYearMonth]);

    // de-dupe while preserving order
    var seen = {};
    next = next.filter(function (x) {
      if (seen[x]) return false;
      seen[x] = true;
      return true;
    });

    if (next.length) url.searchParams.set("year_month", next.join(","));
    else url.searchParams.delete("year_month");

    return url.toString();
  }

  //******************************************
  // 1) Force "disabled" months clickable (CSS)
  //******************************************
  function injectCss() {
    var css = ""
      + BTN_SELECTOR + "{ pointer-events:auto !important; cursor:pointer !important; } \n"
      + BTN_SELECTOR + "[style*='pointer-events: none']{ pointer-events:auto !important; } \n";

    var style = document.createElement("style");
    style.setAttribute("data-month-override", "true");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  //******************************************
  // 2) Hide "Apply" button (by visible text)
  //******************************************
  function hideApplyButton() {
    var nodes = document.querySelectorAll(APPLY_SELECTOR);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = (el.textContent || "").trim();
      if (APPLY_TEXT_REGEX.test(t)) {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        log("Hid Apply button:", el);
      }
    }
  }

  //******************************************
  // 3) Click handler: ALWAYS allow month click
  //    Update URL year_month and reload
  //******************************************
  function onDocumentClickCapture(e) {
    // Capture phase so we get it even if React stops propagation later.
    var target = e.target;

    // Find the pill element
    var pill = target && target.closest ? target.closest(BTN_SELECTOR) : null;
    if (!pill) return;

    var label = getMonthLabel(pill);
    var monthNum = MONTH_MAP[label];

    // Only handle month labels
    if (!monthNum) return;

    // Stop React default behavior; we're taking over URL-as-state.
    e.preventDefault();
    e.stopPropagation();

    var url = new URL(window.location.href);
    var currentYearMonths = parseYearMonthParam(url.searchParams.get("year_month"));

    //******************************************
    // UPDATED: year comes from active year tab (2026/2027),
    // fallback to URL inference if tabs aren't found
    //******************************************
    var activeTabYear = getActiveYearFromTabs();
    var year = activeTabYear || inferYear(currentYearMonths);

    // Build target "YYYY/M" (no leading zero, matches your payload)
    var ym = year + "/" + monthNum;

    var nextUrl = toggleYearMonthInUrl(ym);
    log("Month click:", label, "->", ym, "ActiveTabYear:", activeTabYear, "Next URL:", nextUrl);

    // Reload with updated params so React rehydrates correctly.
    window.location.href = nextUrl;
  }

  //******************************************
  // 4) MutationObserver: React may re-render & re-disable.
  //    Keep CSS + Apply hidden.
  //******************************************
  function watchDom() {
    var obs = new MutationObserver(function () {
      hideApplyButton();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    injectCss();
    hideApplyButton();

    // Capture click events
    document.addEventListener("click", onDocumentClickCapture, true);

    // Keep Apply hidden after rerenders
    watchDom();

    log("Installed. Disabled months are now clickable; clicking updates year_month URL and reloads.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
