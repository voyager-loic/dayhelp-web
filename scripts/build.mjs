import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { translations } from "../src/translations.mjs";
import { config } from "../src/config.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const template = await readFile(resolve(root, "src/template.html"), "utf8");
const legalTemplate = await readFile(resolve(root, "src/legal-template.html"), "utf8");
const languages = Object.keys(translations);

const mark = `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><g class="logo-heart" transform="scale(2)" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></g><g class="logo-house" transform="translate(9 9) scale(1.25)" fill="none" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>`;
const contactMark = mark.replace('class="brand-mark"', 'class="contact-mark"');

const iconNames = {
  cleaning: "broom-sparkles",
  laundry: "washing-machine",
  shopping: "shopping-basket",
  garden: "sprout",
  dog: "dog",
  pet: "house-heart",
};

async function loadIcon(name) {
  const source = await readFile(resolve(root, "node_modules/lucide-static/icons", `${name}.svg`), "utf8");
  const content = source.match(/<svg[\s\S]*?>([\s\S]*?)<\/svg>/)?.[1]?.trim();
  if (!content) throw new Error(`Could not load the ${name} service icon.`);
  return content;
}

const iconPaths = Object.fromEntries(await Promise.all(Object.entries(iconNames).map(async ([id, name]) => [id, await loadIcon(name)])));
const uiIconPaths = Object.fromEntries(await Promise.all(["arrow-up-right", "arrow-down", "arrow-left", "arrow-right"].map(async (name) => [name, await loadIcon(name)])));

// Push-mower outline adapted from Tabler Icons (MIT), mirrored to match the service-card composition.
iconPaths.lawn = `<g transform="translate(24 0) scale(-1 1)"><path d="M6 11h5.38a1 1 0 0 1 .9 .55l.72 1.45h5a1 1 0 0 1 1 1v2"/><path d="M3 4h1.13a1 1 0 0 1 1 .86L6.72 16"/><path d="M17 18H9"/><circle cx="7" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></g>`;

function serviceIcon(id) {
  return `<svg viewBox="0 0 24 24" class="service-icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${iconPaths[id]}</svg>`;
}

function uiIcon(name, className = "ui-icon") {
  return `<svg viewBox="0 0 24 24" class="${className}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${uiIconPaths[name]}</svg>`;
}

function fill(source, values) {
  return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, String(value)), source);
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "assets"), { recursive: true });
await cp(resolve(root, "src/assets"), resolve(dist, "assets"), { recursive: true });
await cp(resolve(root, "src/main.js"), resolve(dist, "assets/main.js"));

for (const lang of languages) {
  const t = translations[lang];
  const cards = t.services.map(([id, title, description, price, tone], index) => `<article class="service-card ${tone}"><div class="service-card-top"><span class="service-number">${String(index + 1).padStart(2, "0")}</span>${serviceIcon(id)}</div><div class="service-card-copy"><h2>${title}</h2><p>${description}</p><button type="button" data-service="${id}">${t.request}${uiIcon("arrow-up-right")}</button></div><div class="service-price"><span>${t.from}</span><strong>${price}</strong></div></article>`).join("");
  const prices = t.services.map(([id, title,, price], index) => `<button type="button" class="price-row" data-service="${id}"><span class="price-index">${String(index + 1).padStart(2, "0")}</span><span class="price-name">${title}</span><span class="price-value">${price}</span><span class="price-arrow">${uiIcon("arrow-up-right")}</span></button>`).join("");
  const options = t.services.map(([id, title]) => `<option value="${id}">${title}</option>`).join("");
  const languageLinks = languages.map((code) => `<a href="/${code}/" lang="${code}"${code === lang ? ' class="active"' : ""}>${code.toUpperCase()}</a>`).join("");
  const metaDescriptions = { de:"Zuverlässige Alltagshilfe für Haushalt, Garten und Haustiere in Romanshorn und Umgebung.", fr:"Une aide fiable pour la maison, le jardin et les animaux à Romanshorn et dans les environs.", it:"Un aiuto affidabile per la casa, il giardino e gli animali a Romanshorn e dintorni.", en:"Reliable everyday help for your home, garden and pets in Romanshorn and the surrounding area." };
  const html = fill(template, {
    LANG:lang, SITE_URL:config.siteUrl, RECIPIENT:config.recipientEmail, FORM_ENDPOINT:config.formEndpoint, META_DESCRIPTION:metaDescriptions[lang], MARK:mark, CONTACT_MARK:contactMark,
    ARROW_UP_RIGHT:uiIcon("arrow-up-right"), ARROW_DOWN:uiIcon("arrow-down"), ARROW_LEFT:uiIcon("arrow-left"), ARROW_RIGHT:uiIcon("arrow-right"),
    LANGUAGE_LINKS:languageLinks, SERVICE_CARDS:cards, PRICE_ROWS:prices, SERVICE_OPTIONS:options,
    NAV_SERVICES:t.navServices, NAV_PRICES:t.navPrices, NAV_CONTACT:t.navContact, SLOGAN:t.slogan, INTRO:t.intro,
    REQUEST:t.request, EXPLORE:t.explore, SERVICES_LABEL:t.servicesLabel, SWIPE:t.swipe, PRICES_EYEBROW:t.pricesEyebrow, PRICES_TITLE:t.pricesTitle,
    PRICES_TEXT:t.pricesText, CONTACT_EYEBROW:t.contactEyebrow, CONTACT_TITLE:t.contactTitle, CONTACT_TEXT:t.contactText,
    NAME:t.name, CONTACT:t.contact, SERVICE:t.service, SELECT:t.select, LOCALITY:t.locality, DATE:t.date, MESSAGE:t.message, PRIVACY:t.privacy,
    SEND:t.send, EMAIL_NOTE:t.emailNote, FORM_SUBJECT:t.formSubject, FORM_SENDING:t.formSending, FORM_SUCCESS:t.formSuccess, FORM_ERROR:t.formError,
    FOOTER_LINE:t.footerLine, LEGAL:t.legal, PRIVACY_LINK:t.privacyLink,
  });
  const langDir = resolve(dist, lang);
  await mkdir(resolve(langDir, "impressum"), { recursive: true });
  await mkdir(resolve(langDir, "datenschutz"), { recursive: true });
  await writeFile(resolve(langDir, "index.html"), html);
  await writeFile(resolve(langDir, "impressum/index.html"), fill(legalTemplate, { LANG:lang, TITLE:t.legal, BACK:t.back, TEXT:t.legalText, RECIPIENT:config.recipientEmail, ARROW_LEFT:uiIcon("arrow-left") }));
  await writeFile(resolve(langDir, "datenschutz/index.html"), fill(legalTemplate, { LANG:lang, TITLE:t.privacyLink, BACK:t.back, TEXT:t.privacyText, RECIPIENT:config.recipientEmail, ARROW_LEFT:uiIcon("arrow-left") }));
}

await writeFile(resolve(dist, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/${config.defaultLanguage}/"><script>location.replace('/${config.defaultLanguage}/')</script></head><body><a href="/${config.defaultLanguage}/">DayHelp</a></body></html>`);
