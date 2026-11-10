# Film Merkezi

Samsung Tizen TV’ler için ücretsiz ve açık kaynaklı bir **medya merkezi**. Desteklenen web kaynaklarının katalog ve videolarını TV kumandasına uygun bir arayüzde sunar.

## Özellikler

- Ortak arama, filtreleme ve içerik birleştirme.
- Listem, kaldığın yerden devam ve bölüm takibi.
- HTML5/hls.js ve Samsung AVPlay; kalite, ses ve altyazı seçenekleri.
- Türkçe/İngilizce arayüz, uygulama içi güncellemeler ve isteğe bağlı hata bildirimi.

## Kurulum

[1.9.1 WGT paketini](Film-Merkezi-TV-1.9.1-public.wgt) Apps2Samsung ile TV’nize kurabilirsiniz. Kullanım sırasında bilgisayar veya yerel sunucu gerekmez. Bu sürüm için ayrı Release veya Apps2Samsung katalog güncellemesi yapılmadı.

İlk kurulumda dil ve birleştirme tercihi, kullanım bilgilendirmesi ve depo seçimi bulunur. Hazır site veya önceden seçili depo gelmez; depo eklemeden devam edebilirsiniz. [Eklenti SDK 1.3.0](SDK/README.md) kullanılabilir; ayrı grafik arayüz henüz yayımlanmamıştır.

## Depo bulma

**Güncelleme Merkezi → Eklenti depoları → GitHub’da depo ara** yolundan depo adı veya GitHub kullanıcı adıyla arayın. Seçtiğiniz depo doğrulandıktan sonra **Ekle** deyin. Doğrudan HTTPS adresi ekleme de kullanılabilir.

Depo dosyasının adı **filmmerkezi-repository.json** olmalıdır. SDK, GitHub aramasında bulunabilmesi için README açıklamasını ve dosya yolunu otomatik hazırlar. Eski dosya adı desteklenmez. Arama sonucunda görünmek bir güvenilirlik veya içerik onayı değildir.

<!-- film-merkezi-repository: github-eklenti/sites/filmmerkezi-repository.json -->

Tizen 3.0 hedeflenerek geliştirilmiştir. Uyumluluk TV modeline ve kaynağa bağlıdır. Genel amaçlı bir web tarayıcısı değildir; harici sitelerdeki değişiklikler çalışmasını etkileyebilir. Yetişkin içeriklerini göstermemeye yönelik filtreleme bulunur.

## Lisans ve teşekkürler

Proje [MIT lisanslıdır](uygulama/LICENSE). Üçüncü taraf bileşenler kendi lisanslarına tabidir; katkı sağlayan geliştiricilere ve Apps2Samsung ekibine teşekkür ederiz. [Lisanslar ve teşekkürler](uygulama/THIRD_PARTY_NOTICES.md).

**İletişim:** destekfilmmerkezi@gmail.com
