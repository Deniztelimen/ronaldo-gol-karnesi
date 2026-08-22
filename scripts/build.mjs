// data.json + template.html -> index.html
// Sadece string yer değiştirme yapar; framework/derleyici gerektirmez.
// Kullanım: node scripts/build.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const dataPath = new URL("data.json", root);
const templatePath = new URL("template.html", root);
const outPath = new URL("index.html", root);
const sitemapPath = new URL("sitemap.xml", root);

const data = JSON.parse(readFileSync(dataPath, "utf8"));

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
const pct = `%${(progress * 100).toFixed(1).replace(".", ",")}`;

const RADIUS = 85;
const CIRC = 2 * Math.PI * RADIUS;
const ringOffset = (CIRC * (1 - progress)).toFixed(2);

function fmt(n) {
  return n.toLocaleString("tr-TR");
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

function renderRow(c) {
  const tag = c.tag ? `<span class="tag">${c.tag}</span>` : "";
  const cls = c.approx ? " approx" : "";
  const prefix = c.approx ? "~" : "";
  const note = c.note ? `<p class="card-note">${c.note}</p>` : "";
  const kindClass = c.national ? "kind--national" : "kind--club";
  const kindLabel = c.national ? "Milli Takım" : "Kulüp";
  const badge = c.abbr ? renderBadge(c) : "";

  return `      <div class="card">
        <div class="card-head">
          ${badge}
          <div class="card-title">
            <span class="name">${c.name}</span>
            <span class="meta"><span class="kind ${kindClass}">${kindLabel}</span><span>·</span><span>${c.years}</span></span>
          </div>
          ${tag}
        </div>
        <div class="card-stats">
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.apps)}</span><span class="l">Maç</span></span>
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.goals)}</span><span class="l">Gol</span></span>
          <span class="stat"><span class="n${cls}">${prefix}${fmt(c.assists)}</span><span class="l">Asist</span></span>
        </div>
        ${note}
      </div>`;
}

const rowsHtml = data.clubs.map(renderRow).join("\n");

let html = readFileSync(templatePath, "utf8");

const replacements = {
  "{{AS_OF_DATE}}": data.asOfDisplay,
  "{{TOTAL_GOALS}}": fmt(totals.goals),
  "{{TOTAL_ASSISTS}}": fmt(totals.assists),
  "{{TOTAL_APPS}}": fmt(totals.apps),
  "{{GOALS_REMAINING}}": fmt(remaining),
  "{{PROGRESS_PCT}}": pct,
  "{{MILESTONE_TARGET}}": fmt(target),
  "{{RING_CIRC}}": CIRC.toFixed(2),
  "{{RING_OFFSET}}": ringOffset,
  "{{CLUB_ROWS}}": rowsHtml,
};

for (const [token, value] of Object.entries(replacements)) {
  html = html.split(token).join(value);
}

writeFileSync(outPath, html);

// sitemap.xml içindeki lastmod tarihini de senkron tut
try {
  let sitemap = readFileSync(sitemapPath, "utf8");
  sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/, `<lastmod>${data.asOf}</lastmod>`);
  writeFileSync(sitemapPath, sitemap);
} catch {
  // sitemap.xml henüz yoksa sessizce geç
}

console.log("index.html güncellendi ->", {
  toplamGol: totals.goals,
  toplamAsist: totals.assists,
  toplamMac: totals.apps,
  kalanGol: remaining,
  yuzde: pct,
});
