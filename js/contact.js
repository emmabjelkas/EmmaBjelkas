/* Emma Bjelkås – Contact form
   Sends via Web3Forms (https://web3forms.com) when WEB3FORMS_KEY is set,
   otherwise via FormSubmit's AJAX endpoint. Without JS the form posts
   straight to Web3Forms (action attribute + hidden access_key in contact.html). */
(function () {
  "use strict";

  var EMAIL = "emma.bjelkas@hotmail.com";

  // Web3Forms access key – get one for free at https://web3forms.com (just enter
  // your email, the key is mailed to you). The key is meant to be public, so it is
  // fine to have it here. Leave it empty to keep using FormSubmit.
  var WEB3FORMS_KEY = "ad72ca71-20cc-4b7c-a1f6-b64c84145d8b";

  var USE_WEB3FORMS = !!WEB3FORMS_KEY;
  var ENDPOINT = USE_WEB3FORMS ? "https://api.web3forms.com/submit" : "https://formsubmit.co/ajax/" + EMAIL;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var form = document.getElementById("contact-form");
  if (!form || !window.fetch) return;

  var success = document.getElementById("form-success");
  var alertBox = document.getElementById("form-alert");
  var status = document.getElementById("form-status");
  var resetBtn = document.getElementById("form-reset");
  var submitBtn = form.querySelector('button[type="submit"]');
  var btnLabel = form.querySelector(".contact-form__btn-label");
  var honey = form.querySelector('[name="botcheck"]');

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

  // kind: "failed"  – the service clearly refused the message
  //       "unknown" – no answer (slow service / dropped connection): the message
  //                   has often still been delivered, so don't tell people it failed
  function showError(kind) {
    var mail = '<a href="mailto:' + EMAIL + '">' + EMAIL + "</a>";
    alertBox.innerHTML =
      kind === "unknown"
        ? "<strong>We couldn't confirm that your message was sent.</strong>" +
          "The form service is slow right now, so it has most likely arrived anyway – please don't send it " +
          "again straight away. If you haven't heard from me within a few days, email me at " + mail + "."
        : "<strong>Your message couldn't be sent.</strong>" +
          "Please try again in a moment, or email me directly at " + mail + ".";
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

    var fields = {
      name: name,
      email: email,
      phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim(),
    };
    var subject = "New message from portfolio – " + name;
    var payload = USE_WEB3FORMS
      ? {
          access_key: WEB3FORMS_KEY,
          subject: subject,
          from_name: "Portfolio contact form",
          name: fields.name,
          email: fields.email, // Web3Forms uses this as reply-to
          phone: fields.phone,
          message: fields.message,
        }
      : {
          name: fields.name,
          email: fields.email,
          phone: fields.phone,
          message: fields.message,
          _subject: subject,
          _template: "table",
          _captcha: "false",
          _honey: "",
          _replyto: email,
        };

    setSending(true);
    // FormSubmit sometimes takes a long time to answer. Keep the visitor informed,
    // and give up waiting after 30 s (the message is usually delivered anyway).
    var slowTimer = setTimeout(function () {
      btnLabel.textContent = "Still sending…";
      status.textContent = "Still sending – this can take a little while.";
    }, 6000);
    var controller = window.AbortController ? new AbortController() : null;
    var abortTimer = controller
      ? setTimeout(function () {
          controller.abort();
        }, 30000)
      : null;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        // Read text and parse it ourselves (FormSubmit sends JSON as text/html).
        // Both services answer { success: true|"true" } or { success: false|"false" }.
        return res.text().then(function (text) {
          var data = null;
          try {
            data = JSON.parse(text);
          } catch (err) {}
          if (data && String(data.success) === "false") return "failed"; // explicit refusal (400, 429…)
          if (res.ok) return "sent"; // 2xx: delivered, even if the body was odd
          if (res.status >= 500) return "unknown"; // gateway timeout etc. – often delivered
          return "failed";
        });
      })
      .catch(function () {
        return "unknown"; // network drop or our 30 s timeout
      })
      .then(function (result) {
        clearTimeout(slowTimer);
        clearTimeout(abortTimer);
        setSending(false);
        if (result === "sent") {
          form.reset();
          showSuccess(email);
        } else {
          showError(result); // role="alert" announces it
        }
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

/* Copy-email button – fallback for visitors whose computer has no
   default mail app (then the mailto: link silently does nothing). */
(function () {
  "use strict";

  var btn = document.querySelector(".copy-email");
  if (!btn) return;
  var label = btn.querySelector(".copy-email__text");
  var status = document.getElementById("copy-email-status");
  var resetTimer;

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject();
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function show(ok) {
    clearTimeout(resetTimer);
    btn.classList.toggle("is-copied", ok);
    label.textContent = ok ? "Copied!" : "Press Ctrl+C";
    if (status) status.textContent = ok ? "Email address copied to clipboard" : "Couldn't copy – select the address and copy it manually";
    resetTimer = setTimeout(function () {
      btn.classList.remove("is-copied");
      label.textContent = "Copy";
      if (status) status.textContent = "";
    }, 2500);
  }

  btn.addEventListener("click", function () {
    copy(btn.getAttribute("data-copy")).then(
      function () {
        show(true);
      },
      function () {
        // Select the visible address so the visitor can copy it by hand
        var value = btn.parentNode.querySelector(".contact-way__value");
        if (value && window.getSelection) {
          var range = document.createRange();
          range.selectNodeContents(value);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        show(false);
      }
    );
  });
})();
