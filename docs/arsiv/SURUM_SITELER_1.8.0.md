# Film Merkezi — çekirdek 1.8.0 ve bağımsız site paketleri

Bu sürüm pilot güncelleme kanalındadır. WGT uygulaması 1.4.1 olarak kalır; genel Release veya Apps2Samsung kaydı değiştirilmez.

- HDFilmCehennemi ve Filmizle.ink çekirdekte kalır. Diğer 20 site ayrı imzalı eklentiye taşınmıştır.
- Eski sitelerin kimlikleri ve kayıt önekleri korunur. Film İzle Babam temel adresi `https://filmizlebabam.icu`; eski `.com` adresleri takma adres olarak kalır.
- Yeni siteler: TRDiziizle, Dizipal21, Diziyou, İzle7, RoketDizi, Diziizle, Dizipal19 ve Diziboxum. İki Dizipal kaydı birbirinden bağımsızdır.
- DDizi doğrudan YouTube iframe biçimi, Vidara’nın bildirdiği AS9 aynası, FilmizleHell sayısal içerik kimliği ve HDF’nin açık 404/410 manifest davranışı düzeltilmiştir.
- Site modülleri özel ad alanında yüklenir. İmzalı ağ izinleri gerçek yanıtlardan çıkarılır; TLS doğrulaması açık kalır.
- Yirmi eklenti ilk olarak 1.0.0 yayımlandı. Canlı kontrolden çıkan TRDizi düzeltmeleri 1.0.1/1.0.2; FixFull güncel Bronz CDN izni 1.0.1 ile verildi. Önceki paketler korunur.
- TRDizi’de gizli doğrulama iframe’i oynatıcı sayılmaz; Tizen 3’te sayfa ve embed arasında yanlış fallback tercihi taşınmaz.
- Kaldırma sonrası yeniden kurmada indirilmiş dosyaların erken budanmasına karşı çekirdekte işlem süresiyle sınırlı staging koruması bulunur.

Site eklenmiş olması bütün kaynaklarının çalıştığı anlamına gelmez. HTTP engelleri, yayıncı kısıtları ve zaman aşımı sonuçları [ayrıntılı kabul raporunda](TEST_SONUCLARI_SITELER_1.8.0.md) ayrı gösterilir. Fiziksel TV sesi, senkronu ve kumandası bu çalışmanın emülatör sonucundan çıkarılamaz.

Güncelleme sırası: önce **çekirdek 1.8.0**, ardından **Güncelleme Merkezi → Eklenti depoları** üzerinden site paketleri; son olarak yeniden açılış. Mevcut WGT 1.4.1 şeması kurulum öncesinde ayrı minimum çekirdek alanını denetlemez; modül açılışındaki açık uyumluluk kontrolü korunur.
