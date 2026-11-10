# Film Merkezi 1.9.1 — GitHub'da depo bulma

WGT **1.9.1**, çekirdek **1.12.1**, SDK **1.3.0**. Uygulama kimliği değişmedi. Bu özellik için yeni WGT kurulmalıdır; eski depo dosyası adına bağlantı desteği yoktur.

- Site depo indeksi **filmmerkezi-repository.json**, imzası **filmmerkezi-repository.sig** oldu. Çekirdeğin `update.json`/`update.sig` adresleri değişmedi. Eski dosya adı GitHub'daki aktif site deposundan kaldırılır; eski sürümlere ait değişmez paketler korunur.
- Depolar ekranındaki **GitHub’da depo ara**, depo adı veya kullanıcı adıyla README araması yapar. Yazarken istek göndermez. Sonuç seçilince README'deki yol bulunur, depo ve imzası doğrulanır; kullanıcı **Ekle** seçmeden güven verilmez veya paket kurulmaz. Adresle ekleme korunur. İlk kurulumda hazır depo eklenmez.
- SDK ana README'ye dosya adını ve `<!-- film-merkezi-repository: yol/filmmerkezi-repository.json -->` işaretini üretir. Alt klasörde çıktı için `--github-root` kullanılabilir. Metnin SDK dışındaki bölümleri korunur. GitHub'ın README'yi indekslemesi gecikebilir; API oran/erişim kısıtında hata açıklanır.
- Native katman yeni dosya adını kullanacak biçimde ARM/x86-32/x86-64 için yeniden derlendi. Yeni izin yalnız GitHub'ın herkese açık depo araması ve README okuma uçlarına **GET** erişimidir; genel API/yazma izni veya token eklenmedi. TLS/hostname doğrulaması, imzalar ve 128 köken sınırı korunur. CA girdisi değişmedi.
- Eski adresli depoların kayıtları bozuk sayılıp ezilmez. Bağlantı eski dosya adıyla çalışmaz; yeni adres aynı yayıncı kimliğiyle doğrulanıp kullanıcı tarafından kaydedilebilir. Diğer kullanıcı kayıtları sıfırlanmaz.

## İlgili kontroller

- [Birim sonuçları](../tools/test-results/repository191/unit.json): yeni ad/normalizasyon, eski adın reddi, boş/uzun arama, kullanıcı filtresi, README yolu, traversal, 429 ve iptal/geç yanıt; **77 ES5 çalışma zamanı dosyası** ayrıştırıldı.
- [SDK sonuçları](../tools/test-results/repository191/sdk.json): yeni indeks/imza adı, alt klasör keşif işareti, README'nin korunması, anahtarın yeniden kullanımı ve minimum WGT sürümü. Eski SDK üretim akışının 5 kontrolü de geçti.
- [Tarayıcı](../tools/test-results/repository191/browser.json): **6 grup**, Enter ile tek gönderim, arama→README→imza→Ekle, bozuk imza, sonuçlara Geri dönüş, API sınırı, TR/EN ve 1080p/720p. Bunlar yalıtılmış ağ yanıtlarıyla sınandı.
- Native C++98 keşif testi: **8 izin/red senaryosu** geçti; diğer host/API yolları reddediliyor. Üç mimarinin gerçek derlemesi geçti.
- Paket: kaynak dosyaları ve **243 imza başvurusu** doğrulandı. Public WGT 120, imzalı WGT 122 dosyadır; QA dosyaları ve geliştirici imzaları public WGT'de yoktur. YouTube CSP hash'i değişmedi.
- Tizen 3'te **1.9.1 / 1.12.1** açıldı; native HTTPS ile GitHub arama ve README API çağrıları geçti. [Yayın öncesi gerçek API sonucu](../tools/test-results/repository191/emulator-api.json) yeni README henüz yayımlanmadığından boş arama sonucu içerir; eşleşen depo bulunduğu iddia edilmez. Yayın sonrası sonuç ayrıca kaydedilir.

## Yayın sınırı ve bilinenler

Bu çalışmada GitHub `main` üzerindeki yeni dosya adı, güncel kaynaklar, SDK, README ve imzasız WGT hazırlanır/yüklenir. Ayrı Release, Apps2Samsung, imzalama anahtarı veya sunucu yayını yapılmaz. Eski WGT'ler yeni dosya adıyla çalışmaz; **1.9.1 kurulumu gerekir**. Fiziksel TV/kumanda/ses testi bu çalışmada yapılmadı.

Önceki turda bulunan P001 **1.0.2** yükleme sırası düzeltmesi yerelde hazırdır; bu dosya adı değişikliğine gizlice dahil edilmez. Yayımdaki P001 1.0.1'in açılış sorunu ayrı güncelleme bekler. [Önceki kurulum/oynatma raporu](DEPO_KURULUM_OYNATMA_1.9.0.md).
