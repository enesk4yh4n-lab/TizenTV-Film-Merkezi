# TRDizi erişimi — çekirdek 1.9.1 / site paketi 1.0.5

8 Kasım 2026. WGT 1.5.0 ve native ikililer değiştirilmez.

## Neden

Aynı gerçek Samsung Tizen 3 TV'de özel MbedTLS taşıması TRDizi'den HTTP 403 alırken, TV'nin kendi Download servisi aynı HTTPS adreslerini alıyor. 403 sayfası Cloudflare `Just a moment` yanıtıdır; TLS doğrulama hatası değildir. Sertifika/hostname doğrulaması kapatılmadı, proxy veya PC çalışma bağımlılığı eklenmedi.

Önceki yalnız özel-TLS ölçümü bu site için eksikti: TV Download karşılaştırması ana sayfa, arama, bölüm, gerçek dizi sayfası ve oynatıcı wrapper'ında başarılı oldu. Public WordPress REST alt uçları da 403 verdi; bu yol kullanılmadı. Site betikleri uygulamada çalıştırılmaz.

## Değişiklik

- İmzalı çekirdek manifestindeki mevcut `legacyTextOrigins` listesine yalnız TRDizi eklendi; HDF tercihi korundu. Bu liste özel TLS istemcisini metin isteklerinde seçmez; TV'nin HTTPS doğrulaması açık Download/XHR yolunu kullanır. Medya CDN izinleri veya motorlar değiştirilmez.
- TRDizi sağlayıcısı ve wrapper istekleri Native Download önceliğiyle, her istekte ayrı iptal sahibiyle açılır.
- Kartta tarih ve dil rozeti yerine `.bolum-alt` başlığı ile gerçek afiş seçilir. Daha önce yanlış seçicilerle oluşturulmuş katalog yanıtları yeni önbellek kapsamından tekrar alınır; içerik kimlikleri ve kullanıcı kayıtları değişmez.
- Dizi sayfasının gerçek `.custom-scrollbar .bolumust` alanı okunur. Kategori adresindeki `son-bolum-izle` sunum eki nedeniyle bölüm sırasının boş kalması düzeltilir; hayali bölüm üretilmez.
- Yükleyici/site sözleşmesi, uygulama kimliği, WGT ve TLS doğrulaması aynı kalır. Çekirdek 1.9.1 ile TRDizi 1.0.5 birlikte güncellenir.

## İlgili denetimler

Altı yeni kontrol geçti: gerçek TV home/search yanıtları; dokuz bölümün sırası ve parent bağlantısı; etkin JW kaynağı; native tercih ve iptal; yalnız izinli çekirdek farkı; imzalı ES5 eklenti.
Paylaşılan ayrıştırıcı için beş ilgili gerileme grubu geçti: altı gerçek TRDizi wrapper biçimi, tek alt playlist seçimi, yedi diğer sağlayıcı ana sayfası, dizi sayfaları ve iptal/geç yanıt.

TV'deki ilk ağ karşılaştırması: home 1.150 ms, search 2.226 ms, Tuzlu Kahve 8 sayfası 992 ms, gerçek dizi sayfası 832 ms, wrapper 5.091 ms. Bunlar tek tur ölçümleridir; performans garantisi değildir. Özel TLS yolundaki 403 başarı olarak sayılmadı.

Canlı güncelleme sonrası katalog/arama/detay ve oynatma sonuçları ayrıca tamamlandığında bu rapora eklenir. Duyulan ses, senkron ve fiziksel kumanda kullanıcı onayı olmadan doğrulanmış sayılmaz. Yerel ham kanıtlar ve örnek yanıtlar `tools/test-results/trdizi104/` altındadır; WGT'ye girmez.
