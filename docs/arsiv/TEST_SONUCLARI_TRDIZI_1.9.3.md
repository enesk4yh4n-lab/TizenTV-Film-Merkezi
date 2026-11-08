# TRDizi — çekirdek 1.9.3 / site 1.0.6

8 Kasım 2026. WGT 1.5.0 değişmez. Önceki ağ/katalog ölçümleri [1.9.1 raporunda](TEST_SONUCLARI_TRDIZI_1.9.1.md) korunur.

## Doğrulanan nedenler ve düzeltmeler

- TV'nin HTTPS Download yolu TRDizi sayfalarını alırken özel TLS istemcisi HTTP 403 alıyordu. Sertifika doğrulaması kapatılmadan siteye özel platform taşıması seçildi.
- Genel sağlayıcı seçilen bölümün adresini bildiriyor, katalog ise yalnız bölüm kimliğini okuyordu. 8. bölüm detayından 1. bölüme geçiş bu sözleşme eksikliğinden kaynaklanıyordu. Açık bölüm kimliği önceliği korunarak açık adres karşılığı da kullanılacak.
- Gerçek 8. bölümdeki Twitter HLS manifesti özel TLS yolunda 403, TV/XHR yolunda geçerli HLS döndürdü. Eklentinin sahip olduğu istemcide platform HTTPS metin yolu seçildi; doğrulanmış XHR medya tercihi artık özel TLS denemesinden önce uygulanır. Diğer istemcilerin varsayılanı, sertifika doğrulaması, boyut sınırları ve iptal sahipliği korunur.
- 1.9.3 yalnız üç modülü değiştirir: ağ metin istemcisi, medya taşıma sırası ve seçilen bölümün katalogdan oynatıcıya aktarımı. Eklenti 1.0.6 bu çekirdeği gerektirir.

## İlgili kontroller

12 dar kapsamlı kontrol geçti: gerçek TV HTML örneklerinden başlık/afiş ve dokuz bölüm sırası; etkin JW kaynağı; ayrı iptal sahipliği; imza/ES5; platform taşımasının isteğe bağlı oluşu; XHR önceliği ve yedekleri; açık bölüm seçimi; yalnız üç modülün değişmesi ve WGT'nin korunması; imzalı ağ modülünün engel sayfasıyla karıştırılmaması. 1.9.3 çalışma dosyalarıyla sınandı.

## Gerçek TV kabul durumu

Önceki turda açılan 1. bölüm yaklaşık iki saniyede takıldı; kullanıcı görüntü/ses sorunu bildirdi. Bu tur 8. bölüm başarısı olarak sayılmaz. Daha sonraki doğrudan 8. bölüm denemesi manifest 403 nedeniyle başarısız oldu. Ham başarısız kayıtlar korunur.

Son kabul 8 Kasım 2026, 23:41–23:43 Türkiye saatinde gerçek Tizen 3 TV'de tamamlandı:

| Kontrol | Sonuç |
|---|---|
| Etkin sürüm | WGT 1.5.0, çekirdek 1.9.3, TRDizi 1.0.6; 22 site yüklü |
| TRDizi ana sayfası | 12 kart, erişim hatası yok |
| Tuzlu Kahve araması | Dokuz gerçek bölüm kartı; başlık ve afiş doğru |
| 8. bölüm detayına geçiş | 1–9 bölüm sırası korundu; seçili adres 8. bölüm |
| İzle | Oynatıcı gerçekten 8. bölüm adresiyle açıldı; başka bölüme/kaynağa kaçılmadı |
| Medya | video.twimg.com HLS, HTML5, 1920×1080, süre 8.060,8 saniye |
| Kesintisiz ilerleme | 1,030 → 61,236 saniye; 12 örneğin tamamı playing, yükleme kimliği 3 olarak sabit, hata yok |
| Duraklat / devam | Gerçek TV sayfasına gönderilen Pause/Play tuş olayları geçti; duraklatmada saat sabit kaldı |
| Görüntü ve duyulan ses | Kullanıcı bu yeni turda “Görüntü ve ses normal” yanıtıyla onayladı |

Ses–görüntü senkronu ayrıca sorulmadı; fiziksel kumanda ve tüm TRDizi bölümleri bu kısa turla doğrulanmış sayılmaz. Önceki 1. bölüm Streambox takılması yeni turda yeniden sınanmadı. Diğer kaynakların tamamına başarı sonucu taşınmaz.

Yeni çekirdek TV'de etkinleştiğinde, önceki minimum-çekirdek hatası nedeniyle TRDizi pasif ve aktif paketi boş görünüyordu. Uygulamanın kendi paket yöneticisiyle 1.0.6 yeniden indirildi, etkinleştirildi ve yeniden açılışta hatasız kaydoldu. Uygulama kaldırılmadı; kullanıcı kayıtları sıfırlanmadı. Güncellemede sorun kalırsa önce çekirdeği uygulayıp yeniden açın, ardından TRDizi paketini kurun/etkinleştirin.

Yerel kanıtlar: `tools/test-results/trdizi104/tv-install-193.json`, `tv-flow-193.json`, `tv-twitter-parts.json`, `human-observation-193.json`, `download-verification-193.json`. Bunlar QA kayıtlarıdır; WGT'ye girmez. Kabul turunda oynatma koduna geçici yama uygulanmadı.

## Paket sınırı

WGT SHA-256: `3d2fd810f6b39c43065b7a5c4ae74a750c16457642ff53450feeb7b22e6963f7`. WGT/native ikililer değiştirilmez, uygulama kaldırılmaz, kullanıcı kayıtları temizlenmez. GitHub normal bileşen/site güncellemesi dışında Release ve Apps2Samsung değişikliği yapılmaz. Geçici tokenlar ve özel anahtarlar yayımlanmaz.

1.9.2 indirme denemesi, ağ modülünün içindeki engel denetim metninin yanlış eşleşmesi nedeniyle durdu; bu denemede etkin 1.9.1 korundu. 1.9.3 aynı denetimi eşdeğer desenle yazar; gerçek engel sayfalarını reddetmeye devam eder. GitHub ham dosya önbelleği bir süre eski 1.9.2 bildirimini sundu; 1.9.3 normal `main/updates` adresinden görünür olduğunda on dosya yeniden indirilip yerel SHA-256 ve imzalarla karşılaştırıldı. Geçici alternatif adres denemesi native izin kontrolünde reddedildi; kalıcı güncelleme adresi değiştirilmedi.
