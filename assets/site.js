/* Conway Guardian Insurance Group — shared settings and add-ons.
   Used by the home page and every landing page.

   To switch something on, paste its ID between the quotes and push:
   - GA4_ID:        Google Analytics 4 measurement ID, looks like "G-XXXXXXXXXX"
   - META_PIXEL_ID: Facebook / Instagram ads pixel ID, a long number
   - TAWK_ID:       Tawk.to live chat, the part after tawk.to/chat/ in the
                    widget code, looks like "64ab.../1h..." (property/widget)
   - REVIEW_URL:    Google review link from her Google Business Profile
                    ("Ask for reviews" → copy link). Shows "Leave us a review" links.
   Anything left blank stays off. */
window.CG = {
  PHONE: "803-768-0594",
  LEAD_EMAIL: "conway@guardianinsagency.com",
  GA4_ID: "",
  META_PIXEL_ID: "",
  TAWK_ID: "",
  REVIEW_URL: "",
};

(function () {
  const C = window.CG;
  const add = (src, attrs) => { const s = document.createElement("script"); s.async = true; s.src = src; Object.assign(s, attrs || {}); document.head.appendChild(s); };

  // Google Analytics 4
  if (C.GA4_ID) {
    add("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.GA4_ID));
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", C.GA4_ID);
  }

  // Meta (Facebook / Instagram) pixel
  if (C.META_PIXEL_ID) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", C.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  // Tawk.to live chat
  if (C.TAWK_ID) {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    add("https://embed.tawk.to/" + C.TAWK_ID, { charset: "UTF-8", crossOrigin: "anonymous" });
  }

  // Report a conversion to whichever tools are switched on.
  // kind: "quote_started", "quote_sent", "contact_sent", "referral_sent", "partner_sent", "call_click", "text_click"
  window.cgTrack = function (kind, details) {
    try {
      if (window.gtag) window.gtag("event", kind, details || {});
      if (window.fbq) {
        if (kind === "quote_sent" || kind.endsWith("_sent")) window.fbq("track", "Lead", { content_name: kind });
        else if (kind === "call_click" || kind === "text_click") window.fbq("track", "Contact", { content_name: kind });
      }
    } catch (e) { /* tracking must never break the site */ }
  };

  // Count taps on phone and text links anywhere on the site
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="sms:"]');
    if (a) window.cgTrack(a.href.startsWith("sms:") ? "text_click" : "call_click");
  });

  // Show "Leave us a review" links once REVIEW_URL is set
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-review-link]").forEach((a) => {
      if (C.REVIEW_URL) { a.href = C.REVIEW_URL; a.hidden = false; } else a.hidden = true;
    });
  });
})();
