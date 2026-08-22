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

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

  const shareText = t.shareText
    .replace("{{N}}", totalGoalsFmt)
    .replace("{{REMAINING}}", remainingFmt)
    .replace(/"/g, "&quot;");

  const embedIframe = `<iframe src="${siteOrigin}/widget/" width="340" height="190" style="border:none;border-radius:16px;" loading="lazy" title="Ronaldo Goal Tracker"></iframe>`;
  const embedSnippet = escapeHtml(embedIframe);

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
    "{{SHARE_LABEL}}": t.shareLabel,
    "{{SHARE_TEXT}}": shareText,
    "{{SHARE_COPIED}}": t.shareCopied,
    "{{EMBED_TITLE}}": t.embedTitle,
    "{{EMBED_SNIPPET}}": embedSnippet,
    "{{EMBED_COPY_LABEL}}": t.embedCopyLabel,
    "{{COPIED_GENERIC}}": t.copiedGeneric,
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
    "{{FAQ5_Q}}": t.faq5Q,
    "{{FAQ5_A}}": t.faq5A,
    "{{FAQ6_Q}}": t.faq6Q,
    "{{FAQ6_A}}": t.faq6A,
    "{{FAQ7_Q}}": t.faq7Q,
    "{{FAQ7_A}}": t.faq7A,
    "{{FAQ8_Q}}": t.faq8Q,
    "{{FAQ8_A}}": t.faq8A,
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

// Başka sitelere gömülebilen küçük widget (iframe ile kullanılıyor).
// Dilden bağımsız, tek bir İngilizce sürüm — sayılar zaten evrensel.
function buildWidget() {
  const RADIUS = 40;
  const CIRC2 = 2 * Math.PI * RADIUS;
  const offset2 = (CIRC2 * (1 - progress)).toFixed(2);
  const fmt2 = (n) => fmt(n, "en-US");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ronaldo Goal Tracker Widget</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Sora:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  a.card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 320px;
    padding: 14px 16px;
    background: #0a100b;
    border: 1px solid #253027;
    border-radius: 16px;
    text-decoration: none;
    font-family: "Sora", ui-sans-serif, system-ui, sans-serif;
    color: #edf2ec;
  }
  .ring-wrap { position: relative; width: 84px; height: 84px; flex: none; }
  svg { transform: rotate(-90deg); }
  .track { fill: none; stroke: #253027; stroke-width: 8; }
  .fill { fill: none; stroke: url(#g); stroke-width: 8; stroke-linecap: round; }
  .center {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: "Anton", sans-serif; font-size: 22px;
  }
  .meta { min-width: 0; }
  .brand { font-family: "Sora"; font-weight: 700; font-size: 13px; margin: 0 0 2px; }
  .sub { font-family: "JetBrains Mono", monospace; font-size: 11px; color: #93a891; margin: 0 0 6px; }
  .remaining { font-family: "JetBrains Mono", monospace; font-size: 12px; color: #ffcb47; font-weight: 600; }
  .footer { font-family: "JetBrains Mono", monospace; font-size: 10px; color: #22c974; margin-top: 4px; }
</style>
</head>
<body>
<a class="card" href="${siteOrigin}/?utm_source=widget" target="_blank" rel="noopener">
  <div class="ring-wrap">
    <svg width="84" height="84" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22c974"/>
          <stop offset="100%" stop-color="#ff5468"/>
        </linearGradient>
      </defs>
      <circle class="track" cx="50" cy="50" r="${RADIUS}"></circle>
      <circle class="fill" cx="50" cy="50" r="${RADIUS}" stroke-dasharray="${CIRC2.toFixed(2)}" stroke-dashoffset="${offset2}"></circle>
    </svg>
    <div class="center">${fmt2(totals.goals)}</div>
  </div>
  <div class="meta">
    <p class="brand">Cristiano Ronaldo</p>
    <p class="sub">/ ${fmt2(target)} career goals</p>
    <p class="remaining">${fmt2(remaining)} to go</p>
    <p class="footer">ronaldogoalscore.com ↗</p>
  </div>
</a>
</body>
</html>
`;

  const outDir = new URL("widget/", root);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(new URL("index.html", outDir), html);
}

buildWidget();

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
