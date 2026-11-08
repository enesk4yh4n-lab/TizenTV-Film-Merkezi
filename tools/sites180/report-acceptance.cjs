'use strict';
const {root,dir}=require('./inventory.cjs'),fs=require('node:fs'),path=require('node:path');
const read=n=>{const f=path.join(dir,n+'.json');return fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):null;};
const playback=read('emulator-playback'),patch=read('emulator-patch'),verify=read('verification');
const lines=['','## Son emülatör turu ve bağımsız düzeltmeler','',
'- WSL Ubuntu-22.04 içindeki mevcut Tizen 3 başlatıcı doğrudan kullanıldı; SDK eklentisi çalıştırılmadı. Cihaz `127.0.0.1:26111`. Kullanıcı kayıtları veya VM diski silinmedi.',
'- İlk kırk bağlantılık turda 24. kayıttan sonra farklı sunucular birlikte `native connect (-20)` verdi ve RWI yanıtı kesildi. Bu ham tur saklandı. Aynı diskle emülatörü yeniden açınca Diziyou, Diziizle, Streamcore, KSD ve kontrol DUAL çözüldü. Yeniden açılış, bu uzun oturum sorununun kök nedenini çözdüğümüz anlamına gelmez.',
'- Uzun oynatma turunda Vidara otomatik AVPlay motorunda ilerledi, ardından yaklaşık 47. saniyede yavaşladı/durdu; çıkışta Runtime.evaluate zaman aşımı oluştu. Bu tur başarısız kaydedildi ve aynı VM diskiyle güvenli yeniden başlatma yapıldı. Kaynak çözümlemesi ile bu emülatör/motor oturum hatası ayrı tutulur; gerçek TV davranışı çıkarılamaz.',
'- Tabloda her bağlantının en son denemesi kullanılır; ilk başarısızlıklar `emulator-probe.json`, tekrarlar `emulator-probe-fresh.json` ve `emulator-probe-tr-fixed.json` içinde ayrıdır.',
'- TRDizi 1.0.1: aktif JW verisi yerine gizli doğrulama iframe’ine gidilmesi düzeltildi. Tizen’de ikinci sayfanın yanlış XHR fallback tercihinin devralındığı ayrıca ölçüldü; 1.0.2 her istek için iptal edilebilen ayrı istemci kullanır. Çekirdek 1.8.0 ve önceki eklenti sürümleri değiştirilmedi.',
'- FixFull 1.0.1: güncel Bronz MP4 yanıtında görülen kesin CDN kökeni izinlere eklendi. Genel internet veya tahmini wildcard izni verilmedi.',
`- Son eklenti güncellemesi: ${patch&&patch.passed?'gerçek GitHub indirme / imza doğrulama / yeniden açılış geçti; 22 site etkin':'tamamlanmadı'}.`,
'- TRDizi’nin altı gerçek oynatıcı yanıtı fixture olarak ayrıştırıldı. Streambox/Puhu/Tabii emülatörde manifest doğruladı; Yandex MP4 yalnız adaydır. Twitter iki örnekte manifest aşamasında 403 verdi. Manifest erişimi oynatma başarısı sayılmaz.',
'','## Gerçek kaynakla oynatma kontrolleri','',
'Bu tablo simülasyon değildir. Uygulamanın kendi çözümleyicisi ve medya motoru kullanılır; kontrol işlemleri CDP tuş olaylarıyla gönderilir. Kaynak değişirse asıl kaynağın kabulü başarısız sayılır. Duyulan ses, senkron ve fiziksel kumanda onayı içermez.','',
'| Bağlantı | İstenen kaynak | Sonuç | Kontroller | Son kontrol zamanı |',
'|---|---|---|---|---|'];
for(const r of playback&&playback.rows||[])lines.push('| '+r.case+' | '+r.expected+' | '+(r.passed===true?'geçti':r.passed===false?'başarısız: '+String(r.error).replace(/\|/g,'/').slice(0,250):'devam ediyor')+' | '+r.checks.join(', ')+' | '+(r.finished||r.started)+' |');
lines.push('', 'Başarılı her farklı biçimde 90 saniyelik örnekleme ayrıca yapılır; medya saati ilerlemeli ve video ölçüleri bulunmalıdır. Duraklatma, ileri/geri sarma, Kaynaklar → yenileme ve Çıkış aynı turda ayrı kontrol edilir.',
'','### Görüntü sayacı sınırı','',
'Bu Tizen 3 RWI, HTML5 `webkitDecodedFrameCount` sayacını sürekli sıfır bildiriyor. İlk Hotstream turundaki bu ölçüm başarısızlığı `emulator-playback-counter-run.json` içinde korundu; uygulamanın video açamadığı şeklinde yorumlanmadı. Sonraki kontroller medya saati/video ölçülerini sınar ve sayaç sınırını uyarı olarak kaydeder. Hotstream film görüntüsü WSL emülatör penceresinden ayrıca görüldü. Diğer kaynaklarda ekran gözlemi yoksa yalnız otomatik medya/kontrol kabulü vardır; tüm pikseller veya duyulan ses doğrulanmış sayılmaz.',
'','## Açık kalanlar ve kullanım sınırı','',
'- Erişim engelli site veya kaynak için 90 saniyelik kabul verilemez: Film Makinesi, FullHDfilmizlesene ve Dizibox sayfa erişimleri; Dizipal21 API; Roket/Pichive; Dailymotion DM016; kamuya açık oynatıcı sunmayan HDFilmDelisi örneği. Bunlar otomatik fallback ile başarılıya çevrilmedi.',
'- LoveFilmizle çok kaynaklı bazı örnekler ve OK seçenekleri süre sınırına takıldı. HDF Rapidrame örneği 404, FixFull Fastm örneği 521 döndürdü. Sunucu hatasının kalıcı olarak giderildiği iddia edilmez.',
'- Her sitenin tüm dizi/sezon biçimleri tamamlanmış değildir. Mevcut gerçek örnekler ve HDF Umut Taciri gerilemesi kapsanır; daha fazla bölüm biçimi edinildikçe fixture eklenmelidir.',
'- Eklentiye gereken çekirdek sürümü WGT 1.4.1 şemasında ayrı kurulum öncesi alan olarak bulunmuyor. Önce çekirdek 1.8.0 kurulması gerekir; eski çekirdekte açık modül uyumluluk kontrolü vardır. Bu, tam kurulum öncesi bağımlılık denetimi değildir.',
`- Teknik WGT/CA değişmedi; son izin birleşimi ${verify&&verify.originUnion}/128 ve eklenti dosyaları ${verify&&verify.codePackageBytes} bayt/8 MiB. TLS doğrulaması kapatılmadı.`,
'- Genel Release, Apps2Samsung yayını veya gerçek TV kabulü yapılmadı. Bu kanal pilot dağıtımdır.');
const f=path.join(root,'docs/arsiv/TEST_SONUCLARI_SITELER_1.8.0.md');fs.appendFileSync(f,lines.join('\n')+'\n');
console.log(JSON.stringify({appended:true,playbackRows:playback&&playback.rows.length||0}));
