/* Emma Bjelkås – Contact form
   Sends via FormSubmit's AJAX endpoint. Without JS the form posts
   straight to https://formsubmit.co/<email> (action attribute). */
(function () {
  "use strict";

  var EMAIL = "emma.bjelkas@hotmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var form = document.getElementById("contact-form");
  if (!form || !window.fetch) return;

  var success = document.getElementById("form-success");
  var alertBox = document.getElementById("form-alert");
  var status = document.getElementById("form-status");
  var resetBtn = document.getElementById("form-reset");
  var submitBtn = form.querySelector('button[type="submit"]');
  var btnLabel = form.querySelector(".contact-form__btn-label");
  var honey = form.querySelector('[name="_honey"]');

  // JS handles validation with inline messages instead of browser bubbles
  form.setAttribute("novalidate", "");

  var rules = {
    name: function (v) {
      return v ? "" : "Enter your name.";
    },
    email: function (v) {
      if (!v) return "Enter your email address.";
      return EMAIL_RE.test(v) ? "" : "Enter a valid email address.";
    },
    message: function (v) {
      return v ? "" : "Write a message.";
    },
  };

  function setError(input, msg) {
    var err = document.getElementById(input.id + "-error");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", err.id);
      err.textContent = msg;
      err.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      err.textContent = "";
      err.hidden = true;
    }
  }

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var msg = rule(input.value.trim());
    setError(input, msg);
    return !msg;
  }

  // Re-validate live once a field has been flagged, and on blur once touched
  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") validateField(input);
    });
    input.addEventListener("blur", function () {
      if (input.value.trim() && input.dataset.touched) validateField(input);
    });
    input.addEventListener("change", function () {
      input.dataset.touched = "1";
    });
  });

  function setSending(on) {
    form.classList.toggle("is-sending", on);
    submitBtn.disabled = on;
    form.setAttribute("aria-busy", String(on));
    btnLabel.textContent = on ? "Sending…" : "Send message";
    status.textContent = on ? "Sending your message…" : "";
  }

  function showError() {
    alertBox.innerHTML =
      "<strong>Your message couldn't be sent.</strong>" +
      "Please try again in a moment, or email me directly at " +
      '<a href="mailto:' + EMAIL + '">' + EMAIL + "</a>.";
    alertBox.hidden = false;
  }

  function showSuccess(email) {
    var who = success.querySelector("[data-success-email]");
    if (who) who.textContent = email ? "at " + email : "by email";
    form.hidden = true;
    success.hidden = false;
    status.textContent = "Thank you! Your message has been sent.";
    success.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    alertBox.hidden = true;

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      input.dataset.touched = "1";
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();

    // Honeypot filled → most likely a bot: pretend it worked
    if (honey && honey.value) {
      showSuccess(email);
      return;
    }

    var payload = {
      name: name,
      email: email,
      phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim(),
      _subject: "New message from portfolio – " + name,
      _template: "table",
      _captcha: "false",
      _honey: "",
      _replyto: email,
    };

    setSending(true);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return Promise.resolve(res.json ? res.json() : {}).then(function (data) {
          var ok = res.ok && data && String(data.success) === "true";
          if (!ok) throw new Error((data && data.message) || "Request failed");
        });
      })
      .then(function () {
        setSending(false);
        form.reset();
        showSuccess(email);
      })
      .catch(function () {
        setSending(false);
        showError(); // role="alert" announces it
      });
  });

  resetBtn.addEventListener("click", function () {
    success.hidden = true;
    form.hidden = false;
    status.textContent = "";
    Object.keys(rules).forEach(function (name) {
      delete form.elements[name].dataset.touched;
    });
    form.elements.name.focus();
  });
})();
