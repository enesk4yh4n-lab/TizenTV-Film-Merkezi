# Film Merkezi 2.0.0 — paket haritası ve sözleşmeler

## Ayrım

- WGT: sabit yükleyici, güven doğrulaması, native TLS bileşenleri ve çevrimdışı genel çekirdek. Hazır site/depo/çözümleyici yoktur.
- Çekirdek: arayüz, katalog, kayıtlar, iki oynatma motoru, ortak veri ayrıştırması ve eklenti arayüzleri.
- P002 2.0.0: Puhutv katalog/arama/detay ve bölüm bilgisi.
- R002 1.0.5: Puhutv medya çözümlemesi.

Paket kaynakları `kaynak/saglayicilar/p002/` ve `kaynak/cozumleyiciler/r002/` altındadır. WGT içinde site veya çözümleyici paketi yoktur.

## Paket API v2

Depo `schemaVersion: 2` kullanır; dosya adı `filmmerkezi-repository.json` kalır. Manifest `schemaVersion: 2`, `apiVersion: 2`, `type: site|resolver`, `minAppVersion`, `minCoreVersion`, `dependencies`, `files`, `modules`, `networkPolicy` içerir. Yalnız site paketinde `site` tanımı bulunur.

Bağımlılık `{publisher, id, minVersion, maxVersion}` biçimindedir; minimum dahil, maksimum hariçtir. `publisher` açık anahtarın SHA-256 parmak izidir. Aynı çözümleyici için tek etkin sürüm bulunur. Uyumsuz sürümler, eksik yayıncı ve döngüler kurulumdan önce reddedilir. Başka depolar otomatik eklenmez.

`FilmPlugins.context()` ile paket yüklenirken bağlam alınır. Bağlamın `createClient`, `readJSON`, `createResolver`, `registerResolver`, `registerLoader` işlemleri vardır. Kayıtlar yalnız modül yüklemesinde yapılır.

Çözümleyici `registerResolver({create: function(context, log, now) { return {resolve, cancel}; }})` ile kaydolur. Site `context.createResolver('r002')` üzerinden yalnız bildirdiği bağımlılığı çağırır. Girdi, site ile çözümleyicinin belgelenmiş veri sözleşmesidir; çıktı ortak player kaynak listesi veya site adaptörünün işlediği yapılandırılmış ayrıştırma sonucudur. Medya kayıtlarının sahipliği çalışma zamanında çözümleyiciye bağlanır.

Paketler JavaScript sandbox'ı değildir. İmza yayıncıyı/doğruluğu kanıtlar, kodun güvenli veya içeriğin lisanslı olduğunu kanıtlamaz.

## Ağ ve özel medya yükleme

`createClient()` varsayılan olarak paket kapsamındaki native TLS yolunu kullanır. Repository/plugin kimliği native isteğe taşınır; URL, Referer, Origin ve yönlendirmeler ilgili paketin imzalı kökenleriyle karşılaştırılır. Başka paketin izinleri yetki kazandırmaz.

Eski cihazlarda gereken platform metin yolu `createClient({platformText:true})` ile seçilebilir. Bu seçenek yalnız sağlayıcının açıkça talep ettiği durumlarda kullanılır. Platform Download API'si etkin yönlendirme zincirini sunmadığından native TLS yolundaki her yönlendirme denetimi bu yolda aynı güçte uygulanamaz; başlangıç ve bildirilen yanıt URL'si paket kapsamında kontrol edilir. Bu sınırlama gizlenmemeli; eklentiler güvenilmeyen kod için güvenlik sınırı olarak sunulmamalıdır.

Özel yükleyici `registerLoader(id, factory)` ile kaydolur. Kaynak `loaderId`, sınırlı JSON `loaderConfig` taşır. Factory oturumluk `request` ve `put(id,text)` alır; `{load(url,options), destroy()}` döndürür. `load`, `{promise,cancel}` görevi döndürür. Yanıt `{data,status,url}` şeklindedir; `data` metin veya istenmişse ArrayBuffer olur. Manifest, playlist, key ve medya isteklerinin iptali/boyut/süre sınırı ortak köprüde korunur.

`put` en fazla toplam 1 MiB sanal metin saklar. `https://film-virtual.invalid/` adresleri gerçek ağa gitmez. Özel yükleyicili kaynak AVPlay'e aktarılmaz. Çıkış/kaynak değişimi oturumu temizler. Yeni native, DRM veya codec desteği bu API'nin kapsamında değildir.

## Kurulum

Site kurulum ekranı bağımlılıkları birlikte gösterir. Bütün dosyalar ve imzalar doğrulanmadan etkin kayıt değişmez. Pending set yeniden açılışta tutarlı biçimde etkinleşir; başlangıç kaydı tamamlanamazsa önceki paket setine dönülür. Önceki/pending set dosyaları çöp toplamada korunur. Eski API paketleri çalıştırılmadan açıklamayla ayrılır.

Çözümleyiciyi kullanan site varsa çözümleyici kaldırılamaz/devre dışı bırakılamaz. Başka depodaki siteyi bozacak depo kaldırma/pasifleştirme engellenir. Geri dönüş tutarlı paket seti içindir. Kullanıcı izleme/favori verileri bu işlemlerde silinmez.

