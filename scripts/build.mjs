// data.json (sayılar) + i18n.mjs (metinler) + template.html (tasarım)
// -> her dil için ayrı bir index.html.
// Sadece string yer değiştirme yapar; framework/derleyici gerektirmez.
// Kullanım: node scripts/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { locales, clubText, ui, siteOrigin } from "./i18n.mjs";

const root = new URL("../", import.meta.url);
const dataPath = new URL("data.json", root);
const templatePath = new URL("template.html", root);
const sitemapPath = new URL("sitemap.xml", root);

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const template = readFileSync(templatePath, "utf8");

const totals = data.clubs.reduce(
  (acc, c) => ({
    apps: acc.apps + c.apps,
    goals: acc.goals + c.goals,
    assists: acc.assists + c.assists,
  }),
  { apps: 0, goals: 0, assists: 0 }
);

const target = data.milestoneTarget || 1000;
const remaining = Math.max(target - totals.goals, 0);
const progress = Math.min(totals.goals / target, 1);

const RADIUS = 85;
const CIRC = 2 * Math.PI * RADIUS;
const ringOffset = (CIRC * (1 - progress)).toFixed(2);

function fmt(n, intl) {
  // useGrouping'i açıkça true vermek gerekiyor — bazı Node/ICU sürümlerinde
  // it-IT ve pt-PT gibi dillerin varsayılanı hiç binlik ayracı koymuyor.
  return n.toLocaleString(intl, { useGrouping: true });
}

function pct(intl) {
  // %94,7 / 94.7% gibi yerel biçimlere Intl.NumberFormat ile uyum sağlar.
  return new Intl.NumberFormat(intl, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(progress);
}

function renderBadge(c) {
  const style = [
    `--badge-bg:${c.badgeBg || "var(--surface-2)"}`,
    `--badge-fg:${c.badgeFg || "var(--text)"}`,
    c.badgeBorder ? `--badge-border:${c.badgeBorder}` : "",
  ]
    .filter(Boolean)
    .join(";");

  if (c.badgeSplit) {
    return `<span class="badge badge--split" style="${style};--badge-split:${c.badgeSplit}"><span>${c.abbr}</span></span>`;
  }
  return `<span class="badge" style="${style}">${c.abbr}</span>`;
}

function renderRow(c, locale, t, intl) {
  const text = clubText[c.id][locale];
  const tag = c.tag ? `<span class="tag">${t.clubRecordTag}</span>` : "";
  const cls = c.approx ? " approx" : "";
  const prefix = c.approx ? "~" : "";
  const note = text.note ? `<p class="card-note">${text.note}</p>` : "";
  const kindClass = c.national ? "kind--national" : "kind--club";
  const kindLabel = c.national ? t.kindNational : t.kindClub;
  const badge = c.abbr ? renderBadge(c) : "";

  return `      <div class="card">
        <div class="card-head">
          ${badge}
          <div class="card-title">
            <span class="name">${text.name}</span>
            <span class="meta"><span class="kind ${kindClass}">${kindLabel}</span><span>·</span><span>${text.years}</span></span>
          </div>
          ${tag}
        </div>
        <div class="card-stats">
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.apps, intl)}</span><span class="l">${t.statMatchLabel}</span></span>
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.goals, intl)}</span><span class="l">${t.statGoalLabel}</span></span>
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.assists, intl)}</span><span class="l">${t.statAssistLabel}</span></span>
        </div>
        ${note}
      </div>`;
}

function renderLangLinks(currentCode) {
  return locales
    .map((l) => {
      const href = `${siteOrigin}/${l.path}`;
      const current = l.code === currentCode ? ' aria-current="true"' : "";
      return `<a href="${href}"${current}><span>${l.flag}</span><span>${l.label}</span></a>`;
    })
    .join("\n    ");
}

function renderHreflangLinks() {
  const alts = locales
    .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${siteOrigin}/${l.path}">`)
    .join("\n");
  return `${alts}\n<link rel="alternate" hreflang="x-default" href="${siteOrigin}/">`;
}

function fillTemplate(html, replacements) {
  let out = html;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  return out;
}

function localizedDate(intl, isoDate = data.asOf) {
  // ISO ("YYYY-MM-DD") bir tarihi her dilde o dile özgü biçimde
  // (ör. "22 August 2026" / "22. August 2026") gösterir.
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function buildLocale(locale) {
  const t = ui[locale.code];
  const intl = locale.intl;
  const asOfDisplay = localizedDate(intl);

  const rowsHtml = data.clubs.map((c) => renderRow(c, locale.code, t, intl)).join("\n");
  const shirtCount = fmt(data.clubs.length, intl);
  const remainingFmt = fmt(remaining, intl);
  const totalGoalsFmt = fmt(totals.goals, intl);
  const totalAssistsFmt = fmt(totals.assists, intl);
  const totalAppsFmt = fmt(totals.apps, intl);
  const targetFmt = fmt(target, intl);
  const pctFmt = pct(intl);

  const milestoneRemaining = t.milestoneRemaining
    .replace("{{N}}", remainingFmt)
    .replace("{{PCT}}", pctFmt);
  const heroSubAssists = t.heroSubAssists.replace("{{N}}", totalAssistsFmt);
  const heroSubMatches = t.heroSubMatches.replace("{{N}}", totalAppsFmt);
  const heroSubShirts = t.heroSubShirts.replace("{{N}}", shirtCount);
  const asOfBadge = t.asOfBadge.replace("{{DATE}}", asOfDisplay);
  const footerUpdated = t.footerUpdated.replace("{{AS_OF_DATE}}", asOfDisplay);

  const faq1A = t.faq1A
    .replace("{{AS_OF_DATE}}", asOfDisplay)
    .replace("{{TOTAL_GOALS}}", totalGoalsFmt)
    .replace("{{GOALS_REMAINING}}", remainingFmt);
  const faq3A = t.faq3A.replace("{{TOTAL_ASSISTS}}", totalAssistsFmt);

  const lastGoalBadge = data.lastGoalDate
    ? `<span class="last-goal-badge">${t.lastGoalLabel.replace("{{DATE}}", localizedDate(intl, data.lastGoalDate))}</span>`
    : "";

  const replacements = {
    "{{HTML_LANG}}": locale.code,
    "{{PAGE_TITLE}}": t.pageTitle,
    "{{META_DESCRIPTION}}": t.metaDescription,
    "{{CANONICAL_URL}}": `${siteOrigin}/${locale.path}`,
    "{{HREFLANG_LINKS}}": renderHreflangLinks(),
    "{{LANG_SWITCH_LABEL}}": t.langSwitchLabel,
    "{{CUR_FLAG}}": locale.flag,
    "{{CUR_CODE}}": locale.code.toUpperCase(),
    "{{LANG_LINKS}}": renderLangLinks(locale.code),
    "{{EYEBROW}}": t.eyebrow,
    "{{GOAL_UNIT}}": t.goalUnit,
    "{{MILESTONE_TARGET}}": targetFmt,
    "{{MILESTONE_REMAINING}}": milestoneRemaining,
    "{{HERO_SUB_ASSISTS}}": heroSubAssists,
    "{{HERO_SUB_MATCHES}}": heroSubMatches,
    "{{HERO_SUB_SHIRTS}}": heroSubShirts,
    "{{HERO_CAPTION}}": t.heroCaption,
    "{{AS_OF_BADGE}}": asOfBadge,
    "{{SECTION_TIMELINE_TITLE}}": t.sectionTimelineTitle,
    "{{LAST_GOAL_BADGE}}": lastGoalBadge,
    "{{CLUB_ROWS}}": rowsHtml,
    "{{TOTAL_CARD_LABEL}}": t.totalCardLabel,
    "{{TOTAL_APPS}}": totalAppsFmt,
    "{{TOTAL_GOALS}}": totalGoalsFmt,
    "{{TOTAL_ASSISTS}}": totalAssistsFmt,
    "{{STAT_MATCH_LABEL}}": t.statMatchLabel,
    "{{STAT_GOAL_LABEL}}": t.statGoalLabel,
    "{{STAT_ASSIST_LABEL}}": t.statAssistLabel,
    "{{RECORD_CALLOUT}}": t.recordCallout,
    "{{FAQ_TITLE}}": t.faqTitle,
    "{{FAQ1_Q}}": t.faq1Q,
    "{{FAQ1_A}}": faq1A,
    "{{FAQ2_Q}}": t.faq2Q,
    "{{FAQ2_A}}": t.faq2A,
    "{{FAQ3_Q}}": t.faq3Q,
    "{{FAQ3_A}}": faq3A,
    "{{FAQ4_Q}}": t.faq4Q,
    "{{FAQ4_A}}": t.faq4A,
    "{{FOOTER_NOTE}}": t.footerNote,
    "{{FOOTER_UPDATED}}": footerUpdated,
    "{{RING_CIRC}}": CIRC.toFixed(2),
    "{{RING_OFFSET}}": ringOffset,
  };

  const html = fillTemplate(template, replacements);

  const outDir = new URL(locale.path, root);
  if (locale.path) mkdirSync(outDir, { recursive: true });
  writeFileSync(new URL("index.html", outDir), html);
}

for (const locale of locales) {
  buildLocale(locale);
}

// sitemap.xml: her dil için bir <url>, hepsi birbirine hreflang alternate veriyor.
function buildSitemap() {
  const urls = locales
    .map((l) => {
      const loc = `${siteOrigin}/${l.path}`;
      const alternates = locales
        .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.code}" href="${siteOrigin}/${alt.path}"/>`)
        .join("\n");
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${data.asOf}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${l.code === "tr" ? "1.0" : "0.8"}</priority>
${alternates}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

writeFileSync(sitemapPath, buildSitemap());

console.log("Tüm diller üretildi ->", {
  diller: locales.map((l) => l.code).join(", "),
  toplamGol: totals.goals,
  toplamAsist: totals.assists,
  toplamMac: totals.apps,
  kalanGol: remaining,
});
