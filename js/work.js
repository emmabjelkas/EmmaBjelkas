/* Work page – client-side project filter (tabs + linkable #hash) */
(function () {
  "use strict";

  var tablist = document.querySelector(".tabs[role='tablist']");
  var list = document.getElementById("project-list");
  if (!tablist || !list) return;

  var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[role='tab']"));
  var items = Array.prototype.slice.call(list.querySelectorAll(".work-item"));
  var status = document.getElementById("filter-status");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = null;
  var leaveTimer;

  function matches(item, filter) {
    return filter === "all" || item.getAttribute("data-category") === filter;
  }

  // Keep the counts in the tabs in sync with the markup
  tabs.forEach(function (tab) {
    var filter = tab.getAttribute("data-filter");
    var count = tab.querySelector(".tab__count");
    if (count) {
      count.textContent = items.filter(function (item) {
        return matches(item, filter);
      }).length;
    }
  });

  function tabFor(filter) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute("data-filter") === filter) return tabs[i];
    }
    return null;
  }

  function showItems(filter, animate) {
    var visible = 0;
    items.forEach(function (item) {
      var show = matches(item, filter);
      item.hidden = !show;
      item.classList.remove("is-entering");
      item.style.animationDelay = "";
      if (show) {
        // projects that become visible are already "revealed"
        var reveal = item.querySelector(".reveal");
        if (reveal && animate) reveal.classList.add("is-visible");
        if (animate) {
          void item.offsetWidth; // restart animation
          item.style.animationDelay = visible * 70 + "ms";
          item.classList.add("is-entering");
        }
        visible++;
      }
    });
    return visible;
  }

  function select(filter, opts) {
    opts = opts || {};
    var tab = tabFor(filter) || tabFor("all");
    filter = tab.getAttribute("data-filter");
    if (filter === current) return;
    var first = current === null;
    current = filter;

    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    list.setAttribute("aria-labelledby", tab.id);

    if (opts.updateHash) {
      var hash = filter === "all" ? "" : "#" + filter;
      if (history.replaceState) {
        history.replaceState(null, "", location.pathname + location.search + hash);
      }
    }

    var animate = !first && !reduceMotion.matches;
    clearTimeout(leaveTimer);

    function swap() {
      list.classList.remove("is-leaving");
      var n = showItems(filter, animate);
      if (status && !first) {
        status.textContent = "Showing " + n + (n === 1 ? " project" : " projects");
      }
    }

    if (animate) {
      list.classList.add("is-leaving");
      leaveTimer = setTimeout(swap, 200);
    } else {
      swap();
    }
  }

  function filterFromHash() {
    var h = decodeURIComponent(location.hash.replace(/^#/, "")).toLowerCase();
    return tabFor(h) ? h : "all";
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      select(tab.getAttribute("data-filter"), { updateHash: true });
    });
    // Arrow-key navigation between tabs (automatic activation)
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      select(next.getAttribute("data-filter"), { updateHash: true });
    });
  });

  window.addEventListener("hashchange", function () {
    select(filterFromHash());
  });

  select(filterFromHash());
})();
