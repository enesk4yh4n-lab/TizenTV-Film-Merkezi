# TRDizi — çekirdek 1.9.2 / site 1.0.6

8 Kasım 2026. WGT 1.5.0 değişmez. Önceki ağ/katalog ölçümleri [1.9.1 raporunda](TEST_SONUCLARI_TRDIZI_1.9.1.md) korunur.

## Doğrulanan nedenler ve düzeltmeler

- TV'nin HTTPS Download yolu TRDizi sayfalarını alırken özel TLS istemcisi HTTP 403 alıyordu. Sertifika doğrulaması kapatılmadan siteye özel platform taşıması seçildi.
- Genel sağlayıcı seçilen bölümün adresini bildiriyor, katalog ise yalnız bölüm kimliğini okuyordu. 8. bölüm detayından 1. bölüme geçiş bu sözleşme eksikliğinden kaynaklanıyordu. Açık bölüm kimliği önceliği korunarak açık adres karşılığı da kullanılacak.
- Gerçek 8. bölümdeki Twitter HLS manifesti özel TLS yolunda 403, TV/XHR yolunda geçerli HLS döndürdü. Eklentinin sahip olduğu istemcide platform HTTPS metin yolu seçildi; doğrulanmış XHR medya tercihi artık özel TLS denemesinden önce uygulanır. Diğer istemcilerin varsayılanı, sertifika doğrulaması, boyut sınırları ve iptal sahipliği korunur.
- 1.9.2 yalnız üç modülü değiştirir: ağ metin istemcisi, medya taşıma sırası ve seçilen bölümün katalogdan oynatıcıya aktarımı. Eklenti 1.0.6 bu çekirdeği gerektirir.

## İlgili kontroller

11 dar kapsamlı kontrol geçti: gerçek TV HTML örneklerinden başlık/afiş ve dokuz bölüm sırası; etkin JW kaynağı; ayrı iptal sahipliği; imza/ES5; platform taşımasının isteğe bağlı oluşu; XHR önceliği ve yedekleri; açık bölüm seçimi; yalnız üç modülün değişmesi ve WGT'nin korunması.

## Gerçek TV kabul durumu

Önceki turda açılan 1. bölüm yaklaşık iki saniyede takıldı; kullanıcı görüntü/ses sorunu bildirdi. Bu tur 8. bölüm başarısı olarak sayılmaz. Daha sonraki doğrudan 8. bölüm denemesi manifest 403 nedeniyle başarısız oldu. Ham başarısız kayıtlar korunur.

1.9.2 / 1.0.6 paketinin gerçek TV kurulumu ve doğru 8. bölümün kesintisiz oynatma kabulü henüz tamamlanmadı. Sonuç geldiğinde ayrı kaydedilecek. Duyulan ses, senkron ve fiziksel kumanda bu otomatik kontrollerle doğrulanmış sayılmaz.

## Paket sınırı

WGT SHA-256: `3d2fd810f6b39c43065b7a5c4ae74a750c16457642ff53450feeb7b22e6963f7`. WGT/native ikililer değiştirilmez, uygulama kaldırılmaz, kullanıcı kayıtları temizlenmez. GitHub normal bileşen/site güncellemesi dışında Release ve Apps2Samsung değişikliği yapılmaz. Geçici tokenlar ve özel anahtarlar yayımlanmaz.
