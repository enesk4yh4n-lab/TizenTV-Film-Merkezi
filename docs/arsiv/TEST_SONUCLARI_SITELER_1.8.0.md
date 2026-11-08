# Film Merkezi 1.8.0 — 22 site kabul raporu

8 Kasım 2026. Bu rapor bilgisayar, yakalanmış yanıt ve Tizen 3 emülatörü sonuçlarını ayırır. Fiziksel TV sesi/senkronu/kumandası bu çalışmada doğrulanmadı.

## Dağıtım ve bütünlük

- İki yerleşik site: HDFilmCehennemi, Filmizle.ink. Yirmi bağımsız imzalı site paketi; başlangıç sürümü 1.0.0.
- Aynı WGT 1.4.1 korunuyor. Çekirdek: 1.8.0. Genel Release/Apps2Samsung yayını yok.
- WGT SHA-256: `2c06ea44e4e4dc3d3c62416324eebbb5a080a3318066d76070a5b4e35310fac9`.
- Paket dosyaları: 266212 bayt; sınır 8 MiB. İzin birleşimi: 112/128.
- Yerel imza/özet/ES5: geçti; 94 JS kontrolü. GitHub yeniden indirme: 218 dosya geçti.
- Emülatör kurulum: 22 site etkin, 20 eklenti yüklü. Yeniden açılış: 2480 ms.

## Verilen 40 bağlantı

“HLS hazır” yalnız çözümleme/manifest erişimidir; oynatma kabulü değildir. Parça kontrolü kısmi Range indirmesidir; tam parça/decoder testi yerine geçmez. Zaman aşımında kalan seçenekler ayrıca bekliyor sayılır.

| # | Site / sayfa | Bilgisayar | Tizen 3 çözümleme | Medya erişimi |
|---|---|---|---|---|
| case-01 | [filmizle](https://filmizle.ink/the-gorge-2025-izle/) | kaynak bulundu | Hotstream / hls / https://hotstream.club; Hotstream 2 / hls / https://hotstream.club | Hotstream: geçti; Hotstream 2: geçti |
| case-02 | [filmizle](https://filmizle.ink/the-gorge-2025-izle/2/) | kaynak bulundu | Hotstream 2 / hls / https://hotstream.club; Hotstream / hls / https://hotstream.club | Hotstream 2: geçti; Hotstream: geçti |
| case-03 | [filmizle](https://filmizle.ink/american-psycho-1-amerikan-sapigi-2000-izle/) | kaynak bulundu | Hotstream / hls / https://hotstream.club | Hotstream: geçti |
| case-04 | [filmmakinesi](https://filmmakinesi.to/film/orumcek-adam-yepyeni-bir-gun-2026-fmfxps/) | page: HTTP 403 | failed: Native TLS HTTP 403; Native API: Input/output error | sınanmadı |
| case-05 | [fullhdfilmizlesene](https://www.fullhdfilmizlesene.now/film/ringlerin-kralicesi-queen-of-the-ring/) | page: HTTP 403 | failed: Native TLS HTTP 403; Native API: Input/output error | sınanmadı |
| case-06 | [fullhdfilmizlesene](https://www.fullhdfilmizlesene.now/film/arif-v-216/) | page: HTTP 403 | failed: Native TLS HTTP 403; Native API: Input/output error | sınanmadı |
| case-07 | [lovefilmizle](https://lovefilmizle.net/guvenli-yer-yok-izle/) | kaynak bulundu | Vidmoly / hls / https://prx-1317-ant.vmpx.online | Vidmoly: geçti |
| case-08 | [lovefilmizle](https://lovefilmizle.net/gorunmez-cocuk-ikinci-nesil-izle/4/) | kaynak bulundu | timeout: süre doldu | FilmRu: geçti; FilmOk: geçti; FilmOk2: geçti |
| case-09 | [lovefilmizle](https://lovefilmizle.net/goster-gununu-2-izle/8/) | kaynak bulundu | timeout: süre doldu | FilmVS: HTML response instead of media; FilmOk: geçti; FilmViP: geçti; FilmViP: geçti; FilmOk2: geçti; FilmOk: geçti; FilmOk2: geçti |
| case-10 | [filmizlehell](https://filmizlehell.net/film/3730-orumcek-adam-yepyeni-bir-gun-jg6-izle) | kaynak bulundu | PlayTurka / hls / https://p.playturka.space | PlayTurka: geçti |
| case-11 | [filmifullizle](https://www.filmifullizle.news/film/orumcek-adam-yepyeni-bir-gun.html) | kaynak bulundu | Moly · Türkçe Dublaj / hls / https://prx-1546-ant.vmpx.online; Moly · Türkçe Altyazılı / hls / https://prx-1350-ant-d.vmpx.online | Moly · Türkçe Dublaj: geçti; Moly · Türkçe Altyazılı: geçti; OkRu · Türkçe Altyazılı: geçti |
| case-12 | [filmizlebabam](https://filmizlebabam.icu/home-service/) | kaynak bulundu | Vidara / hls / https://s10-s501740.97bf1.com; AS9 / hls / https://s10-s501740.97bf1.com | Vidara: geçti; AS9: geçti |
| case-13 | [filmizlebabam](https://filmizlebabam.icu/365-gun/) | kaynak bulundu | failed: Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) | OK.ru: The operation was aborted due to timeout |
| case-14 | [filmizlebabam](https://filmizlebabam.icu/siyah-giyen-adamlar-3/) | kaynak bulundu | Pilavyer (Play2) / hls / https://play2.pilavyerplay.top | Pilavyer (Play2): geçti |
| case-15 | [filmizlebabam](https://filmizlebabam.icu/sex-drive/) | kaynak bulundu | Vidara / hls / https://s10-s501740.97bf1.com; AS9 / hls / https://s10-s501740.97bf1.com | Vidara: geçti |
| case-16 | [sinemacc](https://sinemacc.com/film/yardim-cagrisi-send-help-2026/) | kaynak bulundu | Dublaj & Altyazı / hls / https://player.filmizle.in | Dublaj & Altyazı: geçti |
| case-17 | [fixfullfilmizle](https://www.fixfullfilmizle.net/poseidondan-kacis-full-hd-film-izle/) | kaynak bulundu | VIDMOLY / hls / https://matrudas.com; BRONZ / mp4 / https://ynll3vo5a4qr.drewimplemnt.top | VIDMOLY: geçti |
| case-18 | [hdfilmdelisi](https://hdfilmdelisi.one/film/saplanti-obsession) | page: Bu içerik için herkese açık oynatıcı bulunmuyor. | failed: Bu içerik için herkese açık oynatıcı bulunmuyor. | sınanmadı |
| case-19 | [hdf](https://www.hdfilmcehennemi.nl/disclosure-day/) | kaynak bulundu | Close / hls / https://srv10.cdnimages1223.cyou | Close: geçti |
| case-20 | [ddizi](https://www.ddizi.tel/izle/92001/tasacak-bu-deniz-35-bolum-izle-hd2.htm) | network: Failed to retrieve session data: 404 | Tek Parça · YouTube / hls / https://ytx.invalid | sınanmadı |
| case-21 | [ddizi](https://www.ddizi.tel/izle/91916/uzak-sehir-68-bolum-izle-hd1.htm) | network: Failed to retrieve session data: 404 | Tek Parça · YouTube / hls / https://ytx.invalid | sınanmadı |
| case-22 | [turkcefilmler](https://turkcefilmler.to/drop-kabul-et-veya-reddet/) | kaynak bulundu | DUAL / hls / https://player.filmizle.in | DUAL: geçti |
| case-23 | [turkcefilmler](https://turkcefilmler.to/companion/) | kaynak bulundu | DUAL / hls / https://player.filmizle.in | DUAL: geçti |
| case-24 | [dizibox](https://www.dizibox.live/visionquest-1-sezon-1-bolum-izle/) | page: HTTP 403 | failed: Native TLS HTTP 403; Native API: Input/output error | sınanmadı |
| case-25 | [trdiziizle](https://www.trdiziizle.tv/tuzlu-kahve-2-bolum-izle-full-tek-parca/) | Kaynak: embed / HTTP 403 | Kaynak / hls / https://streambox.xyz | Active JW: geçti |
| case-26 | [trdiziizle](https://www.trdiziizle.tv/sevdan-bir-ates-9-bolum-izle-full-tek-parca/) | Kaynak: embed / HTTP 403 | failed: Native TLS HTTP 403; Native ag zaman asimi (10 sn) | Active JW: HTTP 403 |
| case-27 | [trdiziizle](https://www.trdiziizle.tv/masterchef-2026-139-bolum-izle-4-kasim-2026/) | Kaynak: embed / HTTP 403 | Kaynak / mp4 / https://downloader.disk.yandex.ru | Active JW: HTTP 403 |
| case-28 | [trdiziizle](https://www.trdiziizle.tv/omur-usta-5-bolum-full-izle/) | Kaynak: embed / HTTP 403 | failed: Native TLS HTTP 403; Native ag zaman asimi (10 sn) | Active JW: HTTP 403 |
| case-29 | [trdiziizle](https://www.trdiziizle.tv/baskalarinin-hayati-4-bolum-izle-full-tek-parca/) | Kaynak: embed / HTTP 403 | Kaynak / hls / https://puhu-p3.mncdn.com | Active JW: geçti |
| case-30 | [trdiziizle](https://www.trdiziizle.tv/teskilat-191-bolum-full-izle-tek-parca/) | Kaynak: embed / HTTP 403 | Kaynak / hls / https://eu1.tabii.com | Active JW: geçti |
| case-31 | [dizipal21](https://dizipalorijinal21.vip/bolum/aski-hatirla-1-sezon-4-bolum) | Dizipal: embed / The operation was aborted due to timeout | failed: Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) | sınanmadı |
| case-32 | [diziyou](https://www.diziyou.one/visionquest-1-sezon-7-bolum/) | Diziyou Player: HLS hazır | Diziyou Player / hls / https://storage.diziyou.one | Diziyou Player: geçti |
| case-33 | [izle7](https://www.izle7.com/kanal7/izle-81932-gonul-sozum-273-bolum-final-17-nisan-2026.html) | Dailymotion: unavailable / Dailymotion erişim kısıtı: DM016 | failed: Dailymotion erişim kısıtı: DM016 | sınanmadı |
| case-34 | [roketdizi](https://roketdizi.life/dizi/wheres-wanda/sezon-2/bolum-3) | RoketTV · Türkçe Altyazı: embed / HTTP 403; RoketTV · Türkçe Dublaj: embed / HTTP 403 | failed: Native TLS HTTP 403; HTTP 403 | sınanmadı |
| case-35 | [diziizle](https://diziizle.cloud/dizi/tuzlu-kahve/sezon-1/bolum-8) | Pilavyer: HLS hazır | Pilavyer / hls / https://play2.pilavyerplay.top | Pilavyer: geçti |
| case-36 | [dizipal19](https://dizipalorjinal19.com/bolumler/house-of-the-dragon-s1b3) | other oynatici: HLS hazır | other oynatici / hls / https://streamcorecdn.com | other oynatici: geçti |
| case-37 | [turkcefilmler](https://turkcefilmler.to/infatuation-erotik-filmini-izle/) | filtre kapsamında | filtre kapsamında | sınanmadı |
| case-38 | [turkcefilmler](https://turkcefilmler.to/red-sonja/) | kaynak bulundu | DUAL / hls / https://player.filmizle.in | DUAL: geçti |
| case-39 | [turkcefilmler](https://turkcefilmler.to/ahlaksizlik/) | filtre kapsamında | filtre kapsamında | sınanmadı |
| case-40 | [diziboxum](https://diziboxum.com/tulsa-king-1-sezon-2-bolum-9b0sw-16021/) | Kaynak: HLS hazır | Kaynak / hls / https://ksdpictures.site | Kaynak: geçti |

## Kaynak seçenekleri ve aşamalar

| Sayfa | Kaynak | Bilgisayar durumu | Emülatör durumu |
|---|---|---|---|
| case-01 | Hotstream | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-01 | Hotstream 2 | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-02 | Hotstream 2 | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-02 | Hotstream | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-03 | Hotstream | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-07 | Vidmoly | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-08 | FilmMl | error / HTTP 404 | error / embed / Native TLS HTTP 404; HTTP 404 |
| case-08 | FilmOk | ready / HLS erişimi doğrulandı | error / manifest / Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) |
| case-08 | FilmRu | candidate / MP4 medya motorunda sınanacak | candidate /  / MP4 medya motorunda sınanacak |
| case-08 | FilmOk2 | ready / HLS erişimi doğrulandı | pending /  /  |
| case-09 | FilmVS | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-09 | FilmViP | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-09 | FilmOk | ready / HLS erişimi doğrulandı | error / manifest / Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) |
| case-09 | FilmOk2 | ready / HLS erişimi doğrulandı | pending /  /  |
| case-09 | FilmMl | error / Aktif JW medya ayarı bulunamadı. | pending /  /  |
| case-10 | PlayTurka | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-11 | Sinefilm · Türkçe Dublaj | error / SMPlayer kaynağı hazırlama süresinde açılamadı. | error / access / SMPlayer kaynağı hazırlama süresinde açılamadı. |
| case-11 | Moly · Türkçe Dublaj | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-11 | Sinefilm · Türkçe Altyazılı | error / SMPlayer kaynağı hazırlama süresinde açılamadı. | error / access / SMPlayer kaynağı hazırlama süresinde açılamadı. |
| case-11 | Moly · Türkçe Altyazılı | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-11 | OkRu · Türkçe Altyazılı | ready / HLS erişimi doğrulandı | error / manifest / Native TLS zaman aşımı.; XHR ag/CORS/TLS |
| case-12 | Vidara | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-12 | AS9 | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-13 | OK.ru | ready / HLS erişimi doğrulandı | error / manifest / Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) |
| case-14 | Pilavyer (Play2) | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-15 | Vidara | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-15 | AS9 |  | ready /  / HLS erişimi doğrulandı |
| case-16 | Dublaj & Altyazı | ready / HLS erişimi doğrulandı · aynı yayının dilleri Ses ve Altyazı menülerinde | ready /  / HLS erişimi doğrulandı · aynı yayının dilleri Ses ve Altyazı menülerinde |
| case-17 | VIDMOLY | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-17 | FASTM | error / HTTP 521 | error / host / Native TLS HTTP 521; HTTP 521 |
| case-17 | BRONZ | error / FixFullFilmİzle · MP4 HTTP 404 | ready /  / MP4 ilk karesi HTML5 motorunda doğrulandı |
| case-19 | Close | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-19 | Rapidrame | unsupported / Bu yayın listede başka kaynak adıyla zaten var. | error / manifest / Kaynak sunucusunda yayın listesi bulunamadı. |
| case-20 | Tek Parça | error / Failed to retrieve session data: 404 |  |
| case-20 | Tek Parça · YouTube |  | ready /  / YouTube güncel misafir oturumu / H.264-AAC HLS hazır |
| case-21 | Tek Parça | error / Failed to retrieve session data: 404 |  |
| case-21 | Tek Parça · YouTube |  | ready /  / YouTube güncel misafir oturumu / H.264-AAC HLS hazır |
| case-22 | DUAL | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-23 | DUAL | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-25 | Kaynak | embed / HTTP 403 | ready /  / HLS erişimi doğrulandı |
| case-26 | Kaynak | embed / HTTP 403 | error / manifest / Native TLS HTTP 403; Native ag zaman asimi (10 sn) |
| case-27 | Kaynak | embed / HTTP 403 | candidate /  / MP4 medya motorunda sınanacak |
| case-28 | Kaynak | embed / HTTP 403 | error / manifest / Native TLS HTTP 403; Native ag zaman asimi (10 sn) |
| case-29 | Kaynak | embed / HTTP 403 | ready /  / HLS erişimi doğrulandı |
| case-30 | Kaynak | embed / HTTP 403 | ready /  / HLS erişimi doğrulandı |
| case-31 | Dizipal | embed / The operation was aborted due to timeout | error / embed / Native ag zaman asimi (10 sn); XHR zaman asimi (16 sn) |
| case-32 | Diziyou Player | ready /  | ready /  / HLS erişimi doğrulandı |
| case-33 | Dailymotion | unavailable / Dailymotion erişim kısıtı: DM016 | error / unavailable / Dailymotion erişim kısıtı: DM016 |
| case-34 | RoketTV · Türkçe Altyazı | embed / HTTP 403 | error / embed / Native TLS HTTP 403; HTTP 403 |
| case-34 | RoketTV · Türkçe Dublaj | embed / HTTP 403 | error / embed / Native TLS HTTP 403; HTTP 403 |
| case-35 | Pilavyer | ready /  | ready /  / HLS erişimi doğrulandı |
| case-36 | other oynatici | ready /  | ready /  / HLS erişimi doğrulandı |
| case-38 | DUAL | ready / HLS erişimi doğrulandı | ready /  / HLS erişimi doğrulandı |
| case-40 | Kaynak | ready /  | ready /  / HLS erişimi doğrulandı |

## Doğrulanan düzeltmeler

- Site modülleri özel ad alanlarına taşındı; eski kimlik/önek/depolama kapsamları korunuyor. Film İzle Babam `.icu`; eski `.com` takma adresleri korunuyor.
- FilmizleHell’de aynı sayısal kimlikli URL ekinin değişmesi, farklı film kimliği sayılmıyor. Başka sayısal kimlik reddediliyor.
- DDizi’nin doğrudan YouTube iframe biçimi mevcut özel YouTube yükleyicisine bağlandı. Güncel YouTube oturum hatası ayrı raporlanır; destek/başarı uydurulmaz.
- Vidara’nın sayfada bildirdiği aynı video kimlikli AS9 aynası eklendi. Manifest API yanıtı ayrı doğrulandı.
- HDF’de açık 404/410 manifest, denenebilir başarılı kaynak gibi tutulmuyor. Aynı URL’ye dönen seçenek tekrar eklenmiyor.
- Kaldırma sonrası yeniden kurmada geçici dosyaların erken budanması düzeltildi. Mevcut 1.4.1 yükleyicisine 1.8.0 çekirdeğinde işlem süresiyle sınırlı staging koruması uygulanır.
- Yeni sekiz adaptör: gerçek bölüm bağlantıları, sayfalama/sezon bağlantıları, erişim kısıtı ayrımı. Roket AES URL verisi asenkron WebCrypto ile çözülür; sayfa betiği çalıştırılmaz.

## TLS ve sınırlar

Aynı native CA kaynak dosyasıyla bilgisayarda 99 sunucu kontrol edildi; 98 TLS doğrulaması geçti. Hostname/SNI ve sertifika doğrulaması açık. s41.imgz.me: TLS handshake timed out. Bu bilgisayar sonucu tek başına TV native kabulü değildir. Emülatörün kendi ağ sonuçları yukarıdadır.

## Kalan sınırlar

- HTTP 403/404/521 ve zaman aşımı erişim sonucudur; sertifika doğrulaması kapatılarak aşılmadı. Dizipal21 API ve Pichive gibi erişilemeyen biçimler tam oynatma kabulü almış sayılmaz.
- Dailymotion DM016, yayıncının gömme erişim kısıtıdır. HDFilmDelisi’nin herkese açık oynatıcı vermediği kayıt zorlanmaz.
- Eski WGT’nin eklenti şeması çekirdek sürümünü ayrı bir alan olarak denetlemez. Önce 1.8.0 çekirdeği kurulmalıdır; eski çekirdekte modülün açık uyumluluk hatası başlangıçta devreye girer.
- Verilen bağlantılar dışında her sitenin bütün bölüm/sezon varyantları doğrulanmış değildir. Eksik/engelli fixture yeni HTML/API örneği edinilmeden başarı olarak kapatılmaz.
- Ham HTML ve tokenlı medya adresleri yalnız yerel QA alanında; dağıtım veya kullanıcı kalıcı kimlik kaydında değiller.

## Kanıt dosyaları

- `tools/test-results/sites180/`: inventory, captures, catalog-check, probe-all, probe-new, media-check, tls, verification, remote, first-package, all-packages, lifecycle, emulator-install, emulator-probe.
- İlgili regresyon turu: 60 test geçti (HDF Umut Taciri, DDizi, Pilavyer, ortak inert decoder, imza/köken ve yeni site adaptörleri).
- Bağımsız 1.0.1 fixture yalnız test alanında üretildi; kamu deposuna yayımlanmadı.

## Son emülatör turu ve bağımsız düzeltmeler

- WSL Ubuntu-22.04 içindeki mevcut Tizen 3 başlatıcı doğrudan kullanıldı; SDK eklentisi çalıştırılmadı. Cihaz `127.0.0.1:26111`. Kullanıcı kayıtları veya VM diski silinmedi.
- İlk kırk bağlantılık turda 24. kayıttan sonra farklı sunucular birlikte `native connect (-20)` verdi ve RWI yanıtı kesildi. Bu ham tur saklandı. Aynı diskle emülatörü yeniden açınca Diziyou, Diziizle, Streamcore, KSD ve kontrol DUAL çözüldü. Yeniden açılış, bu uzun oturum sorununun kök nedenini çözdüğümüz anlamına gelmez.
- Uzun oynatma turunda Vidara otomatik AVPlay motorunda ilerledi, ardından yaklaşık 47. saniyede yavaşladı/durdu; çıkışta Runtime.evaluate zaman aşımı oluştu. Bu tur başarısız kaydedildi ve aynı VM diskiyle güvenli yeniden başlatma yapıldı. Kaynak çözümlemesi ile bu emülatör/motor oturum hatası ayrı tutulur; gerçek TV davranışı çıkarılamaz.
- Tabloda her bağlantının en son denemesi kullanılır; ilk başarısızlıklar `emulator-probe.json`, tekrarlar `emulator-probe-fresh.json` ve `emulator-probe-tr-fixed.json` içinde ayrıdır.
- TRDizi 1.0.1: aktif JW verisi yerine gizli doğrulama iframe’ine gidilmesi düzeltildi. Tizen’de ikinci sayfanın yanlış XHR fallback tercihinin devralındığı ayrıca ölçüldü; 1.0.2 her istek için iptal edilebilen ayrı istemci kullanır. Çekirdek 1.8.0 ve önceki eklenti sürümleri değiştirilmedi.
- FixFull 1.0.1: güncel Bronz MP4 yanıtında görülen kesin CDN kökeni izinlere eklendi. Genel internet veya tahmini wildcard izni verilmedi.
- Son eklenti güncellemesi: gerçek GitHub indirme / imza doğrulama / yeniden açılış geçti; 22 site etkin.
- TRDizi’nin altı gerçek oynatıcı yanıtı fixture olarak ayrıştırıldı. Streambox/Puhu/Tabii emülatörde manifest doğruladı; Yandex MP4 yalnız adaydır. Twitter iki örnekte manifest aşamasında 403 verdi. Manifest erişimi oynatma başarısı sayılmaz.

## Gerçek kaynakla oynatma kontrolleri

Bu tablo simülasyon değildir. Uygulamanın kendi çözümleyicisi ve medya motoru kullanılır; kontrol işlemleri CDP tuş olaylarıyla gönderilir. Kaynak değişirse asıl kaynağın kabulü başarısız sayılır. Duyulan ses, senkron ve fiziksel kumanda onayı içermez.

| Bağlantı | İstenen kaynak | Sonuç | Kontroller | Son kontrol zamanı |
|---|---|---|---|---|
| case-01 | HOTSTREAM | geçti | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog | 2026-11-08T15:25:49.145Z |
| case-07 | VIDMOLY | geçti | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog | 2026-11-08T15:27:47.152Z |
| case-10 | PLAYTURKA | geçti | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock, exit via actual dialog to catalog | 2026-11-08T15:29:33.343Z |
| case-12 | Vidara | başarısız: Emulator media clock stalled; Runtime.evaluate timed out during exit; session stopped for a graceful VM restart | pause/play physical key events, forward, rewind, refresh preserves active engine and playback clock | 2026-11-08T15:33:55.905Z |
| case-14 | Pilavyer | başarısız: TV evaluation failed: {"result":{"type":"object","objectId":"{\"injectedScriptId\":2,\"id\":1}","subtype":"error","className":"ReferenceError","description":"ReferenceError: ChainApp is not defined\n    at <anonymous>:1:3\n    at Object.InjectedScrip |  | 2026-11-08T15:35:09.665Z |

Başarılı her farklı biçimde 90 saniyelik örnekleme ayrıca yapılır; medya saati ilerlemeli ve video ölçüleri bulunmalıdır. Duraklatma, ileri/geri sarma, Kaynaklar → yenileme ve Çıkış aynı turda ayrı kontrol edilir.

### Görüntü sayacı sınırı

Bu Tizen 3 RWI, HTML5 `webkitDecodedFrameCount` sayacını sürekli sıfır bildiriyor. İlk Hotstream turundaki bu ölçüm başarısızlığı `emulator-playback-counter-run.json` içinde korundu; uygulamanın video açamadığı şeklinde yorumlanmadı. Sonraki kontroller medya saati/video ölçülerini sınar ve sayaç sınırını uyarı olarak kaydeder. Hotstream film görüntüsü WSL emülatör penceresinden ayrıca görüldü. Diğer kaynaklarda ekran gözlemi yoksa yalnız otomatik medya/kontrol kabulü vardır; tüm pikseller veya duyulan ses doğrulanmış sayılmaz.

## Açık kalanlar ve kullanım sınırı

- Erişim engelli site veya kaynak için 90 saniyelik kabul verilemez: Film Makinesi, FullHDfilmizlesene ve Dizibox sayfa erişimleri; Dizipal21 API; Roket/Pichive; Dailymotion DM016; kamuya açık oynatıcı sunmayan HDFilmDelisi örneği. Bunlar otomatik fallback ile başarılıya çevrilmedi.
- LoveFilmizle çok kaynaklı bazı örnekler ve OK seçenekleri süre sınırına takıldı. HDF Rapidrame örneği 404, FixFull Fastm örneği 521 döndürdü. Sunucu hatasının kalıcı olarak giderildiği iddia edilmez.
- Her sitenin tüm dizi/sezon biçimleri tamamlanmış değildir. Mevcut gerçek örnekler ve HDF Umut Taciri gerilemesi kapsanır; daha fazla bölüm biçimi edinildikçe fixture eklenmelidir.
- Eklentiye gereken çekirdek sürümü WGT 1.4.1 şemasında ayrı kurulum öncesi alan olarak bulunmuyor. Önce çekirdek 1.8.0 kurulması gerekir; eski çekirdekte açık modül uyumluluk kontrolü vardır. Bu, tam kurulum öncesi bağımlılık denetimi değildir.
- Teknik WGT/CA değişmedi; son izin birleşimi 112/128 ve eklenti dosyaları 266212 bayt/8 MiB. TLS doğrulaması kapatılmadı.
- Genel Release, Apps2Samsung yayını veya gerçek TV kabulü yapılmadı. Bu kanal pilot dağıtımdır.

## Sonraki gerçek TV turu

Kullanıcının TV’yi hazır etmesinden sonra yapılan ayrı kurulum, kaynak/kontrol turları ve TRDizi 1.0.3 düzeltmesi [gerçek TV raporunda](TEST_SONUCLARI_TV_SITELER_1.8.0.md) bulunur. Bu bölümün yukarısındaki emülatör sonuçları TV sonucu olarak yeniden etiketlenmez.
