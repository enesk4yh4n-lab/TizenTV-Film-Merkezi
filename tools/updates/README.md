# Film Merkezi — WGT 1.5.0 / çekirdek 1.9.0

Etkin kanal `updates/update.json`, değişmez setler `updates/versions/<sürüm>/` altındadır. `updates/pilot` eski istemcilerin dondurulmuş arşividir. WGT son ortak seti ve 22 çevrimiçi eklentinin imzalı başlangıç kopyalarını içerir. İlk açılışta indirme zorunluluğu yoktur. Uygulama kimliği yükseltme için korunur.

Kanonik başlangıç katmanı `tools/updates/stable/`. `build-stable.cjs` dosya izin listesini ve imzalı tam seti üretir. Site başlangıcı `loadBundled/seedBundled` ile imza/özet denetiminden geçer; WGT'den salt okunur yüklenir, indirilen yeni paketler özel alanda öncelik kazanır. Sonraki açılışlar kaldırılan siteyi yeniden eklemez. Yayınlanan sürüm değiştirilemez. `package-stable.ps1` imzasız public WGT, `sources-stable.ps1` native/CA/decoder kaynak ZIP'i üretir. Özel anahtarlar kullanıcı hesabında, depo dışında tutulur.

İlgili denetimler: `node --test tools/updates/stable.test.cjs tools/updates/coordinator.test.cjs tools/updates/sites-fixes.test.cjs`; `node tools/updates/stable-browser.cjs`. `audit-stable.py` yerel imzalı/public WGT eşleşmesini, imza referanslarını, native ve kaynak ZIP'i özetlerini denetler. Bu araçlar WGT'ye alınmaz.

`deneme/ortak/katalog/update-coordinator.js` çekirdek ve etkin depolardaki kurulu/yeni siteleri tek denetimde toplar. Açılış kontrolü metadata ile sınırlıdır; indirme seçimi ve yeniden açılış onay ekranından yapılır. Yeni siteler varsayılan olarak seçili değildir.

## Eski pilot araçları — tarihsel açıklamalar

Aşağıdaki komutlar önceki yayınların üretim geçmişidir; normal kanala yeni yayın için kullanılmaz.

**Son bileşen 1.5.0:** Site yönetimi ve ayrı güncelleme kapsamları. `management150-build.cjs` bu core güncellemesini üretir; site/çözümleyici/vendor/native değişikliği içerirse reddeder. `management150-browser.cjs` imzalı örnek eklentiyle kur/güncelle/kapat/aç/kaldır ve değişmeyen core SHA-256 kanıtını; `management150-emulator.cjs` aynı WGT ile gerçek GitHub geçişini sınar. [Rapor ve yerleşik site sınırı](../../docs/arsiv/TEST_SONUCLARI_YONETIM_1.5.0.md). Site paketleri mevcut Plugin SDK ile ayrı yayımlanır; bu teslimde 12 site taşınmaz ve kararlı WGT çıkarılmaz.

**Son bileşen 1.4.1:** Android düzenindeki sekiz kategorili TV ayarları. `node tools/updates/settings140-build.cjs` bu çalışmanın imzalı setini üretir; yayımlanmış sürümün üzerine yazmayı reddeder. WGT yeniden paketlenmez. `settings140-bootstrap.cjs` yükleyici/CSP'yi, `settings140-emulator.cjs` aynı WGT ile gerçek GitHub geçişini sınar. Son ekranda Güncellemeler, **Oynatma ve kaynaklar** kategorisindedir. [Rapor ve sınırlar](../../docs/arsiv/TEST_SONUCLARI_AYARLAR_1.4.1.md).

**Son bileşen 1.3.2:** HDF’nin sonunda eğik çizgi olmayan bölüm URL’leri okunur; eski boş dizi detay önbelleği yenilenir. `node tools/updates/hdf-series132-build.cjs` yalnız iki modülü yeni, imzalı tam sete taşır. Aynı 1.4.1 WGT ile gerçek GitHub indirmesi/uygulaması ve Umut Taciri’nin on bölümü doğrulandı. [Sonuçlar](../../docs/arsiv/TEST_SONUCLARI_BILESEN_1.3.2.md). Aşağıdaki 1.3.1 bölümündeki native değişiklikler önceki WGT çalışmasıdır; 1.3.2 native veya WGT değiştirmez.

**8 Kasım 2026:** HDF için `tools/plugins/build-hdf.cjs` ile 1.3.1 tam bileşen seti üretilir. Minimum WGT 1.4.1'dir; yeni native izin eşleyicisi `{n}` için 1–6 rakam kabul eder. HDF katalog HTML kökeni `legacyTextOrigins` üzerinden çalışan eski metin yolunu korurken CDN medya parçaları doğrudan native TLS ArrayBuffer yolunu kullanır. Bu tercih imzalı manifestin parçasıdır; TLS doğrulaması kapatılmaz. Başarısız TLS metin isteği alternatif taşıma yoluna geçer, aynı TLS işi ikinci kez açılmaz. SDK 1.0.2 sayısal izinlerde minimum sürümü denetler. [Sonuçlar](../../docs/arsiv/TEST_SONUCLARI_1.4.1.md).

`promote-component.cjs 1.3.1` / `publish.cjs --publish` yeni WGT'nin `plugins141/gate.json` kanıtını ister. Ana 1.2.0 ve önceki pilot paketler korunur. **Aşağıdaki 1.4.0 mimarisi önceki sürüm kaydıdır.**

Güncel pilot **bağımsız eklenti depolarını** destekler. Kullanıcı kendi GitHub/HTTPS adresini ekleyebilir; yayıncı ücretsiz olarak kendi RSA-2048 anahtarını üretir. Çekirdek güncellemesi ile site eklentisi güncellemesi ayrıdır. HDF + Filmizle yerleşik, üçüncü taraf eklentileri kullanıcı seçimiyle eklenir. [SDK, kurulum ve API](../plugins/README.md), [test raporu](../../docs/arsiv/TEST_SONUCLARI_1.4.0.md). Yeni stage `tools/test-results/plugins140/stage`, native kaynak `tools/plugins/native/` altındadır. Yeni eklenti depoları için bir kez 1.4.0 WGT gerekir.

`promote-component.cjs` ve `publish.cjs`, manifestin minimum WGT sürümüne karşılık gelen kurulum/test kapısını denetler. 1.3.0 çekirdek bileşeni minimum 1.4.0 ister; eski 1.3.1 WGT bunu uygulamaz. Önceki sürüm dosyaları değişmez olarak korunur. `runtime/storage.js` isteğe bağlı `film-plugins` alanını; `native-tls.js` yayıncı başına güven ve origin politikası işlemlerini destekler. Bunlar yerel işlemlerdir; iki HTTP işi sınırını tüketmezler.

**Aşağıdaki 1.3.1 üretim adımları tarihsel kayıttır; güncel eklenti SDK’sı için yukarıdaki kılavuzu kullanın.**

Güncel pilot HDF ve Filmizle içerir. 1.3.0'daki sabit native host sınırı, **1.3.1 WGT ile bir kez** değiştirilmiştir. Sonraki JS/site ve imzalı HTTPS köken güncellemeleri WGT değiştirmeden alınır. Yeni native ikili/privilege/CSP/açık anahtar hâlâ yeni WGT gerektirir. [Canlı sonuçlar ve kalan HDF 404 durumu](../../docs/arsiv/TEST_SONUCLARI_1.3.1.md).

Yeni dosyalar:

| Dosya | Görev |
| --- | --- |
| `native-general/network-policy.h` | İmzayı native MbedTLS içinde doğrular; origin/wildcard ve özel IP sınırları. |
| `prepare-general.cjs`, `native-general/` | Ana native kaynaklara dokunmadan üç mimari için TLS/metin/ArrayBuffer kaynağı. |
| `runtime/native-tls.js` | Sabit WGT köprüsü; ayrı iptal, iki iş, Range, boyut ve yönlendirme denetimi. |
| `transport-sources.cjs` | Kanonik ağ dosyalarından yalnız pilot bileşenine TLS uyarlaması üretir. |
| `build-general.cjs` | Değişmez 1.2.0 baseline / `update131/stage` / 124 dosyalık izin listesi. Yayımlanmış sürüm üzerinde `--replace-unpublished` kullanılmaz. |
| `extend-origins.cjs` | Önceki tam setten yeni sürüm üretir; yalnız ölçülmüş HTTPS origin belgesi ve ayrı imzasını değiştirir. |
| `add-site.cjs` | Yeni sağlayıcıyı `--origin` ve gerekiyorsa `--module` ile ekler; dosya ve yeni izinleri imzalar. |
| `promote-component.cjs`, `publish.cjs` | İmza/hash ve kurulu WGT teknik kapısını kontrol ederek yalnız pilot kanalını yayımlar. |
| `verify-general.cjs`, `audit-general.py` | ES5, paket/kaynak, native hash, XML imzaları ve korunan paketler. |
| `general-browser.cjs`, `general-emulator.cjs` | Gerçek yanıt fixture'ları / canlı iki içerik ve aynı WGT ile gerçek GitHub politika güncellemesi. |
| `native-signature-emulator.cjs` | Native instance'ın ilk yapılandırmasında geçici QA enjeksiyonu; yanlış imza ve değiştirilmiş veri reddi. Hook kaldırılır. |

Tek seferlik 1.3.1 üretimi:

```powershell
node tools/updates/prepare-general.cjs
wsl -d Ubuntu-22.04 -- python3 /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/build-native-http.py --source /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/updates/native-general/secure-http.cpp --out /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/updates/native-general/bin
node tools/updates/build-general.cjs
& tools/updates/package-general.ps1 -LocalTestSign
& tools/updates/sources-general.ps1
python tools/updates/audit-general.py
```

Sonraki site için şablon (sürüm/site/alan adları örnektir; çalıştırmadan gerçek ölçümle doldurulur):

```text
node tools/updates/add-site.cjs <yeni-sürüm> <site-id> 1.2.1 --origin https://site.example.org --origin https://cdn.example.org --module cozumleyiciler/ornek/resolver.js
node tools/updates/extend-origins.cjs <yeni-sürüm> 1.2.1 https://yeni-cdn.example.org
node tools/updates/promote-component.cjs <yeni-sürüm>
node tools/updates/publish.cjs --publish
```

Sağlayıcı önce kanonik site kaydında bulunmalı; bağımlı çözümleyici modülleri yükleme sırasına dahil edilmelidir. `add-site.cjs` kök dosyaları ve WGT'yi yeniden üretmez. Native köken izni olmayan yeni bir CDN'nin TLS üzerinden çalıştığı varsayılmaz. Kaynaklar farklı sürümlerden karıştırılmaz. `extend-origins.cjs` yalnız bileşen üretir; kanala geçiş ve yayın ayrı, açık işlemlerdir. Özel anahtar mevcut depo dışı konumda kalır.

**Aşağıdaki 1.3.0 / 1.1.1 açıklamaları tarihsel üretim ve önceki kısıtların kaydıdır.**

Ana `deneme/` projesi ve 1.2.0 WGT'leri değiştirilmez. Ayrı uygulama `FMUpTest01.FilmMerkezi`, yalnız HDF ile başlar. Bileşenlerin sürümü WGT'den ayrıdır: gömülü **1.0.0**, GitHub'daki **1.0.1**.

| Dosya | İşlev |
| --- | --- |
| `build.cjs` | Kanonik kaynakları okuyup pilot dönüşümlerini, staging'i, iki imzalı sürümü ve paket izin listesini üretir. Asıl dosyalara yazmaz. |
| `runtime/verify.js` | Sabit RSA-2048/SHA-256 güven sınırı; manifest, yol, sürüm ve boyut denetimi. |
| `runtime/storage.js` | Yalnız uygulamanın `wgt-private/film-update` alanı; iki günlük ve SHA ile adlandırılan nesneler. |
| `runtime/manager.js` | Metadata kontrolü; kullanıcı isteğiyle indirme, dosya yeniden kullanımı, iptal, uygulama ve geri dönüş. |
| `runtime/boot.js` | Tutarlı tam sürümü Blob üzerinden yükler; başlangıç hatasında önceki sete döner. |
| `runtime/panel.js` | Seçenekler → Güncellemeler, TR/EN işlem etiketleri. |
| `prepare-native.cjs`, `native/` | Üretimden ayrı TLS kaynağı/girdileri; yalnız pilot GitHub kanalına ek izin. |
| `protect-key.ps1`, `sign.cjs` | Depo dışı anahtar izinleri ve seçilen manifest/bildirim JSON'unun imzası. |
| `verify.cjs`, `audit.py` | ES5, dosya/manifest özetleri, paket, CSP, XML imzaları, native girdiler ve eski paketlerin korunması. |
| `package.ps1`, `sources.ps1` | Public/test WGT ve native/decoder kaynak ZIP'i. |
| `publish.cjs` | Varsayılan dry-run; `--publish` yalnız pilot kanalını gönderir. Yayımlanmış sürüm dosyasının değiştirilmesini reddeder. |
| `updates.test.cjs`, `browser.cjs`, `emulator.cjs` | Dar birim, tarayıcı ve SDK/CDP kabulü. WGT'ye girmez. |

## Üretim

Bu bölüm ilk 1.3.0 bootstrap üretimi içindir. Yayımlanmış 1.0.0/1.0.1 kaynakları dondurulmuştur; kanonik kod değişmişse eski bileşenler yeniden yazılmaz. Site eklemek için WGT üretim/paketleme komutları kullanılmaz.

Kökten, mevcut Node bağımlılıkları ve WSL/SDK ile:

```powershell
node tools/updates/prepare-native.cjs
wsl -d Ubuntu-22.04 -- python3 /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/build-native-http.py --source /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/updates/native/secure-http.cpp --out /mnt/d/Projelerim/HDfilmCehennemi/kaynakkod/tools/updates/native/bin
node tools/updates/build.cjs
& tools/updates/protect-key.ps1
node --test tools/updates/updates.test.cjs
node tools/updates/browser.cjs
& tools/updates/sources.ps1
& tools/updates/package.ps1 -LocalTestSign
python tools/updates/audit.py
node tools/updates/publish.cjs
```

Anahtar yoksa bir kez üretilir; sonrasında aynı anahtar kullanılır. Özel anahtar `~/.film-merkezi-updates/pilot/signing-key.pem` altındadır; GitHub, kaynak ZIP'i ve WGT'ye girmez. Anahtar değiştirmek kurulu WGT'nin güvenini bozar. Kullanıcı güvenli yedeğini ayrıca tutmalıdır.

Yerel test imzası mevcut TizenSigner yolundan gelir. SDK runner'ın çift paketleme/Debug dizini sorunu nedeniyle pilot bu imzayla kuruldu. Public WGT geliştirici imzası içermez. XML imzasının kriptografik geçerliliği, gerçek TV'nin sertifika güven zinciri kabulüyle aynı şey değildir.

## Emülatör ve yayın

Tizen işlemleri SDK runner'larından yapılır. `emulator.cjs` yalnız **Film Merkezi Update Test** CDP hedefine bağlanır. `FILM_UPDATE_TEST_MODE=gate|update|tour`, `TIZEN_CDP_PORT=35952`. SDK Playwright runner'a **mutlak test yolu**, `--no-setup --background` verilir; `job-cli.js wait` ile sonuç alınır. `tour` en az beş dakika, `--timeout 590` gerektirir.

Son WGT ile `gate` geçmeden `publish.cjs --publish` çalışmaz. Yalnız manifestte sayılan pilot dosyaları ve kaynak ZIP'i gönderilir; ana Release/Apps2Samsung değişmez. Yeni değişiklik yeni bileşen sürümünde yayımlanmalıdır. Bu ilk üretici yalnız 1.0.0/1.0.1'i hazırlar; sonraki yayınlar için sürüm girdileri genişletilmelidir.

## Kullanım ve sınırlar

Seçenekler → Güncellemeler → **Kontrol et → İndir → Uygula ve yeniden aç**. Açılış kontrolü yalnız küçük, imzalı bildirimi alır; modüller kendiliğinden indirilmez. Aynı anda tek indirme vardır. Player açılınca kendi indirme istemcisi iptal edilir. Aktif/önceki sürümler korunur; artık kullanılmayan geçici nesneler temizlenir.

Tizen 3 tarayıcısının GitHub `ERR_INSECURE_RESPONSE` hatası için paket içi Mbed TLS, yalnız pilot kanalına sertifika ve hostname denetimiyle erişir. PC/proxy yoktur. NaCl olmayan platformlarda normal HTTPS/XHR kullanılır; diğer TV sürümlerindeki kabul bu çalışmada yapılmadı.

JS/CSS, uygulama şablonu ve site modülleri güncellenebilir. Native ikili, bootstrap, açık anahtar, ayrı YouTube frame/CSP veya yeni privilege yeni WGT gerektirir. Harici CSS `url()`/`@import` desteklenmez. Sınırlar: 256 dosya, dosya başına 2 MiB, toplam 8 MiB. İlk kullanım onayı beklemek ve ağ/site hataları kod başlangıç hatası sayılmaz.

Kaynak ZIP'inde pilot C++ dosyası, header/CA girdileri, özetler, decoder kaynakları ve lisanslar bulunur. Native derleme `tools/build-native-http.py --source tools/updates/native/secure-http.cpp --out <çıktı>` ile yapılır; resmi Pepper 47 SDK ve Mbed TLS 3.6.7 derleme bağımlılıkları gerekir. CA/config dosyaları ZIP'teki `tools/updates/native/` altındadır; TLS üreticisinin varsayılan `kaynak/ortak/ag/native/` girdilerine aynı dosyalar konabilir. Özel anahtar gerekmez.

Kanıtlar `tools/test-results/update130/`; kullanıcı raporu `docs/arsiv/TEST_SONUCLARI_1.3.0.md`. Fiziksel TV sesi/kumandası ayrıca doğrulanmalıdır.

## WGT değiştirmeden site ekleme — Filmizle 1.1.1

`node tools/updates/add-site.cjs 1.1.1 filmizle 1.0.1` mevcut dondurulmuş setten ikinci siteyi hazırlar. Yeni/değişen kaynakları UTF-8/LF yapıp özetler; aynı sürümde farklı içerik yazmayı reddeder. Sonraki yeni site yayını yeni sürüm ve uygun taban sürümü kullanmalıdır. `verify-component.cjs 1.1.1`, `filmizle-browser.cjs` ve `remote-component.cjs 1.1.1` bu teslimin dar kontrolleridir. `publish.cjs --publish` artık sürümleri otomatik bulur; güncel yayın raporu `tools/test-results/component-111/` altındadır.

Yükleyici/native/WGT dosyaları değişmedi. Ancak Tizen 3 emülatöründe Filmizle HTTPS sertifikası kabul edilmedi ve platformun Download API'si I/O hatası verdi. Yerel fixture/host kaynak çözümü geçti; emülatörde gerçek Filmizle oynatması **geçmedi**. Sabit native TLS izin listesine yeni alan adı eklemek yeni WGT gerektirir; mevcut şart altında bu yapılmadı. [Sonuçlar ve kanıtlar](../../docs/arsiv/TEST_SONUCLARI_BILESEN_1.1.1.md).
