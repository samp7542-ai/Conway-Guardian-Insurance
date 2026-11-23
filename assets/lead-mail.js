/* Sends lead emails in the branded "Design A" layout through EmailJS.
   Template "cg_lead" lives in the EmailJS dashboard (copy in tools/email-template.html).

   cgLeadMail({
     badge: "NEW QUOTE REQUEST", subject: "...", source: "Quote form",
     name, phone, email, location, prefers,
     tags: ["Auto", "Homeowners", {text: "Renews in 1–3 months", warm: true}],
     sections: [{ title: "Auto", rows: [["Vehicle 1", "2019 Honda CR-V"], ...] }, ...],
     footer: "Consent: ..."
   })  → Promise (rejects if not sent) */
(function () {
  const EMAILJS = { publicKey: "zdzJrKFf3t3HC6Air", service: "cg_gmail", template: "cg_lead" };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const digits = (v) => String(v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

  function tagsHTML(tags) {
    return (tags || []).filter(Boolean).map((t) => {
      const warm = typeof t === "object" && t.warm;
      const text = typeof t === "object" ? t.text : t;
      return '<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:99px;font-size:13px;font-weight:bold;' +
        (warm ? "background:#fdf2dc;color:#7a560c" : "background:#eef3fa;color:#0b2545") + '">' + esc(text) + "</span>";
    }).join("");
  }

  function buttonsHTML(name, phone, email) {
    const d = digits(phone);
    const first = esc(String(name || "").split(" ")[0] || "them");
    const btn = (href, label, solid) =>
      '<td style="padding:0 4px" width="33%"><a href="' + href + '" style="display:block;text-align:center;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 0;border-radius:10px;' +
      (solid ? "background:#0b2545;color:#ffffff;border:1.5px solid #0b2545" : "background:#ffffff;color:#0b2545;border:1.5px solid #cbd5e1") + '">' + label + "</a></td>";
    let cells = "";
    if (d.length === 10) cells += btn("tel:+1" + d, "Call " + first, true) + btn("sms:+1" + d, "Text", false);
    if (email) cells += btn("mailto:" + esc(email), "Reply by email", !cells);
    if (!cells) return "";
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px"><tr>' + cells + "</tr></table>";
  }

  function detailsHTML(sections) {
    return (sections || []).filter((s) => s && s.rows && s.rows.length).map((s) =>
      '<div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#7a560c;text-transform:uppercase;margin:18px 0 8px">' + esc(s.title) + "</div>" +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;font-size:14px">' +
      s.rows.map((r, i) =>
        "<tr>" +
        '<td valign="top" width="38%" style="padding:9px 12px;color:#475569;' + (i ? "border-top:1px solid #eef2f7" : "") + '">' + esc(r[0]) + "</td>" +
        '<td valign="top" style="padding:9px 12px;font-weight:bold;color:#0f172a;' + (i ? "border-top:1px solid #eef2f7" : "") + '">' + esc(r[1]) + "</td>" +
        "</tr>").join("") +
      "</table>").join("");
  }

  window.cgLeadMail = async function (lead) {
    const when = new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
    const params = {
      subject: lead.subject,
      badge: lead.badge || "NEW LEAD",
      when,
      source: lead.source || "Website",
      name: lead.name || "—",
      phone: lead.phone || "—",
      email: lead.email || "—",
      location: lead.location || "—",
      prefers: lead.prefers || "—",
      reply_to: lead.email || "",
      tags_html: tagsHTML(lead.tags),
      buttons_html: buttonsHTML(lead.name, lead.phone, lead.email),
      details_html: detailsHTML(lead.sections),
      footer: lead.footer || "Sent from conwayguardianins.com",
    };
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: EMAILJS.service, template_id: EMAILJS.template, user_id: EMAILJS.publicKey, template_params: params }),
    });
    if (!res.ok) throw new Error("EmailJS " + res.status + " " + (await res.text().catch(() => "")));
    return true;
  };
})();
