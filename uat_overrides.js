(function () {
  try {
    // Only show when URL has ?UAT=on
    var params = new URLSearchParams(window.location.search);
    if ((params.get("UAT") || "").toLowerCase() !== "on") return;

    var BADGE_ID = "uat-under-logo";
    var LOGO_SELECTOR = 'a.logo.property-no-own[href="/"]';
    // Proof the script executed
    localStorage.setItem("uat_run", "true");

    // Optional: also stamp a timestamp (handy for debugging)
    localStorage.setItem("uat_run_time", new Date().toISOString());
    function inject() {
      // prevent duplicates
      if (document.getElementById(BADGE_ID)) return;

      var logo = document.querySelector(LOGO_SELECTOR);
      if (!logo) return;

      // Create label
      var badge = document.createElement("div");
      badge.id = BADGE_ID;
      badge.textContent = "UAT MODE";
      badge.style.marginTop = "6px";
      badge.style.display = "inline-block";
      badge.style.padding = "4px 10px";
      badge.style.borderRadius = "999px";
      badge.style.background = "#C8102E";
      badge.style.color = "#fff";
      badge.style.fontWeight = "800";
      badge.style.fontSize = "12px";
      badge.style.letterSpacing = "0.5px";
      badge.style.lineHeight = "1";

      // Insert directly under the logo <a> (as a sibling)
      logo.insertAdjacentElement("afterend", badge);
    }

    // Try now
    inject();

    // If header/nav is rendered later or re-rendered, keep it applied
    var obs = new MutationObserver(function () {
      inject();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

  } catch (e) {}
})();

