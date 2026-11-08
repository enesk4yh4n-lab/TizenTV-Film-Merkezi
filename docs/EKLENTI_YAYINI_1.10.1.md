# Eklenti yayını — çekirdek 1.10.1 / SDK 1.1.0

Tarih: 9 Kasım 2026. WGT 1.6.0 değişmez; P001–P022 isteğe bağlı çevrim içi paketlerdir, her biri 1.0.0 sürümündedir. Kullanım açıklaması desteklenen web/video sayfaları için eklenti tabanlı Tizen erişimi olarak düzenlendi. Genel amaçlı tarayıcı veya bütün sitelerde çalışma garantisi verilmez.

## İlgili doğrulamalar

| Kontrol | Sonuç |
|---|---|
| Çekirdek işaretçisi, manifest ve dosya özetleri/imzaları | Geçti |
| 22 paket ve ağ izinlerinin RSA/SHA-256 doğrulaması | Geçti |
| Paket adları/yolları ve görünen sağlayıcı adları P001–P022 | Geçti |
| Yeni runtime dosyalarının ES5 ayrıştırması | Geçti; mevcut vendor/üretilmiş YouTube kodu yeniden düzenlenmedi |
| Boş WGT açılışı, zorunlu site seçimi olmaması | Geçti |
| 22 yeni paket bildirimi; otomatik kod indirilmemesi | Geçti |
| Bildirimde odak korunması, Geri ile kapatma | Geçti |
| Gerçek yükleyiciyle çekirdek + 22 paket kurulumu | Geçti; Playwright, TV API/dosya sistemi mock'u |
| Kurulumdan sonra yeniden açılışta 22 kayıt | Geçti |
| SDK ZIP'inden uygulama dışında örnek üretme ve imzalama | Geçti |
| Modern runtime JS, değişmiş sabit sürüm ve yol dışına çıkma reddi | Geçti |

İlk tarayıcı denemelerinde test seçicisi depo kimliğini yanlış varsaydığı ve test yeniden kullanım onayını beklemeden kayıt sayısını ölçtüğü için kontroller durdu. Testler düzeltildi; ürün kodunda bunlara yönelik değişiklik yapılmadı. Son turda yakalanmamış sayfa istisnası yoktu.

- 22 eklenti toplamı: **330.537 bayt**; 8 MiB alan sınırının altında.
- Ortak ağ izinleri: **117 köken**; 128 sınırının altında. Yeni sağlayıcı eklenirken kalan izin alanı tekrar ölçülmelidir.
- SDK: **10 dosya, 14.618 bayt ZIP**. Tek npm bağımlılığı Acorn 8.15.0; ZIP bağımlılık klasörü veya özel anahtar içermez.
- TR/EN yeni kullanım metni: **2026-11-09.1**. Çekirdek güncellemesinden sonra kullanıcıdan yeniden onay istenir.
- TLS sertifika/hostname doğrulaması kapatılmadı. Gerçek bağlantı adresleri ve zorunlu telif bildirimleri korundu.

## Paket özetleri

İmzasız WGT 1.6.0:

    2eea193e06feec8803efda44369a94684989ba5b3ed02175cad59589d0aab820

SDK 1.1.0:

    2fbac8ec139d037eea2b6a1052f232a269f40c33162e85864ee48a2aea7a44a3

## Doğrulanmayanlar ve kullanım

Bu turda canlı katalog/medya sunucuları kasıtlı olarak 503 fixture yanıtıyla yalıtıldı. Kontrol, yükleyici ve paketlerin birlikte kayıt olması içindir; 22 sitenin tüm katalogları, video kaynakları, TV sesi/senkronu veya fiziksel kumanda yeniden doğrulanmış sayılmaz. Önceki kaynaklarda erişim engeli veya yapı değişikliği yaşanabilir.

Kullanıcı Güncelleme Merkezi'nden istediği eklentileri seçer. WGT yeniden kurulmaz. Eklenti yazmak isteyenler [SDK rehberini](../SDK/README.md) kullanabilir; kendi yayıncı anahtarları ve kendi HTTPS depolarıyla dağıtım yapabilirler. Kaynak izinleri, imza denetimleri ve içerik erişim hakları korunmalıdır.

Uygulama eklentileri güvenlik sandbox'ında çalıştırmaz. Paket imzası yayıncı bütünlüğünü doğrular; kodun güvenli veya tüm kaynakların çalışır olduğunu garanti etmez. Özel anahtarlar, cihaz sertifikaları ve QA kayıtları yayımlanan dosyalara dahil değildir.
