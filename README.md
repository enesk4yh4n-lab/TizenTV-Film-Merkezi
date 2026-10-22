# HDfilmCehennemi TV · Tizen 3.0

Samsung Tizen TV için kumandayla kullanılan film/dizi kataloğu ve HLS oynatıcı.
Uygulama TV üzerinde çalışır; normal kullanımda PC veya ek sunucu gerekmez.

**Tizen 3.0 gerçek TV’de günlük kullanımda sorunsuz çalıştığı kullanıcı tarafından
bildirilmiştir.** Denenen cihaz Samsung UE55MU7500, yazılım 1410'dur. Bu bilgi
tek cihazdaki kullanıcı deneyimidir; bütün TV modelleri, yayınlar ve codec'ler için
koşulsuz uyumluluk garantisi değildir. Ayrıntılar: [Uyumluluk](docs/UYUMLULUK.md).

**Tizen-sim üzerinde Tizen 10.0 ortamında uygulamanın açıldığı kullanıcı tarafından
bildirilmiştir; ayrıntılı oynatma, ses, ağ ve kumanda testleri yapılmamıştır.** Bu
açılış bildirimi, gerçek Tizen 10.0 TV veya Samsung TV emülatörü kabulü sayılmaz.

## İndirme ve kurulum

[v0.4.6 sürümünden](https://github.com/enesk4yh4n-lab/TizenTV-HDFilmCehennemi.wgt/releases/tag/v0.4.6)
`HDfilmCehennemi-TV-0.4.6-public.wgt` dosyasını indirin.
Kaynak ZIP dosyası uygulama paketi değildir.

Kurulumda **[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung)** kullanıldı.
TV bağlantısı, sertifika ve kurulum işlemlerini kolaylaştıran Apps2Samsung ekibine
özellikle teşekkür ederiz. [Kurulum adımları](docs/KURULUM.md).

Dağıtılan WGT kişisel sertifika/imza içermez. Apps2Samsung'ın özel WGT kurulum
yolunda kendi TV'niz için imzalanmalıdır; doğrudan `sdb install` ile imzasız kurulum
başarısı beklemeyin. Genel paket ayrı uygulama kimliği kullanır; eski özel kurulumun
izleme kayıtları kendiliğinden aktarılmaz.

## Özellikler

- Film/dizi katalogları, arama, filtreler, Listem ve izlemeye devam et.
- Sezon/bölüm seçimi, izlendi işaretleri ve isteğe bağlı bölüm takibi.
- Smart Remote ile oynatma/duraklatma, sarma, önceki/sonraki içerik ve güvenli çıkış.
- Yayının sunduğu kalite, ses ve altyazı seçenekleri; Türkçe ses önceliği.
- Afişlerde doğrulanmış dublaj/altyazı rozetleri; bölüm seçenekleri değişebilir.
- Yerel izleme kayıtları ve isteğe bağlı beş dakikalık kararlılık ölçümü.

MP4, bağımsız ses gecikmesi ve doğrulanmamış yüksek codec/çözünürlükler genel
destek kapsamında değildir. Ana motor hls.js/MSE'dir; AVPlay tanı deneyi genel
oynatma desteği anlamına gelmez. Site/kaynak değişiklikleri erişimi etkileyebilir.

## Kaynaktan paketleme

Node.js, Python 3 ve geliştirme araçları gerekir:

```sh
npm ci
npm test
python scripts/build.py
```

Paket `dist/` içinde oluşur; derleyici decoder'ı `vendor/decoder/` kaynaklarından
yeniden üretir. Yerel sertifika/parola gerektirmez. Tarayıcı kontrolleri için önce
`npx playwright install chromium`, ardından `npm run browser` çalıştırılabilir.

## Lisanslar ve teşekkürler

Projenin özgün katkıları [MIT](LICENSE) lisanslıdır. Bağımlılıkların kendi lisansları
korunur; MIT, Apache-2.0 bileşeninin lisansını değiştirmez.

Faydalandığımız projelerin geliştiricilerine ve katkıcılarına teşekkür ederiz:

- **[enXov/hdfilmcehennemi-stremio](https://github.com/enXov/hdfilmcehennemi-stremio)**:
  özgün çözümleme yaklaşımı ve decoder çeşitleri, MIT.
- **[Batuhan4/hdfilmcehennemi-stremio](https://github.com/Batuhan4/hdfilmcehennemi-stremio)**:
  sürdürülen fork ve site oynatıcı biçimleriyle ilgili uyarlama temeli, MIT.
- **[video-dev/hls.js](https://github.com/video-dev/hls.js)** geliştiricileri ve
  katkıcıları: HLS/MSE oynatma motoru, Apache-2.0.
- **[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung)** ekibi ve katkıcıları:
  gerçek TV'ye kurulum kolaylığı. Kurulum aracının kodu bu uygulamaya dahil değildir.
- Geliştirme kontrollerinde kullanılan **[Playwright](https://github.com/microsoft/playwright)**
  ve **[Acorn](https://github.com/acornjs/acorn)** ekipleri.

Özgün telif bildirimleri: [THIRD_PARTY_NOTICES](app/THIRD_PARTY_NOTICES.md),
[decoder lisansı](vendor/decoder/LICENSE), [hls.js lisansı](app/HLS_APACHE_2_LICENSE.txt)
ve [hls.js bildirimi](app/HLS_LICENSE.txt).

## Kapsam ve gizlilik

Bu bağımsız topluluk projesi Samsung, Apps2Samsung veya içerik sitesi tarafından
onaylanmış/resmî bir uygulama değildir. Film/video dosyaları ve afiş arşivi dağıtılmaz.
Yazılım lisansı, üçüncü taraf içerik veya markaları kullanma izni sağlamaz; yalnız
erişim ve kullanım hakkınız olan kaynaklarla kullanın. Simge/marka hakları yazılımın
MIT lisansıyla devredilmiş sayılmaz.

Bu paylaşımda kişisel ad/e-posta, özel sertifika, hesap bilgisi, izleme geçmişi veya
ham test yanıtları yoktur. Uygulamanın istekleri içerik kaynaklarına gider; izleme
kayıtları cihazda saklanır. Sorun bildirirken parola, DUID, IP, imzalı video URL'si
veya kişisel ekran görüntülerini paylaşmayın. Bkz. [Güvenlik](SECURITY.md).
