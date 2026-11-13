# Sürüm notları

## Çekirdek 2.1.3 — 13 Kasım 2026

Bu güncelleme, önceki çekirdek yayını 2.0.1'den sonra hazırlanan yenilik ve düzeltmeleri birlikte içerir. Uygulama/WGT sürümü **2.0.0** olarak kalır; çekirdek Güncelleme Merkezi üzerinden yüklenir.

### Yenilikler

- **Arama önerileri:** TMDB veya destekleyen bir site eklentisi öneri kaynağı olarak seçilebilir. En az üç karakter yazıp bir saniye beklediğinizde öneriler görünür. Özellik ayarlardan kapatılabilir.
- **P001 önerileri:** Yeni kurulumlarda öneriler açık ve kaynak P001 olarak ayarlıdır. P001'in kurulu ve aktif olması gerekir; otomatik depo veya eklenti kurulmaz. Mevcut kullanıcı tercihleri korunur.
- **Birleştirme yöntemleri:** Net, Akıllı ve Esnek seçenekleri eklendi. IMDb/TMDB kimlikleri ve doğrulanmış eser bilgileri eşleştirmede kullanılır; Esnek yöntemde yanlış eşleşme olasılığı daha yüksektir.
- **Geçici site bekletmesi:** Bir site art arda iki gerçek erişim hatası verirse katalog istekleri 30 dakika bekletilir. Sonraki istekte tek kontrol yapılır. Site yanıtlarındaki **Şimdi tekrar dene** düğmesiyle erken deneme yapılabilir. Boş arama sonuçları ve kullanıcı iptalleri hata sayılmaz.

### Düzeltmeler

- Öneri seçildiğinde aramanın yanlış başlıkla başlaması ve seçilen kaydın sonuçlardan kaybolması düzeltildi.
- TV'nin sanal klavyesi açıldığında uygulamanın tamamının küçülmesi giderildi.
- Ortak aramada gereksiz bölüm bilgisi indirilmesi azaltıldı; sağlayıcılar ortak istek ve iptal düzenine bağlandı.
- Bazı birleşik kartların kaybolmasına yol açan kimlik çakışması düzeltildi.
- Türkçe ve özgün adlarla arama, eser türü doğrulaması ve öğrenilmiş kimlik bilgilerinin yeniden kullanılması geliştirildi.
- Sonradan gelen yanıtların eski ekranı değiştirmesine karşı korumalar ve katalog zaman aşımı işlemleri iyileştirildi.

### Bilmeniz gerekenler

- Birleştirme, sitelerin sunduğu bilgilerle sınırlıdır; belirsiz kayıtlar ayrı kalabilir.
- Geçici site bekletmesi uygulama oturumu boyunca tutulur. Süre dolduğunda kontrol, sonraki katalog isteğinde yapılır.
- Bu yayın yeni WGT kurulumu gerektirmez. SDK ve çözümleyici paketleri değişmemiştir.
