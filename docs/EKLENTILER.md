# Eklenti ve güncelleme haritası

Film Merkezi, desteklenen web/video sayfalarını eklentiler aracılığıyla Tizen'e uygun bir arayüzde sunar. Desteklenmeyen her siteyi kendiliğinden açan bir tarayıcı değildir.

    uygulama/                          WGT 1.6.0'ın sitesi olmayan kaynak seti
    github-eklenti/
      update.json, update.sig           İmzalı çekirdek sürüm işaretçisi
      versions/1.10.0/                  Başlangıç seti
      versions/1.10.1/                  Yeni kullanım bilgilendirmesi (TR/EN)
      sites/
        repository.json, repository.sig
        packages/
          p001/1.0.0/                  P001 bağımsız paket
            manifest.json, manifest.sig
            runtime/site.js
            runtime/LICENSE.txt
            runtime/network-policy.txt
            runtime/network-policy.signature.txt
          ...
          p022/1.0.0/                  P022 bağımsız paket
    SDK/                               Geliştirici aracı ve örnek
    kaynak/ortak/ag/native/             Native/TLS ve CA kaynakları

P001–P022 **1.0.0** sürümüyle yayımlanır. Teknik site kimlikleri/önekleri eski izleme kimliklerini korur; dosya yolları ve görünen paket/sağlayıcı adları kod kullanır. Gerçek alan adları olmadan ağ bağlantısı kurulamayacağı için bunlar manifestlerde ve kodda kalır. Lisans/telif adları değiştirilmez.

Kurulum: **Seçenekler → Güncelleme Merkezi → Kontrol et**. Yeni eklentiler varsayılan seçili değildir. Seçilenler indirilir, imzaları ve özetleri doğrulanır; yeniden açılışta tutarlı set etkinleşir. Aktif/pasif seçimi Katalog ve siteler bölümündedir. Kurma, kaldırma ve önceki sürüme dönüş Güncelleme Merkezi'nden yönetilir.

Kendi deponuz için [SDK](../SDK/README.md) ile bağımsız yayıncı anahtarı üretin. Yayın klasörüne yalnız üretilen indeks, imzalar ve paketler konur. Özel anahtar depo dışında tutulur. Kullanıcı depo adresi ve yayıncı güvenini kendisi seçer. Eklentiler sandbox içinde değildir; imzalı olması içeriğin güvenilir veya bütün sayfalarda çalışır olduğunu tek başına kanıtlamaz.

Bu yayın WGT güncellemesi gerektirmez: 1.6.0 WGT'nin SHA-256 değeri değişmez. Yeni kullanım açıklaması çevrim içi 1.10.1 çekirdeğiyle gelir; bilgilendirme sürümü değiştiğinden yeniden onay istenir. Site paketlerinin kurulması tüm canlı adreslerde oynatma başarısı anlamına gelmez.
