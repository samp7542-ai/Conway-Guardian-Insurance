#!/usr/bin/env python3
"""Builds the landing pages (one folder per page with an index.html), sitemap.xml and robots.txt.

Run from the repo root:  python3 tools/build_pages.py
Edit the PAGES content below, re-run, commit. The home page (index.html) is not touched.
"""
import html, json, os, datetime

SITE = "https://conwayguardianins.com"
PHONE = "803-768-0594"
TEL = "+18037680594"
EMAIL = "conway@guardianinsagency.com"
LICENSE = "License #[000000]"  # fill in with the agency's SC license number
NAME = "Conway Guardian Insurance Group"
TODAY = datetime.date.today().isoformat()

E = html.escape


def head(p):
    url = SITE + "/" + p["slug"] + "/"
    ld = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": p["title"],
        "url": url,
        "inLanguage": p.get("lang", "en"),
        "isPartOf": {"@type": "WebSite", "name": NAME, "url": SITE + "/"},
        "about": {"@type": "InsuranceAgency", "@id": SITE + "/#agency", "name": NAME},
    }
    faq = p.get("faq")
    extra = ""
    if faq:
        extra = '\n<script type="application/ld+json">' + json.dumps({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq],
        }, ensure_ascii=False) + "</script>"
    alt = ""
    if p.get("lang") == "es":
        alt = f'\n<link rel="alternate" hreflang="es" href="{url}" />\n<link rel="alternate" hreflang="en" href="{SITE}/" />\n<link rel="alternate" hreflang="x-default" href="{SITE}/" />'
    return f"""<!DOCTYPE html>
<html lang="{p.get('lang', 'en')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{E(p['title'])}</title>
<meta name="description" content="{E(p['desc'])}" />
<link rel="canonical" href="{url}" />{alt}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{NAME}" />
<meta property="og:title" content="{E(p['title'])}" />
<meta property="og:description" content="{E(p['desc'])}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{SITE}/assets/og-share-2026.jpg" />
<meta name="twitter:card" content="summary" />
<link rel="icon" type="image/png" href="/assets/favicon-64.png" />
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/pages.css" />
<script src="/assets/site.js" defer></script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>{extra}
</head>
<body>
"""


def chrome_top(p):
    es = p.get("lang") == "es"
    skip = "Saltar al contenido" if es else "Skip to content"
    top_l = "Agencia de seguros independiente · Carolina del Sur" if es else "Independent insurance agency · Proudly Serving South Carolina"
    top_r = "¿Preguntas? Llame al" if es else "Questions? Call"
    quote = "Pedir cotización" if es else "Get a Quote"
    quote_href = "#solicitud" if es else "/#quote"
    return f"""<a class="skip" href="#main">{skip}</a>
<div class="topbar"><div class="wrap"><span>{top_l}</span><span>{top_r} <a href="tel:{TEL}">{PHONE}</a></span></div></div>
<header class="site"><div class="wrap">
  <a class="brand" href="/" aria-label="{NAME} — {'inicio' if es else 'home'}"><img src="/assets/logo-512.webp" alt="" width="44" height="44" /><span><b>Conway Guardian</b><small>Insurance Group</small></span></a>
  <div class="hdr-actions"><a class="hdr-phone" href="tel:{TEL}">{PHONE}</a><a class="btn btn-gold" href="{quote_href}">{quote}</a></div>
</div></header>
<main id="main">
"""


def chrome_bottom(p):
    es = p.get("lang") == "es"
    call, text, quote = ("Llamar", "Mensaje", "Cotizar") if es else ("Call", "Text", "Get a quote")
    quote_href = "#solicitud" if es else p.get("quote_href", "/#quote")
    js = '<script src="/assets/lead-mail.js" defer></script>\n' if (p.get("form") or p.get("script")) else ""
    if p.get("form"):
        js += '<script src="/assets/pages.js" defer></script>\n'
    if p.get("script"):
        js += f'<script src="{p["script"]}" defer></script>\n'
    if es:
        foot_l = "Agencia de seguros independiente en Carolina del Sur"
        links = [("/", "Inicio"), ("/#auto", "Auto"), ("/#homeowners", "Casa"), ("/#renters", "Inquilino"), ("/#landlord", "Propiedad de alquiler"), ("/#business", "Negocio"), ("/sr22-insurance-sc/", "SR-22"), ("/", "English"), ("/#privacy", "Privacidad")]
        review = "★ Déjenos una reseña en Google"
        disc = "La cobertura está sujeta a los términos, condiciones y exclusiones de la póliza emitida. Las cotizaciones no están garantizadas y pedir una cotización no activa ninguna cobertura."
        nav_l = "Pie de página"
    else:
        foot_l = "Independent insurance agency serving South Carolina"
        links = [("/", "Home"), ("/#auto", "Auto"), ("/#homeowners", "Homeowners"), ("/#renters", "Renters"), ("/#landlord", "Landlord"), ("/#business", "Business"), ("/auto-estimate/", "Auto estimate"), ("/sr22-insurance-sc/", "SR-22 insurance"), ("/cheap-car-insurance-sc/", "Affordable car insurance"), ("/landlord-insurance-sc/", "Landlord insurance SC"), ("/refer/", "Refer a friend"), ("/partners/", "Partners"), ("/es/", "Español"), ("/#privacy", "Privacy policy")]
        review = "★ Leave us a Google review"
        disc = "Coverage is subject to the terms, conditions and exclusions of the policy issued. Coverage, discounts and carrier availability vary. Quotes are not guaranteed, and requesting a quote does not bind coverage."
        nav_l = "Footer"
    nav = "".join(f'<a href="{h}"' + (' hreflang="es" lang="es"' if t == "Español" else (' hreflang="en" lang="en"' if t == "English" else "")) + f">{t}</a>" for h, t in links)
    return f"""</main>
<footer class="site"><div class="wrap">
  <div><b>{NAME}</b><br />{foot_l}<br /><a href="tel:{TEL}">{PHONE}</a> · <a href="mailto:{EMAIL}">{EMAIL}</a><br />{LICENSE}<br /><a data-review-link hidden href="#" target="_blank" rel="noopener">{review}</a></div>
  <nav aria-label="{nav_l}">{nav}</nav>
  <p style="flex-basis:100%;font-size:12.5px;opacity:.85;margin-top:6px">{disc}</p>
</div></footer>
<nav class="callbar" aria-label="{'Contacto rápido' if es else 'Quick contact'}">
  <a class="c-call" href="tel:{TEL}">{call}</a><a class="c-text" href="sms:{TEL}">{text}</a><a class="c-quote" href="{quote_href}">{quote}</a>
</nav>
{js}</body>
</html>
"""


def hero(eyebrow, h1, sub, ctas):
    btns = "".join(f'<a class="btn {c}" href="{h}">{E(t)}</a>' for t, h, c in ctas)
    return f"""<section class="hero"><div class="wrap">
  <div class="eyebrow">{E(eyebrow)}</div>
  <h1>{E(h1)}</h1>
  <p>{E(sub)}</p>
  <div class="ctas">{btns}</div>
</div></section>
"""


def cards(items, cols="three"):
    return f'<div class="grid {cols}">' + "".join(f'<div class="card"><h3>{E(t)}</h3><p>{E(d)}</p></div>' for t, d in items) + "</div>"


def faq_html(faq, title="Common questions"):
    return f'<section class="faq"><div class="wrap"><h2>{E(title)}</h2>' + "".join(
        f"<details><summary>{E(q)}</summary><p>{E(a)}</p></details>" for q, a in faq) + "</div></section>\n"


def band(h, p, ctas):
    btns = "".join(f'<a class="btn {c}" href="{hr}">{E(t)}</a>' for t, hr, c in ctas)
    return f'<section><div class="wrap"><div class="band"><div><h2>{E(h)}</h2><p class="lead">{E(p)}</p></div><div class="ctas" style="display:flex;gap:10px;flex-wrap:wrap">{btns}</div></div></div></section>\n'


def field(name, label, kind="text", required=True, ac="", opts=None, es=False, data_label=None, ph="", primary=""):
    fid = "f-" + name
    opt = "" if required else (' <span class="opt">(opcional)</span>' if es else ' <span class="opt">(optional)</span>')
    req = " required" if required else ""
    acs = f' autocomplete="{ac}"' if ac else ""
    dl = f' data-label="{E(data_label or label)}"' + (f' data-primary="{primary}"' if primary else "")
    phs = f' placeholder="{E(ph)}"' if ph else ""
    if kind == "select":
        choose = "Seleccione…" if es else "Choose…"
        o = f'<option value="">{choose}</option>' + "".join(f"<option>{E(x)}</option>" for x in opts)
        ctl = f'<select id="{fid}" name="{name}"{req}{dl}>{o}</select>'
    elif kind == "textarea":
        ctl = f'<textarea id="{fid}" name="{name}"{req}{dl}{phs}></textarea>'
    else:
        im = ' inputmode="tel"' if kind == "tel" else ""
        if kind == "tel" and ac == "tel":
            acs = ' autocomplete="tel-national"'
        ctl = f'<input id="{fid}" name="{name}" type="{kind}"{req}{acs}{dl}{im}{phs} />'
    return f'<div class="field"><label for="{fid}">{E(label)}{opt}</label>{ctl}<div class="err" role="alert"></div></div>'


def form(kind, subject, title, intro, body, consent, button, done_title, done_text, es=False):
    msg = '<div class="form-msg" role="alert"></div>'
    return f"""<div class="form-card" id="{'solicitud' if es else 'form'}">
  <h2>{E(title)}</h2><p class="lead">{E(intro)}</p>
  <form data-lead="{kind}" data-subject="{E(subject)}" data-badge="{E(BADGES.get(kind, 'NEW LEAD'))}" data-done="done-{kind}" novalidate>
    <div class="hp" aria-hidden="true"><label>Leave this empty <input name="cg_hp" tabindex="-1" autocomplete="off" /></label></div>
    {body}
    <label class="check"><input type="checkbox" required /> <span>{E(consent)}</span></label>
    <div class="check-err" role="alert" style="color:var(--danger);font-size:13.5px;font-weight:600"></div>
    <div style="margin-top:18px"><button class="btn btn-navy" type="submit">{E(button)}</button></div>
    {msg}
  </form>
  <div class="done" id="done-{kind}" role="status"><div class="tick">✓</div><h2>{E(done_title)}</h2><p class="lead" style="margin:0 auto">{E(done_text)}</p></div>
</div>
"""


BADGES = {"spanish": "SPANISH-PAGE REQUEST", "referral": "NEW REFERRAL", "partner": "PARTNER REFERRAL"}
COV_EN = ["Auto", "Homeowners", "Renters", "Landlord / rental property", "Business / commercial", "Not sure yet"]
COV_ES = ["Auto", "Casa (propietario)", "Inquilino (renta)", "Propiedad de alquiler", "Negocio / comercial", "No estoy seguro"]

PAGES = []

# ---------------- SR-22 ----------------
sr22_faq = [
    ("What is an SR-22?", "An SR-22 isn't a type of insurance. It's a certificate your insurance company files with the South Carolina DMV to prove you carry at least the state's minimum liability coverage."),
    ("Who needs an SR-22 in South Carolina?", "The DMV usually requires one after events like a DUI, driving without insurance, a license suspension or too many points. The DMV or court will tell you if you need one."),
    ("How long do I need to keep it?", "The DMV sets how long the SR-22 must stay on file. If your policy cancels or lapses during that time, the insurance company has to notify the DMV, so it's important to keep coverage active."),
    ("I don't own a car. Can I still get an SR-22?", "Yes. A non-owner policy with an SR-22 filing can help you meet the requirement and get your license back even if you don't own a vehicle."),
    ("How fast can you file it?", "Many carriers can file the SR-22 electronically soon after your policy starts. Call us and we'll explain the timing for your situation."),
]
PAGES.append(dict(
    slug="sr22-insurance-sc", quote_href="/#quote-auto",
    title="SR-22 Insurance in South Carolina | Conway Guardian Insurance Group",
    desc="Need an SR-22 in South Carolina? We compare carriers that file SR-22s with the SC DMV, including non-owner SR-22 policies. Call 803-768-0594 for a quote.",
    faq=sr22_faq,
    body=hero("SR-22 filings · South Carolina", "SR-22 insurance in South Carolina, made simple",
              "If the DMV or a court says you need an SR-22, we'll compare carriers that offer them and help you get the certificate filed with the SC DMV so you can get back on the road.",
              [("Get an SR-22 quote", "/#quote-auto", "btn-gold"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><h2>How we help</h2><p class="lead">As an independent agency, we can shop more than one company — which matters when your record makes some insurers say no.</p>'
    + cards([
        ("We compare carriers", "We check options from multiple insurance companies that accept drivers who need an SR-22."),
        ("We get it filed", "Your insurance company files the SR-22 certificate with the South Carolina DMV. We make sure it's requested correctly."),
        ("Non-owner SR-22", "Don't own a car? A non-owner policy can still meet the SR-22 requirement."),
    ]) + "</div></section>\n"
    + '<section><div class="wrap"><h2>Common reasons drivers need an SR-22</h2><ul class="ticks"><li>DUI or DUAC conviction</li><li>Driving without insurance</li><li>License suspension or revocation</li><li>Too many points on your driving record</li><li>An at-fault accident while uninsured</li></ul><p class="note">The SC DMV or the court decides whether you need an SR-22 and for how long. This page is general information, not legal advice.</p></div></section>\n'
    + faq_html(sr22_faq)
    + band("Need an SR-22 soon?", "Call now or start a quick quote online — it takes a few minutes.", [("Start my quote", "/#quote-auto", "btn-navy"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")]),
))

# ---------------- Affordable car insurance ----------------
car_faq = [
    ("How can I lower my car insurance in South Carolina?", "Comparing several carriers is the biggest step. Bundling with home or renters insurance, raising your deductibles, keeping a clean record and asking about discounts can also help."),
    ("Is the state minimum enough?", "South Carolina's minimum is the least you can legally carry, and it may not cover a serious accident. We'll show you the price difference between minimum and higher limits so you can decide."),
    ("Will getting a quote affect my credit?", "Insurance quotes don't affect your credit score the way a loan application can."),
    ("Do you work with drivers who have tickets or accidents?", "Yes. We compare carriers that accept a range of driving records, including drivers who need an SR-22."),
]
PAGES.append(dict(
    slug="cheap-car-insurance-sc", quote_href="/#quote-auto",
    title="Cheap Car Insurance in South Carolina — Compare Rates | Conway Guardian",
    desc="Looking for affordable car insurance in South Carolina? We compare rates from multiple carriers to find the coverage you need at a competitive price. Free quotes.",
    faq=car_faq,
    body=hero("Auto insurance · South Carolina", "Affordable car insurance in South Carolina",
              "One quote request, multiple carriers compared. We look for the coverage you need at a competitive price — so you don't have to call around.",
              [("Compare my rates", "/#quote-auto", "btn-gold"), ("Quick price estimate", "/auto-estimate/", "btn-ghost"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><h2>Ways drivers save</h2><p class="lead">Discounts and prices vary by insurance company. We check what you qualify for with each carrier we quote.</p>'
    + cards([
        ("Compare carriers", "Each company prices drivers differently. Shopping several is the most reliable way to save."),
        ("Bundle policies", "Pairing auto with homeowners or renters insurance often earns a multi-policy discount."),
        ("Choose your deductible", "A higher comprehensive and collision deductible usually lowers your premium."),
        ("Multi-car and good driver", "Insuring more than one vehicle or keeping a clean record can lower your rate."),
        ("Pay-in-full and paperless", "Some carriers discount paying the full term up front or going paperless."),
        ("Safety and anti-theft", "Vehicles with certain safety or anti-theft features may qualify for savings."),
    ]) + "</div></section>\n"
    + faq_html(car_faq)
    + band("See what you could save", "Tell us about your vehicles and drivers — we'll compare options and call you back.", [("Start my quote", "/#quote-auto", "btn-navy")]),
))

# ---------------- Landlord ----------------
ll_faq = [
    ("Does my homeowners policy cover a house I rent out?", "Usually not. A homeowners policy is designed for a home you live in. A rental property generally needs a landlord (dwelling fire) policy."),
    ("Does landlord insurance cover my tenant's belongings?", "No. Tenants need their own renters insurance for their belongings. Many landlords require it in the lease."),
    ("What about loss of rent?", "Many landlord policies can include loss-of-rent coverage, which helps replace rental income if a covered loss makes the home unlivable."),
    ("Can you insure a vacant property?", "Vacant properties often need special coverage. Tell us about the property and we'll look for options."),
]
PAGES.append(dict(
    slug="landlord-insurance-sc", quote_href="/#quote-landlord",
    title="Landlord Insurance in South Carolina | Rental Property Coverage | Conway Guardian",
    desc="Landlord and rental property insurance in South Carolina: dwelling, liability, loss of rent and vacant property options. Compare carriers with a local independent agency.",
    faq=ll_faq,
    body=hero("Landlord insurance · South Carolina", "Insurance for your South Carolina rental properties",
              "Whether you rent out one house or a few doors, we compare carriers to protect the building, your rental income and your liability.",
              [("Get a landlord quote", "/#quote-landlord", "btn-gold"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><h2>What a landlord policy can cover</h2>'
    + cards([
        ("The building", "Repairs or rebuilding after covered damage like fire, wind or hail."),
        ("Loss of rental income", "Helps replace rent while a covered loss is being repaired."),
        ("Landlord liability", "If a tenant or visitor is hurt and you're found responsible."),
        ("Other structures", "Detached garages, sheds and fences on the property."),
        ("Vacant properties", "Options for homes between tenants or being renovated."),
        ("Multiple properties", "We can help keep several rentals organized with one agency."),
    ]) + "</div></section>\n"
    + faq_html(ll_faq)
    + band("Own a rental in South Carolina?", "Tell us about the property and we'll compare coverage options.", [("Start my quote", "/#quote-landlord", "btn-navy")]),
))

# ---------------- Spanish ----------------
es_body = (
    field("nombre", "Nombre completo", ac="name", es=True, data_label="Nombre", primary="name")
    + '<div class="row two">' + field("telefono", "Teléfono", kind="tel", ac="tel", es=True, data_label="Teléfono", primary="phone")
    + field("correo", "Correo electrónico", kind="email", required=False, ac="email", es=True, data_label="Correo", primary="email") + "</div>"
    + field("seguro", "¿Qué seguro necesita?", kind="select", opts=COV_ES, es=True, data_label="Seguro")
    + field("ciudad", "Ciudad", required=False, ac="address-level2", es=True, data_label="Ciudad", primary="location")
    + field("mensaje", "Mensaje", kind="textarea", required=False, es=True, data_label="Mensaje", ph="Cuéntenos un poco sobre lo que necesita")
)
PAGES.append(dict(
    slug="es", lang="es", form=True,
    title="Seguro de auto, casa y negocio en Carolina del Sur | Conway Guardian",
    desc="Agencia de seguros independiente en Carolina del Sur. Comparamos varias compañías para seguro de auto, casa, inquilino, propiedad de alquiler y negocio. Pida su cotización gratis.",
    body=hero("Agencia de seguros independiente · Carolina del Sur", "Seguro de auto, casa y negocio en Carolina del Sur",
              "Comparamos opciones de varias compañías de seguros para encontrar la cobertura que necesita a un precio competitivo. Pida su cotización gratis.",
              [("Pedir cotización", "#solicitud", "btn-gold"), ("Llamar al " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><h2>Seguros que ofrecemos</h2>'
    + cards([
        ("Seguro de auto", "Responsabilidad civil, choque y cobertura completa. También ayudamos con el SR-22."),
        ("Seguro de casa", "Protección para su vivienda, sus pertenencias y su responsabilidad civil."),
        ("Seguro de inquilino", "Protección económica para sus cosas si renta una casa o apartamento."),
        ("Propiedad de alquiler", "Cobertura para casas que usted renta a otras personas."),
        ("Seguro de negocio", "Responsabilidad general, propiedad comercial, auto comercial y más."),
        ("Comparamos por usted", "Como agencia independiente, trabajamos con varias compañías, no solo una."),
    ]) + "</div></section>\n"
    + '<section><div class="wrap">' + form(
        "spanish", "Nueva solicitud de cotización (página en español)", "Pida su cotización gratis",
        "Déjenos sus datos y le contactaremos, normalmente dentro de un día hábil.", es_body,
        "Acepto que Conway Guardian Insurance Group me contacte sobre mi cotización por teléfono, mensaje de texto o correo electrónico al número y la dirección que proporcioné, incluso por medios automatizados. El consentimiento no es una condición de compra. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para cancelar.",
        "Enviar solicitud", "¡Gracias! Recibimos su solicitud.", "Le contactaremos pronto. Si necesita ayuda antes, llame al " + PHONE + ".", es=True)
    + "</div></section>\n",
))

# ---------------- Referral ----------------
ref_body = (
    "<fieldset><legend>Your information</legend>"
    + '<div class="row two">' + field("your_name", "Your name", ac="name", data_label="Referred by — name")
    + field("your_phone", "Your phone", kind="tel", ac="tel", data_label="Referred by — phone") + "</div></fieldset>"
    + "<fieldset><legend>Who are you referring?</legend>"
    + '<div class="row two">' + field("friend_name", "Their name", data_label="Friend — name", primary="name")
    + field("friend_phone", "Their phone", kind="tel", data_label="Friend — phone", primary="phone") + "</div>"
    + field("friend_email", "Their email", kind="email", required=False, data_label="Friend — email", primary="email")
    + field("coverage", "What do they need?", kind="select", opts=COV_EN, data_label="Coverage needed")
    + field("notes", "Anything we should know?", kind="textarea", required=False, data_label="Notes") + "</fieldset>"
)
PAGES.append(dict(
    slug="refer", form=True,
    title="Refer a Friend | Conway Guardian Insurance Group",
    desc="Know someone who could use a better insurance rate in South Carolina? Refer them to Conway Guardian Insurance Group and we'll take great care of them.",
    body=hero("Refer a friend", "Know someone paying too much for insurance?",
              "The best compliment we can get is a referral. Send us a friend, family member or neighbor, and we'll compare carriers for them — with no pressure.",
              [("Refer someone", "#form", "btn-gold")])
    + '<section><div class="wrap">' + form(
        "referral", "New referral from the website", "Send us a referral",
        "We'll reach out to your friend by phone call or email and let them know you sent them.", ref_body,
        "My friend knows I'm referring them and is OK with a phone call or email from Conway Guardian Insurance Group.",
        "Send referral", "Thank you for the referral!", "We'll reach out to them soon. We appreciate you thinking of us.")
    + "</div></section>\n",
))

# ---------------- Partners ----------------
partner_body = (
    "<fieldset><legend>About you</legend>"
    + '<div class="row two">' + field("p_name", "Your name", ac="name", data_label="Partner — name")
    + field("p_company", "Company", ac="organization", data_label="Partner — company") + "</div>"
    + field("p_type", "You are a…", kind="select", opts=["Realtor / real estate agent", "Mortgage lender / loan officer", "Car dealer", "Property manager", "Other"], data_label="Partner — type")
    + '<div class="row two">' + field("p_phone", "Your phone", kind="tel", ac="tel", data_label="Partner — phone")
    + field("p_email", "Your email", kind="email", ac="email", data_label="Partner — email") + "</div></fieldset>"
    + "<fieldset><legend>Your client</legend>"
    + '<div class="row two">' + field("c_name", "Client name", data_label="Client — name", primary="name")
    + field("c_phone", "Client phone", kind="tel", data_label="Client — phone", primary="phone") + "</div>"
    + field("c_email", "Client email", kind="email", required=False, data_label="Client — email", primary="email")
    + '<div class="row two">' + field("c_cov", "Coverage needed", kind="select", opts=COV_EN, data_label="Client — coverage")
    + field("c_date", "Closing / purchase date", kind="date", required=False, data_label="Client — closing or purchase date") + "</div>"
    + field("c_notes", "Notes", kind="textarea", required=False, data_label="Notes", ph="Property address, vehicle, lender requirements, deadline…") + "</fieldset>"
)
PAGES.append(dict(
    slug="partners", form=True,
    title="Partner With Us — Realtors, Lenders & Dealers | Conway Guardian Insurance",
    desc="Realtors, mortgage lenders, car dealers and property managers: send your clients to Conway Guardian Insurance Group for fast homeowners, auto and landlord quotes in South Carolina.",
    body=hero("For realtors, lenders & dealers", "Fast insurance quotes for your clients",
              "Closings and car deals shouldn't wait on insurance. Send us your client's details and we'll compare carriers quickly — and, with your client's permission, keep you posted on timing.",
              [("Send a client", "#form", "btn-gold"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><h2>Why partners send clients to us</h2>'
    + cards([
        ("Quick turnaround", "We know closings and purchases run on deadlines and we prioritize them."),
        ("Multiple carriers", "As an independent agency, we can shop several companies for each client."),
        ("Proof of insurance", "We help your client get the binder or proof of insurance their lender or dealer needs."),
    ]) + "</div></section>\n"
    + '<section><div class="wrap">' + form(
        "partner", "New partner referral from the website", "Send us a client",
        "We'll contact your client by phone call or email. With their permission, we'll let you know the status and timing.", partner_body,
        "My client has agreed to a phone call or email from Conway Guardian Insurance Group about insurance.",
        "Send client", "Thanks — we've got it!", "We'll reach out to your client soon and keep you posted.")
    + "</div></section>\n",
))


# ---------------- Quick Auto Estimate (calculator) ----------------
def radios(name, opts, need=True):
    return ('<div class="chips" role="radiogroup" aria-labelledby="lbl-' + name + '">' +
            "".join(f'<label class="chip"><input type="radio" name="{name}" value="{E(o)}" />{E(o)}</label>' for o in opts) + "</div>")


def q_screen(name, title, opts, help_text=""):
    h = f'<p class="est-help">{E(help_text)}</p>' if help_text else ""
    return (f'<div class="est-screen" hidden><div data-need="{name}"><h2 id="lbl-{name}">{E(title)}</h2>{h}{radios(name, opts)}'
            '<div class="est-err-msg" role="alert">Please pick one.</div></div></div>')


est_body = (
    hero("Quick auto estimate · South Carolina", "What could car insurance cost you?",
         "Answer 6 quick questions and see an estimated monthly price range in about a minute. Like the number? Book a call and we'll get your exact price.",
         [("Start my estimate", "#est-card", "btn-gold"), ("Call " + PHONE, "tel:" + TEL, "btn-ghost")])
    + '<section><div class="wrap"><div id="est"><div class="est-card" id="est-card">'
    + '<div class="est-head"><span>Auto estimate</span><span id="est-count" aria-live="polite"></span></div><div class="est-bar"><i id="est-bar"></i></div>'
    # 1 ZIP
    + '<div class="est-screen"><div data-need="zip"><h2 id="lbl-zip"><label for="est-zip">What\'s your ZIP code?</label></h2>'
      '<p class="est-help">Prices vary by area.</p>'
      '<div class="field" style="max-width:220px"><input id="est-zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="e.g. 29201" /></div>'
      '<div class="est-err-msg" role="alert">Enter a 5-digit ZIP code.</div>'
      '<p id="est-zip-note" class="est-help" hidden style="color:var(--danger)">We currently serve South Carolina only — but you can still see an estimate.</p></div></div>'
    + q_screen("age", "Age of the youngest driver", ["Under 21", "21–24", "25–64", "65+"])
    + q_screen("vehicles", "How many vehicles?", ["1", "2", "3", "4+"])
    + q_screen("coverage", "What coverage do you want?", ["State minimum", "Full coverage", "Not sure"],
               "Full coverage adds collision and comprehensive, which pay to fix your own car. Lenders usually require it.")
    + q_screen("credit", "How would you describe your credit?", ["Excellent", "Good", "Fair", "Poor", "Not sure"],
               "Just a best guess. Checking your estimate does not run a credit check or affect your credit.")
    + q_screen("record", "Any accidents, tickets or claims in the last 3 years?", ["None", "1 ticket", "1 accident or claim", "2 or more", "DUI or SR-22 needed"])
    # 7 contact
    + '<div class="est-screen" hidden><h2>Where should we send your estimate?</h2><p class="est-help">Your estimate shows right away. An agent can then get your exact price.</p>'
      '<div class="hp" aria-hidden="true"><label>Leave this empty <input name="cg_hp" tabindex="-1" autocomplete="off" /></label></div>'
      '<div class="row two">'
      '<div class="field" data-need="first"><label for="est-first">First name</label><input id="est-first" autocomplete="given-name" /><div class="est-err-msg" role="alert">Please enter your first name.</div></div>'
      '<div class="field" data-need="phone"><label for="est-phone">Phone</label><input id="est-phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(803) 555-0123" /><div class="est-err-msg" role="alert">Enter a 10-digit phone number.</div></div>'
      '</div>'
      '<div data-need="consent"><label class="check"><input type="checkbox" id="est-consent" /> <span>I agree that Conway Guardian Insurance Group may contact me about my estimate and quote by phone, text message or email, including by automated means. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.</span></label>'
      '<div class="est-err-msg" role="alert">Please check the box so we can follow up.</div></div>'
      '<div style="margin-top:18px"><button type="button" class="btn btn-navy" id="est-see">See my estimate →</button></div>'
      f'<div class="form-msg err" id="est-err" hidden role="alert" style="display:block">We couldn\'t load your estimate right now. Please try again or call <a href="tel:{TEL}">{PHONE}</a>.</div>'
      '</div>'
    # 8 result
    + '<div class="est-screen" hidden><h2>Here\'s your estimate, <span id="est-name"></span></h2>'
      '<div class="est-range"><div class="amt"><span id="est-low"></span> – <span id="est-high"></span></div><div class="per">per month · <span id="est-cov"></span></div></div>'
      '<p class="est-help" id="est-cov-note" hidden style="text-align:center">You weren\'t sure about coverage, so this shows full coverage. We\'ll go over both options on your call.</p>'
      '<div class="est-fine"><b>This is an estimate, not a quote.</b> It\'s a general range based on typical South Carolina prices for drivers who answered like you. Your actual price depends on the insurance company, your full driving record, your vehicles, your address and other details, and may be higher or lower. Coverage isn\'t bound until a policy is issued.</div>'
      '<div class="est-sec" id="est-booking"><h3>Like the number? Book a quick call for your exact price.</h3>'
      '<p class="est-help">An agent will call you at the time you pick, compare carriers and give you real quotes. It takes about 10–15 minutes.</p>'
      '<div data-need="day" id="est-day-g"><b id="lbl-day" style="display:block;margin-top:6px">Pick a day</b><div class="chips" id="est-days" role="radiogroup" aria-labelledby="lbl-day"></div><div class="est-err-msg" role="alert">Pick a day.</div></div>'
      '<div data-need="time" id="est-time-g" style="margin-top:14px"><b id="lbl-time" style="display:block">Pick a time (Eastern)</b>'
      '<div class="chips" role="radiogroup" aria-labelledby="lbl-time">'
      + "".join(f'<label class="chip"><input type="radio" name="time" value="{t}" />{t}</label>' for t in ["9–11 am", "11 am–1 pm", "1–3 pm", "3–5 pm"])
      + '</div><div class="est-err-msg" role="alert">Pick a time.</div></div>'
      '<div class="field" style="margin-top:14px"><label for="est-notes">Anything we should know? <span class="opt">(optional)</span></label><textarea id="est-notes" placeholder="e.g. current company, when your policy renews, vehicles you have"></textarea></div>'
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px"><button type="button" class="btn btn-gold" id="est-book">Request this call</button>'
      f'<a class="btn btn-ghost" href="tel:{TEL}">Or call now</a><a class="btn btn-ghost" href="/#quote-auto">Get a full quote online</a></div>'
      f'<div class="form-msg err" id="est-book-err" hidden role="alert" style="display:block">We couldn\'t book that time. Please try again or call <a href="tel:{TEL}">{PHONE}</a>.</div>'
      '</div>'
      '<div class="done" id="est-booked" hidden role="status" style="display:block"><div class="tick">✓</div><h2>You\'re booked!</h2>'
      '<p class="lead" style="margin:0 auto">We\'ll call you <b id="est-when"></b>. If you need to change it, call or text us at '
      f'<a href="tel:{TEL}">{PHONE}</a>.</p></div>'
      '</div>'
    + '<div class="est-nav"><button type="button" class="back" id="est-back">← Back</button><button type="button" class="btn btn-navy" id="est-next">Next →</button></div>'
    + '</div></div></div></section>\n'
    + '<section><div class="wrap"><h2>What affects your price</h2>'
    + cards([
        ("Driving record", "Accidents, tickets and claims in the last few years usually have the biggest effect on price."),
        ("Credit-based insurance score", "In South Carolina, many insurers use credit history when setting rates. Better credit often means a lower price."),
        ("Age and experience", "Newer and younger drivers typically pay more until they build a driving history."),
        ("Coverage and deductibles", "Full coverage costs more than the state minimum. A higher deductible can lower your premium."),
        ("Vehicles", "The cars you drive, how many and how they're used all factor in."),
        ("Where you live", "Rates differ by ZIP code across South Carolina."),
    ]) + "</div></section>\n"
)
PAGES.append(dict(
    slug="auto-estimate", quote_href="#est-card", script="/assets/estimate.js",
    title="Car Insurance Cost Estimate for South Carolina Drivers | Conway Guardian",
    desc="See an estimated monthly price range for car insurance in South Carolina in about a minute, then book a call with a local independent agent for your exact price.",
    body=est_body,
))


def build():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for p in PAGES:
        out = os.path.join(root, p["slug"], "index.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(head(p) + chrome_top(p) + p["body"] + chrome_bottom(p))
    urls = [SITE + "/"] + [SITE + "/" + p["slug"] + "/" for p in PAGES]
    with open(os.path.join(root, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write(f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod></url>\n")
        f.write("</urlset>\n")
    with open(os.path.join(root, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print("built", len(PAGES), "pages")


if __name__ == "__main__":
    build()
