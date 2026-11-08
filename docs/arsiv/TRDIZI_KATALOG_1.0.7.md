# TRDizi 1.0.7 — bölüm yerine dizi kartları

9 Kasım 2026. Yalnız TRDizi site paketi güncellenir. Çekirdek 1.9.4, WGT 1.5.0, diğer 21 site ve kaynak çözümleme yolu değişmez.

## Neden ve davranış

TRDizi'nin ana sayfası ve arama yanıtları dizi listesi yerine `.listepisodes` alanlarında bölüm yayınları sunar. Önceki sağlayıcı bu ham bölümleri doğrudan kataloğa aktarıyordu. Yeni sağlayıcı:

- Kartın ayrı `dizi-ismi` alanını ve aynı yanıtın gerçek `/diziler/…` bağlantılarını eşler. URL tahmin etmez; bölüm numarasını dizi adı saymaz.
- Doğrulanan dizi adresi ve mevcut dizi kimliğiyle tek kart üretir. Ana sayfa, Diziler, tek-site/ortak arama ve sonraki sayfalar aynı kimliği kullanır.
- Bu düzeltme sağlayıcının kendi katalog modelindedir; genel siteler arası birleştirme ayarı kapalıyken de uygulanır.
- Sayfadaki bütün alfabetik dizi dizinini arama sonucu olarak eklemez; yalnız gerçek sonuç kartlarını dönüştürür.
- Dizi dizini olmayan yanıtta, açık dizi başlığı ile gerçek bölüm adresinin dizi kökü üzerinden sınırlı bir grup kimliği kullanır. Gerçek bölüm adresi detayda üst dizi sayfasını bulmak için korunur. Farklı dizi kökleri veya çelişkili dizi adresleri benzer ad diye zorla birleştirilmez.
- Dizi kartını açmak en son yayınlanan bölümü kendiliğinden seçmez. Normal sezon/bölüm seçimi ve kayıtla devam akışı kullanılır. Doğrudan eski bölüm bağlantısı açılırsa o bölümün seçimi korunur.
- Detayda dokuz gerçek Tuzlu Kahve bölümü ve sırası korunur. Eski bölüm/izleme kimlikleri yeniden yazılmaz.
- Liste başına ek detay isteği yapılmaz. Aynı HTML bir ayrıştırma bağlamında işlenir. Yeni cache kapsamı eski bölüm kartlarının yeniden kullanılmasını önler; kullanıcı kayıtları temizlenmez.

## İlgili doğrulama

Altı yeni katalog kontrolü: gerçek TV'den kaydedilmiş dokuz Tuzlu Kahve arama kartının bir dizi kartına dönüşmesi; home/list/search için aynı kimlikler ve toplam üç ağ isteği; dokuz bölümün detayda korunması; dizinsiz yanıt/sayfalama ve başlıktaki sayıların korunması; çelişkili adlar/harici adresler; boş arama ve engel sayfası.

Mevcut TRDizi yanıt/çözümleme, taşıma/iptal ve imza/ES5 kontrolleriyle birlikte **12 kontrol geçti**. Kaynak çözümleyici ve medya motorları değiştirilmez; kapsam dışı player testleri tekrarlanmaz.

Bu turda önceki TV inceleme bağlantısı `fetch failed` döndüğü için yeni fiziksel TV kabulü yapılmadı. Yukarıdaki katalog sonuçları gerçek yanıt örnekleriyle çalışan tarayıcı kontrolleridir. Önceki 1.9.3 / TRDizi 1.0.6 oynatma kabulü [kendi raporunda](TEST_SONUCLARI_TRDIZI_1.9.3.md) korunur; 1.0.7 canlı kabulü olarak sunulmaz.

## Uygulama

Güncelleme Merkezi → Kontrol et → TRDizi 1.0.7 güncellemesini indirip uygulamayı yeniden açın. En az çekirdek 1.9.2 ve WGT 1.5.0 gerekir; çalışan daha yeni çekirdeği düşürmeyin. Yeni WGT gerekmez. Eklenti/indeks imzaları ve yayımlanan dosya SHA-256 değerleri doğrulanır; özel anahtarlar ve QA yanıtları dağıtıma girmez.
