// CheckEverythingWorks agent
// Opens the Conway Guardian site in a real browser, clicks every button and link
// on every page, fills in and sends every version of the quote form and the
// contact form, and fails if anything breaks.
//
// Every test also fails on: JavaScript errors, console errors, and missing
// files (images, scripts, styles) from the site itself.

const { test, expect } = require("@playwright/test");

const VIEWS = [
  { name: "Home", hash: "" },
  { name: "Auto insurance", hash: "auto" },
  { name: "Homeowners insurance", hash: "homeowners" },
  { name: "Renters insurance", hash: "renters" },
  { name: "Landlord insurance", hash: "landlord" },
  { name: "Business insurance", hash: "business" },
  { name: "About", hash: "about" },
  { name: "Contact", hash: "contact" },
  { name: "Get a quote", hash: "quote" },
  { name: "Privacy policy", hash: "privacy" },
];
const VIEW_NAME_BY_HASH = { "": "", about: "about", contact: "contact", quote: "quote", privacy: "privacy",
  auto: "coverage", homeowners: "coverage", renters: "coverage", landlord: "coverage", business: "coverage" };
const COVERAGE_KEYS = ["auto", "homeowners", "renters", "landlord", "business"];

const CLICKABLE = "a[href], button, summary, label.chip, label.qopt, label.cov-opt, label.consent";

/* ------------------------------------------------------------------ */
/* Error tracking: every test fails if the page logs problems          */
/* ------------------------------------------------------------------ */
test.beforeEach(async ({ page, baseURL }) => {
  const problems = [];
  const origin = new URL(baseURL).origin;
  page.on("pageerror", (err) => problems.push(`JavaScript error: ${err.message}`));
  page.on("console", (msg) => {
    // "Failed to load resource" is reported below with the file name, and only for the site's own files
    // (so an outside service like Google Fonts being slow doesn't fail the check).
    if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) problems.push(`Console error: ${msg.text()}`);
  });
  page.on("response", (res) => {
    if (res.url().startsWith(origin) && res.status() >= 400) problems.push(`Missing file (${res.status()}): ${res.url()}`);
  });
  page.on("requestfailed", (req) => {
    // ERR_ABORTED = the test moved on before a download finished (not a site problem).
    // Truly missing files are caught above as 404s.
    const why = req.failure()?.errorText || "";
    if (req.url().startsWith(origin) && !why.includes("ERR_ABORTED")) problems.push(`Failed to load (${why}): ${req.url()}`);
  });
  page.__problems = problems;

  // Never send real leads to the agency while testing: answer form sends with a fake "OK".
  await page.route(/(formsubmit\.co|formspree\.io)/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: "true", ok: true }) }));
});

test.afterEach(async ({ page }) => {
  expect(page.__problems, "The page reported errors").toEqual([]);
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function open(page, hash) {
  // about:blank first forces a full, fresh page load (changing only the #part would keep old state)
  await page.goto("about:blank");
  await page.goto("/index.html" + (hash ? "#" + hash : ""));
  await expect(page.locator(".view.on")).toHaveCount(1);
}

const isMobile = (testInfo) => testInfo.project.name === "mobile";

// Gives every visible clickable element a stable number so the same element
// can be found again after the page is reloaded.
async function markClickables(page) {
  return page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((el) => {
      el.removeAttribute("data-cew");
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = r.width > 0 && r.height > 0 && style.visibility !== "hidden" && el.closest("[hidden]") === null
        && el.closest('[aria-hidden="true"]') === null && el.offsetParent !== null;
      if (!visible) return;
      el.setAttribute("data-cew", String(out.length));
      out.push({
        label: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("href") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60),
        href: el.getAttribute("href"),
      });
    });
    return out;
  }, CLICKABLE);
}

async function expectHealthyPage(page, what) {
  await expect(page.locator(".view.on"), `After clicking "${what}", the page should still show exactly one section`).toHaveCount(1);
  expect(page.__problems, `Clicking "${what}" caused errors`).toEqual([]);
}

async function clickChip(scope, value) {
  await scope.locator(`label:has(input[value="${value}"])`).first().click();
}

// Answers every question on the visible quote step. Required questions get a
// valid answer; optional text fields are filled too so they get exercised.
async function fillVisibleStep(page) {
  const step = page.locator("#quoteForm .wstep.on");
  for (let pass = 0; pass < 4; pass++) { // more questions can appear (e.g. one block per vehicle)
    // Radio / checkbox questions
    const groups = await step.evaluate((s) => {
      const names = new Set();
      s.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((i) => {
        if (i.offsetParent !== null || i.closest("label")?.offsetParent !== null) names.add(i.name);
      });
      return [...names].filter((n) => n && n !== "cov" && !s.querySelector(`input[name="${n}"]:checked`));
    });
    for (const name of groups) {
      const options = step.locator(`input[name="${name}"]`);
      const count = await options.count();
      let pick = 0;
      if (name === "auto_vehicles" && count > 1) pick = 1;        // 2 vehicles: tests the per-vehicle blocks
      if (/^auto_v\d+_own$/.test(name)) pick = 1;                  // "Financed": tests the lender section
      await options.nth(pick).locator("xpath=ancestor::label[1]").click();
    }
    // Text, date and dropdown questions (only the ones on screen)
    const fields = step.locator("input[type=text], input[type=tel], input[type=email], input[type=date], input:not([type]), select, textarea");
    const todo = await fields.evaluateAll((els) => els.map((el, i) => ({ i, show: el.offsetParent !== null, filled: !!el.value })).filter((x) => x.show && !x.filled).map((x) => x.i));
    if (!groups.length && !todo.length) break;
    for (const i of todo) {
      const f = fields.nth(i);
      const tag = await f.evaluate((el) => el.tagName);
      if (tag === "SELECT") {
        await f.selectOption({ index: 1 });
        continue;
      }
      const id = (await f.getAttribute("id")) || "";
      const type = (await f.getAttribute("type")) || "text";
      const max = Number(await f.getAttribute("maxlength")) || 0;
      let v = "Test answer";
      if (type === "date") { const d = new Date(Date.now() + 30 * 864e5); v = d.toISOString().slice(0, 10); }
      else if (/zip/.test(id) || max === 5) v = "29201";
      else if (/year/.test(id) || max === 4) v = "2019";
      else if (/vin/.test(id) || max === 17) v = "1HGCM82633A004352";
      else if (/phone/.test(id)) v = "8035550123";
      else if (/email/.test(id)) v = "test.customer@example.com";
      else if (id === "first") v = "Testy";
      else if (id === "last") v = "McTester";
      await f.fill(v);
      if (type === "date") await f.dispatchEvent("change");
    }
    // Consent checkbox on the contact step
    const consent = step.locator("#consent");
    if ((await consent.count()) && (await step.locator("#consent-f").isVisible()) && !(await consent.isChecked())) await step.locator("#consent-f").click();
  }
}

async function runQuote(page, keys) {
  await open(page, "quote");
  await runQuoteFromHere(page, keys);
}
async function runQuoteFromHere(page, keys) {
  for (const k of keys) await page.locator(`label.cov-opt:has(input[value="${k}"])`).click();
  const next = page.locator("#wizNext");
  for (let guard = 0; guard < 150; guard++) { // one question per screen, so many screens
    if (await page.locator("#sendBtn").isVisible()) break;
    await fillVisibleStep(page);
    const before = await page.locator("#wizName").innerText();
    await next.click();
    await expect(page.locator("#quoteForm .wstep.on .step-err.show"), `Step "${before}" still shows an error after filling every question`).toHaveCount(0);
  }
  await expect(page.locator("#sendBtn"), "Never reached the review step").toBeVisible();
  await expect(page.locator("#reviewBox")).toContainText("Testy McTester");
  await page.locator("#sendBtn").click();
  await expect(page.locator("#quoteDone")).toBeVisible();
  await expect(page.locator("#quoteDone")).toContainText("Thanks, Testy");
}

/* ------------------------------------------------------------------ */
/* 1. Every page loads cleanly                                         */
/* ------------------------------------------------------------------ */
for (const v of VIEWS) {
  test(`${v.name} page loads with all images and no errors`, async ({ page }, testInfo) => {
    await open(page, v.hash);
    await expect(page.locator(`.view.on[data-view="${VIEW_NAME_BY_HASH[v.hash]}"]`)).toBeVisible();
    await expect(page).toHaveTitle(/Conway Guardian Insurance Group/);
    await expect(page.locator("header.site img.mark")).toBeVisible();

    // Every image that should be on screen actually loaded
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src));
    expect(broken, "Images that failed to load").toEqual([]);

    // Nothing spills off the side of the screen
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${v.name} page scrolls sideways on ${testInfo.project.name}`).toBeLessThanOrEqual(1);
  });
}

/* ------------------------------------------------------------------ */
/* 2. Click every button and link on every page                        */
/* ------------------------------------------------------------------ */
for (const v of VIEWS) {
  test(`every button and link on the ${v.name} page works`, async ({ page }) => {
    test.setTimeout(600_000); // the home page has dozens of links
    await open(page, v.hash);
    const items = await markClickables(page);
    expect(items.length, "Found no buttons to click").toBeGreaterThan(0);

    for (let i = 0; i < items.length; i++) {
      const { label, href } = items[i];
      await open(page, v.hash);
      await markClickables(page);
      const el = page.locator(`[data-cew="${i}"]`);
      if (!(await el.count())) continue; // layout changed (e.g. menu closed); covered by other tests

      const realHref = await el.getAttribute("href");
      if (realHref && realHref.startsWith("tel:")) {
        expect(realHref.replace(/\D/g, "").length, `"${label}" phone link has a bad number: ${realHref}`).toBeGreaterThanOrEqual(10);
        continue;
      }
      if (realHref && /^(mailto:|https?:)/.test(realHref)) {
        expect(() => new URL(realHref), `"${label}" has a broken link`).not.toThrow();
        continue;
      }
      if (realHref && realHref.startsWith("sms:")) {
        expect(realHref.replace(/\D/g, "").length, `"${label}" text link has a bad number: ${realHref}`).toBeGreaterThanOrEqual(10);
        continue;
      }
      if (realHref && !realHref.startsWith("#") && realHref !== "") {
        // A link to another page of the site (e.g. refer/): make sure that page exists
        const url = new URL(realHref, page.url());
        const res = await page.request.get(url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname);
        expect(res.status(), `"${label}" links to a missing page: ${realHref}`).toBeLessThan(400);
        continue;
      }

      await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
      await el.click({ timeout: 5_000 });
      await page.waitForTimeout(150);
      await expectHealthyPage(page, label);

      // In-page links must land on the right section
      if (href && /^#[a-z]*$/.test(href)) {
        const target = href.slice(1);
        if (target in VIEW_NAME_BY_HASH) {
          await expect(page.locator(`.view.on[data-view="${VIEW_NAME_BY_HASH[target]}"]`),
            `"${label}" should open the ${target || "home"} page`).toBeVisible();
        }
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* 3. Navigation menus                                                 */
/* ------------------------------------------------------------------ */
test("Coverage dropdown: every item starts a quote with that coverage pre-selected (desktop)", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "Desktop menu only");
  for (const k of COVERAGE_KEYS) {
    await open(page, "");
    await page.locator("#covDD > button").click();
    await expect(page.locator("#covMenu")).toBeVisible();
    await page.locator(`#covMenu a[data-pre="${k}"]`).click();
    await expect(page.locator('.view.on[data-view="quote"]')).toBeVisible();
    await expect(page.locator(`#covGrid input[value="${k}"]`), `Menu item for ${k} should pre-select ${k}`).toBeChecked();
    await expect(page.locator("#covGrid input:checked")).toHaveCount(1);
  }
});

test("Mobile menu opens, every link works, and it closes (mobile)", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "Mobile menu only");
  await open(page, "");
  const links = await page.evaluate(() => {
    document.querySelector("#burger").click();
    return [...document.querySelectorAll("#mobileLinks a[href^='#']")].map((a) => a.getAttribute("href"));
  });
  expect(links.length).toBeGreaterThan(3);
  for (const href of links) {
    await open(page, "");
    await page.locator("#burger").click();
    await expect(page.locator("#mobileNav")).toBeVisible();
    await page.locator(`#mobileLinks a[href="${href}"]`).first().click();
    await expect(page.locator("#mobileNav"), `Menu should close after tapping ${href}`).toBeHidden();
    const target = href.slice(1);
    if (target in VIEW_NAME_BY_HASH) await expect(page.locator(`.view.on[data-view="${VIEW_NAME_BY_HASH[target]}"]`)).toBeVisible();
  }
  await page.locator("#burger").click();
  await page.locator("#closeNav").click();
  await expect(page.locator("#mobileNav")).toBeHidden();
});

/* ------------------------------------------------------------------ */
/* 4. Home page quick picker and "quote this" buttons                  */
/* ------------------------------------------------------------------ */
test("Home quick picker: only one choice at a time, and it carries over to the quote form", async ({ page }) => {
  // Nothing picked: goes straight to the quote form with nothing pre-selected
  await open(page, "");
  await page.locator("#quickGo").click();
  await expect(page.locator('.view.on[data-view="quote"]')).toBeVisible();
  await expect(page.locator("#covGrid input:checked")).toHaveCount(0);
  // Picking a second option replaces the first
  await open(page, "");
  await clickChip(page.locator("#quickOpts"), "auto");
  await clickChip(page.locator("#quickOpts"), "renters");
  await expect(page.locator("#quickOpts input:checked")).toHaveCount(1);
  await page.locator("#quickGo").click();
  await expect(page.locator('.view.on[data-view="quote"]')).toBeVisible();
  await expect(page.locator('#covGrid input[value="renters"]')).toBeChecked();
  await expect(page.locator('#covGrid input[value="auto"]')).not.toBeChecked();
});

test("Quote form shows one question per screen", async ({ page }) => {
  await open(page, "quote");
  await page.locator('label.cov-opt:has(input[value="auto"])').click();
  await page.locator("#wizNext").click();
  const visibleQuestions = () => page.locator("#quoteForm .wstep.on").evaluate((s) =>
    [...s.querySelectorAll(".q[data-q], .vblock, .field, .g2")].filter((el) => el.offsetParent !== null && el.offsetHeight > 0 && !el.parentElement.closest(".vblock, .q, .g2")).length);
  for (let i = 0; i < 8; i++) {
    expect(await visibleQuestions(), `Screen ${i + 1} should show exactly one question`).toBe(1);
    await expect(page.locator("#wizCount")).toHaveText(/^Question \d+ of \d+$/);
    await fillVisibleStep(page);
    await page.locator("#wizNext").click();
  }
});

for (const k of COVERAGE_KEYS) {
  test(`"Get a ${k} quote" button pre-selects ${k} in the quote form`, async ({ page }) => {
    await open(page, k);
    await page.locator(`.view.on a[data-pre="${k}"]`).first().click();
    await expect(page.locator('.view.on[data-view="quote"]')).toBeVisible();
    await expect(page.locator(`#covGrid input[value="${k}"]`)).toBeChecked();
  });
}

test("FAQ questions open and close", async ({ page }) => {
  await open(page, "");
  const items = page.locator(".view.on .faq details");
  const n = await items.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const d = items.nth(i);
    await d.locator("summary").click();
    await expect(d).toHaveAttribute("open", "");
    await d.locator("summary").click();
    await expect(d).not.toHaveAttribute("open", "");
  }
});

/* ------------------------------------------------------------------ */
/* 5. Quote form: every coverage type, start to finish                 */
/* ------------------------------------------------------------------ */
for (const k of COVERAGE_KEYS) {
  test(`Quote form works end to end for ${k}`, async ({ page }) => {
    test.setTimeout(180_000);
    await runQuote(page, [k]);
  });
}

test("Quote form works end to end with all five coverage types at once", async ({ page }) => {
  test.setTimeout(400_000);
  await runQuote(page, COVERAGE_KEYS);
});

test("Quote form blocks Continue until required questions are answered", async ({ page }) => {
  await open(page, "quote");
  await page.locator("#wizNext").click();
  await expect(page.locator('.wstep[data-key="coverage"] .step-err')).toBeVisible();
  await page.locator('label.cov-opt:has(input[value="renters"])').click();
  await page.locator("#wizNext").click();
  await expect(page.locator("#wizName")).toHaveText(/Contact/); // contact info comes first
  await page.locator("#wizNext").click(); // nothing answered yet
  await expect(page.locator("#quoteForm .wstep.on .step-err")).toBeVisible();
  await expect(page.locator("#wizName")).toHaveText(/Contact/);
});

test("Quote form emails a 'quote started' lead as soon as contact info is given", async ({ page }) => {
  const sent = [];
  await page.route(/formsubmit\.co/, async (route) => {
    sent.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":"true"}' });
  });
  await open(page, "quote");
  await page.locator('label.cov-opt:has(input[value="auto"])').click();
  await page.locator("#wizNext").click();
  for (let i = 0; i < 3; i++) { await fillVisibleStep(page); await page.locator("#wizNext").click(); }
  await expect(page.locator("#wizName")).toHaveText(/Auto/);
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]._subject).toMatch(/^Quote started \(not finished yet\): Auto — Testy McTester$/);
  expect(sent[0].Phone).toBeTruthy();
});

test("Links from landing pages pre-select the coverage (#quote-auto)", async ({ page }) => {
  await page.goto("about:blank");
  await page.goto("/index.html#quote-landlord");
  await expect(page.locator('.view.on[data-view="quote"]')).toBeVisible();
  await expect(page.locator('#covGrid input[value="landlord"]')).toBeChecked();
  await expect(page.locator(".wstep.on")).toHaveAttribute("data-key", "contact");
});

test("Browser Back leaves the thank-you page in one step", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("about:blank");
  await page.goto("/index.html#about");
  await page.goto("/index.html#quote");
  await runQuoteFromHere(page, ["renters"]);
  await page.goBack();
  await expect(page.locator('.view.on[data-view="about"]')).toBeVisible();
});

test("Editing coverage on the review page asks the new coverage's questions", async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, "quote");
  await page.locator('label.cov-opt:has(input[value="renters"])').click();
  for (let i = 0; i < 80 && !(await page.locator("#sendBtn").isVisible()); i++) { await fillVisibleStep(page); await page.locator("#wizNext").click(); }
  await page.locator('#reviewBox [data-edit="coverage"]').click();
  await page.locator('label.cov-opt:has(input[value="auto"])').click();
  await page.locator("#wizNext").click();
  await expect(page.locator("#wizName")).toHaveText(/Auto/);
});

test("On-screen Back and the browser's Back agree", async ({ page }) => {
  await open(page, "quote");
  await page.locator('label.cov-opt:has(input[value="auto"])').click();
  await page.locator("#wizNext").click();
  for (let i = 0; i < 5; i++) { await fillVisibleStep(page); await page.locator("#wizNext").click(); }
  const at = await page.locator("#wizCount").innerText();
  await page.locator("#wizBack").click();
  const prev = await page.locator("#wizCount").innerText();
  expect(prev).not.toBe(at);
  await page.goBack();
  await expect(page.locator("#wizCount")).not.toHaveText(at); // must not jump forward again
});

test("Quick auto estimate: shows a price range, emails the lead and books a call", async ({ page }) => {
  const sent = [];
  await page.route(/formsubmit\.co/, async (route) => {
    sent.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":"true"}' });
  });
  await page.goto("/auto-estimate/");
  const next = page.locator("#est-next");
  await next.click();
  await expect(page.locator('[data-need="zip"].bad')).toBeVisible(); // ZIP required
  await page.locator("#est-zip").fill("29201");
  await next.click();
  for (const pick of ["25–64", "2", "Full coverage", "Good", "None"]) {
    await page.locator(`.est-screen:not([hidden]) label.chip:has(input[value="${pick}"])`).click();
  }
  await expect(page.locator("#est-see")).toBeVisible();
  await page.locator("#est-see").click();
  await expect(page.locator('[data-need="first"].bad')).toBeVisible();
  await page.locator("#est-first").fill("Testy");
  await page.locator("#est-phone").fill("+1 803 555 0123");
  await page.locator("#est-consent").check();
  await page.locator("#est-see").click();
  // 190 base × 1.9 (2 vehicles) = 361 → $255 – $470
  await expect(page.locator("#est-low")).toHaveText("$255");
  await expect(page.locator("#est-high")).toHaveText("$470");
  expect(sent.length).toBe(1);
  expect(sent[0]._subject).toMatch(/^Auto estimate lead: Testy — \(803\) 555-0123 \(SC 29201\)$/);
  expect(sent[0]["Credit (self-reported)"]).toBe("Good");
  await page.locator("#est-book").click();
  await expect(page.locator("#est-day-g.bad")).toBeVisible();
  await page.locator("#est-days label.chip").first().click();
  await page.locator('label.chip:has(input[value="1–3 pm"])').click();
  await page.locator("#est-book").click();
  await expect(page.locator("#est-booked")).toBeVisible();
  expect(sent.length).toBe(2);
  expect(sent[1]._subject).toMatch(/^📞 Call requested: Testy — .+, 1–3 pm$/);
});

const LANDING = ["auto-estimate", "sr22-insurance-sc", "cheap-car-insurance-sc", "landlord-insurance-sc", "es", "refer", "partners"];
for (const slug of LANDING) {
  test(`Landing page /${slug}/ loads with its links working`, async ({ page, request }) => {
    await page.goto(`/${slug}/`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://conwayguardianins.com/${slug}/`);
    const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href").split("#")[0]))]);
    for (const h of hrefs) {
      const res = await request.get(h === "/" ? "/index.html" : h + (h.endsWith("/") ? "index.html" : ""));
      expect(res.status(), `Link ${h} on /${slug}/`).toBeLessThan(400);
    }
  });
}

for (const slug of ["es", "refer", "partners"]) {
  test(`Form on /${slug}/ shows errors when empty and sends when filled in`, async ({ page }) => {
    await page.goto(`/${slug}/`);
    const form = page.locator("form[data-lead]");
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".field.bad").first()).toBeVisible();
    for (const f of await form.locator(".field").all()) {
      const inp = f.locator("input, select, textarea").first();
      if (!(await inp.evaluate((el) => el.required))) continue;
      const tag = await inp.evaluate((el) => el.tagName);
      const type = await inp.getAttribute("type");
      if (tag === "SELECT") await inp.selectOption({ index: 1 });
      else if (type === "tel") await inp.fill("8035550123");
      else if (type === "email") await inp.fill("test@example.com");
      else await inp.fill("Test Person");
    }
    await form.locator('.check input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(".done")).toBeVisible();
  });
}

test("Quote form Back button and review-page Edit buttons work", async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, "quote");
  await page.locator('label.cov-opt:has(input[value="renters"])').click();
  for (let i = 0; i < 60 && !(await page.locator("#sendBtn").isVisible()); i++) {
    await fillVisibleStep(page);
    await page.locator("#wizNext").click();
  }
  await expect(page.locator("#sendBtn")).toBeVisible();
  const edits = page.locator("#reviewBox [data-edit]");
  const n = await edits.count();
  expect(n).toBeGreaterThan(2);
  for (let i = 0; i < n; i++) {
    const key = await edits.nth(i).getAttribute("data-edit");
    await edits.nth(i).click();
    await expect(page.locator(`.wstep.on[data-key="${key}"]`), `Edit should jump to the ${key} step`).toBeVisible();
    for (let j = 0; j < 60 && !(await page.locator("#sendBtn").isVisible()); j++) await page.locator("#wizNext").click();
  }
  await page.locator("#wizBack").click();
  await expect(page.locator('.wstep.on[data-key="about"]')).toBeVisible();
});

/* ------------------------------------------------------------------ */
/* 6. Contact form                                                     */
/* ------------------------------------------------------------------ */
test("Contact form shows errors when empty and sends when filled in", async ({ page }) => {
  await open(page, "contact");
  await page.locator("#cfSend").click();
  await expect(page.locator("#cf-name-f")).toHaveClass(/bad/);
  await expect(page.locator("#cf-email-f")).toHaveClass(/bad/);
  await expect(page.locator("#cf-msg-f")).toHaveClass(/bad/);
  await page.locator("#cf-name").fill("Testy McTester");
  await page.locator("#cf-phone").fill("8035550123");
  await page.locator("#cf-email").fill("test.customer@example.com");
  await page.locator("#cf-topic").selectOption({ index: 1 });
  await page.locator("#cf-msg").fill("This is an automated check from the CheckEverythingWorks agent.");
  await page.locator("#cfSend").click();
  await expect(page.locator("#contactPanel")).toContainText("Message sent");
});

/* ------------------------------------------------------------------ */
/* 7. Carrier logo strip and phone links                               */
/* ------------------------------------------------------------------ */
test("Carrier logo strip shows all logos and keeps scrolling", async ({ page }) => {
  await open(page, "");
  const logos = page.locator(".marquee ul:not([aria-hidden]) img");
  await expect(logos).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    expect(await logos.nth(i).evaluate((img) => img.naturalWidth), `Carrier logo ${i + 1} did not load`).toBeGreaterThan(0);
  }
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  test.skip(reduced, "Animation is intentionally off for reduced-motion users");
  const x = () => page.locator(".marquee-track").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  const a = await x();
  await page.waitForTimeout(700);
  expect(await x(), "Logo strip is not moving").not.toBe(a);
});

test("Every Call Now / phone link dials the agency number", async ({ page }) => {
  await open(page, "");
  const hrefs = await page.locator('a[href^="tel:"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(2);
  const numbers = new Set(hrefs.map((h) => h.replace(/\D/g, "")));
  expect(numbers.size, `Phone links point to different numbers: ${[...numbers].join(", ")}`).toBe(1);
  expect([...numbers][0].length).toBeGreaterThanOrEqual(10);
});
