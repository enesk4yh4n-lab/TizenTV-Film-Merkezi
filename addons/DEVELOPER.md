# Film Merkezi — bağımsız eklenti depoları, API v1

**Update Test 1.4.1 / SDK 1.0.2:** imzalı ağ izinlerinde `https://*.cdnimages{n}.cyou` gibi sınırlı sayısal DNS aileleri desteklenir. `{n}` tek DNS etiketinde 1–6 rakam eşler; harf, boş eşleşme veya bütün `.cyou` alanları kabul edilmez. Her DNS kalıbında en fazla bir `{n}` işareti olabilir. Bu kalıbı kullanan `addon.json` için `minAppVersion: "1.4.1"` gerekir; SDK daha düşük sürüm bildirilirse paketlemeyi reddeder. Normal tam host/`*.alan` eklentileri 1.4.0 ile uyumlu kalır. TLS, imza, özel IP, boyut ve eşzamanlı istek sınırları değişmez.

Update Test **1.4.0** kullanıcıların kendi GitHub veya uyumlu HTTPS depolarını eklemesini sağlar. Film Merkezi'nin yayın anahtarı veya onayı gerekmez. Her yayıncı kendi RSA-2048 anahtarını üretir; kullanıcı ilk eklemede yayıncının SHA-256 parmak izini görüp güvenmeyi seçer. TLS sertifika/hostname kontrolü devam eder. Eklentiler uygulamayla aynı JavaScript yetkilerindedir; ayrı klasörler bir sandbox değildir.

## Kullanıcı akışı

**Seçenekler → Eklenti depoları → Depo ekle → Adresi düzenle → Depoyu incele → Yayıncıya güven → Eklentilere gözat → Yükle → Uygula ve yeniden aç.**

Adres `https://sunucu/yol/repository.json` biçimindedir. GitHub `blob` bağlantıları raw adrese çevrilir; yalnız `https://github.com/kullanici/depo` girilirse `main/repository.json` denenir. Farklı dal için tam raw bağlantı verin. Kullanıcı birden çok depo ekleyebilir. Depo ekranında güncelleme kontrolü, aynı yayıncı anahtarını koruyarak adres değiştirme ve depoyu kapatma/kaldırma vardır. Başka yayıncıya geçmek için yeni depo eklenir; anahtar değişimi sessizce kabul edilmez.

**Kurulu eklentiler** ekranında etkinleştir/devre dışı bırak, kaldır ve önceki sürüme dön bulunur. Dosya ve sürümler karıştırılmaz; değişiklikler yeniden açılışta uygulanır. Hatalı başlangıç yalnız ilgili eklentiyi geri alır veya kapatır. Core ve diğer yayıncılar çalışmayı sürdürür. Kaldırma izleme/Listem kayıtlarını silmez. Player açılırken indirme iptal edilir. Kod indirmesi kullanıcı seçimiyle gerçekleşir.

## Geliştirici için başlangıç

SDK **1.0.1** örnek yayını 848×480 varyantına sabitler. İlk 1080p otomatik kalite denemesinde emülatör tamponlama gecikmesi görüldü; bu değişiklik yalnız örnek eklenti verisidir, player motorunu değiştirmez.

Node 20+ gerekir. Projede mevcut `tools/node_modules/acorn` kullanılabilir; bağımsız SDK ZIP'inde `npm install --prefix tools/plugins` çalıştırılabilir. TV tarafına Node, sunucu veya npm kurulmaz.

```text
node tools/plugins/cli.cjs keygen --out <YAYIN_DISINDAKI_DIZIN>/author.pem
node tools/plugins/cli.cjs init --project benim-sitem --id yayinci-site --name "Benim sitem"
node tools/plugins/cli.cjs pack --project benim-sitem --out yayin --key <YAYIN_DISINDAKI_DIZIN>/author.pem --publisher "Yayıncı adı" --repository-id yayinci
```

Özel anahtar hem proje hem yayın klasörü dışında kalmalı. Windows'ta oluşturulan dosyanın ACL'si mevcut kullanıcıyla sınırlandırılır; Linux'ta 0600 kullanılır. Anahtarı WGT'ye, GitHub'a veya ZIP'e koymayın. Aynı yayıncı anahtarını sonraki sürümlerde koruyun. Araç var olan anahtarı ezmez. Özel anahtar metnini paket dosyalarında görürse paketlemeyi reddeder.

`init` açıkça **örnek test yayını kataloğu** üretir; gerçek bir film sitesini çözdüğünü iddia etmez. `site.js`, `catalog.json`, `streams.json`, lisans ve `addon.json` oluşur. Kendi siteniz için provider/parser/resolver bölümlerini değiştirin. `addon.json` sürümünü artırıp tekrar `pack` çalıştırın. Aynı sürüm farklı dosyalarla ezilemez. Üretilen `yayin/` klasörünü GitHub'a veya HTTPS sunucunuza yükleyin; kullanıcılara `repository.json` adresini verin. NaCl olmayan platformlarda normal tarayıcı CORS koşulları da geçerlidir. Yönlendirme/kısaltma yerine doğrudan manifest adresi kullanın.

```text
yayin/
├── repository.json          # id, ad, açık anahtar, revizyon, eklenti listesi
├── repository.sig           # aynı yayıncının RSA/SHA-256 imzası
└── packages/yayinci-site/1.0.0/
    ├── manifest.json        # API/minimum uygulama sürümü, site kimliği, dosyalar, hash/size
    ├── manifest.sig
    └── runtime/
        ├── site.js
        ├── catalog.json
        ├── streams.json
        ├── LICENSE.txt
        ├── network-policy.txt
        └── network-policy.signature.txt
```

## Site API'si

Kod ES5 olmalı. Her eklenti tek bir site kaydeder. `site.id` benzersiz olmalı; `site.prefix` tam olarak `<site.id>:` olur. `storagePrefix` aynı siteye özgü seçilir. Provider/resolver global adları yerine IIFE içinde tutulabilir. Yerleşik veya başka eklentinin site kimliği üzerine yazılmaz.

Modül yüklenirken `var context = FilmPlugins.context()` alınır. `context.site` manifest metadata'sıdır. `context.readJSON(path)` yalnız bu eklentinin manifestinde bildirilen, özeti doğrulanmış dosyayı okur. `context.createClient()` bağımsız `ChainNetwork` istemcisi oluşturur. Katalog ve resolver istemcileri ayrı tutulmalı; `cancel()` yalnız kendi işlerini iptal etmelidir.

- `Provider(cache, network)`: `home(force)` → `{hero,movies,series}`; `list(query,next,force)` / `search(query,force,next)` → `{cards,next}`; `detail(card,force)` → detay; `options()` → filtreler; `cancel()` ve `isIdle()`.
- Kart: `contentId`, `siteId`, `type`, `pageUrl`, `title`, `poster`; bilinen yıl/puan/dil bilgileri eklenebilir. Detayda `genres`, `cast`, `episodes`, `seasons` dizi alanları bulunmalı. Bilgi yoksa boş dizi verilir.
- `Resolver(log)`: `resolve(content, deadline, notify, hints)` → kaynak listesi; `cancel()` desteklenir. Kaynak: sabit `id`, `label`, `type`, güncel `url`, gerekirse `referer`, `subtitles`. Geçerli manifest/medya denetlenmeden başarı gösterilmez. Tokenlı URL'ler koda veya kalıcı kataloğa gömülmez.
- Site kaydı `SiteRegistry.register({id,name,base,prefix,storagePrefix,Provider,Resolver,ui,filterFields,collectionQuery})` ile yapılır. Çalışan tam örnek `template/site.js` içindedir.

Gerekli site, embed, API ve medya kökenlerini `addon.json.origins` içine **ölçerek** ekleyin. `pack` bunları ayrıca yayıncı anahtarıyla imzalar. Native katman her yayıncının politikalarını kendi anahtarıyla denetler. Özel IP/localhost, HTTP, izinsiz yönlendirme ve farklı yayıncı imzası kabul edilmez. Kod paketleri native binary/privilege/CSP değiştiremez. Native/çekirdek değişikliği yine WGT gerektirir.

## Sınırlar ve kayıtlar

16 depo / 64 kurulu eklenti; depo indeksi 64 KiB / 128 ilan; eklenti başına 40 dosya / 4 MiB, dosya başına 1 MiB. Kod önbelleği aktif/önceki/hazır sürümler dahil toplam **8 MiB**. Bu alan silinebilir katalog önbelleğinden ayrıdır. Yer açmak için kurulu eklenti veya kullanıcı verisi otomatik silinmez. Yalnız terk edilmiş dosyalar temizlenir. Metadata iki günlükle `wgt-private/film-plugins` altında tutulur; core güncellemeleri `film-update` alanında kalır. Bilinmeyen kayıt sürümü veya okunamayan kayıt ezilmez.

Aktif kayıtların bozulması ilgili eklentiyi kapatabilir/geri alabilir; kullanıcıya hata gösterilir. JavaScript sandbox bulunmadığından kötü niyetli, kullanıcı tarafından güvenilmiş kodu tam yalıtma garantisi yoktur. Ağ/API/core bütçeleri korunur; yükleyici ikinci bir video motoru açmaz.

## İlgili doğrulamalar

```text
node --test tools/plugins/plugins.test.cjs tools/updates/native-tls.test.cjs
node tools/plugins/fixtures.cjs
node tools/plugins/build.cjs
node tools/plugins/browser.cjs
```

Fixture testleri native oynatma kanıtı sayılmaz. Gerçek Tizen sonuçları teslim raporunda ayrıca gösterilir. Ana 14 siteli 1.2.0 uygulama ve önceki 1.3.1 pilot WGT korunur. Yeni pilot 1.4.0 ayrı test uygulaması kimliğini kullanır.
