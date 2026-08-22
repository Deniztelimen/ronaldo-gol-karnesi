// data.json'daki güncel sayılara göre sosyal medya paylaşım görseli
// (og:image) üretir. Tüm dillerde ortak, tek bir görsel (İngilizce metin) —
// sayılar zaten evrensel, 8 ayrı görsel üretmenin karmaşıklığına değmiyor.
//
// Kullanım: node scripts/generate-og-image.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const root = new URL("../", import.meta.url);
const data = JSON.parse(readFileSync(new URL("data.json", root), "utf8"));

const totals = data.clubs.reduce(
  (acc, c) => ({ goals: acc.goals + c.goals }),
  { goals: 0 }
);
const target = data.milestoneTarget || 1000;
const remaining = Math.max(target - totals.goals, 0);
const progress = Math.min(totals.goals / target, 1);

const W = 1200;
const H = 630;
const R = 210;
const CX = 300;
const CY = 315;
const CIRC = 2 * Math.PI * R;
const offset = (CIRC * (1 - progress)).toFixed(2);

const fmt = (n) => n.toLocaleString("en-US");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="10%" r="90%">
      <stop offset="0%" stop-color="#182219"/>
      <stop offset="60%" stop-color="#0a100b"/>
    </radialGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c974"/>
      <stop offset="100%" stop-color="#ff5468"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#253027" stroke-width="22"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#ring)" stroke-width="22"
    stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${offset}"
    transform="rotate(-90 ${CX} ${CY})"/>

  <text x="${CX}" y="${CY - 8}" font-family="Anton" font-size="108" fill="#edf2ec"
    text-anchor="middle" dominant-baseline="middle">${fmt(totals.goals)}</text>
  <text x="${CX}" y="${CY + 52}" font-family="JetBrains Mono" font-weight="700" font-size="26"
    letter-spacing="2" fill="#93a891" text-anchor="middle">/ ${fmt(target)} GOALS</text>

  <text x="680" y="220" font-family="Sora" font-size="46" fill="#edf2ec" style="font-variation-settings:'wght' 800">Cristiano Ronaldo</text>
  <text x="680" y="270" font-family="JetBrains Mono" font-size="26" fill="#93a891" style="font-variation-settings:'wght' 500">Career goal tracker</text>

  <text x="680" y="360" font-family="Anton" font-size="64" fill="#ffcb47">${fmt(remaining)}</text>
  <text x="680" y="405" font-family="JetBrains Mono" font-size="24" fill="#93a891" style="font-variation-settings:'wght' 500">goals to reach 1,000</text>

  <rect x="680" y="470" width="420" height="2" fill="#253027"/>
  <text x="680" y="530" font-family="JetBrains Mono" font-size="28" letter-spacing="1" fill="#22c974" style="font-variation-settings:'wght' 700">ronaldogoalscore.com</text>
</svg>
`;

const resvg = new Resvg(svg, {
  font: {
    fontFiles: [
      new URL("assets/fonts/Anton-Regular.ttf", root).pathname,
      new URL("assets/fonts/Sora-Variable.ttf", root).pathname,
      new URL("assets/fonts/JetBrainsMono-Variable.ttf", root).pathname,
    ],
    loadSystemFonts: false,
    defaultFontFamily: "Sora",
  },
  background: "#0a100b",
});

const png = resvg.render().asPng();
writeFileSync(new URL("og-image.png", root), png);

console.log("og-image.png üretildi ->", { goller: totals.goals, kalan: remaining, boyutKB: Math.round(png.length / 1024) });
