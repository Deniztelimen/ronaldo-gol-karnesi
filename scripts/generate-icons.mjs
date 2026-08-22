// Ana ekrana ekleme / PWA manifest için ikon dosyalarını üretir.
// Tasarım: koyu zemin + yeşil-kırmızı (Portekiz) gradyan + forma numarası "7".
// Kullanım: node scripts/generate-icons.mjs

import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const root = new URL("../", import.meta.url);
const fontFiles = [new URL("assets/fonts/Anton-Regular.ttf", root).pathname];

function iconSvg(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c974"/>
      <stop offset="100%" stop-color="#ff5468"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#0a100b"/>
  <circle cx="256" cy="240" r="176" fill="none" stroke="url(#g)" stroke-width="20"/>
  <text x="256" y="270" font-family="Anton" font-size="230" fill="#edf2ec"
    text-anchor="middle" dominant-baseline="middle">7</text>
</svg>`;
}

function render(size, outName) {
  const resvg = new Resvg(iconSvg(size), {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Anton" },
    fitTo: { mode: "width", value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(new URL(outName, root), png);
  console.log(outName, "->", png.length, "byte");
}

render(192, "icon-192.png");
render(512, "icon-512.png");
render(180, "apple-touch-icon.png");
