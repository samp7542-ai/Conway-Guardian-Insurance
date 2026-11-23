/* Quick Auto Estimate — /auto-estimate/
   One question per screen → contact info → estimated monthly range → book a call.
   Sends two emails to the agency: the estimate lead, then the call request (if they book one).

   ⚙️ PRICING — edit these to match what her carriers really charge.
   BASE is a typical monthly price for ONE vehicle, adult driver (25–64), good credit,
   clean record. Every answer multiplies it. The page shows BASE × factors, ± SPREAD. */
const EST = {
  BASE: { minimum: 95, full: 190 },        // $/month for one vehicle
  SPREAD: 0.3,                              // show ±30% around the middle
  AGE: { "Under 21": 2.2, "21–24": 1.45, "25–64": 1.0, "65+": 1.05 },
  CREDIT: { "Excellent": 0.85, "Good": 1.0, "Fair": 1.15, "Poor": 1.35, "Not sure": 1.1 },
  RECORD: { "None": 1.0, "1 ticket": 1.2, "1 accident or claim": 1.35, "2 or more": 1.6, "DUI or SR-22 needed": 1.75 },
  EXTRA_VEHICLE: 0.9,                       // each extra vehicle costs about 90% of the first
};

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.CG;
  const digits = (v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const money = (n) => "$" + (Math.round(n / 5) * 5).toLocaleString("en-US");
  const root = $("#est");
  if (!root) return;

  const screens = $$(".est-screen", root);
  let i = 0, result = null, sentLead = false;

  function answers() {
    const pick = (n) => { const x = $('input[name="' + n + '"]:checked', root); return x ? x.value : ""; };
    return {
      zip: $("#est-zip").value.trim(), age: pick("age"), vehicles: pick("vehicles"), coverage: pick("coverage"),
      credit: pick("credit"), record: pick("record"),
      first: $("#est-first").value.trim(), phone: $("#est-phone").value.trim(), consent: $("#est-consent").checked,
    };
  }

  function estimate(a) {
    const cov = a.coverage === "State minimum" ? "minimum" : "full";
    const nVeh = a.vehicles === "4+" ? 4 : parseInt(a.vehicles, 10) || 1;
    const vehFactor = 1 + (nVeh - 1) * EST.EXTRA_VEHICLE;
    const mid = EST.BASE[cov] * (EST.AGE[a.age] || 1) * (EST.CREDIT[a.credit] || 1) * (EST.RECORD[a.record] || 1) * vehFactor;
    return { low: mid * (1 - EST.SPREAD), high: mid * (1 + EST.SPREAD), cov };
  }

  function show(n) {
    i = n;
    screens.forEach((s, k) => { s.hidden = k !== i; });
    const total = screens.length - 1; // last screen is the result
    $("#est-count").textContent = i < total ? "Question " + (i + 1) + " of " + total : "Your estimate";
    $("#est-bar").style.width = Math.round(((i + 1) / (total + 1)) * 100) + "%";
    $("#est-back").hidden = i === 0 || i === total;
    $("#est-next").hidden = i >= total - 1;
    const scr = screens[i];
    const h = $("h2, legend", scr);
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    $("#est-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function valid(scr) {
    let ok = true;
    $$("[data-need]", scr).forEach((g) => {
      const name = g.dataset.need;
      let bad;
      if (name === "zip") {
        const v = $("#est-zip").value.trim();
        bad = !/^\d{5}$/.test(v);
        const sc = $("#est-zip-note");
        sc.hidden = bad || /^29\d{3}$/.test(v);
      } else if (name === "first") bad = !$("#est-first").value.trim();
      else if (name === "phone") bad = digits($("#est-phone").value).length !== 10;
      else if (name === "consent") bad = !$("#est-consent").checked;
      else bad = !$('input[name="' + name + '"]:checked', root);
      g.classList.toggle("bad", bad);
      const ctl = $("input", g);
      if (ctl && ctl.type !== "radio") ctl.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) ok = false;
    });
    if (!ok) { const f = $(".bad input", scr); if (f && f.type !== "radio") f.focus(); }
    return ok;
  }

  async function post(data) {
    const res = await fetch("https://formsubmit.co/ajax/" + C.LEAD_EMAIL, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ _template: "table", _captcha: "false" }, data)),
    });
    if (!res.ok) throw new Error(res.status);
    const out = await res.json().catch(() => null);
    if (!out || !(out.success === true || out.success === "true")) throw new Error("not sent");
  }

  function leadRows(a, r) {
    return {
      "Name": a.first, "Phone": a.phone, "ZIP": a.zip, "Youngest driver": a.age, "Vehicles": a.vehicles,
      "Coverage wanted": a.coverage, "Credit (self-reported)": a.credit, "Accidents / tickets / claims (3 yrs)": a.record,
      "Estimate shown": money(r.low) + " – " + money(r.high) + " per month (" + (r.cov === "minimum" ? "state minimum" : "full coverage") + ")",
      "Consent to contact": "Yes — agreed to calls, texts & email",
    };
  }

  // Phone formatting
  $("#est-phone").addEventListener("input", (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const d = (raw.length === 11 && raw[0] === "1" ? raw.slice(1) : raw).slice(0, 10);
    e.target.value = d.length > 6 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : d.length > 3 ? "(" + d.slice(0, 3) + ") " + d.slice(3) : d;
  });
  root.addEventListener("change", (e) => { const g = e.target.closest(".bad"); if (g) g.classList.remove("bad"); });
  root.addEventListener("input", (e) => { const g = e.target.closest(".bad"); if (g) g.classList.remove("bad"); });

  $("#est-next").addEventListener("click", () => { if (valid(screens[i])) show(i + 1); });
  $("#est-back").addEventListener("click", () => show(Math.max(0, i - 1)));
  // Picking an answer on a tap-only screen moves on automatically
  root.addEventListener("change", (e) => {
    if (i < screens.length - 2 && e.target.type === "radio" && e.target.closest(".est-screen") === screens[i]) {
      setTimeout(() => { if (valid(screens[i])) show(i + 1); }, 220);
    }
  });
  $("#est-zip").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#est-next").click(); } });

  // See my estimate: send the lead, then show the range
  $("#est-see").addEventListener("click", async () => {
    const scr = screens[i];
    if (!valid(scr)) return;
    const a = answers();
    const r = estimate(a);
    result = { a, r };
    const btn = $("#est-see"), err = $("#est-err");
    err.hidden = true;
    if ($('[name="cg_hp"]', root).value) { err.hidden = false; return; }
    if (!sentLead) {
      btn.disabled = true; btn.textContent = "One moment…";
      try {
        await post(Object.assign({ _subject: "Auto estimate lead: " + a.first + " — " + a.phone + " (SC " + a.zip + ")" }, leadRows(a, r)));
        sentLead = true;
        window.cgTrack && window.cgTrack("estimate_sent");
      } catch (x) {
        btn.disabled = false; btn.textContent = "See my estimate →";
        err.hidden = false; return;
      }
    }
    $("#est-low").textContent = money(r.low);
    $("#est-high").textContent = money(r.high);
    $("#est-cov").textContent = r.cov === "minimum" ? "state minimum coverage" : "full coverage";
    $("#est-name").textContent = a.first;
    $("#est-cov-note").hidden = a.coverage !== "Not sure";
    show(screens.length - 1);
  });

  // Booking: next 7 weekdays
  const days = $("#est-days");
  const d = new Date();
  let added = 0;
  while (added < 7) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.insertAdjacentHTML("beforeend", '<label class="chip"><input type="radio" name="day" value="' + label + '" />' + label + "</label>");
    added++;
  }
  $("#est-book").addEventListener("click", async () => {
    const day = $('input[name="day"]:checked', root), time = $('input[name="time"]:checked', root);
    $("#est-day-g").classList.toggle("bad", !day);
    $("#est-time-g").classList.toggle("bad", !time);
    if (!day || !time || !result) return;
    const btn = $("#est-book"), err = $("#est-book-err");
    btn.disabled = true; btn.textContent = "Booking…"; err.hidden = true;
    try {
      await post(Object.assign({
        _subject: "📞 Call requested: " + result.a.first + " — " + day.value + ", " + time.value,
        "Call requested for": day.value + ", " + time.value + " (Eastern)",
        "Notes from customer": $("#est-notes").value.trim() || "—",
      }, leadRows(result.a, result.r)));
      window.cgTrack && window.cgTrack("call_booked");
      $("#est-booking").hidden = true;
      const done = $("#est-booked");
      $("#est-when").textContent = day.value + ", " + time.value;
      done.hidden = false; done.setAttribute("tabindex", "-1"); done.focus();
    } catch (x) {
      btn.disabled = false; btn.textContent = "Request this call";
      err.hidden = false;
    }
  });

  show(0);
})();
