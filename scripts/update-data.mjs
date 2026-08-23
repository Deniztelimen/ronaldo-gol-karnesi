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
  const club = data.clubs.find((c) => c.id === "alnassr");
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

  const club = data.clubs.find((c) => c.id === "portugal");
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
  let anySucceeded = false;
  const goalsBefore = data.clubs.reduce((sum, c) => sum + c.goals, 0);

  try {
    await updateAlNassr(data);
    anySucceeded = true;
  } catch (err) {
    console.error("Al-Nassr güncellemesi başarısız:", err.message);
  }

  const isWeeklyCheckDay = new Date().getUTCDay() === 1; // Pazartesi
  if (isWeeklyCheckDay) {
    try {
      await updatePortugal(data);
      anySucceeded = true;
    } catch (err) {
      console.error("Portekiz güncellemesi başarısız:", err.message);
    }
  }

  if (!anySucceeded) {
    // API'ye hiç ulaşılamadıysa (kota/ağ hatası vb.) "bugün itibarıyla"
    // yazıp yanlış bir doğrulama izlenimi vermemek için hiçbir şeye
    // dokunmadan çıkılır — tarih bir sonraki başarılı çalıştırmaya kadar
    // olduğu gibi kalır.
    console.log("Hiçbir kaynağa ulaşılamadı — data.json değiştirilmedi.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  // "İtibarıyla" tarihi, en az bir kaynak başarıyla kontrol edildiği her
  // çalıştırmada bugüne çekilir — sayılar değişmese bile "kontrol edildi,
  // güncel" bilgisini taşır. Kullanıcı isteği: 2026-08-23.
  data.asOf = today;

  // "Son gol" tarihini ekstra bir API isteği YAPMADAN takip eder: toplam gol
  // sayısı bir önceki kontrole göre arttıysa, bu çalıştırmanın tarihi "son
  // gol tarihi" olarak kaydedilir. Kesin maç tarihi değil ama otomasyon her
  // gün çalıştığı için pratikte 0-1 gün fark eder ve zamanla kendini düzeltir.
  const goalsAfter = data.clubs.reduce((sum, c) => sum + c.goals, 0);
  if (goalsAfter > goalsBefore) {
    data.lastGoalDate = today;
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
  execSync("node scripts/build.mjs", { stdio: "inherit", cwd: root });
  execSync("node scripts/generate-og-image.mjs", { stdio: "inherit", cwd: root });
}

main();
