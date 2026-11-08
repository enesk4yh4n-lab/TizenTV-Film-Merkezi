# Film Merkezi 1.8.0 — gerçek Tizen 3 TV kabulü

2026-11-08T16:05:47.159Z

## Cihaz ve kurulum

- Gerçek TV bağlantısı yerel ağ üzerinden kuruldu. Önceki IP değişmişti; TV ağ taramasında bulundu. TV web motoru Tizen 3.0 bildiriyor. Tam bağlantı bilgisi yalnız yerel QA kaydındadır.
- Başlangıçta Film Merkezi kurulu değildi. Mevcut imzalı `Film-Merkezi-Update-Test-1.4.1.wgt` kuruldu; başka uygulama kaldırılmadı. İlk kullanım ekranından sonra uygulama içi güncelleme kullanıldı.
- Çekirdek 1.8.0 ve 20 site eklentisi: geçti. Birlikte 22 ayrı site etkin; başlangıç 5899 ms.
- TRDizi 1.0.3 bağımsız güncellemesi: GitHub indirme, doğrulama ve yeniden açılış geçti. WGT değiştirilmedi.

## Kaynak ve kontrol turu

Oynatma ve menü işlemleri gerçek TV sürecinde CDP tuş olaylarıyla sınanır. Simüle medya saati, sahte API veya bilgisayardan oynatma proxy’si kullanılmaz. Her başarılı satırda 90 saniye örnekleme, duraklat/oynat, ileri/geri sarma, oynarken kaynak yenileme ve Çıkış denenir. Yenileme yükleme kimliğini değiştirmemeli; medya saati ilerlemelidir.

| Sayfa | İstenen kaynak | Gerçekte açılan kaynak / motor | Sonuç | Kontroller |
|---|---|---|---|---|
| case-12 | Vidara | Vidara / html5 | başarısız: 60 saniyelik deneme süresi doldu. Tekrar deneyebilir veya başka kaynak seçebilirsiniz. |  |
| case-12 | AS9 | Vidara / html5 | istenen kaynağa ulaşılamadı; ilk kaynak hazırlığı başarısız |  |
| case-19 | Close | Close / html5 | geçti | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog |
| case-36 | other oynatici | other oynatici / html5 | geçti | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog |
| case-29 | Kaynak | Kaynak / html5 | geçti | pause/play CDP key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog |
| case-25 | Kaynak | Kaynak / html5 | başarısız: Timeout: ChainApp.controller.phase==="playing"&&!ChainApp.engine.requestedSeek | pause/play CDP key events, forward, rewind |

## Bulunan gerçek sorunlar

### Vidara örneğinde medya profili

- Katalog ve çözümleme çalıştı; TV manifesti ve 4.700.752 baytlık ilk medya parçasını aldı. AVPlay `PLAYER_ERROR_NOT_SUPPORTED_FORMAT` verdi; HTML5 hata kodu 3 ile durdu. Ortak 60 saniyelik toparlama sonunda hata ekranı geldi.
- Aynı güncel kaynağın parçası bilgisayarda ffprobe ile incelendi: H.264 High, 1920×1080, yuv420p, **Level 6.1**; AAC-LC stereo, 48 kHz. Bu bilgisayar profil ölçümüdür; duyulan TV sesi kabulü değildir.
- Samsung’un 2017 TV belgesi H.264 FHD için Level 4.1, UHD için Level 5.1 sınırı bildirir. Ölçülen 6.1 bunun üzerindedir; format reddiyle uyumlu güçlü bulgu, tek başına bütün bitstream’in donanım uyum analizi değildir. [Samsung 2017 video özellikleri](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2017-tv-video-specifications.html)
- Vidara ve AS9 bu içerikte aynı CDN/medya yolunu döndürdü. AS9 seçimine ulaşmadan ilk Vidara açılışının hata vermesi AS9 oynatma kabulü sayılmaz. Otomatik başka kaynağa geçiş başarı diye raporlanmaz.

### TRDizi Streambox yanlış master bilgisi

- Gerçek master `RESOLUTION=1920x1333` bildirirken gerçek ilk parça H.264 Main Level 4.0, 1920×1080 ve AAC-LC içeriyor. Yanlış boyut bilgisi HTML5 yetenek filtresinde kaynağın elenmesine yol açtı; AVPlay fallback hazırlığı zaman aşımına uğradı.
- TRDizi eklenti 1.0.3 yalnız tek varyantlı, ayrı ses/altyazı rendition taşımayan masterı, sunucunun verdiği gerçek alt playlist adresine açar. Çözünürlük/codec uydurmaz; birden fazla kalite veya `EXT-X-MEDIA` varsa master korunur. Böylece ortak motor ve WGT değişmeden siteye özel bozuk master ele alınır.
- Düzeltme sonrası gerçek TV’de Streambox HTML5 ile 1920×1080 açıldı; duraklatma ve kısa ileri/geri sarma yanıt verdi. Ardından sarma sonrası tamponlama 25 saniyede oynuyor durumuna dönmedi. Bu son tekrar yenileme başlamadan kaldı: yenilemenin videoyu kapattığı kanıtlanmış değildir; sarma/toparlanma sorunu açık kalır. Bu kaynak 90 saniyelik tam kabul almış sayılmaz.

## Test altyapısında düzeltilen ölçüm sorunları

- Streamcore kaynağının gerçek etiketi `other oynatici`; ilk testin `Kaynak` etiketini araması bir test hatasıydı. Önceki ham sonuç saklanarak gerçek etiketle tekrarlandı.
- Çok hızlı biten yenilemeden hemen sonra 0,5 saniye medya ilerlemesi beklemek yanlış negatif üretebiliyordu. Yenileme sonrasında 1,5 saniyelik gözlem eklendi; uygulama kodu bu nedenle değiştirilmedi.
- İlk tur alt testleri başarısız yazdığı halde süreç 0 dönüyordu. Çıkış kodu ilgili başarısız satırlara bağlandı. Runner’ın ilk turdaki üst seviye `passed:true` alanı kaynak başarısı olarak kullanılmaz.
- Emülatörün sıfır kare sayacı ve AVPlay oturum takılması TV sonucu yerine kullanılmadı. Ekran/işitilen ses gözlemi olmayan satır yalnız otomatik medya ve kontrol kabulüdür.

## Katalog ve son durum

- Gerçek TV katalog turu geçti: 22 site tekil listelendi; Matrix aramasında son turda 5 sonuç geldi; görünür yön tuşu odağı korundu. Ana sayfada 24 kart, sonuçlarda 5 kart; 60 DOM sınırı aşılmadı.
- Dizipal21 kapatılıp gerçek Uygula ve yeniden aç işleminden sonra 21 siteye düşüldü; tekrar açılıp yeniden başlatılınca 22 siteye dönüldü. Son durumda bütün 22 site açık, uygulama görünür ve çekirdek 1.8.0.

## Sınırlar ve kanıtlar

- Fiziksel kumanda, TV hoparlörlerinden duyulan ses/senkron ve bütün kaynak seçenekleri bu otomatik turla doğrulanmış sayılmaz. Kullanıcı gözlemi ayrıca kaydedilir.
- Ağ erişimi engelli seçenekler ve kalan kısa oynatma turları ana 1.8.0 raporunda açık kalır. Bütün 22 site için sorunsuz oynatma iddiası yoktur.
- WGT SHA-256: `2c06ea44e4e4dc3d3c62416324eebbb5a080a3318066d76070a5b4e35310fac9`. Geliştirici imzalı mevcut test paketi; public paket ayrıca korunur.
- Yerel kanıtlar: `tools/test-results/sites180/tv-install.json`, `tv-playback.json`, `tv-initial-diagnostics.json`, `tv-after-streambox.json`, `vidara-codecs.json`, `media-profiles.json`, `tv-patch-tr103.json` ve başarısız önceki tur dosyaları. Ham yanıt/tokenlar dağıtıma girmez.
- Genel Release veya Apps2Samsung kaydı değiştirilmedi.

## İlgili otomatik doğrulamalar

- 60 ilgili birim/ayrıştırıcı kontrolü geçti. Paketlerde 94 JS dosyası node --check ve ES5 ayrıştırmasından geçti; imzalar/özetler geçerli. Son WGT özeti korunuyor. Kapsam, dokunulan eklenti ve ortak yardımcılarla sınırlıdır.
