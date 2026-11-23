/* Short lead forms on the landing pages (Spanish, referral, partner).
   Each form has data-lead="<kind>" and data-subject="<email subject>".
   Required fields have the "required" attribute; errors show in Spanish on lang="es" pages. */
(function () {
  const es = document.documentElement.lang === "es";
  const T = es
    ? { req: "Este campo es obligatorio.", phone: "Ingrese un número de 10 dígitos.", email: "Ingrese un correo válido.", consent: "Marque la casilla para continuar.", fail: "No pudimos enviar su solicitud. Inténtelo de nuevo o llame al ", sending: "Enviando…" }
    : { req: "This field is required.", phone: "Enter a 10-digit phone number.", email: "Enter a valid email address.", consent: "Please check the box to continue.", fail: "We couldn't send your request. Please try again or call ", sending: "Sending…" };
  const digits = (v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); // drop a leading +1
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  // Format phone numbers as (803) 555-0123 while typing
  document.querySelectorAll('input[type="tel"]').forEach((i) => i.addEventListener("input", () => {
    const raw = i.value.replace(/\D/g, "");
    const d = (raw.length === 11 && raw[0] === "1" ? raw.slice(1) : raw).slice(0, 10);
    i.value = d.length > 6 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : d.length > 3 ? "(" + d.slice(0, 3) + ") " + d.slice(3) : d;
  }));

  document.querySelectorAll("form[data-lead]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let first = null;
      const mark = (field, bad, msg) => {
        field.classList.toggle("bad", bad);
        const err = field.querySelector(".err");
        if (err && msg) err.textContent = msg;
        const inp = field.querySelector("input, select, textarea");
        if (inp) inp.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad && !first) first = inp;
      };
      form.querySelectorAll(".field").forEach((f) => {
        const inp = f.querySelector("input, select, textarea");
        if (!inp) return;
        const v = inp.value.trim();
        if (inp.required && !v) return mark(f, true, T.req);
        if (inp.type === "tel" && v && digits(v).length !== 10) return mark(f, true, T.phone);
        if (inp.type === "email" && v && !emailOk(v)) return mark(f, true, T.email);
        mark(f, false);
      });
      const consent = form.querySelector(".check input[required]");
      const cErr = form.querySelector(".check-err");
      if (consent) {
        consent.closest(".check").classList.toggle("bad", !consent.checked);
        consent.setAttribute("aria-invalid", consent.checked ? "false" : "true");
        if (cErr) cErr.textContent = consent.checked ? "" : T.consent;
        if (!consent.checked && !first) first = consent;
      }
      if (first) { first.focus(); return; }

      const btn = form.querySelector('button[type="submit"]');
      const msg = form.querySelector(".form-msg");
      const fail = () => { msg.className = "form-msg err"; msg.innerHTML = T.fail + '<a href="tel:' + window.CG.PHONE.replace(/\D/g, "") + '">' + window.CG.PHONE + "</a>."; };
      // Spam trap: real people never fill the hidden field
      if (form.querySelector('[name="cg_hp"]').value) { fail(); return; }

      // Build the lead: who to contact goes in the header, everything else in the details table
      const lead = { badge: form.dataset.badge, subject: form.dataset.subject, source: document.title.split("|")[0].trim(), sections: [] };
      const rows = [];
      form.querySelectorAll("[name]").forEach((el) => {
        if (el.name === "cg_hp" || el.type === "checkbox") return;
        const v = el.value.trim();
        if (!v) return;
        if (el.dataset.primary) lead[el.dataset.primary] = v;
        rows.push([el.dataset.label || el.name, v]);
      });
      if (lead.name) lead.subject += " — " + lead.name;
      const sel = form.querySelector('select[name="coverage"], select[name="c_cov"], select[name="seguro"]');
      if (sel && sel.value) lead.tags = [sel.value];
      lead.sections.push({ title: "Details", rows });
      if (consent) lead.footer = "Consent: " + consent.closest(".check").textContent.trim();

      const label = btn.textContent;
      btn.disabled = true; btn.textContent = T.sending; msg.className = "form-msg";
      try {
        await window.cgSend(lead);
        window.cgTrack && window.cgTrack(form.dataset.lead + "_sent");
        form.hidden = true;
        const done = document.getElementById(form.dataset.done);
        done.style.display = "block"; done.setAttribute("tabindex", "-1"); done.focus();
      } catch (err) {
        btn.disabled = false; btn.textContent = label;
        fail();
      }
    });
  });
})();
