/* Graphic art page – accessible animated lightbox */
(function () {
  "use strict";

  var dialog = document.getElementById("lightbox");
  var triggers = Array.prototype.slice.call(document.querySelectorAll(".artwork[data-src]"));
  if (!dialog || !triggers.length || typeof dialog.showModal !== "function") return;

  var root = document.documentElement;
  var img = dialog.querySelector(".lightbox__img");
  var title = dialog.querySelector(".lightbox__title");
  var type = dialog.querySelector(".lightbox__type");
  var text = dialog.querySelector(".lightbox__text");
  var indexEl = dialog.querySelector("[data-lightbox-index]");
  var totalEl = dialog.querySelector("[data-lightbox-total]");
  var prevBtn = dialog.querySelector(".lightbox__prev");
  var nextBtn = dialog.querySelector(".lightbox__next");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var current = 0;
  var opener = null;
  var closing = false;
  var swapTimer;

  totalEl.textContent = triggers.length;

  function data(i) {
    var t = triggers[i];
    return {
      src: t.getAttribute("data-src"),
      alt: t.getAttribute("data-alt") || t.getAttribute("data-title"),
      title: t.getAttribute("data-title"),
      type: t.getAttribute("data-type")
    };
  }

  function render(i) {
    var d = data(i);
    img.src = d.src;
    img.alt = d.alt;
    title.textContent = d.title;
    type.textContent = d.type;
    indexEl.textContent = i + 1;
  }

  // Preload neighbours so prev/next feels instant
  function preload(i) {
    var n = triggers.length;
    [(i + 1) % n, (i - 1 + n) % n].forEach(function (j) {
      var p = new Image();
      p.src = data(j).src;
    });
  }

  function go(delta) {
    var n = triggers.length;
    current = (current + delta + n) % n;
    clearTimeout(swapTimer);
    if (reduceMotion.matches) {
      render(current);
    } else {
      img.classList.add("is-swapping");
      text.classList.add("is-swapping");
      swapTimer = setTimeout(function () {
        render(current);
        var done = function () {
          img.classList.remove("is-swapping");
          text.classList.remove("is-swapping");
        };
        if (img.complete) setTimeout(done, 20);
        else {
          img.onload = img.onerror = function () {
            img.onload = img.onerror = null;
            done();
          };
        }
      }, 180);
    }
    preload(current);
  }

  function lockScroll() {
    var gap = window.innerWidth - root.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + "px";
    root.classList.add("lightbox-open");
  }
  function unlockScroll() {
    root.classList.remove("lightbox-open");
    document.body.style.paddingRight = "";
  }

  function open(i, trigger) {
    current = i;
    opener = trigger || triggers[i];
    closing = false;
    img.classList.remove("is-swapping");
    text.classList.remove("is-swapping");
    render(i);
    lockScroll();
    dialog.showModal();
    // flush styles so the closed state is painted, then transition in
    void dialog.offsetWidth;
    dialog.classList.add("is-open");
    preload(i);
  }

  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.remove("is-open");
    var finish = function () {
      if (!closing) return;
      closing = false;
      dialog.close();
      unlockScroll();
      if (opener) opener.focus();
    };
    if (reduceMotion.matches) finish();
    else setTimeout(finish, 300);
  }

  triggers.forEach(function (t, i) {
    t.addEventListener("click", function () {
      open(i, t);
    });
  });

  prevBtn.addEventListener("click", function () {
    go(-1);
  });
  nextBtn.addEventListener("click", function () {
    go(1);
  });

  // Backdrop ("Skugga") and close button
  dialog.addEventListener("click", function (e) {
    if (e.target.closest("[data-lightbox-close]") || e.target === dialog) close();
  });

  // Esc → animated close instead of the instant native one
  dialog.addEventListener("cancel", function (e) {
    e.preventDefault();
    close();
  });

  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      // keep focus inside the panel
      var f = Array.prototype.slice.call(dialog.querySelectorAll("button:not([disabled])"));
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Swipe left/right on touch screens
  var startX = null;
  dialog.addEventListener(
    "touchstart",
    function (e) {
      startX = e.touches.length === 1 ? e.touches[0].clientX : null;
    },
    { passive: true }
  );
  dialog.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    startX = null;
  });

  // Deep link: art.html#pink-paint opens that artwork
  function openFromHash() {
    var id = location.hash.replace(/^#/, "");
    if (!id) return;
    for (var i = 0; i < triggers.length; i++) {
      var item = triggers[i].closest("[id]");
      if (item && item.id === id) {
        if (!dialog.open) open(i, triggers[i]);
        return;
      }
    }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
