# Film Merkezi Eklenti SDK 1.1.0

Film Merkezi, Tizen'de doğrudan kullanılamayan web/video sayfaları için eklenti tabanlı bir erişim ve oynatma arayüzüdür. Bu SDK, bir sayfanın yapısını Tizen uyumlu ES5 veri sağlayıcısına dönüştürüp bağımsız, imzalı paketler halinde dağıtmanıza yardım eder. Eklenti yazılmamış herhangi bir siteyi kendiliğinden çalıştıran tam bir web tarayıcısı değildir.

## Gerekenler

- Geliştirme bilgisayarında Node.js 20+; `SDK/` içinde `npm install`.
- TV'de Film Merkezi WGT 1.6.0+ ve çekirdek 1.10.0+.
- Kendi RSA-2048 yayıncı anahtarınız. Uygulamanın özel anahtarı veya ücretli SDK gerekmez.
- HTTPS üzerinden dosya sunan GitHub veya benzeri bir depo. TV çalışırken geliştirme bilgisayarına ihtiyaç yoktur.

## Hızlı başlangıç

Aşağıdaki yollar proje kökünden verilmiştir. Anahtarı proje ve yayın klasörü dışında tutun; örnekteki `../private` klasörünü GitHub'a göndermeyin.

```text
cd SDK
npm install
cd ..
node SDK/cli.cjs keygen --out ../private/author.pem
node SDK/cli.cjs init --project examples/p101 --id p101 --name P101
node SDK/cli.cjs pack --project examples/p101 --out my-repository --key ../private/author.pem --publisher "Independent publisher" --repository-id independent
```

Örnek, kamuya açık bir test akışı kullanır. Kendi sayfanız için `addon.json`, `site.js`, `catalog.json` ve `streams.json` dosyalarını düzenleyin. Gerçek erişim adresini ve gereken afiş/embed/API/medya kökenlerini `origins` alanında bildirin; reklam/öneri bağlantılarını video kaynağı saymayın. Dosya adları ve bu projenin görünen paket adları P101 gibi kodlar kullanır. Gerçek URL'ler, protokol verisi ve zorunlu telif bildirimleri kaldırılmaz.

Üretilen `my-repository/` içeriğini HTTPS üzerinden yayımlayın. TV'de **Seçenekler → Güncelleme Merkezi → Eklenti depoları** yolundan `repository.json` adresini ekleyin. Kullanıcı yayıncı parmak izini doğrulayıp güvenmeyi seçer. Paketlerin kurulması, güncellenmesi, kaldırılması ve önceki sürüme dönüşü bu merkezden yönetilir.

## Dosya haritası

```text
SDK/
  cli.cjs             Anahtar, örnek proje ve imzalı paket üretimi
  runtime/schema.js   Paket/depo sözleşmesi ve yol denetimleri
  runtime/verify.js   SHA-256 ve RSA doğrulama yardımcıları
  template/site.js    ES5 sağlayıcı/çözümleyici örneği
  test.cjs            Bağımsız yayıncı ile SDK kontrolü
```

## Sağlayıcı sözleşmesi

`SiteRegistry.register()` ile `id`, `name`, HTTPS `base`, `prefix: id + ':'`, bağımsız depolama öneki, `Provider` ve `Resolver` bildirilir. Paket kimliği ile site kimliği farklı olabilir; mevcut site/izleme kimliklerini güncellemede değiştirmeyin.

| İşlem | Sonuç |
|---|---|
| `home(force)` | `{hero, movies: [], series: []}` |
| `list(query, next, force)` | `{cards: [], next: null veya doğrulanmış devam bilgisi}` |
| `search(text, force, next)` | `{cards, next}` |
| `detail(card, force)` | Gerçek sayfa bilgisi, varsa sezonlar ve sıralı bölümler |
| `cancel()` | Sahip olunan istekleri iptal eder; geç yanıtları geçersiz kılar |
| `isIdle()` | Bekleyen/çalışan iş olmadığında `true` |
| `resolve(content, deadline, notify, hints)` | Doğrulanmış medya kaynakları; zaman bütçesi ve iptal korunur |

`FilmPlugins.context()` yalnız modül yüklenirken alınabilir; site kimliği, `readJSON(path)` ve ayrı `createClient()` sağlar. Ortak yardımcı gerekiyorsa `SitePluginRuntime.scope(context, '1.10.0')` özel bir modül alanı oluşturur. Eklentiler JavaScript sandbox içinde değildir: kullanıcının güvenmediği kod yüklenmemelidir.

## Sınırlar ve kurallar

- Uygulama kodu Chromium 47 için **ES5** olmalı. Modern Node kodu yalnız SDK/üretim araçlarında kullanılır.
- `origins` yalnız gereken HTTPS kökenlerini içermeli; genel internet izni eklemeyin. Sınırlı joker/sayısal DNS kuralları schema tarafından doğrulanır.
- Paket başına en fazla 4 MiB, dosya başına 1 MiB; toplam eklenti alanı 8 MiB. Ortak ağ izinleri toplam 128 kökenle sınırlıdır.
- TLS sertifika/hostname doğrulaması ve RSA/SHA-256 imzaları korunur. TLS, dosyanın doğru sunucudan geldiğini; paket imzası, güvenilen yayıncıdan geldiğini doğrular.
- Yeni sürümde `version` artırılır; aynı sürüm farklı içerikle yayımlanamaz. Özel anahtarı değiştirmek mevcut yayıncı kimliğini değiştirir.
- Sayfa betiklerini çalıştırmayın. Hesap, DRM veya erişim hakkı gerektiren içerik için SDK yetki sağlamaz. Bir sunucunun 403 vermesi sertifika hatası veya başarılı çözümleme olarak gösterilmez.
- Gerçek cihaz görüntü/ses kontrolü ile fixture test sonuçlarını ayrı raporlayın.

```text
cd SDK
npm test
```

MIT lisansı ve tüm üçüncü taraf bildirimleri korunmalıdır. Özel anahtarları, kullanıcı tokenlarını, geçici medya adreslerini veya cihaz sertifikalarını depoya koymayın.
