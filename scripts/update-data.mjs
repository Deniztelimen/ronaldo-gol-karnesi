#!/usr/bin/env node
// Al-Nassr'ı GÜNLÜK, Portekiz Milli Takımı'nı HAFTALIK (Pazartesi) kontrol edip
// data.json + index.html'i günceller. SportAPI7 (Sofascore verisi, RapidAPI)
// kullanır — ücretsiz planda AYDA 50 istek sınırı var, bu yüzden sıklık
// bilinçli olarak düşük tutuluyor (~30 + ~4-5 istek/ay).
//
// Ortam değişkeni: SPORTAPI_KEY (RapidAPI X-RapidAPI-Key).
// GitHub Actions'ta secrets.SPORTAPI_KEY olarak saklanır — repoya asla
// yazılmaz, commit edilmez.
//
// Kullanım: SPORTAPI_KEY=xxx node scripts/update-data.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const HOST = "sportapi7.p.rapidapi.com";
const KEY = process.env.SPORTAPI_KEY;

const root = new URL("../", import.meta.url);
const dataPath = new URL("data.json", root);

async function fetchJson(path) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { "X-RapidAPI-Key": KEY, "X-RapidAPI-Host": HOST },
  });
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

async function updateAlNassr(data) {
  const { playerId, alNassr } = data.liveConfig;
  const { uniqueTournamentId, seasonId } = alNassr.currentSeason;
  const json = await fetchJson(
    `/api/v1/player/${playerId}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`
  );
  const s = json.statistics || {};
  const club = data.clubs.find((c) => c.name === "Al-Nassr");
  if (!club) return false;

  const newGoals = alNassr.frozenGoals + (s.goals || 0);
  const newAssists = alNassr.frozenAssists + (s.assists || 0);
  const newApps = alNassr.frozenApps + (s.appearances || 0);

  const changed = newGoals !== club.goals || newAssists !== club.assists || newApps !== club.apps;
  club.goals = newGoals;
  club.assists = newAssists;
  club.apps = newApps;
  return changed;
}

async function updatePortugal(data) {
  const { playerId, portugal } = data.liveConfig;
  const json = await fetchJson(`/api/v1/player/${playerId}/national-team-statistics`);
  const entry = (json.statistics || []).find((s) => s.team && s.team.id === portugal.teamId);
  if (!entry) return false;

  const club = data.clubs.find((c) => c.name === "Portekiz Milli Takımı");
  if (!club) return false;

  // Not: bu endpoint asist vermiyor — asist alanı kasıtlı olarak dokunulmadan
  // elle girilmiş tahmini değerinde kalır.
  const changed = entry.goals !== club.goals || entry.appearances !== club.apps;
  club.goals = entry.goals;
  club.apps = entry.appearances;
  return changed;
}

async function main() {
  if (!KEY) {
    console.error("SPORTAPI_KEY tanımlı değil, güncelleme atlanıyor (build kırılmıyor).");
    return;
  }

  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  let changed = false;

  try {
    if (await updateAlNassr(data)) changed = true;
  } catch (err) {
    console.error("Al-Nassr güncellemesi başarısız:", err.message);
  }

  const isWeeklyCheckDay = new Date().getUTCDay() === 1; // Pazartesi
  if (isWeeklyCheckDay) {
    try {
      if (await updatePortugal(data)) changed = true;
    } catch (err) {
      console.error("Portekiz güncellemesi başarısız:", err.message);
    }
  }

  if (!changed) {
    console.log("Değişiklik yok (veya bu çalıştırmada güncelleme başarısız oldu) — index.html yeniden üretilmiyor.");
    return;
  }

  const today = new Date();
  data.asOf = today.toISOString().slice(0, 10);
  data.asOfDisplay = today.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
  execSync("node scripts/build.mjs", { stdio: "inherit", cwd: root });
}

main();
