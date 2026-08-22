# Ronaldo Gol Karnesi

Cristiano Ronaldo'nun kulüp kulüp kariyer gol/asist dökümünü gösteren tek
sayfalık statik site. Tek dosya: [`index.html`](index.html) — build adımı,
framework veya sunucu tarafı kod gerektirmez.

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

## Güncelleme

Rakamları güncellemek için `index.html` içindeki ilgili sayıları değiştirip
tekrar push etmeniz yeterli; Pages birkaç dakika içinde yeni sürümü yayınlar.

Kaynaklar sayfanın altında (Wikipedia, FootyStats, StatMuse, Transfermarkt)
linklenmiştir.
