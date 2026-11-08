# Film Merkezi — WGT 1.5.0 / çekirdek 1.9.0

- Görünen uygulama adı Film Merkezi. Mevcut kurulumun uygulama/paket kimliği korunur; kullanıcı verisini silerek geçiş yapılmaz.
- Etkin bileşen kanalı `updates/update.json`; eski `updates/pilot` değişmez uyumluluk arşividir.
- Son ortak arayüz/player bileşenleri WGT içindedir. Güncelleme indirilip onaylandığında tam set olarak etkinleşir; WGT'nin fiziksel dosyaları değiştirilmez.
- HDFilmCehennemi ve Filmci Baba dahil 22 site bağımsız çevrimiçi pakettir. Son paketleri WGT'de de bulunur; yeni kurulum doğrudan açılır, site seçip indirme gerekmez. HDF/Filmci Baba 1.0.0; Diziyou/Diziboxum 1.0.2; TRDizi 1.0.3; FixFull 1.0.1; diğerleri 1.0.0.
- Güncelleme Merkezi'nde tek Kontrol et: çekirdek, kurulu site sürümleri ve etkin depolardaki yeni siteler. Her açılışta otomatik metadata kontrolü vardır; kod indirme ve yeni site kurulumu kullanıcı onayına bağlıdır.
- Bildirim açıkken geç katalog çizimleri odağı arka plana taşıyamaz; indirme sürerken Geri işlemi iptal edip bildirimi kapatır. Diziboxum araması doğrulanmış dizi sonuç alanını kullanır; sayfadaki önerilen bölümleri sonuçlara katmaz.
- Arama, birleştirme, filtreleme ve ortak arayüz kodu çekirdek setindedir; olağan değişiklikleri yeni WGT istemez. Site HTML/katalog/çözümleyici değişikliği ilgili site paketiyle, native/CA/CSP/yükleyici değişikliği WGT ile dağıtılır.
- Katalog ve siteler menüsündeki Site adresleri kaldırıldı. Eski bağlantılar için ortak adres/alias hizmeti korunur.
- Diziyou/Diziboxum gerçek arama kartları ve boş sonuç ayrımı düzeltildi. HTTP 403, TLS sertifika hatası gibi gösterilmez; başka taşıma yolunda gereksiz tekrar açılmaz.
- TLS sertifika/hostname doğrulaması açık kalır. Native değişiklik yalnız normal `updates/` yolunu aynı GitHub deposu içinde kabul eder; CA verisi değişmez.

Genel Release/Apps2Samsung kaydı bu çalışma kapsamında değiştirilmez. İmzasız public WGT kendi TV sertifikasıyla kurulum yapan araçlar içindir; yerel imzalı WGT önceki yerel imza kimliğiyle hazırlanır.
