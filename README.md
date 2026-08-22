# Ronaldo Gol Karnesi

Cristiano Ronaldo'nun kulüp kulüp kariyer gol/asist dökümünü, 1.000 gole
kalan mesafeyi gösteren tek sayfalık site. Al-Nassr (günlük) ve Portekiz
Milli Takımı (haftalık) rakamları [SportAPI7](https://rapidapi.com/rapidsportapi/api/sportapi7)
(Sofascore verisi) üzerinden otomatik güncellenir.

## Dosya yapısı

- `index.html` — yayınlanan sayfa (elle düzenlemeyin, üretilir)
- `template.html` — sayfanın tasarım/markup şablonu, `{{PLACEHOLDER}}` içerir
- `data.json` — tek gerçek veri kaynağı: kulüp/sezon rakamları + otomasyon config'i
- `scripts/build.mjs` — `data.json` + `template.html` → `index.html`
- `scripts/update-data.mjs` — SportAPI7'den çekip `data.json`'u günceller, sonra `build.mjs`'i çağırır
- `.github/workflows/update-data.yml` — günlük GitHub Actions cron job

## GitHub Pages ile yayınlama

1. **Bu klasörü bir GitHub reposuna gönderin.**

   ```bash
   cd /Users/telimen/Developer/ronaldo-gol-karnesi
   gh repo create ronaldo-gol-karnesi --public --source=. --remote=origin --push
   ```

   (`gh` CLI kurulu değilse: GitHub'da elle boş bir repo oluşturup
   `git remote add origin <repo-url>` ve `git push -u origin main` ile de
   yapabilirsiniz.)

2. **GitHub Pages'i açın:** Repo → *Settings* → *Pages* → *Build and
   deployment* → Source: `Deploy from a branch` → Branch: `main` / `/(root)`.

3. **Custom domain girin:** Aynı Pages ekranındaki *Custom domain* kutusuna
   satın aldığınız alan adını yazın (ör. `www.ronaldogoalscoree.com`).
   GitHub bunu otomatik olarak repodaki `CNAME` dosyasına yazar — o dosya
   zaten burada duruyor, sadece içindeki adresi kendi domaininizle
   güncelleyin.

4. **DNS kayıtlarını domain sağlayıcınızda ayarlayın:**
   - `www` alt alan adı için: bir **CNAME** kaydı → `<kullanıcı-adınız>.github.io`
   - Kök alan adı (`ronaldogoalscoree.com`, `www` olmadan) için de
     çalışmasını istiyorsanız: dört **A** kaydı → GitHub Pages'in IP'leri
     (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`)
   - Tam güncel liste: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>

5. DNS yayılması (birkaç dakika – birkaç saat) sonra Pages ekranında
   *Enforce HTTPS* kutusunu işaretleyin — GitHub ücretsiz bir SSL sertifikası
   üretir.

## Günlük otomatik güncellemeyi aktifleştirme

Repo GitHub'a gittikten sonra, **tek seferlik**:

1. RapidAPI'de [SportAPI7](https://rapidapi.com/rapidsportapi/api/sportapi7)
   sayfasında **App** sekmesi → `X-RapidAPI-Key` değerini kopyalayın.
2. Repo → *Settings* → *Secrets and variables* → *Actions* → **New repository
   secret**.
   - Name: `SPORTAPI_KEY`
   - Secret: (kopyaladığınız key)
3. Kaydedin. Bu kadar — `.github/workflows/update-data.yml` her gün 06:00
   UTC'de (09:00 TR) otomatik çalışır, değişiklik varsa commit'leyip push'lar,
   Pages birkaç dakika içinde yeni sürümü yayınlar.

İsterseniz Actions sekmesinden workflow'u elle de (**Run workflow**)
tetikleyebilirsiniz.

### Neden günlük DEĞİL de "Al-Nassr günlük, Portekiz haftalık"?

SportAPI7'nin ücretsiz planı **ayda 50 istek** ile sınırlı. Al-Nassr'ın ana
ligini (Suudi Pro Lig) günlük kontrol etmek ayda ~30 istek tutuyor; buna
Portekiz'i de her gün eklemek ayı aşardı. Bu yüzden Portekiz'i haftada bir
(Pazartesi) kontrol ediyoruz — toplam ayda ~35 istek, sınırın altında kalıyor.

**Kapsam dışı (v1):** Al-Nassr'ın kupa/AFC Şampiyonlar Ligi maçları
otomasyonda YOK (kota yetmiyor) — sadece lig golleri günlük ekleniyor. Kupa
golleri `data.json`'daki `liveConfig.alNassr.frozenGoals` değerine elle
eklenerek periyodik olarak (ör. ayda bir) mutabakat yapılabilir. Daha sık/tam
kapsamlı otomasyon isterseniz SportAPI7'de ücretli bir plana (PRO, $15/ay)
geçmek gerekir.

### Yeni sezon başladığında

Suudi Pro Lig sezonu değiştiğinde (~her Ağustos), `data.json` içindeki
`liveConfig.alNassr`:
- `currentSeason.seasonId` yeni sezonun ID'sine güncellenmeli
- `frozenGoals` / `frozenAssists` / `frozenApps`, biten sezonun rakamları
  eklenerek artırılmalı

Yeni sezon ID'sini bulmak için:
```
GET https://sportapi7.p.rapidapi.com/api/v1/player/750/statistics/seasons
```

## Kaynaklar

- Al-Nassr ve Portekiz (canlı): [SportAPI7](https://rapidapi.com/rapidsportapi/api/sportapi7) (Sofascore verisi)
- Kapanmış dönemler (Sporting, Man Utd, Real Madrid, Juventus): [Wikipedia](https://en.wikipedia.org/wiki/Cristiano_Ronaldo), [FootyStats](https://footystats.org/players/portugal/cristiano-ronaldo), [Transfermarkt](https://www.transfermarkt.com/cristiano-ronaldo/leistungsdaten/spieler/8198)
