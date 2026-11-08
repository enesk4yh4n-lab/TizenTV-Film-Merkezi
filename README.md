# Film Merkezi

**TRDizi düzeltmesi:** çevrimiçi çekirdek **1.9.3** + TRDizi **1.0.6**, TV'de çalışan HTTPS Download yolunu seçer. WGT 1.5.0 değişmez; Güncelleme Merkezi'nden çekirdek ve siteyi birlikte güncelleyin. [Neden ve ilgili kontroller](docs/arsiv/TEST_SONUCLARI_TRDIZI_1.9.3.md).

Samsung Tizen 3.0 TV için film ve dizi uygulaması. **WGT 1.5.0 / çekirdek 1.9.0**, 22 bağımsız çevrimiçi site paketi, ortak katalog/arama, Listem, geçmiş, dizi takibi ve HTML5/hls.js–AVPlay oynatıcısı içerir. Çalışma sırasında PC, proxy veya ek sunucu istemez.

Yeni paket: [Film-Merkezi-TV-1.5.0-public.wgt](Film-Merkezi-TV-1.5.0-public.wgt) — geliştirici imzası içermez. [Karşılık gelen native/CA/decoder kaynakları](updates/sources/Film-Merkezi-Kaynak-1.5.0.zip), [sürüm notları](docs/arsiv/SURUM_NORMAL_1.5.0.md), [ilgili test sonuçları](docs/arsiv/TEST_SONUCLARI_NORMAL_1.5.0.md).

Uygulama **Film Merkezi** adıyla açılır. Son ortak bileşenler ve HDFilmCehennemi/Filmci Baba dahil **22 sitenin son imzalı paketleri WGT içindedir**; ilk açılışta site seçip indirmek gerekmez. Siteler ayrı güncellenebilir, kapatılabilir ve kaldırılabilir. Güncelleme Merkezi → Kontrol et çekirdek, kurulu siteler ve yeni siteleri birlikte denetler. Açılışta otomatik kontrol eder; indirme/kurulum için onay ister. Depoya sonradan eklenen yeni siteler kendiliğinden kurulmaz.

Etkin kanal [updates/update.json](updates/update.json), site deposu [addons/sites/repository.json](addons/sites/repository.json). `updates/pilot` yalnız eski istemcilerin dondurulmuş uyumluluk arşividir. Önceki uygulama kimliği ve kayıt kapsamı korunur. 1.5.0 WGT, normal kanal için bir kez kurulmalıdır. Genel Release/Apps2Samsung kaydı bu geçişte değiştirilmez.

Katalogda yetişkin içerikleri göstermemeye yönelik filtreleme kullanılır. Film Merkezi yetişkin içerik kataloğu sunmayı amaçlamaz. TLS ve imza doğrulaması açık kalır; bir sitenin HTTP 403 erişim engeli, sertifika hatası veya başarılı katalog erişimi olarak sunulmaz.

Proje geçmişi, sürüm notları ve test raporları tek yerde tutulur: [güncel proje durumu](PROJE_GECMISI.md), [aktif mimari/dosya belgeleri](DOSYA_HARITASI.md) ve [sürüm/test arşivi](docs/arsiv/README.md).

## Önceki sürümlerin tarihsel notları

Aşağıdaki 1.2.0 ve daha eski açıklamalar arşivdir. Güncel sürümde Site adresleri menüsü yoktur; site paketleri Güncelleme Merkezi'nden yönetilir.

Yerel 1.2.0 public paketini yeniden üretmek için `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-public.ps1` kullanılır. Bu araç runtime izin listesinden geliştirici imzalarını çıkarır; yerel imzalı WGT'yi değiştirmez. [1.2.0 sürüm ve paket bilgileri](SURUM_1.2.0.md).

Güncel genel paket: **[Film-Merkezi-TV-1.1.7-public.wgt](Film-Merkezi-TV-1.1.7-public.wgt)**. Apps2Samsung için imzasızdır. Paket dışı üretim/CA kaynakları [Film-Merkezi-Kaynak-1.1.7.zip](Film-Merkezi-Kaynak-1.1.7.zip) içindedir. Güncel kaynak ve genel dağıtım [GitHub deposunda](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi) hazırlanır. Önceki paketler ve `ChainProbe.wgt` korunur. [Yayın doğrulaması](docs/arsiv/YAYIN_1.1.7.md).

Yeni kurulumda önce **Türkçe / English** ve **Aynı film ve dizileri birleştir: Açık / Kapalı** seçimleri gösterilir. Birleştirme varsayılanı kapalıdır. Ardından kullanım bilgilendirmesi açıkça onaylanınca Tüm siteler → Ana Sayfa açılır. Mevcut kurulumlarda önceki açık birleştirme davranışı korunur. Seçimler **Seçenekler → Uygulama ayarları** üzerinden değiştirilebilir. Arama üst ortadadır; OK ile klavye açılır. Film/dizi adları afiş altında metindir. Sarı çerçeve kumanda odağını gösterir.

## v1.1.6 — ilk kurulum ve isteğe bağlı birleştirme

Birleştirme kapalıyken sitelerin kartları ayrı kalır; eşleştirme için ek detay istekleri ve son birleştirme turu çalışmaz. Aynı sitenin video kaynakları kullanılmaya devam eder. Mod değişince bekleyen katalog işleri iptal edilip ana sayfa yenilenir; Listem ve izleme kayıtları korunur. Depolama kullanılamıyorsa tercihler oturum içinde sürer ve kalıcı kayıt sorunu bildirilir.

48 ilgili birim kontrolü ve 38 tarayıcı senaryosu geçti; 131 çalışma JavaScript dosyası ES5/sözdizimi kontrolünden geçti. Yeni kurulum 720p/1080p görünümde incelendi. Bu sürümde gerçek TV/emülatör kurulumu yapılmadı. [Test, paket ve kalan sınırlar](docs/arsiv/TEST_SONUCLARI_1.1.6.md).

Genel paketi tekrar hazırlamak için `python tools/prepare-public116.py` kullanılır. MPL kaynak adresindeki `<KAYNAK_ADRESI>` yayından önce doldurulup paket yeniden hazırlanmalıdır.

## Yetişkin içerik filtresi

Katalogda yetişkin içeriklerin gösterilmesini önlemeye yönelik filtreleme kullanılır. Film Merkezi yetişkin içerik kataloğu sunmayı amaçlamaz.

Bu bilgi yeni GitHub yayınının açıklamasına da eklenecektir. Yayın hazırlığı ve doğrulanan kapsam [v1.1.5 raporunda](docs/arsiv/TEST_SONUCLARI_1.1.5.md) tutulur; aşağıdaki v1.0.0 Apps2Samsung başvurusu tarihsel kayıttır.

## v1.1.4 — performans ve kararlılık

Kumanda gezinmesi değişmeyen listeyi yeniden sıralamaz; ana sayfanın yalnız site durumu değişince afişler yeniden oluşturulmaz. İlerleme kaydı, değişmemiş katalog önbelleklerini taramaz. Açıkça izin veren kaynakların 12 MiB parça sınırı dosya okumasına kadar taşınır; diğer kaynaklar 8 MiB kalır. İptal ve ortak dizi dil işlemleri düzeltildi; medya decoder'ı tek üretimden paylaşılır. Birleştirmenin 12 detay / 30 saniye / iki istek sınırları değişmedi.

Yalnız ilgili kontroller ve gerçek Tizen 3 TV'de kısa turlar yapıldı. Önceki uzun donma ikinci turda tekrarlanmadı; ilk turdaki Close ağ/toparlama hatası ve kabul sınırları ayrıca kaydedildi. [Test ve teslim raporu](docs/arsiv/TEST_SONUCLARI_1.1.4.md).

Alan bazında kontrol: `npm --prefix tools run check:area -- catalog`, `storage`, `media`, `decoder` veya `parsers`. Bu komutlar bütün takımı kendiliğinden çalıştırmaz.

## v1.1.2 — önceki birleştirme düzeltmeleri

Bu sürümün paketi [Film-Merkezi-TV-1.1.2.wgt](Film-Merkezi-TV-1.1.2.wgt); [üretim kaynakları](Film-Merkezi-Kaynak-1.1.2.zip) eşlik eder. LoveFilm özgün adı ve doğrulanmış İngilizce artikel alternatifi düzeltildi. Paket doğrulandı; emülatöre kurulum hata verdiği için o aşamadaki canlı arama kabulü tamamlanmadı. [Tarihsel testler ve kalanlar](docs/arsiv/TEST_SONUCLARI_1.1.2.md).

## v1.1.1 — önceki birleştirme iyileştirmesi

Bu sürümün paketi **[Film-Merkezi-TV-1.1.1.wgt](Film-Merkezi-TV-1.1.1.wgt)**; eşlik eden üretim kaynakları [Film-Merkezi-Kaynak-1.1.1.zip](Film-Merkezi-Kaynak-1.1.1.zip) dosyasındadır. Birincil metadata aktarımı ve ayrışan kartların doğrulama önceliği iyileştirildi. Eksikler tamamen bitmedi; [tarihsel test ve kalanlar](docs/arsiv/TEST_SONUCLARI_1.1.1.md) raporlandı.

## v1.1.0 — kanıta dayalı eser kimliği

Ortak arama, katalog, Listem ve izleme geçmişi tek kimlik hizmetini kullanır. Ham site başlıkları ve adresleri korunur; sezon, dil ve platform ekleri ayrı değerlendirilir. IMDb kimliği puandan ayrıdır. Çelişen kimlik/yıl veya doğrulanamayan adlar zorla birleştirilmez. Detay doğrulaması 30 saniye, iki eşzamanlı istek ve 12 farklı sayfayla sınırlıdır; harici API veya hesap gerekmez.

Eski v1 kayıtları saklanan site varyantlarından yeniden değerlendirilir; `identityVersion: 2` eklenir. Favoriler kaynaklarına bağlanır, site izleme kayıtları yeniden yazılmaz. [Sürüm notları](docs/arsiv/SURUM_1.1.0.md), [test ve kalan belirsizlikler](docs/arsiv/TEST_SONUCLARI_1.1.0.md).

## v1.0.0 — Apps2Samsung genel yayını

[Genel v1.0.0 yayını](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/tag/v1.0.0) hazırdır. Apps2Samsung ile kurulacak dosya **Film-Merkezi-TV-1.0.0-public.wgt** dosyasıdır; kişisel imza/e-posta içermez ve kurulum sırasında kullanıcıya göre yeniden imzalanır. Normal geliştirme WGT'si ile genel paket ayrı tutulur. Genel dosyaların yerel kopyası `releases/apps2samsung/1.0.0/` altındadır.

[Apps2Samsung katalog başvurusu #165](https://github.com/Apps2Samsung/tizen-community-packages/pull/165) gönderildi; otomatik doğrulama geçti, yönetici kabulü bekleniyor. Yetişkin içerik sunabilen kaynaklar nedeniyle `adult: true` işaretlidir. Bu, her kullanıcıda varsayılan görünür olacağı veya bütün Tizen sürümlerinde çalışacağı anlamına gelmez. [Araştırma](docs/arsiv/APPS2SAMSUNG_ARASTIRMA.md) · [Sürüm ve test raporu](docs/arsiv/SURUM_1.0.0.md).

## v0.23.3 — seçenekler ve eski tanı kodu temizliği

Yapımcı/yayıncı ve e-posta bilgileri, Kararlılık karşılaştırması ve Oynatıcı / ağ tanısı seçenekleri kaldırıldı. Eski ölçüm modülü, 500 ms zamanlayıcısı, ağ ölçüm kancaları ve tanı laboratuvarı kodları da silindi. Kullanım bilgilendirmesi, lisanslar/teşekkürler, mevcut oynatma ve kayıt yaşam döngüsü korunur.

566 birim testi, 97 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. Önceki dört karşılaştırma testi kaldırıldı; iki temizlik testi eklendi. Aynı döngülerde DOM düğümü 1099'dan 1032'ye, dinleyici 125'ten 120'ye indi ve sabit kaldı. Bu kısa tarayıcı ölçümü gerçek TV performans kabulü değildir. [Sürüm ve test raporu](docs/arsiv/SURUM_0.23.3.md).

## v0.23.2 — kullanım bilgilendirmesi ve teşekkürler

Onaydan önce katalog ve oynatıcı başlatılmaz. Onay bu cihazda, metin sürümüyle saklanır; normal uygulama güncellemesi tek başına yeniden onay istemez. Metin değişirse yeniden gösterilir. Bozuk/tanınmayan kayıt ezilmez, depolama sorunu olduğunda açık onay yalnız oturum için geçerli olur. Bu yerel kayıt kimlik doğrulaması veya hukuki sorumsuzluk garantisi değildir.

Katalog **Seçenekler → Hakkında**, player **Diğer seçenekler → Hakkında** üzerinden Kullanım bilgilendirmesi ve Teşekkürler ve lisanslar açılır. Kısa lisans adları, geliştirici teşekkürleri ve isteğe bağlı tam yerel bildirim okuyucusu bulunur. Üçüncü taraf metinleri korunur; kullanım onayı bu lisansların sağladığı hakları kısıtlamaz. Apps2Samsung ve geliştirme araçları, WGT içinde dağıtılan bileşenlerden ayrı belirtilir.

568 birim testi, 96 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. Bu sürümün canlı emülatör/gerçek TV kabulü yapılmadı; 8–9 emülatörlerindeki önceki görüntü sorunu çözülmüş sayılmaz. [Sürüm ve test raporu](docs/arsiv/SURUM_0.23.2.md).

## v0.23.1 — player açıkken gizli katalog yükü

**29 Ekim ek bulgusu:** Tizen 8/9 emülatörlerinde kullanıcı ses var/görüntü yok ve `tvs-daemon` kaynak tahsisi uyarısı bildirdi. Tizen 8'de yerel referansla siyah görüntü yeniden gözlendi. Aşağıdaki otomatik zaman/çözünürlük başarıları görsel oynatma onayı değildir; görüntü sorunu çözülmüş sayılmıyor. Ayrıntılar [uyumluluk raporunda](TIZEN_SURUM_UYUMLULUK_RAPORU.md).

Ortak katalog ve sıralama katmanları, player açıkken çizim öncesi sonuç/odak işlemlerine girmeden durur. Player'dan dönüşte mevcut katalog yenilemesi devam eder. Motorlar, çözümleyiciler, kayıtlar ve 8 MiB parça sınırı değişmedi. 562 birim testi, 86 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. [Sürüm ve paket raporu](docs/arsiv/SURUM_0.23.1.md).

Samsung TV emülatörleri için ayrıca [Samsung imzalı SDK paketi](tools/test-results/platform100/FilmMerkezi.wgt) bulunur. Normal teslim ile çalışma dosyaları eşleşir; sertifikası emülatör DUID'sini kapsar, gerçek TV'ye otomatik kurulum yetkisi vermez. Normal paketin Apps2Samsung kurulumu/yeniden imzalanması ayrı akıştır. Başlatıcı güncel manifest sürümünün paketini seçer. Ayrıntılı önceki sonuçlar [Tizen sürüm uyumluluk raporundadır](TIZEN_SURUM_UYUMLULUK_RAPORU.md).

## v0.23.0 — Türkçe / English

**Seçenekler → Dil / Language → English** ile İngilizce arayüze geçilir. Player içinde **Diğer seçenekler → Ayarlar → Arayüz dili** yolu da kullanılabilir. Türkçe varsayılandır; seçim ortak v1 tercihlerinde hatırlanır ve yeniden açılışta uygulanır. Dil değişimi için uygulamayı kapatmak gerekmez.

Katalog, arama, filtreler, site seçimi, player menüleri, çıkış ve uygulamanın durum/yardım mesajları çevrilir. Film/dizi/bölüm adları, özetler, oyuncular ve altyazı metinleri kaynakta nasılsa öyle kalır. Arayüz dili, ses/altyazı tercihini veya TV ayarlarını değiştirmez. Dil dosyaları WGT içindedir; ek ağ isteği veya sunucu gerekmez. Bulunamayan çeviri Türkçe gösterilir. Teknik günlükler ve dış sitelerin tanı mesajları özgün hâliyle korunabilir.

560 birim testi, 86 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. Kurulu Tizen 3.0 emülatöründe üç SDK/CDP kontrolü geçti; gerçek TV kabulü ayrıca yapılmadı. [Sürüm ve test raporu](docs/arsiv/SURUM_0.23.0.md).

## v0.22.8 — bir yedekten sonra bekleyen kaynak taraması

İlk kaynak hemen oynatılır. Bir ayrı, uygun yedek bağlantı hazır olduğunda otomatik kaynak taraması kapanır; kalanlar Kaynaklar menüsü açılana kadar bekler. Menü açılınca hazır bağlantılar korunarak kalan seçenekler öncelikli çözülür. Oynayan veya duraklatılmış video yeniden açılmaz. Menüden başlatılan tarama mevcut süre sınırları içinde tamamlanabilir; menü çizimleri yeni tarama başlatmaz.

**Bağlantıları yenile** açık kullanıcı isteği olarak tam tarama yapar. Gerçek medya hatasında bekleyen kaynaklar mevcut 60 saniye/beş deneme bütçesiyle toparlamaya katılabilir. 553 birim testi, 79 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. [Sürüm ve test raporu](docs/arsiv/SURUM_0.22.8.md).

## v0.22.7 — kalıcı uygulama kimliği ve yerel medya

Widget kimliği `http://filmmerkezi.local/tv`, paket kimliği `FilmMerkez`, uygulama kimliği `FilmMerkez.FilmMerkezi` oldu. **Bu sürüm eski `ChainProbe.Test` uygulamasından ayrı kurulur.** Eski uygulama silinmez; kayıt aktarımı eklenmedi. Görünen ad Film Merkezi'dir. CSP'ye yalnız `media-src 'self'` izni eklendi; YouTube script hash'i ve privilege listesi korundu.

545 birim testi, 75 tarayıcı grubu ve üç Tizen 3.0 emülatör kontrolü geçti. Yerel referans MP4, HTML5 ve AVPlay'de çalıştı; ses/HDR/yetenek onayı verilmedi. Başlatıcı seçilen WGT'nin kendi manifestini okur; eski geri dönüş paketlerini de doğru kimlikle hedefler. [Sürüm ve test raporu](docs/arsiv/SURUM_0.22.7.md).

## v0.22.6 — paket dışı üretim kaynakları

Decoder üretim kaynakları ile native C++/header/PEM, derleme özeti ve README dosyaları proje kökündeki `kaynak/` klasörüne taşındı. WGT yalnız üretilmiş JS, üç NEXE, NMF ve bütün lisans bildirimlerini içerir. Derleme yeni kaynak yollarını kullanır; kaynak ve ikili özetleri doğrulanır. [Kaynak klasörü](kaynak/README.md) · [Sürüm ve paket raporu](docs/arsiv/SURUM_0.22.6.md).

## v0.22.5 — küçük ikon ve ayrı başlık logosu

Uygulama ikonu 117×117, başlık logosu ayrı 136×136 RGBA PNG'dir; başlıkta 68×68 gösterilir. 1254×1254 özgün `icon.png` yalnız geliştirme kaynağıdır; WGT'ye küçük çıktılar girer. Paketleme bunları `tools/build-image-assets.ps1` ile yeniden üretir. [Boyutlar, doğrulama ve sürüm notu](docs/arsiv/SURUM_0.22.5.md).

## v0.22.4 — ağ hatasından toparlama

Geçici ağ/HTTP hatası motor uyumsuzluğu sayılmaz. Süresi dolan 401/410 bağlantısı yenilenir; aynı kaynakta motor, izleme konumu ve duraklatma niyeti korunur. Bir kez yedek motora geçilmişse yeniden deneme onu kullanır. Oynarken bağlantı yenileme kesintisiz kalır; hata ve kullanıcı yeniden denemesi mevcut süre/deneme sınırlarına uyar.

541 birim testi, 75 tarayıcı grubu ve sekiz masaüstü katalog–player döngüsü geçti. Tizen 3.0 emülatöründe 5 dakika 9 saniyelik sekiz grup tamamlandı. Bir sarma zaman aşımı yedek motorla toparlandı; ayrıntılar ve sınırlar [test raporunda](docs/arsiv/TEST_SONUCLARI_0.22.4.md), değişiklikler [sürüm notundadır](docs/arsiv/SURUM_0.22.4.md). Gerçek TV kabulü yapılmadı.

## v0.22.3 — afiş ve katalog yükü

Afişler uygun sunucularda XHR, gerektiğinde mevcut native yedek yolla alınır. Taşıma tercihi sunucu bazında 16 kayıt/10 dakika ile sınırlıdır. Ortak arama/listelerde yalnız site durumu değişince afişler yeniden kurulmaz; değişmiş veri ve arama sonu normal çizilir. Player motorları, çözümleyiciler ve HLS parça sınırları korunur.

536 birim testi, 68 tarayıcı grubu ve sekiz masaüstü katalog–player döngüsü geçti. Emülatörde yaklaşık 5 dakika 58 saniyelik dokuz canlı döngü hatasız tamamlandı; tekil gecikme sınırlaması raporda korunur. [Sürüm notları](docs/arsiv/SURUM_0.22.3.md) · [Ölçümler ve test raporu](docs/arsiv/TEST_SONUCLARI_0.22.3.md). Gerçek TV kabulü bu sürüm için yapılmadı.

Sonraki bellek değerlendirmesinde 18 döngü/üç heap görüntüsü incelendi: ölçülen JavaScript belleği 8,54 → 8,77 → 8,75 MB; DOM/dinleyici sabit, kapanış işleri sıfır. Küçük SDK kayıtları artar; büyük HTML/video birikimi bu turda görülmedi. Yeni uygulama değişikliği veya WGT gerekmedi. Bu toplam TV RAM'i/saatlerce kullanım kabulü değildir. [Bellek değerlendirmesi](docs/arsiv/BELLEK_KULLANIM_RAPORU_0.22.3.md).

## v0.22.2 — oynatma kararlılığı


HLS parçası yerel boyut sınırını aşınca aynı veri farklı indirme yollarıyla tekrar denenmez. Otomatik kalite başarısız olan gerçek seviyeden daha düşük kaliteye döner; motor, konum ve duraklatma niyeti korunur. 8 MiB varsayılan sınırı ve mevcut toparlama bütçesi değişmez. Yeni özellik veya site eklenmedi.

532 birim testi, 67 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. Tizen 3.0 emülatöründe 5 dakika 35 saniyelik dokuz canlı tur ve ayrı gerçek HLS parça sınırı/toparlama denemesi geçti. [Sürüm notları](docs/arsiv/SURUM_0.22.2.md) · [Test raporu](docs/arsiv/TEST_SONUCLARI_0.22.2.md). Bu sürümün gerçek TV ses/kumanda kabulü yapılmadı.

## v0.22.1 — bellek ve katalog kararlılığı

Afiş indirmeleri aynı JavaScript turunda peş peşe başlatılmaz; her başlangıç arasında kumanda/çizim olaylarına sıra verilir. Üç eşzamanlı indirme ve mevcut önbellek sınırları korunur. Kapanan katalog panellerinin içerik ve düğme işleyicileri bırakılır. Tizen'in tamamlanan indirmelerde tuttuğu işleyicilerin eski HTML ve medya verilerini bellekte tutması giderilir. Yeni özellik veya sağlayıcı eklenmedi.

525 birim testi, 67 tarayıcı grubu ve sekiz katalog–player döngüsü geçti. [Sürüm notları](docs/arsiv/SURUM_0.22.1.md) · [Performans ve test raporu](docs/arsiv/TEST_SONUCLARI_0.22.1.md). Emülatör ölçümleri gerçek TV ses/kumanda onayı sayılmaz.

## v0.22.0

Ana ekran ve detaylar sadeleştirildi; listelerde altı afiş, dizilerde 24 satırlık tek sütun bölüm ekranı bulunur. Film detayında İzle/Devam et ve Listem öndedir; site seçimi ayrı paneldedir. Özet ve oyuncular genişletilebilir. Arama yanında metni temizleme ve ortak son 10 arama vardır; geçmişi temizlemek izleme kayıtlarını silmez.

**Ne izlesem?** Ana Sayfa ve Filmler'den açılır. Seçili site veya Tüm siteler için güncel listelerden üç benzersiz film adayı bulur. Tek tür ve IMDb alt sınırı seçilir; bitirilen ve en az beş saniye başlanmış filmler site varyantlarıyla elenir. Film kendiliğinden başlamaz. Yeterli aday yoksa filtreler gevşetilmez. Öneri hizmeti 30 saniye/12 detay/iki eşzamanlı istek sınırıyla çalışır; video kaynağı çözümlemez.

[Sürüm notları](docs/arsiv/SURUM_0.22.0.md) · [Test ve hata raporu](docs/arsiv/TEST_SONUCLARI_0.22.0.md). Bu sürümün emülatör sonucu, gerçek TV ses/kumanda onayı değildir.

## v0.21.2

Filmizlebabam'ın numaralı Pilavyer sunucuları aktif player alanından okunur. Drawn Together için yanlış ana sunucuda oluşan 404 giderildi; aynı biçimi kullanan içerikler genel olarak kapsanır. Site betikleri çalıştırılmaz. 501 birim testi ve 54 tarayıcı grubu geçti; gerçek bağlantılı emülatör turu 89,613 saniyede 3/3 kontrolü geçti. Gerçek TV kabulü yapılmadı.

[Sürüm notu](docs/arsiv/SURUM_0.21.2.md) · [Test ve hata raporu](docs/arsiv/TEST_SONUCLARI_0.21.2.md).

## v0.21.1

Çıkış menüsü: **Devam et / Baştan başlat / Kaydet ve çık / Kaydetmeden çık**. Son seçenek, otomatik kayıt yapılmış olsa bile bu içeriğin oturum öncesi izleme noktasını korur. İlk izleme için yeni geçmiş kaydı bırakmaz. Tercihler ve yer imleri korunur. Geri önceki oynatma/duraklatma niyetine döner.

[Sürüm notu](docs/arsiv/SURUM_0.21.1.md) · [Test raporu](docs/arsiv/TEST_SONUCLARI_0.21.1.md) · [Dosya haritası](DOSYA_HARITASI.md).

## v0.21.0 temeli

Bağlantıları yenile oynayan/duraklatılmış motoru kapatmaz; taze adaylar kaynak menüsüne eklenir. İlk kaynak hazır olduğunda oynatma başlar, kalan kaynaklar tek istek ve tampon kapısıyla sessizce çözülür. Hazırlık göstergesi saydam köşe yazısıdır. Filmizlebabam Vidara/Gasobni ve Pilavyer desteği genişletilmiştir.

Önceki emülatör turu 5 dakika 11 saniyede sekiz kontrolü geçti; Gasobni API erişimi `ERR_INSECURE_RESPONSE` ile başarısız kaldı. Bu sınırlama v0.21.1'de giderilmiş sayılmaz. [Önceki rapor](docs/arsiv/TEST_SONUCLARI_0.21.0.md).

Önceki v0.20.1 sürümünde kullanıcı UE55MU7500/Tizen 3.0 üzerinde Disclosure Day görüntü/ses/senkronunu ve fiziksel kumanda kontrollerini normal olarak onaylamıştır. Bu onay yeni sürümün değişikliklerine taşınmaz. Eski ana TV kurulumunda farklı yapımcı sertifikasından kaynaklanan 118 engeli kaldırma ile aşılmamıştır; ana uygulama ve kayıtlar korunur.

Kurulum için mevcut geliştirici modu/Tizen SDK veya Apps2Samsung yöntemi kullanılabilir. Cihaz iznine ve kullanılan imzaya uygun WGT gerekir. [Kaynaklar, lisanslar ve teşekkürler](KULLANILAN_KAYNAKLAR.md).

## Geliştirme

Kaynaklar `deneme/` altındadır. Node.js, Python 3, Tizen SDK ve imzalama ortamı; tarayıcı kabulünde Chrome/Playwright ve FFmpeg; imza doğrulamasında mevcut WSL/xmlsec1 kullanılır. Bunlar geliştirme araçlarıdır.

```powershell
npm --prefix tools ci
npm --prefix tools test
npm --prefix tools run check
npm --prefix tools run release
npm --prefix tools run verify
```

`check` mevcut birim/tarayıcı kontrollerini, yeni ekranları, sürümden bağımsız player kabulünü ve sekiz katalog–player döngüsünü çalıştırır. `release` ayrıca WGT üretir; kaynak, imza, native dosyalar ve geri dönüş paketlerini doğrular. Güncel açık paket değişiklik listesi `tools/release-changes-114.json` dosyasındadır. Küçük değişikliklerde yukarıdaki `check:area` komutu kullanılabilir. İmzalama yalnız izin listesindeki dosyaların geçici kopyasında yapılır; SDK'nin `Debug`/`Release` çıktıları ve `tizen_web_project.yaml` pakete girmez. QA araçları WGT'ye alınmaz.

Emülatör seçmek için **`Emulatorler.cmd`** dosyasına çift tıklayın. Menüde Tizen 3.0 / 8.0 / 9.0 / 10.0 ve Windows emülatörlerini kapatma seçeneği bulunur. Seçilen emülatör açılır, güncel uygulama kurulur ve başlatılır. Aynı anda tek emülatör kullanın; sürüm değiştirmeden önce açık olan TV penceresini kapatın. 180 saniye açılış bekleme sınırıdır; otomatik kapanma süresi değildir.

**`EmulatordeAc.cmd`** doğrudan mevcut Tizen 3.0 WSL/KVM emülatörünü açar, güncel yerel imzalı WGT'yi kurar ve Film Merkezi'ni başlatır. `Tizen3Ac.cmd` yalnız emülatörü açar. `Tizen8Ac.cmd`, `Tizen9Ac.cmd` ve `Tizen10Ac.cmd` seçilen 1920×1080 Samsung TV emülatörünü açıp güncel kaynaklardan `FilmMerkeziEmulator` profiliyle hazırlanan paketi kullanır. Sürüm manifestten okunur; paketin güncelliği kaynak dosyalarıyla karşılaştırılır ve gerekirse yeniden hazırlanır. Başlatıcılar doğrudan kurulu SDK/WSL araçlarını kullanır; Tizen agent skill runner bağımlılığı yoktur. Uygulama kaldırılmaz veya kayıt sıfırlanmaz. İmzasız `-public.wgt` yayımlama paketi korunur; doğrudan emülatöre kurulmaz.

Komut satırından `Emulatorler.cmd -Version 3.0` güncel uygulamayı kurar; `-LaunchOnly` yalnız emülatörü açar. `-CheckOnly` cihaz işlemi yapmadan yolları ve kimlikleri gösterir. `-Rebuild` paketi yeniden hazırlar; `-Package <imzalı.wgt>` ile belirli bir paket seçilebilir. Güncel başlatıcı doğrulaması: [1.1.7 emülatör başlatıcı kontrolü](docs/EMULATOR_BASLATICI_KONTROLU_1.1.7.md).

Ayrı tarihsel test paketi `tools/build-tv0200.ps1` ile üretilir; emülatöre kurulduktan ve SDK portu 35960'a yönlendirildikten sonra yeni Çıkış kabulü `node tools/player0211-emulator.cjs` ile çalıştırılır. Bu betik yalnız emülatörün yerel yönlendirmesine bağlanır; gerçek TV'ye bağlanmaz.

0.22.0'ın tekrarlanabilir ekran turu `tools/build-qa0220.ps1` ve `tools/catalog0220-emulator.cjs` kullanır. Bu ayrı QA uygulamasındaki açıkça sentetik katalog ve yerel test videosu yalnız geliştirme içindir; dağıtılan WGT'de bulunmaz. Güncel kanıtlar `tools/test-results/catalog0220/` altındadır.

[Proje geçmişi](PROJE_GECMISI.md) · [Mimari](KATALOG_MIMARISI.md) · [Tarihsel raporlar](docs/arsiv).

8/9/10 Samsung TV emülatörlerinin sertifika engeli, cihaz kimliğini kapsayan FilmMerkeziEmulator profiliyle çözüldü. Üçü de 1920×1080'de Samsung imzalı v0.23.1 SDK paketiyle beşer grubu geçti: katalog, dil, AVPlay, canlı kaynak çözümleme/HTML5 ve sarma/duraklatma/çıkış. Tizen 9'un ek tekrar turuyla toplam 20/20 grup geçti; kullanıcı kayıtları aynı. Sonuçlar ve önceki başarısız denemeler [sürüm uyumluluk raporundadır](TIZEN_SURUM_UYUMLULUK_RAPORU.md). 4–7 denenmedi; emülatör kabulü gerçek TV, duyulan ses/senkron veya fiziksel kumanda kabulü değildir. Otomatik Mux master'daki 8 MiB üstü parça sınırlaması devam eder; sabit 480p kabulü onun düzeldiğini göstermez.
