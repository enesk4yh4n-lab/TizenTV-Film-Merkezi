# Film Merkezi WGT 1.5.0 / çekirdek 1.9.0 — ilgili kabul

8 Kasım 2026. Yalnız normal güncelleme kanalı, WGT başlangıcı, site paketleri, bildirim odağı ve bildirilen arama/ağ hataları sınandı. Yeni kapsamlı player/codec turu yapılmadı.

## Otomatik sonuçlar

- **19 ilgili kontrol geçti:** birleşik çekirdek/site kontrolü, bekleyen paketlerin yinelenmemesi, çekirdek hatasında diğer depoların sürmesi, iptal/geç yanıt, otomatik metadata kontrolü, iki gerçek arama yanıtı ve boş sonuç ayrımı, HTTP 403'te tekrar olmaması, imzalar/ES5/izin listesi.
- **7 tarayıcı kabul senaryosu geçti:** temiz kurulumda 22 imzalı başlangıç eklentisi; otomatik yeni site bildirimi; tek Kontrol et; indirme sırasında odak ve Geri; onaylı çekirdek değişiminin aynı WGT ile çalışması; kaldırılan sitenin kendiliğinden geri gelmemesi; internetsiz ilk açılış. Konsol/JS hatası yok.
- **103 JS dosyası `node --check`, 100 uygulama dosyası ES5 kontrolünden geçti.** Üçüncü taraf üretilmiş dosyalar ES5 kapsamı dışında, sözdizimi kontrolü içindedir.
- 22 başlangıç eklentisinin manifest/runtime özetleri ve imzaları çevrimiçi depo ile eşleşir. Toplam kökenler 128 sınırının altındadır. Başlangıçta site kodu indirilmez; canlı katalog için internet gerekir.
- Public WGT **262 dosya**, geliştirici imzasız. Yerel imzalı WGT **264 dosya**, **527 imza referansı** ve iki RSA imzası doğrulandı. Önceki 1.4.1 author kimliği korunur. Native dosyalar/üretim girdileri, CA ve kaynak ZIP'i denetlendi; eski WGT özeti değişmedi.

Public WGT SHA-256: `84cea338eb334a9ae1bc9400a32954fae62c6b2ff306801c0c302735514f1182`.
Yerel imzalı WGT SHA-256: `3d2fd810f6b39c43065b7a5c4ae74a750c16457642ff53450feeb7b22e6963f7`.
Boyutlar: public 4.516.862 bayt; imzalı 4.558.719 bayt. Diğer özetler: `updates/SHA256SUMS-1.5.0.txt`.

## TV'de ölçülen site hataları

TV'nin kendi doğrulamalı native TLS yolu, 19:37–19:38 (Türkiye saati):

| Site | Ana sayfa / arama | Sonuç |
| --- | --- | --- |
| Film Makinesi | HTTP 403 / 403 | TLS bağlantısı kuruluyor, sunucu erişimi reddediyor; sertifika hatası değil. Çözülmüş sayılmadı. |
| FullHDfilmizlesene | HTTP 403 / 403 | Aynı erişim engeli; çözülmüş sayılmadı. |
| TRDiziizle | HTTP 403 / 403 | Aynı erişim engeli; `/tr2/` masaüstü denemesi de 403. |
| Diziyou | HTTP 200 / 200 | Gerçek arama sayfasında `#list-series` dizi kartı seçicisi eksikti; eklenti 1.0.2 ve çekirdek ayrıştırıcısında düzeltildi. |
| Diziboxum | HTTP 200 / 200 | `.single-item` arama kartları eksikti; sayfadaki bölüm/afiş önerileri sonuçlara karışıyordu. Arama `#content .single-item` ile sınırlandı; eklenti 1.0.2. |

Loki gerçek TV yanıtlarıyla her iki sitede tek dizi kartı doğrulandı; önerilen 12 bölüm artık ayrı arama sonucu değildir. Başka sorgular için de aynı sayfa yapısı kullanılır; ada özel kural yoktur. Bulunmayan sorguda boş sonuç gösterilir; asıl alan yoksa hata gizlenmez.

403 yanıtından sonra başarısız isteği native/XHR/TLS arasında yeniden denemek kaldırıldı. Mesaj HTTP erişim engelini açıkça belirtir. Sertifika/hostname doğrulaması ve mevcut CA verisi korunur. Sunucunun erişim kısıtı uygulama tarafından giderilmiş değildir.

## TV kabulünün sınırı ve araçlar

Ara aşamadaki 1.5.0 WGT'nin TV'ye yerinde kurulması runner tarafından tamamlandı; çalıştırma/doğrulama `closed` döndürdü. Bu paket 22 yerel başlangıç kopyası eklenmeden önceki taslaktı. Son 262 dosyalı WGT'nin fiziksel kumanda/ses veya TV ilk açılış kabulü, ayrıca başarı kanıtı olmadan tamamlandı sayılmaz. Sonraki SDB denemesinde cihaz bağlantısı da düştü. Uygulama kaldırılmadı, kayıt sıfırlanmadı.

SDK runner, `../sdk-output/Debug/stage.wgt` çıktısını ürettiği hâlde proje içinde aradığı için “Package file not found after build” raporladı. SDK günlüğü derleme/paketlemeyi başarılı gösterdi. Dağıtım paketi açık dosya listesinden, önceki author kimliğiyle hazırlanıp bağımsız audit ile doğrulandı. Bu runner sonucu başarılı olarak değiştirilmedi.

Yerel makine kanıtları WGT'ye/yayına girmez: `tools/test-results/stable150/{browser,static,audit,build}.json` ve `site-errors/tv.json`. Testler, yayımlanmayan canlı yanıt fixture'larını kullanır; dışarıdan tekrar çalıştırmak için aynı gerçek sayfaların fixture alanına kaydedilmesi gerekir. Fixture yokluğu başarılı canlı test anlamına gelmez.

## Yayın kapsamı

Normal `updates/` kanalı ve 22 site deposu için GitHub yayını hazırlanır; HDF/Filmci Baba ayrı paket olarak sunulur. `updates/pilot` eski istemcilerin değişmez uyumluluk arşivi olarak kalır. Genel Release ve Apps2Samsung kataloğu bu çalışmada değiştirilmez. Yayımlama sonrası indirilen dosya özetleri ayrıca `download-verification.json` kanıtına kaydedilir.

Arama, birleştirme, filtreleme ortak çekirdek kodudur; olağan değişiklikleri çekirdek güncellemesiyle gelir. Siteye özel katalog/çözümleme ilgili site paketiyle gelir. Sabit yükleyici, native TLS/CA, CSP ve uygulama kimliği gibi değişiklikler WGT gerektirir.
