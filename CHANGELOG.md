## Çekirdek 2.1.15 — 20 Kasım 2026

- İlk kurulumda **Tümünü yükle** seçilince eklentiler toplu ön taramayı beklemeden sırayla işleniyor. Hazır eklentilerle devam edebilir ve kalanları daha sonra deneyebilirsiniz.
- Tizen 6.5’te imzalı eklentilerin ağ bağlantısı iyileştirildi.
- HTML5 oynatıcı ilk kare hazır olana kadar bekliyor. Video açıldıktan sonra ağdaki bekleme, bazı ileri ve geri sarma işlemlerini erken kesmiyor.
- Tizen 7’de bazı yayınlarda görüntü ve ayrı ses izleri eşzamanlı oynatılıyor.

**WGT 2.0.3** ile önce uygulama içinden çekirdeği, ardından eklentileri güncelleyin. [Eklenti sürüm notları](https://github.com/enesk4yh4n-lab/Film-Merkezi-Eklentiler/blob/main/CHANGELOG.md).

## Film Merkezi TV 2.0.3 / Çekirdek 2.1.14 — 18 Kasım 2026

### TV uyumluluğu ve daha kolay güncelleme

- Tizen **7, 8, 9 ve 10** için video kaynaklarına güvenli bağlantı desteği genişletildi.
- İlk açılışta çekirdek indirmesinin ilerlemesi gösteriliyor. Güncelleme hazır olduğunda yenilikleri okuyup **Yeniden başlat** düğmesiyle devam edebilirsiniz.
- Eklenti indirmesi yarıda kalırsa, **Yalnız kalanları tekrar dene** ile doğrulanmış dosyaları tekrar indirmeden devam edebilirsiniz.
- Depolar daha hızlı listeleniyor. Eklenti sayıları doğrulandıkça görünüyor. Kurulumdan önce boş alan ve sürüm uyumluluğu kontrol ediliyor. Gerekirse hangi TV paketini kurmanız gerektiği gösteriliyor.
- Büyük video parçaları için varsayılan sınır **16 MiB** oldu. Gereken kaynaklar **32 MiB**’a kadar izin isteyebiliyor.

**Kurulum:** Release’teki **Film-Merkezi-TV-2.0.3-public.wgt** dosyasını kullanın. Gerçek Tizen 3 TV’de kurulum, menü geçişi ve kısa oynatma kontrolü yapıldı.

[TV’ye kurulum](docs/KURULUM.md) · [Depo ve eklenti ekleme](docs/DEPO_EKLEME.md)

## Çekirdek 2.1.9 — 16 Kasım 2026

WGT **2.0.1** değişmedi. Güncelleme uygulama içinden alınır; yerel ara denemeler tek genel sürümde toplandı.

- **Güncelleme Merkezi sadeleşti:** Güncelleme denetimi, Eklentilerim, Eklenti ekle ve Depolarım aynı panelde; teknik işlemler ayrıntılara taşındı. Eski ara ekranlar güncel arayüze bağlandı.
- **Kurulum kolaylaştı:** Birleştirme ve arama önerileri aynı sihirbaz ekranında. Depo bilgileri/sayıları hazır olduğunda birlikte gösterilir; ekleme ve seçilmiş paketler için yinelenen onaylar kaldırıldı. Boş depo ile devam açıklaması ve kurulum sonu yeniden açma işlemi netleştirildi.
- **İlerleme ve kapasite:** İndirme, doğrulama ve gerçek kurulum aşamaları ayrıldı; indirme sırasında kurulum sayacı ilerlemez. Hazırlık durumu, seçim tikleri ve kapasiteye sığmayan paketlerin açıklaması düzenlendi. Değişmeyen paketler için kapasite hesabı tekrar tekrar çalıştırılmaz; son kurulum denetimi korunur.
- **Kararlılık ve kumanda:** Eklenti kaldırma/yeniden kurma sonrasında eski katalog/görsel işleri ve arayüz dinleyicileri temizlenir. Menü, araç çubuğu, vitrin, ayarlar, kaynaklar ve bölüm listelerinde odak/geçiş/kaydırma düzeltildi; içerikten dönüş odağı korunur.
- **Dizi bölümleri:** Sezon içi ve toplam bölüm numaraları tek gösterimde eşleştirilir; siteye ait gerçek bağlantı ve ham numara çözümleyiciye korunarak verilir. Tahmini eşleşmeler belirtilir. TMDB içerik/bölüm doğrulaması, arama önerilerinden bağımsız açılıp kapatılabilir.
- **Katalog ve birleştirme:** Tür filtrelerinde film/dizi ayrımı korunur. Ortak güçlü kimliği olmayan tek kelimelik film adlarının yanlış birleşmesi sınırlandırıldı; eski zayıf kimlikler yeniden değerlendirilir.

İlgili otomatik kontroller ile Tizen 3 emülatöründe kurulum, kumanda, dizi ve kısa oynatma kontrolleri yapıldı; önceki başarılı turlar gereksiz yere tekrarlanmadı. Bu sürüm için yeni fiziksel TV/ses/kumanda kabulü yapılmadı. Bölüm tahminleri kusursuz eşleşme garantisi değildir.

Hazır depo/site eklenmez. TLS ve imza doğrulaması, 128 toplam ağ kökeni ve 60 kartlık DOM sınırı korunur. Eski WGT 2.0.0 kanalı değişmez. R001/R008 düzeltmeleri kullanıcı tarafından eklenen eklenti deposundan ayrıca alınır; diğer site paketleri bu yayında değişmez.

## WGT 2.0.1 / Çekirdek 2.1.8 — 14 Kasım 2026

- Ana menüye **ÇizgiFilm/Anime** ve **Drama/Short** eklendi; Keşfet kaldırıldı. Drama/Short, Kore/Asya ve kısa bölümlü diziler içindir.
- Yeni bölümleri destekleyen P001 **2.0.7**, P004 **1.0.3**, P007 **1.0.2** hazırlandı. R paketleri değişmedi.
- Kumanda odağı, menü geçişleri ve kaydırılmış listeden araçlara dönüş düzenlendi.
- İlk kurulum öncesi çekirdek denetimi WGT'ye bağlandı; güncelleme yoksa kurulum normal devam eder.
- Native taşımanın tavanı **24 MiB** oldu. Varsayılan 8 MiB ve daha küçük istek sınırları korunur; kullanılacak miktarı çekirdek belirler.
- Paket temizliği bitmeden yeni iş başlamasına izin veren işlem kilidi hatası düzeltildi.
- Yeni çekirdek kanalı **github-eklenti/201/update.json**, yeni eklenti listesi **filmmerkezi201-repository.json**. Eski WGT 2.0.0'ın kanalı, imzalı listeleri ve uyumlu paketleri korunur.
- SDK **2.0.1**, yeni listeyi üretir; mevcut yayıncı anahtarını ve eski listeyi korur.

**Kurulum:** Yeni çekirdek ve kategori özellikleri için WGT 2.0.1 kurulmalıdır. Eski WGT'ye uyumsuz paket sunulmaz. Hazır depo veya site eklenmez; TLS ve imza doğrulaması açık kalır.

Tizen 3 emülatörü ve gerçek TV'de ilgili kısa kurulum/güncelleme/menü kontrolleri yapıldı. Bu yayın için yeni kapsamlı oynatma/ses testi yapılmadı.


# Sürüm notları

## Çekirdek 2.1.6 — 14 Kasım 2026

WGT **2.0.0** değişmedi. Güncelleme uygulama içinden alınır; site ve çözümleyici paketleri değişmedi.

- Güncelleme Merkezi ayarların sağ paneline entegre edildi. Depolar, paketler ve çekirdek aynı alanda yönetilir; gereksiz ara menüler kaldırıldı.
- Depo bazında tüm eklentileri yükleme ve güncelleme, genel Kontrol et/Güncelle ve eklenmiş depolar için Sil işlemleri düzenlendi. Depo arama aynı arayüzde açılır.
- Depo başlıklarında güncel, imzası doğrulanmış site eklentisi sayısı gösterilir. Çözümleyiciler sayıyı artırmaz. Depolar çoktan aza sıralanır; sonuçlar gelirken seçili depo odağı korunur.
- Paket yüklerken etkin paket yüzdesi ve boyutu, toplam hazırlık, indirme/önbellek ayrımı ve doğrulama aşamaları gösterilir. Çekirdekte ölçülemeyen ilerleme için tahmini yüzde verilmez.
- İlk açılış altı anlaşılır adıma ayrıldı: Dil → Bilgilendirme → Depo → Birleştirme → Arama → Yükleme. Birleştirme Aktif (Varsayılan), arama önerileri Pasif (Varsayılan) olarak sunulur; mevcut tercihler korunur.
- Kurulumda Devam et ve depo satırındaki Ekle odağı düzenlendi. Fazladan alt Ekle kaldırıldı; Geri dönüşleri, klavye ve geç yanıtların odağı değiştirmesi düzeltildi.
- İlk kurulumda depo seçildikten sonra eklenti yüklemeye geçilir. Yeni eklenti bildirimine Yükle, boş ana sayfaya Eklentileri yükle işlemi eklendi; son kurulum özeti kullanıcı onayıyla uygulanır.
- Çekirdeği koruyarak diğer uygulama ayarlarını sıfırlama seçeneği eklendi.

İlgili TR/EN, 1080p/720p ve Tizen 3 emülatör kontrolleri yapıldı. Hazır depo veya site otomatik eklenmez. Bu yayın için yeni kapsamlı fiziksel TV testi yapılmadı.


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
