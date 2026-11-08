# Çekirdek 1.9.4 — motor değiştirme onayı

9 Kasım 2026. WGT 1.5.0 ve site paketleri değişmez. Güncelleme yalnız player kontrolcüsünü ve yeni metinlerin İngilizce karşılıklarını içerir.

## Davranış

- Motor değiştirmeye uygun hata alan aynı kaynak önce mevcut motorla yeniden açılır. İkinci başarısız açılışta “Diğer oynatma motoruna geçilsin mi?” penceresi gösterilir.
- İlk odak “Mevcut motorda denemeye devam et” üzerindedir. Geri de bu seçimi yapar. Diğer motora yalnız “Motoru değiştir” seçilip OK verilirse geçilir.
- Ret halinde aynı toparlama turunda tekrar sorulmaz; aynı motor mevcut deneme bütçesi içinde denenmeye devam eder. Sonsuz döngüye girilmez. Elle Tekrar dene yeni bir tur başlatır.
- Aynı kaynakta otomatik toparlama sırasında en fazla bir onaylı motor geçişi yapılır. Konum, duraklatma niyeti ve track tercihleri mevcut akışla korunur.
- Kullanıcı kararı beklerken tekrar zamanlayıcısı çalışmaz. Bekleme süresi 60 saniyelik aktif toparlama bütçesinden düşülmez; beş toparlama sınırı artırılmaz. Sınır dolarsa hata ekranı ve elle yeniden deneme kullanılır.
- 403/404 gibi HTTP hataları motor değişimiyle giderilmeye çalışılmaz. Diğer motorun kaynağı açabilecek yeteneği yoksa uygun olmayan seçenek sunulmaz. Kalite geri dönüşü önceliği korunur.
- İçerik/kaynak değişimi ve çıkış eski onayı geçersiz kılar. Çift OK veya geç gelen olay ikinci bir geçiş başlatamaz.

## İlgili doğrulama

10 yeni mantık kontrolü ve mevcut motor/toparlama alanından altı gerileme kontrolü çalıştırılır. TR/EN tarayıcı senaryoları gerçek controller/View üzerinde yön, OK ve Geri olaylarıyla onay/ret, güvenli ilk odak ve duraklatma niyetini sınar. UI testinde yalnız bir sonraki motor açılışı kayıt tutan fixture ile temsil edilir; gerçek medya/codec veya fiziksel TV kabulü sayılmaz.

Paketin yalnız iki ES5 modülü değiştirdiği, dosya SHA-256 değerleri ve manifest RSA imzası denetlenir. WGT ve native ikililer korunur. Bu sürümde gerçek TV üzerinde kasıtlı oynatma hatası üretilmez; sonuçlar mantık/tarayıcı doğrulamasıdır.

Çalıştırma:

```text
node --test tools/updates/engine-consent194.test.cjs
node --test --test-name-pattern="motor changes|same-source recovery|automatic address refresh|network availability|normal HLS|transport and HTTP" tools/player0120.test.cjs
node tools/tests/run.js area engine-consent --json
node tools/updates/engine194-build.cjs
```

Yerel UI sonuçları `tools/tests/results/engine-consent.json`, TR/EN görüntüleri aynı adlı alt klasördedir; QA dosyaları WGT'ye alınmaz. Çekirdek Güncelleme Merkezi'nden uygulanıp uygulama yeniden açıldığında etkinleşir; yeni WGT kurulmaz.
