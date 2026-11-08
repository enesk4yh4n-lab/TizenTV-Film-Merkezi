# Film Merkezi

Samsung Tizen için eklenti tabanlı web/video sayfası erişim ve oynatma arayüzü. Tizen'de doğrudan kullanılamayan sayfaların katalog ve video yapıları, kullanıcıların seçtiği uyumluluk eklentileriyle TV kumandasına uygun biçimde sunulur. **Eklenti yazılmamış her sayfayı açan genel amaçlı bir web tarayıcısı değildir.**

**Uygulama: 1.6.0 · Çevrim içi çekirdek: 1.10.1 · SDK: 1.1.0**

## Kullanım

1. [İmzasız WGT'yi indirin](Film-Merkezi-TV-1.6.0-public.wgt). Kurulum aracınızın paketi TV'nize yetkili sertifikalarla imzalaması gerekir. [SHA-256 özetleri](SHA256SUMS.txt).
2. Uygulama boş ana sayfayla başlar; WGT'nin içinde site eklentisi bulunmaz.
3. **Seçenekler → Güncelleme Merkezi** üzerinden çekirdek güncellemesini ve istediğiniz P001–P022 eklentilerini seçin. Açılış denetimi yalnız sürüm bilgisini alır; kod indirme ve kurulum kullanıcı seçimine bağlıdır.
4. Kendi uyumluluk eklentinizi veya güvendiğiniz başka bir yayıncının deposunu ekleyebilirsiniz. Yalnız güvendiğiniz kodu kurun; eklentiler JavaScript güvenlik sandbox'ında çalışmaz.

TV'nin çalışması için PC, proxy veya ek sunucu gerekmez. Çevrim dışıyken arayüz açılabilir; çevrim içi sayfa verileri ve videolar internet gerektirir. İşlevler ilgili eklentiye, sayfanın güncel yapısına, erişim koşullarına ve TV'nin medya desteğine bağlıdır. Hesap, DRM veya içerik erişim hakkı uygulama tarafından sağlanmaz.

## Eklentiler ve SDK

İsteğe bağlı **22 ayrı paket**, dosya/klasör ve görünen adlarında **P001–P022** kodlarını kullanır. Gerçek bağlantı adresleri ve eski kayıtlarla uyumlu teknik kimlikler kod/manifestlerde; zorunlu telif bildirimleri lisanslarda bulunur. Kodla adlandırma, bunları gizleme veya anonimleştirme garantisi değildir.

- [Eklenti SDK'sı ve geliştirme rehberi](SDK/README.md)
- [Bağımsız SDK ZIP'i](Film-Merkezi-SDK-1.1.0.zip)
- [Paket ve güncelleme düzeni](docs/EKLENTILER.md)
- [Bu yayının doğrulama raporu](docs/EKLENTI_YAYINI_1.10.1.md)

SDK ile kendi ES5 sayfa ayrıştırıcınızı, sağlayıcınızı ve video çözümleyicinizi yazabilir, kendi RSA anahtarınızla imzalayıp HTTPS deponuzdan dağıtabilirsiniz. Projenin özel anahtarı veya ücretli oynatıcı SDK'sı gerekmez. TV'ye depo eklenirken yayıncı güveni kullanıcı tarafından onaylanır.

## Güncelleme adresleri

- [Çekirdek: github-eklenti/update.json](github-eklenti/update.json)
- [Eklentiler: github-eklenti/sites/repository.json](github-eklenti/sites/repository.json)

Eski updates/ ve addons/ dağıtım yolları kullanılmaz. Çekirdek ile eklentiler ayrı sürümlenir. Mevcut 1.6.0 WGT değiştirilmeden yeni çekirdek ve eklentiler kurulabilir. TLS sertifika/hostname denetimi ve RSA/SHA-256 paket doğrulaması açıktır.

## Kaynak, lisanslar ve kapsam

- [WGT'nin tam kaynağı](uygulama/)
- [Çevrim içi çekirdek ve paket kaynakları](github-eklenti/)
- [Native TLS / Mozilla CA üretim kaynakları](kaynak/ortak/ag/native/)
- [Paketleme rehberi](tools/distribution/README.md)
- [Üçüncü taraf lisansları ve teşekkürler](THIRD_PARTY_NOTICES.md) · [MIT lisansı](LICENSE)

HTML5/hls.js ve Samsung AVPlay ortak kontrollerle kullanılır. Chromium 47 / Tizen 3.0 hedefi korunur. Önceki fiziksel TV sonuçları yeni bir paketin veya tüm Tizen sürümlerinin eksiksiz doğrulandığı anlamına gelmez; bu yayının kapsamı ilgili raporda belirtilmiştir.

Katalogda yetişkin içerikleri göstermemeye yönelik filtreleme kullanılır. Film Merkezi yetişkin içerik kataloğu sunmayı amaçlamaz. Filtreleme bütün üçüncü taraf içeriklerini sınıflandırma garantisi değildir. Kullanıcı, eriştiği içerikler için geçerli kullanım ve erişim haklarına uymalıdır. Özel anahtarlar, cihaz sertifikaları ve QA günlükleri yayımlanmaz.
