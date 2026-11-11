# Film Merkezi SDK 2.0.0

Tizen 3 / Chromium 47 için bağımsız **site** ve **çözümleyici** paketleri üretir. WGT ve çekirdek 2.0.0 gerekir. Eski paket API'si desteklenmez.

## Başlangıç

Geliştirme bilgisayarında Node.js 20+ kullanın; SDK klasöründe `npm install` çalıştırın. TV'nin bilgisayara veya ek çalışma sunucusuna ihtiyacı yoktur.

```text
node SDK/cli.cjs init --project examples/r101 --id r101 --name R101 --type resolver
node SDK/cli.cjs init --project examples/p101 --id p101 --name P101 --type site --resolver-id r101
node SDK/cli.cjs pack --project examples/r101 --out my-repository --publisher "Independent publisher" --repository-id independent
node SDK/cli.cjs pack --project examples/p101 --out my-repository --publisher "Independent publisher" --repository-id independent
```

Örnek site kamuya açık test akışını sağlayan R101'e bağlıdır. `addon.json`, katalog verileri ve kodu kendi sitenize göre değiştirin. `PUBLISHER_FINGERPRINT` bağımlılık değeri paketlemede sizin yayıncı parmak izinize çevrilir. Başka yayıncıya bağımlılık için onun açık anahtar parmak izini yazın. Film Merkezi geliştiricisinin onayı veya özel anahtarı gerekmez.

RSA-2048 anahtarı ilk üretimde proje/depo dışında kullanıcı hesabının `.film-merkezi-sdk/` klasöründe oluşturulur; sonraki üretimlerde korunur. Kaybetmeyin, paylaşmayın. `keygen` ve `--key` komutları kullanılabilir. Mevcut deponun anahtarı yoksa yeni anahtarla üzerine yazılmaz.

## Paketler ve arayüzler

Manifest ve depo biçimi v2'dir. Site `home/list/search/detail`, `cards/next` ve gerçek bölüm verilerini sunar. Çözümleyici `resolve/cancel` sunar. Bağımlılık yayıncı parmak izi, kimlik, minimum dahil/maksimum hariç sürümle belirtilir. Çözümleyicinin tek etkin sürümü bulunur; uyumsuz bağımlılık kurulumu durdurur.

`FilmPlugins.context()` modül yüklenirken alınır. Paket `context.createClient()` ile kendi istemcisini oluşturur. Site `context.createResolver('r101')` ile bildirilen bağımlılığı çağırır. Çözümleyici `context.registerResolver({create: function(context, log, now) { return {resolve: ..., cancel: ...}; }})` ile kaydolur. Medya kaynağının paket sahipliği korunur.

Özel HLS yükleyicisi gerekiyorsa `template/media-loader.js` örneğini resolver paketinin dosya/modül listesine ekleyin. `registerLoader` oturuma bağlı yükleyici kaydeder; kaynak `loaderId`, `loaderConfig` ve `playbackRequirements.customLoader` taşır. Global player/ağ işlevleri değiştirilmemelidir. Yeni codec, DRM veya native cihaz yetkisi eklenmez.

## Yayın ve güven

Paketleme `filmmerkezi-repository.json`, `.sig`, imzalı manifestler ve dosya özetlerini üretir. README'ye keşif işareti eklenir; alt klasöre yayın için `--github-root <depo-kökü>` kullanın. Komut GitHub'a yükleme yapmaz.

Kullanıcı **Güncelleme Merkezi → Eklenti depoları** üzerinden HTTPS adresini ekler veya GitHub'da arar. Hazır/resmî depo yoktur. Site seçildiğinde çözümleyiciler kurulum özetinde gösterilir. Kullanıcı eklemedikçe başka depo aranmaz/eklenmez.

Yalnız gereken HTTPS kökenlerini `origins` alanında bildirin. TLS, imza ve ağ izinleri korunur. Paket 4 MiB, dosya 1 MiB, toplam eklenti alanı 8 MiB ve toplam 128 köken sınırı vardır. Runtime ES5 olmalıdır. Yayımlanan sürümler değişmezdir; değişiklik için sürüm artırın.

Eklentiler JavaScript sandbox'ı değildir; uygulama yetkileriyle çalışırlar. İmza içerik lisansı veya zararsızlık garantisi değildir. Platform metin taşımalarında yönlendirme görünürlüğü native TLS yolundan daha sınırlıdır. Ayrıntılı sözleşme kaynak dağıtımındaki `docs/MODULER_EKLENTI_2.0.0.md` belgesindedir.

Grafik geliştirme aracı planlanmaktadır, henüz yayımlanmamıştır. `npm test` bağımsız yayıncı, anahtarın korunması, paketleme ve bozuk imza kontrollerini çalıştırır.
