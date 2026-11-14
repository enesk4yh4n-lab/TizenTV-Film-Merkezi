# Sürüm notları

## Çekirdek 2.1.5 — 14 Kasım 2026

WGT **2.0.0** değişmedi. Güncelleme uygulama içinden alınır.

- Güncelleme Merkezi'ne Güncellemeler, Kurulu ve Yeni görünümleri, paket arama ve toplu seçim eklendi. Site ile çözümleyicisi aynı satırda gösterilir.
- Seçilen paketlerin ortak bağımlılıkları birlikte planlanır. Gerekli çekirdek geçişinden sonra onaylı paketlerle devam edilir; yeni siteler kendiliğinden kurulmaz.
- GitHub'da depo ara açılınca uyumlu depolar arka planda listelenir. Arama kutusuna hazır metin yazılmaz; hazır depo eklenmez.
- Filmler, Diziler, Keşfet, Listem, Geçmiş ve arama listelerinde Sırala/Filtrele düzenlendi. Site yanıtları korundu; arama alanından sağa geçiş doğrudan Ara'ya gider.
- Eklentilerin bildirebildiği hazır tür/popülerlik filtreleri için altyapı eklendi. P001 2.0.6 bu desteği kullanır; diğer paketler güncellendikçe seçenekler gelir.
- Ortak dizi detayında doğrulanmış farklı site varyantlarının sezon/bölümleri birlikte gösterilir. Bir sitede bulunmayan bölüm için o site oynatma seçeneğine eklenmez.
- Araç şeridindeki odak hareketi katalog çizimi veya afiş/dil işi başlatmaz. Liste dönüşünde filtre, sıralama ve odak korunur.

Önce çekirdek **2.1.5**, ardından **P001 2.0.6** güncellenmelidir. R paketleri ve SDK araç sürümü değişmedi. SDK belgesine isteğe bağlı hazır filtre sözleşmesi eklendi. README'deki yeni dört tanıtım görüntüsü gerçek Tizen 3 emülatöründen alınmıştır.

## Çekirdek 2.1.4 — 13 Kasım 2026

WGT sürümü **2.0.0** olarak kalır. Bu sürüm, 2.1.3'ten sonraki yerel düzeltmeleri tek genel güncellemede toplar.

- Ana sayfada kartlar arasında gezinirken tüm satırın yeniden çizilmesi ve afişlerin göz kırpması giderildi.
- Katalog ayrıştırmasının geçici HTML ağaçları ve ekrandan çıkan afiş işleri bırakılarak afişler açıkken bellek yükü azaltıldı. **Genel ve görünüm → Afişleri göster** ayarı eklendi.
- Küçük liste afişi ve daha büyük detay/vitrin afişi ayrı destekleniyor. P002 2.0.2 ile listede 360×540, büyük görünümde 720×1080 sınırlarına sığan görseller indirilir; oran korunur.
- Arama önerileri yeni veya tercihi olmayan kayıtlarda **Kapalı** başlar; mevcut seçimler değişmez. Açıldığında klavye kapanışından **50 ms** sonra istek başlar; yanıt süresi bağlantıya ve kaynağa bağlıdır. Tamam otomatik katalog araması yapmaz.
- Sonuçlar geldikçe birleştirilir. Son aşama yeni/eksik bilgili kayıtları doğrular; aynı sayfa ve aynı kanıt tekrar işlenmez. Durum yazısı **Eksik bilgiler doğrulanıyor…** olarak sadeleştirildi.
- Mevcut 30 saniye, iki eşzamanlı katalog isteği ve doğrulama sınırları korunur. Yeni varsayılan depo veya site eklenmez.

Bu sürümde değişen site paketi **P002 2.0.2**'dir; diğer P ve R paketleri önceki yayımlanmış sürümlerinde kalır. Önce çekirdeği, ardından P002'yi güncelleyin. WGT kurulumu gerekmez.

Genel sürüm numarası yayımlanan güncellemelerde ilerler; yerel denemeler iç revizyonla izlenir. Bu nedenle 2.1.3'ten sonraki genel sürüm 2.1.4'tür. SDK araç sürümü değişmedi; SDK belgesine isteğe bağlı küçük/büyük afiş alanı eklendi.

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
