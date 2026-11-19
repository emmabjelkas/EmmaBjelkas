/* Emma Bjelkås – Portfolio · shared behaviour */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- Desktop "Projects" dropdown ---------- */
  document.querySelectorAll(".has-dropdown").forEach(function (wrap) {
    var trigger = wrap.querySelector("[aria-haspopup]");
    var menu = wrap.querySelector(".dropdown");
    var closeTimer;
    if (!trigger || !menu) return;

    function open() {
      clearTimeout(closeTimer);
      wrap.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }
    function close() {
      wrap.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      wrap.classList.contains("is-open") ? close() : open();
    });

    // Hover on devices that can hover
    if (window.matchMedia("(hover: hover)").matches) {
      wrap.addEventListener("mouseenter", open);
      wrap.addEventListener("mouseleave", function () {
        closeTimer = setTimeout(close, 120);
      });
    }

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) close();
    });
    wrap.addEventListener("focusout", function (e) {
      if (!wrap.contains(e.relatedTarget)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && wrap.classList.contains("is-open")) {
        close();
        trigger.focus();
      }
    });
  });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");
  if (toggle && mobileMenu) {
    var setMenu = function (isOpen) {
      document.body.classList.toggle("menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      mobileMenu.setAttribute("aria-hidden", String(!isOpen));
      if ("inert" in mobileMenu) mobileMenu.inert = !isOpen;
    };
    setMenu(false);
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    // Close after following an in-page link (e.g. #about)
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setMenu(false);
    });

    var subToggle = mobileMenu.querySelector(".mobile-menu__projects");
    var sub = document.getElementById("mobile-menu-projects");
    if (subToggle && sub) {
      subToggle.addEventListener("click", function () {
        var expanded = subToggle.getAttribute("aria-expanded") === "true";
        subToggle.setAttribute("aria-expanded", String(!expanded));
        sub.hidden = expanded;
      });
    }
  }

  /* ---------- Same-page anchor links ----------
     "index.html#about" should scroll (not reload) when we're already
     on the home page, whether it's served as "/" or "/index.html". */
  var normalizePath = function (p) {
    return p.replace(/index\.html$/, "");
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href*='#']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || normalizePath(url.pathname) !== normalizePath(location.pathname)) return;
    var target = url.hash.length > 1 && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    if (document.body.classList.contains("menu-open") && toggle) toggle.click();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // wait a frame so the body is scrollable again after closing the menu
    requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    if (history.pushState) history.pushState(null, "", url.hash);
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
