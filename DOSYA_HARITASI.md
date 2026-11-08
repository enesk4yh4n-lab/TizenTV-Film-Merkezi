# Dosya haritası — ana uygulama v1.2.0 / ayrı pilot v1.4.1

**Son bileşen 1.7.0 — tampon ve kaynak tarama:** `PlayerCore.bufferPolicy()` üç profilin ortak, sınırlı ayarlarını üretir; HTML5 ve AVPlay adaptörleri motorun desteklediği kısmını uygular. `PlaybackStore` mevcut v1 kaydında `bufferProfile` ve `sourceScanMode` tutar. `player-controller.js` ilk kaynaktan sonra durma/bir yedek hazırlama/menüde devam etme davranışını mevcut iptal ve kurtarma akışında uygular. Ayarlar yolu **Oynatma ve kaynaklar → Tampon ve kaynak tarama**. `buffering170-build/browser/emulator/verify.cjs` ve ilgili testler WGT dışında kalır. WGT/native/taşıma/siteler aynı kalmıştır. [Profil tablosu ve test raporu](docs/arsiv/TEST_SONUCLARI_TAMPON_1.7.0.md).

**Son bileşen 1.6.0 — sade menüler:** `catalog-settings.js` sekiz kategoriyi, tek destek girişini ve tam sıfırlama onayını sunar. `management-panel.js` aktif siteleri paket/depo işlemlerinden ayırır; iç ekranlarda bir seviyelik Geri ve devre dışı düğmeleri atlayan gezinmeyi yönetir. `ortak/kayit/settings-reset.js` yalnız uygulamanın kullanıcı kayıtlarını ve özel güncelleme alanlarını temizler; `storage-coordinator.js` geciken yazımları sıfırlama süresince durdurur. `source-dispatcher.js` pasif doğrudan kaynağı reddeder, mevcut ortak bağlamda etkin alternatif varsa ortak çözümlemeye bırakır. `settings160-build/browser/emulator/verify.cjs` araçları WGT dışında kalır. WGT 1.4.1, eklenti API v1 ve SDK 1.0.2 değişmedi. [Menü haritası ve kabul raporu](docs/arsiv/TEST_SONUCLARI_MENULER_1.6.0.md).

**Önceki bileşenler:** Aşağıdaki 1.5.0 ve daha eski açıklamalar tarihsel mimari kaydıdır; güncel menü yolları için 1.6.0 raporunu kullanın.

**Son bileşen 1.5.0 — yönetim:** `site-management.js` mevcut core/eklenti yöneticilerini koordine eder; `management-panel.js` Site yönetimi ve ayrı güncelleme kapsamlarını gösterir. `main.js` kayıt sonrası yerel site tercihlerini uygular. Site/çözümleyici kodları değiştirilmedi, 12 site taşınmadı. `management150-build.cjs` kaynak sınırını; ilgili birim, alan, imzalı paket ve emülatör araçları yaşam döngüsünü denetler. WGT 1.4.1 kaldı. [Kabul ve sınırlar](docs/arsiv/TEST_SONUCLARI_YONETIM_1.5.0.md).

**Son bileşen 1.4.1 — TV ayarları:** `ortak/katalog/catalog-settings.js/css` Android düzeninde sekiz kategorili ekranı sunar. `CatalogExperience` hizmeti kurar; mevcut `CatalogApp` tuş/çıkış ve çizim noktalarından çağırır. `CatalogPreferences.appearance()` görünüm/açılış/satır tercihlerini mevcut v1 kullanıcı kaydında tutar; player ayarları PlaybackStore'u kullanır. Yeni prototype yaması veya global tuş dinleyicisi yoktur. `tools/updates/settings140-build.cjs` pilotun önceki kancalarını koruyarak imzalı tam set üretir; WGT değişmez. [Ayarlar raporu](docs/arsiv/TEST_SONUCLARI_AYARLAR_1.4.1.md).

**Son bileşen 1.3.2:** HDF bölüm URL’lerindeki son eğik çizgi isteğe bağlıdır; eski boş dizi detay önbelleği `detail-series-v2` kapsamıyla yeniden alınır. WGT 1.4.1 değişmedi. `tools/updates/hdf-series132-build.cjs` yalnız iki HDF modülünü imzalı yeni tam sete taşır; `hdf-series132-emulator.cjs` gerçek GitHub güncellemesi ve bölüm ekranını sınar. `tools/hdf-series132.test.cjs` ve küçük gerçek yanıt fixture’ı WGT dışında kalır. [Sonuçlar](docs/arsiv/TEST_SONUCLARI_BILESEN_1.3.2.md).

**8 Kasım 2026 — Update Test 1.4.1 / çekirdek 1.3.1 / SDK 1.0.2:** HDF CDN parçaları native TLS ile taşınır. Katalog kökeninin çalışan metin yolu, imzalı `legacyTextOrigins` tercihiyle korunur. `{n}` sayısal DNS ailesi JS ve native tarafta aynı 1–6 rakam kuralıyla doğrulanır. Ana 1.2.0 uygulaması değişmedi. [Ölçümler ve sınırlar](docs/arsiv/TEST_SONUCLARI_1.4.1.md).

| 1.4.1 dosyası | Görev |
| --- | --- |
| `tools/plugins/build-hdf.cjs` | Değişmez 1.3.0 çekirdekten 1.3.1 tam seti ve ayrı 1.4.1 WGT stage üretir |
| `tools/plugins/native/origin-patterns.inc.h`, `prepare-native.cjs` | Sınırlı sayısal DNS ailelerini üç mimarinin TLS izin denetimine ekler |
| `tools/updates/runtime/verify.js`, `native-tls.js` | İmzalı politikayı doğrular, metin/medya taşıma tercihini ayırır |
| `tools/updates/transport-sources.cjs` | Başarısız TLS metin isteğinin aynı yolda ikinci kez denenmesini önler |
| `tools/plugins/numeric-origins.test.cjs`, `native-policy-host-test.py`, `hdf-transport.test.cjs` | DNS sınırları ve alternatif taşıma kontrolleri; WGT dışında |
| `tools/plugins/hdf-emulator-performance.cjs`, `tools/test-results/plugins141/` | Gerçek Tizen 3 emülatör ölçümleri ve yerel kanıtlar; WGT dışında |

**Aşağıdaki 1.4.0 açıklaması önceki sürümün mimari kaydıdır.**

Güncel pilot **1.4.0**, çekirdek bileşeni **1.3.0**: kullanıcıların kendi GitHub/HTTPS eklenti depolarını eklediği API v1 uygulandı. HDF + Filmizle yerleşik kalır; topluluk eklentileri ilk kurulumda yüklenmez. [Kullanım ve SDK](tools/plugins/README.md), [kanıtlar ve sınırlar](docs/arsiv/TEST_SONUCLARI_1.4.0.md). Ana 14 siteli uygulama, 1.2.0 WGT’leri ve Apps2Samsung kaydı bu çalışmada değişmedi.

| Pilot dosyası | Görev |
| --- | --- |
| `tools/plugins/runtime/schema.js` | HTTPS depo adresleri, API v1 manifesti, boyut/yol ve sürüm sözleşmeleri |
| `tools/plugins/runtime/manager.js` | Bağımsız yayıncı güveni, indirme/hash/imza doğrulaması, etkin/önceki/hazır sürüm, iptal ve eklenti başlangıç sınırı |
| `tools/plugins/runtime/panel.js` | Depo ekleme/adres değiştirme, parmak izi onayı, yükle/güncelle/kapat/kaldır/geri dön; TR/EN ve IME |
| `tools/plugins/native/`, `prepare-native.cjs` | Her yayıncı için ayrı RSA anahtarı ve imzalı origin izinleri; üç mimarili TLS üretim kaynağı |
| `tools/updates/runtime/native-tls.js` | İki HTTP işi; yerel güven/politika işlemleri ağ kuyruğunda beklemez; ilk veri süresi gerçek gönderimde başlar |
| `tools/updates/runtime/storage.js` | Mevcut `film-update` alanına ek, bağımsız `film-plugins` özel dosya alanı |
| `tools/plugins/cli.cjs`, `template/site.js` | Herkesin kendi anahtarıyla ES5 provider/resolver eklentisi üretmesi için bağımsız SDK |
| `tools/plugins/build.cjs`, `package.ps1`, `sources.ps1` | Dondurulmuş 1.2.1 bileşeninden ayrı pilot stage, açık WGT dosya listesi ve kaynak ZIP’leri |
| `tools/plugins/plugins.test.cjs`, `browser.cjs`, `emulator.cjs`, `verify.cjs`, `audit.py`, `sdk-test.cjs` | Yalnız ilgili alanların QA araçları; WGT’ye girmez |
| `tools/test-results/plugins140/` | 1.4.0 stage ve yerel test kanıtları; yayın dosyası değildir |
| `addons/examples/{a,b,a-mirror}/`, `addons/sdk/`, `addons/app/` | GitHub’da bağımsız imzalı örnek depolar, SDK ve imzasız test WGT’si |

Eklenti kaydı `wgt-private/film-plugins` altında iki günlükle tutulur. Çalışan kod, `SiteRegistry.register()` ve `ChainApp.open(content)` sözleşmelerini kullanır. `FilmPlugins.context()` eklentiye ait doğrulanmış JSON okuma ve ayrı ağ istemcisi sunar. Eklentiler aynı JavaScript yetkilerindedir; klasör ayrımı sandbox değildir. Native/CSP/privilege değişikliği yeni WGT gerektirir.

**Aşağıdaki 1.3.1 paragrafı önceki pilotun tarihsel kaydıdır.**

Güncel pilot bileşeni **1.2.1**: HDF + Filmizle.ink (`filmizle`, kaynak klasörü `siteler/filmcibaba/`). Yeni **1.3.1 WGT**, ayrı imzalı origin politikasını native katmanda doğrular. GitHub'dan iki politika dosyası indirilerek Hotstream CDN izinleri WGT değiştirilmeden genişletildi; canlı film ve dizi bölümü oynadı. [Sonuçlar](docs/arsiv/TEST_SONUCLARI_1.3.1.md). 1.3.0/1.1.1'in önceki TLS engeli tarihsel raporda korunur.

Pilot: [GitHub güncelleme dosya haritası](docs/GITHUB_GUNCELLEME_HARITASI.md), [araçlar ve sınırlar](tools/updates/README.md). `updates/pilot/update.json` güncel imzalı sete işaret eder; yayımlanmış sürümler değişmez. `tools/updates/runtime/` sabit yükleyici, `native-general/` izole native kaynak, `prepare-general.cjs`/`build-general.cjs` üretim, `transport-sources.cjs` bileşen ağ uyarlamalarıdır. Yeni staging `tools/test-results/update131/stage` altındadır. `add-site.cjs --origin ... --module ...` sonraki sağlayıcıları, `extend-origins.cjs` yalnız köken izinlerini ekler. `promote-component.cjs` ve `publish.cjs` doğrulama kapısıyla kanalı yayımlar. Ana uygulama ve `ChainProbe.wgt` 1.2.0 kalır.

v1.2.0 adres hizmeti: `deneme/ortak/katalog/site-addresses.js`, paket içindeki başlangıç adresleri ile GitHub'daki `site-adresleri.json` verisini birleştirir. Hizmet site modüllerinden önce yüklenir; kayıtlı adresler bir oturum boyunca sabittir. `main.js` kontrolü arka planda başlatır. `catalog-app.js` içindeki Site adresleri paneli manuel yenileme/yeniden açma işlemini sunar. Adres belgesi kaynak kodu veya yeni site modülü yükleyemez.

`CatalogSiteKit.createParser` ve sekiz özel parser başlangıç adresini bu hizmetten alır. `CatalogUtils.url`, `CatalogClient.request`, `SourceResolver.resolve`, sağlayıcıların detay işlemleri ve genel metin ağı eski bağlantıları içerik kimliklerini değiştirmeden normalize eder. DDizi'nin taşıması native izin denetiminden önce adresi normalize eder; native ikilinin eski host kısıtı korunur. Ayrıntılar: [site adresleri ve yeni sağlayıcı sözleşmesi](docs/SITE_ADRESLERI.md).

`tools/site-addresses-validate.cjs` JSON doğrulayıcısıdır. `site-addresses.test.cjs` kayıt, süre, kota ve güven sınırlarını; `site-addresses-browser.cjs` 14 gerçek sağlayıcıyı ve panel akışını sınar. Dar komut: `npm --prefix tools run check:area -- addresses`. Araçlar WGT'ye girmez. `tools/build-public.ps1` mevcut runtime izin listesinden geliştirici imzası içermeyen yerel public WGT üretir.

v1.1.6: `ortak/arayuz/legal.js`, yeni kurulumda dil/birleştirme seçimini mevcut kullanım onayından önce gösterir; onay gelmeden katalog/player/site yükleme başlamaz. `CatalogPreferences` mevcut `filmmerkezi.catalog.preferences.v1` kaydına boolean `mergeCatalog` alanını ekler. Yeni kurulumda false; eski kayıt var ve alan yoksa true kullanılır. Tek tercih nesnesi kurulumdan `CatalogExperience` hizmetine aktarılır; depolama hatasında da açık oturum seçimi korunur.

`UnifiedHub.merging` ve `setMerging()` birleştirme politikasının çalışma zamanı sahibidir. Kapalı modda kaynak kimlikleriyle ayrı kartlar üretilir; kimlik aday seçimi/projeksiyon, `UnifiedProvider.enrich` ve son `reconcile` turu çalışmaz. `CatalogResultSet` kapalı modda kaynak kimliğine göre tekilleştirir ve başlık eşleştirme indeksi kurmaz. Eski kalıcı gruplar kullanıcı kayıtlarını korumak için bölünmez/silinmez. `UnifiedPlayback.prepare` kapalı modda siteler arası kaynak havuzu kurmaz; seçilen sitenin çözümleyicileri değişmez.

`catalog-experience.js`, Uygulama ayarları panelini ve kalıcı dil/birleştirme seçimlerini sunar; mod değişimi eski işleri iptal ederek ana sayfayı yeniler. `tools/onboarding116.test.cjs` ve `onboarding116-browser.cjs` ilgili kabul araçlarıdır. `tools/prepare-public116.py`, 1.1.5 genel WGT'ye göre açık 12 dosyalık değişiklik listesiyle imzasız WGT/kaynak ZIP'i üretir. Araçlar WGT'ye girmez. [v1.1.6 sonuçları](docs/arsiv/TEST_SONUCLARI_1.1.6.md).

v1.1.4: `catalog-search-app.js` ekrana ait sıralı/filtreli görünümü saklar; `catalog-unified-app.js` yalnız durum değişiminde ana sayfa kartlarını korur. `unified-provider.js` yayım başına hazırlanmış kartları `CatalogResultSet` ile paylaşır, atomik iptali ve ortak `isIdle()`/dizi dil kuyruğunu yönetir. `storage-coordinator.js`, `catalog-store.js` ve `unified-library.js` değişmeyen satırların byte hesabını paylaşır; normal player checkpoint'i katalog taraması başlatmaz. Koruma değişiklikleri açık `protectionChanged()` çağrısıyla bildirilir.

`NativeFileBytes.read(file, options)` isteğe bağlı `byteLimit` alır: varsayılan 8 MiB, mutlak üst sınır 12 MiB. `native-media.js` istek sınırını okuyucuya iletir; boyut aşımı `byteLimitExceeded`/`byteLimit` ile taşınır. Playlist/anahtar/görsel sınırları artırılmaz.

`cozumleyiciler/literal-media.js`, paket dışındaki kanonik `player.js` dosyasından tek medya decoder'ı üretir. HDF `ChainDecoder.player` girişi aynı `LiteralMediaDecoder` nesnesini kullanır; ikinci bir kopya paketlenmez. `tools/build.ps1` her iki girişi birlikte üretir. `tools/check-area.cjs`/`check:area` alan bazında kontrolleri seçer; `performance114*`, `decoder114.test.cjs` ve `tv114-acceptance.cjs` QA araçları WGT'ye girmez. [Sonuçlar ve açık sınırlar](docs/arsiv/TEST_SONUCLARI_1.1.4.md).

v1.1.2: LoveFilm ayrıştırıcısındaki `originalTitle` seçicisi ana özgün adı okur. `content-identity.js`, yalnız kontrol edilmiş/türü doğrulanmış başlıklarda İngilizce artikel alternatifi üretir; numarayı/alt başlığı korur. `tools/identity112*` dar kapsamlı QA/karar dökümü araçlarıdır, WGT'ye girmez. [Sonuçlar](docs/arsiv/TEST_SONUCLARI_1.1.2.md).

v1.1.1: `content-identity.js` bağımsız özgün ad/yıl kanıtını, `unified-provider.js` ayrışan grup önceliğini, `catalog-site-kit.js` birincil kimlik aktarımını yönetir. Filmci Baba ayrıştırıcısı yayın yılı ipucunu ayırır; DDizi gerçek en eski sayfadan ilk bölüm yılını doğrular. `tools/identity111*` QA araçları WGT'ye girmez. [Sonuçlar](docs/arsiv/TEST_SONUCLARI_1.1.1.md).

Birleştirme kararı yalnız `deneme/ortak/katalog/content-identity.js` içindedir: başlık parçalama, sayfaya bağlı IMDb/yıl/tür kanıtı, aday anahtarları, aynı/farklı/belirsiz kararı, arama alakası ve ortak kart projeksiyonu. `unified-library.js` bu kararı kullanarak grupları, kaynak tercihlerini, favorileri ve v1 → identityVersion 2 geçişini yönetir. `unified-provider.js` iki istek/30 saniye/12 detay bütçesini, küçük kart gruplarını ve geç yanıt iptalini koordine eder. Eski isim benzerliği/yıl tamamlama mantığı birlikte çalışmaz; kalan uyumluluk girişleri yeni hizmete yönlenir.

`catalog-client.js` ve `catalog-utils.js` aynı yanıtın DOM'unu ayrıştırma süresince paylaşır; işlem bittiğinde referans bırakılır. Kimlik hesabının geçici önbelleği de yalnız eşzamanlı küçük işlem süresince yaşar. Tam HTML veya tokenlı medya adresi kimlik kaydına yazılmaz.

`tools/identity110.test.cjs`, `identity110-browser.cjs` ve `identity110-emulator.cjs` yeni kimlik/kayıt/DOM ve canlı SDK kabulünü kapsar. `tools/test-results/identity-audit100/live-search-results.json` değiştirilmeyen 265 kartlık 1.0.0 girdisidir; yeni kanıtlar `tools/test-results/identity110/` altındadır. QA dosyaları WGT'ye girmez. [Sonuç raporu](docs/arsiv/TEST_SONUCLARI_1.1.0.md).

1 Kasım son WGT kabulü `tools/test-results/identity110/2026-11-01/` altındadır. Canlı arama ve `identity110-emulator-tour.cjs`, `FILM_IDENTITY_OUT` ile önceki kanıttan ayrı klasöre yazabilir. Player turunda `FILM_IDENTITY_TOUR_MS` 90–600 saniye aralığında ek kabul sağlar; varsayılan 210 saniyedir. Kaynaklar panelinin görünürlüğü, açık panelde medya ilerlemesi ve Filmler filtresi ayrıca doğrulanır. Bu turda kullanıcı isteğiyle `tizen-agent-skills` / `flutter-tizen` yerine mevcut `Baslat.ps1` ve `EmulatordeAc.ps1` kullanıldı.

`tools/prepare-apps2samsung100.py` yalnız açık çalışma dosyalarını ayrı yayın kopyasına taşır; kişisel imzaları atlar, mevcut manifestin author alanını genelleştirir ve lisans/kaynak bildirimlerini tamamlar. Çözümleyici/motor kodunu değiştirmez. `tools/test-results/apps2samsung0233/publish/` temiz genel Git kopyasıdır; içindeki `scripts/build.py` imzasız ve yeniden üretilebilir WGT/kaynak ZIP'leri üretir. Bu geliştirme araçları WGT'ye girmez. Genel teslimler `releases/apps2samsung/1.0.0/`; katalog katkısı kendi fork'umuzdaki tek JSON dosyasıyla [PR #165](https://github.com/Apps2Samsung/tizen-community-packages/pull/165) üzerinden gönderilmiştir. [Araştırma](docs/arsiv/APPS2SAMSUNG_ARASTIRMA.md).

v0.23.3'te eski kararlılık karşılaştırması ve oynatıcı/ağ laboratuvarı kaldırıldı. `ortak/tani/reliability.js`, ana sayfanın `legacy-lab` HTML/CSS'i, sabit test içerikleri ve `main.js` içindeki deneme akışları artık yoktur. Ağ modüllerindeki ölçüm kancaları çıkarıldı. `ortak/tani/diagnostics.js` gerçek player günlüğü ile arka plan/ekran koruyucu yaşam döngüsünü taşımaya devam eder; eski laboratuvara bağlı değildir. `app-info.js` artık kişisel yapımcı/e-posta alanları içermez. `tools/menu-cleanup.test.cjs` kaldırılan modüllerin ve kişisel alanların dönmediğini sınar. [Sonuçlar](docs/arsiv/SURUM_0.23.3.md).

`ortak/arayuz/legal.js` ilk açılış onayının, ortak bilgilendirme metninin, teşekkür/lisans envanterinin ve yerel bildirim okuyucusunun sahibidir. `legal.css` aynı ekranları biçimlendirir. `main.js` onaydan sonra uygulamayı kurar; onay öncesinde site dosyaları/katalog istekleri ve player kurulumu başlatılmaz. `filmmerkezi.usage-consent.v1` cihaz içi onay kaydıdır, katalog önbelleği değildir; metin revizyonu uygulama sürümünden ayrıdır. Bozuk veya gelecek biçimdeki kayıtlar korunur. Hakkında ekranları bu ortak hizmeti kullanır.

`tools/legal.test.cjs` güvenli onay kaydını ve paket içi lisans dosyalarını; `tools/legal-browser.cjs` ilk açılışı, kumanda olaylarını, iki dili ve katalog/player Hakkında dönüşünü sınar. `tools/browser-usage.cjs` mevcut yalıtılmış tarayıcı senaryolarında gerçek onay düğmesini kullanır; uygulama içinde QA muafiyeti yoktur. Araçlar WGT'ye girmez. [Sonuçlar](docs/arsiv/SURUM_0.23.2.md).

`Emulatorler.cmd` sürüm seçim menüsüdür; `Tizen3Ac.cmd`, `Tizen8Ac.cmd`, `Tizen9Ac.cmd` ve `Tizen10Ac.cmd` doğrudan kısayollardır. Ortak `tools/Emulatorler.ps1`, SDK runner üzerinden açılış yapar. 8/9/10 kısayolları ayrıca manifest sürümünden türetilen `tools/test-results/platform100/FilmMerkezi.wgt` Samsung imzalı paketini kurup açar; yalnız açılış menüden seçilebilir. Tizen 3 mevcut WSL köprüsünü kullanır; eski kurulum başlatıcısı korunur. `-CheckOnly -Version <sürüm>` cihazı değiştirmeden yolları ve işlem planını denetler. Dosyalar WGT'ye alınmaz.

v0.23.1'de `catalog-search-app.js` ve `catalog-unified-app.js` çizime girmeden önce `suspended` durumunu denetler. Böylece player açıkken dil değişimi, sıralama odağı veya ortak katalog yenilemesi gizli katalog üzerinde işlem yapmaz; player kapanınca mevcut `render(true)` akışı çalışır. `tools/catalog-suspended-render.test.cjs` iki girişin DOM'a ve ekran durumuna dokunmadığını sınar. Player motorları, çözümleyiciler ve native ağ dosyaları aynı kalır.

`tools/platform0230-smoke.cjs`, `FILM_TEST_VERSION` ve `FILM_TEST_PLATFORM` ile gerçek kurulu 0.23.0/0.23.1 WGT'ye bağlanır; kayıt özetlerini karşılaştırır, önceki dili geri seçer ve sürüme göre ayrı `platform0230/` veya `platform0231/` kanıtı üretir. `platform0230-live-check.cjs` Tizen 9'daki önceki tamponlama davranışını ayırmak için kullanılır. `platform0230-package-audit.py --version 0.23.1` kaynak/paket, açık sertifika/DUID, native özet ve isteğe bağlı XML imzası denetimidir. Bu QA araçları WGT'ye girmez. [Uyumluluk raporu](TIZEN_SURUM_UYUMLULUK_RAPORU.md).

Dil desteğinin kabul araçları `tools/language.test.cjs`, `language0230-browser.cjs` ve `language0230-emulator.cjs` dosyalarıdır. Birim testleri ve yedi tarayıcı grubu standart `check`/`release` komutundadır. Emülatör betiği kurulu uygulamaya SDK/CDP ile bağlanır; sunucu açmaz, paket içi referansı kullanır ve yalnız değiştirdiği arayüz dilini geri seçer. QA araçları WGT'ye girmez. [Sürüm ve kanıtlar](docs/arsiv/SURUM_0.23.0.md).

| Alan | Görevi |
| --- | --- |
| `deneme/index.html`, `main.js` | Ekran iskeleti, hizmet kurulumu ve player bağlantısı |
| `deneme/config.xml` | Sürüm kaynağı, `FilmMerkez.FilmMerkezi` kimliği, Tizen izinleri ve CSP |
| `icon.png` | 1254×1254 özgün logo kaynağı; doğrudan paketlenmez |
| `deneme/icon.png`, `deneme/header-logo.png` | 117×117 uygulama ikonu ve başlıkta 68×68 gösterilen 136×136 logo |
| `deneme/site-listesi.js` | 14 sitenin dosyaları, kayıt doğrulaması ve yükleme hatası yalıtımı |
| `ortak/dil/i18n.js` | Türkçe varsayılanı, İngilizce mesaj/şablon seçimi, statik etiketler ve sınırlı metin önbelleği; ağ veya DOM observer yok |
| `ortak/dil/en.js` | Paket içi İngilizce arayüz çevirileri; içerik verisi çevrilmez |
| `ortak/katalog/catalog-runtime.js` | Ortak katalog/sıralama/koleksiyon bileşenlerinin tek kurulum noktası |
| `ortak/katalog/catalog-experience.js`, `catalog-experience.css` | Ana ekran, detay panelleri, arama geçmişi ve öneri ekranı; uygulama başına tek hizmet |
| `ortak/katalog/recommendations.js` | Güncel film adayları, tür/IMDb doğrulaması, izleme elemesi, iptal ve 30 saniyelik bütçe |
| `ortak/kayit/catalog-preferences.js` | Ortak son 10 arama, öneri ve arayüz dili; mevcut güvenli v1 kullanıcı kaydı |
| `ortak/katalog/catalog-app.js` | Katalog durumu, arama/filtre/detay, odak ve 60 kartlık DOM penceresi |
| `ortak/katalog/catalog-unified-app.js` | Ortak kütüphane, site seçimi ve player geçiş/dönüşü |
| `ortak/katalog/catalog-search-app.js` | Genel sıralama, alaka puanı ve odak koruma |
| `ortak/katalog/catalog-collections.js` | Koleksiyon üyelerini gerçek filmlere bağlama |
| `ortak/katalog/unified-provider.js` | Sağlayıcı koordinasyonu, iki eşzamanlı istek ve sayfalama |
| `ortak/katalog/content-identity.js` | IMDb/ad/yıl/özgün ad birleştirme ve çelişki koruması |
| `ortak/kayit/unified-library.js` | Ortak kimlikler, Listem/ilerleme köprüsü ve gezinmeye ait CatalogResultSet |
| `ortak/kayit/storage-coordinator.js` | Ortak bütçe, güvenli okuma, bozuk belgeyi koruma ve kapsamlı istemciler |
| `ortak/kayit/catalog-store.js` | Site kayıtları, metadata ve yanıt önbelleği |
| `ortak/kayit/playback-store.js`, `series-state.js` | İlerleme/tercihler ve dizi takip/izlenme kayıtları |
| `ortak/katalog/catalog-images.js` | Afiş ve Blob ömrü; görev başına bir başlangıç, en fazla üç eşzamanlı indirme; 8 MiB/48 giriş, player açılınca 16 giriş |
| `ortak/player/` | İki motor, oturum, kumanda, menüler, altyazı ve sınırlı toparlama |
| `ortak/kayit/playback-compatibility.js` | Kaynak/kalite başarısızlık belleği; geçici erişim ile motor/medya uyumsuzluğunu ayırır |
| `ortak/ag/` | Bağımsız ağ istemcileri, native köprü ve paket içindeki HTTPS bileşeni |
| `ortak/tani/`, `ortak/uyumluluk/` | Tanı, yaşam döngüsü ve eski Tizen uyumluluğu |
| `cozumleyiciler/`, `vendor/` | Paylaşılan çözümleyiciler, YouTube ve lisanslı bağımlılıklar |
| `kaynak/siteler/hdfilmcehennemi/decoder-kaynak/src/` | Paket dışı üç kanonik MIT kaynak dosyası; paketlenen decoder'lar buradan üretilir |
| `kaynak/ortak/ag/native/` | Paket dışı native C++/header/CA kaynakları, derleme özeti ve README |
| `ortak/ag/native/` | Pakette yalnız üç NEXE, `secure-http.nmf` ve bütün `notices/` dosyaları |
| `tools/tasks.cjs`, `build.ps1`, `runtime-manifest.json` | Kontrol/derleme, sürüm eşitleme ve açık paket izin listesi |
| `tools/app-identity.ps1`, `app-identity.test.cjs` | XML/WGT'den kimlik okuma, QA kimliği ayırma, gerçek geri dönüş paketi ve CSP değişmezliği kontrolleri; WGT'ye girmez |
| `tools/EmulatordeAc.ps1` | Seçilen WGT'nin kimliğini okuyarak emülatöre kurar/açar; dosya adı kimlik yerine kullanılmaz |
| `tools/source-manifest.json` | Paket dışına taşınan on dosyanın listesi; kaynak ZIP'ine ekleme ve WGT'den dışlama kuralı |
| `tools/build-image-assets.ps1`, `image-assets.json` | Paketlemede özgün görselden şeffaf küçük PNG üretimi ve kaynak/çıktı boyut–özet kaydı |
| `tools/verify-release.py` | Kaynak–WGT, imza bütünlüğü, native ve geri dönüş doğrulaması |
| `tools/*.test.cjs`, `tools/*browser*.cjs` | Aktif ve korunmuş kabul kontrolleri |
| `tools/player-network-acceptance.cjs`, `player-network-fixture.js`, `player-network-server.py` | Gerçek HTTP kesintisi/adres süresi/yeniden deneme deneyi; masaüstü ve emülatör, geçici yardımcısı tur sonunda kapanır; WGT'ye girmez |
| `tools/catalog0220.test.cjs`, `catalog0220-browser.cjs` | Yeni hizmetlerin süre, izleme elemesi, kayıt ve kumanda ekran kontrolleri |
| `tools/build-qa0220.ps1`, `catalog0220-fixture.js`, `catalog0220-emulator.cjs` | Ayrı kimlikte, sentetik verili Tizen 3.0 kabul turu; WGT'ye girmez |
| `tools/test-results/catalog0224/`, `network0224/` | Güncel kontrol/paket kanıtı ve kontrollü ağ denemelerinin tarayıcı/emülatör raporları |
| `tools/test-results/catalog0200/` | Kanıtlar, ayrı QA paketi ve dosya bazında temizlik envanteri |
| `releases/`, `docs/arsiv/` | v0.19.0 geri dönüş paketi ve tarihsel belgeler |

Tablodaki `ortak/`, `cozumleyiciler/` ve `vendor/` yolları `deneme/` altındadır. `kaynak/` proje kökündedir ve WGT'nin dışındadır. Paketleme, taşınan kaynakları ve lisans kopyalarını sürümlü `Film-Merkezi-Kaynak-<sürüm>.zip` olarak ayrıca üretir.

## Siteler

`deneme/siteler/`: hdfilmcehennemi, filmcibaba (kimlik filmizle), dizibox, turkcefilmler, hdfilmdelisi, ddizi, fixfullfilmizle, sinemacc, filmizlebabam, filmifullizle, filmizlehell, lovefilmizle, fullhdfilmizlesene, filmmakinesi.

Her sitenin seçicileri, sayfa biçimleri ve çözümlemesi kendi klasöründedir. Ortak katalog `all` sanal sağlayıcısıdır. v0.20.0 bu site dosyalarını ve player/native bileşenlerini değiştirmez.

v0.20.1, gerçek TV bulguları üzerine `ortak/player/browser-player.js` içindeki HLS hazırlığı/duraklatılmış sarma ile `siteler/ddizi/ddizi-resolver.js` içindeki sınırlı HTTPS zaman aşımı tekrarını düzeltir. Diğer 13 site ve native bileşenler aynı kalır. `tools/real-tv0200-*.cjs` gerçek TV kabul araçlarıdır; WGT'ye alınmaz. Güncel otomatik kanıtlar `tools/test-results/catalog0201/`, gerçek TV kanıtları `tools/test-results/real-tv0200/` altındadır.

## Veri sahipliği

v0.22.1'de kapanan katalog panelinin içeriği temizlenir. Afiş kuyruğunun başlatma zamanlayıcısı ekran/player geçişinde iptal edilir; çalışan isteklerin sayacı sonuçlanırken bırakılır. Üç eşzamanlı indirme korunur; her başlangıç ayrı bir görevde yapılır.

Performans araçları `tools/stability-emulator.cjs`, `stability-heap.cjs`, `stability-image-probe.cjs` ve `heap-mcp-report.py` dosyalarıdır. Sonuncusu ham heap JSON'unu okumadan DevTools MCP ile özet/karşılaştırma/tutulma zinciri alır. `stability-media-recheck.cjs` iki motorun gerçek durumunu ayırır; `stability-quality-limit.cjs` gerçek HLS üzerinde otomatik kalite/parça sınırı toparlamasını inceler. Son araç yalnız test oturumunun kalite sınırını kaldırır; kalıcı tercihi yazmaz. Bunlar geliştirme araçlarıdır ve WGT'ye girmez. `tools/sdk-source-artifacts.json` SDK metadata/derleme çıktısını çalışma kaynaklarından ayırır; imzalama açık izin listeli geçici dizinde yapılır.

`ortak/ag/network.js` içindeki `NativeDownloadCallbacks` sayfa ve `native-media.js` indirmelerinin ortak dinleyici ömrünü yönetir. SDK'nin tuttuğu dinleyici, iş bitince Promise/HTML/medya kapanımını tutmaz. Geç dosya tamamlanması bağımsız temizlenir; özel SDK tabloları veya native ikililer değiştirilmez. `tools/wsl-sdb-relay.py` yalnız emülatörün SDB bağlantısı için geçici geliştirme yedeğidir.

v0.22.2'de `media-network.js` ve `native-media.js` yerel medya boyutu sınırını ayrı hata olarak bildirir. `native-hls-loader.js` aynı büyük parçayı yeniden indirmez. `browser-player.js` hatanın gerçek kalite seviyesini `player-controller.js` dosyasına aktarır; otomatik kalite mevcut toparlama bütçesiyle düşürülür, konum ve duraklatma niyeti korunur. Varsayılan 8 MiB ve kaynağın bildirdiği en fazla 12 MiB parça sınırları değişmez. Paket değişiklikleri `tools/release-changes-0222.json`, otomatik kontroller `tools/test-results/catalog0222/` altındadır.

v0.22.3'te `catalog-images.js` XHR/native tercihini afiş origin'i bazında öğrenir; en fazla 16 kayıt ve 10 dakika, kalıcı yazma yoktur. `unified-provider.js` isteğe bağlı `catalogRevision` verir. `catalog-unified-app.js`, veri/yüklenme/uyarı değişmediğinde ve ortak liste/arama sürerken yalnız durum yazısını günceller; sonuç değişimi ve bitiş normal çizilir. `tools/input-latency-emulator.cjs`, `poster-transport-probe.cjs`, `poster-benchmark.cjs` geçici ölçüm araçlarıdır ve WGT'ye girmez. Kanıtlar `tools/test-results/input0223/`, paket/kontrol kanıtları `tools/test-results/catalog0223/` altındadır.

v0.22.4'te `player-controller.js`, HTTP/taşıma hatasını gerçek medya/sarma gözetiminden ayırır. 401/410 adres yenilemeye gider; aynı kaynağın otomatik tekrarında ve yenilemesinde kullanılan uyumlu motor korunur. `playback-compatibility.js` içindeki `engineFailed`, yalnız motor/medya kaydını değerlendirir; `sourceFailed` geçici erişim belleğini korur. Kayıt biçimi/anahtarı ve 60 saniye/beş deneme sınırı değişmez. `tools/release-changes-0224.json` önceki pakete göre açık değişiklik listesidir; yeni ağ kabulü `npm --prefix tools run check` komutuna dahildir.

`tools/stability-emulator.cjs --memory-only --snapshots` CPU örneklemesini kapatır; üçüncü, dokuzuncu (yeterli döngü varsa) ve son döngüde heap görüntüsü alabilir. `heap-mcp-report.py` ile karşılaştırılır. Bellek değerlendirmesi [BELLEK_KULLANIM_RAPORU_0.22.3.md](docs/arsiv/BELLEK_KULLANIM_RAPORU_0.22.3.md) dosyasındadır; bu değerlendirme uygulama kaynaklarını/paketini değiştirmedi.

Kullanıcı kaydı kalıcıdır ve bütçe için silinmez. Yeniden alınabilir yanıt/korunmayan metadata toplam 1 MiB önbellektir. Açık sonuç listesi ekran/gezinme ömrüne bağlıdır; disk budanmasından etkilenmez. Yeni arama/site/sekme kullanılmayan gezinme referanslarını bırakır.

## v0.22.0 ekran hizmetleri

`CatalogRuntime.services(app)` tek `CatalogExperience` kurar. Bu hizmet arama kayıtlarını, öneri ekranını ve detay açılır panellerini bağlar. Player motoruna veya çözümleyicilere prototip yaması yapmaz. `catalog-app.js` mevcut durum, kumanda ve sanal liste sorumluluğunu sürdürür; altı sütun/430 piksel satır ve en fazla 60 afiş korunur. Bölümler 24 satır olarak sayfalanır; player'a tam gerçek bölüm sırası verilir.

`RecommendationService` bağımsız bir `UnifiedProvider` istemcisi kullanır; aktif katalog işlemi önce iptal edilir ve aynı iki eşzamanlı HTTP sınırı uygulanır. Ham site kartıyla detay çağrılır, yalnız gösterimde ortak kart üretilir. Son 30 öneri ve gerçek devam bağlantıları bellektedir. Yeni site kapsamı bunları sıfırlar. `CatalogPreferences` ortak `filmmerkezi.catalog.preferences.v1` anahtarını kullanır; geçmiş 10 sorgu ve tür/IMDb tercihleri silinebilir önbellek değildir. Bozuk/yeni sürümlü belge ezilmez.

Dağıtım değişiklikleri `tools/release-changes-0220.json` ile v0.21.2'ye karşı denetlenir. Site klasörleri, bütün player motor/kontrol dosyaları, native bileşenler ve simge aynıdır. [Sürüm](docs/arsiv/SURUM_0.22.0.md) · [Doğrulama](docs/arsiv/TEST_SONUCLARI_0.22.0.md).

## Kaynak taraması ve Çıkış — v0.21.1

- `ortak/player/source-progress.js`, `source-dispatcher.js`, `multi-site-sources.js`: tek istekli sessiz tarama, tampon kapısı, 500 ms aralık ve ayrı tarama ömrü.
- `ortak/player/player-controller.js`: değişmez etkin kaynak; kesintisiz yenileme; otomatik ilk kaynak + bir yedek, sonra bekleme; Kaynaklar menüsünde kalanlara devam; Devam et / Baştan başlat / Kaydet ve çık / Kaydetmeden çık.
- `ortak/player/player-view.js`, `player.css`, `index.html`: tek Çıkış ve yenileme maddesi, şeffaf köşe durumu; menü açılışını controller'a bir kez bildirme ve odağı koruyan kaynak güncellemeleri.

v0.22.8 kontrolleri: `tools/player-backup-fixture.js` yalnız test için dört metaveri kaynağı sağlar; dispatcher/kuyruk/ağ/motor gerçek kalır. `player-backup-browser.cjs` dört video grubunu standart check/release komutuna ekler. `player-backup-emulator.cjs` kurulu WGT'de SDK tuş olaylarıyla aynı davranışı ölçer; geçici sunucuyu ve test kayıtlarını temizler. Bu dosyalar WGT'ye girmez. [Rapor](docs/arsiv/SURUM_0.22.8.md).
- `cozumleyiciler/vidara.js`: Filmizlebabam ve FixFull için ortak Vidara/Gasobni ayrıştırması. Pilavyer büyük parça izni kendi decoder'ındadır.
- `ortak/kayit/playback-store.js`: içerik açılışında yalnız ilerleme alanlarını bellekte yakalar; kaydetmeden çıkışta otomatik kayıtları geri alır, tercihleri/yer imlerini korur.
- `ortak/kayit/series-state.js`, `unified-library.js`: bölüm işareti/yeni bölüm rozetini geri alma ve ortak katalog kayıt köprüsü.
- `ortak/katalog/catalog-app.js`, `catalog-unified-app.js`: site ve Tüm siteler ekranlarının aynı ilerleme oturumuna katılması.
- `tools/player0210-browser.cjs`: sürüme göre ayrı sonuç klasörüyle player ve Kaydetmeden çık tarayıcı kabulü.
- `tools/player0211-emulator.cjs`: yalnız yerel emülatör SDK portuna bağlanan hedefli Çıkış turu; WGT'ye alınmaz.
- `tools/release-changes-0211.json`: v0.21.0 tabanlı 12 dosyanın açık değişiklik listesi.

Güncel otomatik kanıtlar `tools/test-results/catalog0211/`, player/emülatör kanıtları `tools/test-results/player0211/` altındadır. [Sürüm](docs/arsiv/SURUM_0.21.1.md) · [Sonuçlar](docs/arsiv/TEST_SONUCLARI_0.21.1.md) · [v0.21.0 geri dönüş](releases/Film-Merkezi-TV-0.21.0.wgt).
## v0.21.2 Pilavyer sunucu seçimi

`deneme/siteler/filmizlebabam/filmizlebabam-decoder.js`, aktif player içindeki core.js sunucusunu etkisiz veri olarak okur; ana/numaralı Pilavyer embed ve medya kimliğini aynı sunucuyla doğrular. `tools/filmizlebabam-host.test.cjs` ve mevcut player tarayıcı turu bu yolu sınar. `tools/player0212-emulator.cjs` yalnız emülatörde gerçek sayfaları kullanır. Kanıtlar `tools/test-results/player0212/` ve `catalog0212/` altındadır. [Sürüm](docs/arsiv/SURUM_0.21.2.md) · [Sonuçlar](docs/arsiv/TEST_SONUCLARI_0.21.2.md).
# Bağımsız site paketleri — 1.8.0 eki

- `deneme/ortak/katalog/site-plugin-runtime.js`: eklentiye özel global kapsam ve mevcut yükleyicinin staging yaşamı.
- `deneme/ortak/katalog/site-payload.js`: yeni sitelerin inert HTML/Next veri ayrıştırması, katalog ve gerçek sezon/bölüm sayfalaması.
- `deneme/cozumleyiciler/site-source-families.js`: doğrulanmış aktif embed/API aileleri; site betikleri çalıştırılmaz.
- `deneme/siteler/<site>/`: her sitenin kanonik seçicileri, sağlayıcı ve çözümleyici kaydı. TRDizi’nin özel istemci/aktif JW davranışı kendi `site.js` dosyasındadır.
- `kaynak/site-eklentileri/<site>/`: kanonik kaynaklardan üretilen eklenti projesi; doğrudan düzenlenmez.
- `addons/sites/repository.json` ve `.sig`: imzalı, ayrı güncellenebilen 20 site indeksi. `packages/<site>/<sürüm>/` değişmez manifest, imza, modül ve ağ izinlerini içerir.
- `updates/pilot/versions/1.8.0/`: iki yerleşik site ve ortak yardımcıları taşıyan değişmez çekirdek bileşeni. WGT 1.4.1 korunur.
- `tools/sites180/`: envanter, kaynak/paket üretimi, canlı yakalama, ilgili fixture testleri ve emülatör kabul araçları. WGT’ye alınmaz.
- `tools/test-results/sites180/`: yalnız yerel ham yanıtlar, geçici medya adresleri ve kanıtlar. GitHub dağıtımına alınmaz.
- `docs/arsiv/TEST_SONUCLARI_SITELER_1.8.0.md`: 40 bağlantı ve kaynak seçeneklerinin ayrı sonuçları, sınırlar ve kalan sorunlar.

