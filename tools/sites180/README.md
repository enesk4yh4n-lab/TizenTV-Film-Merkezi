# 1.8.0 site paketi çalışma araçları

`inventory.cjs`: sabit 40 bağlantı ve 22 site envanteri. `cases.json` yalnız halka açık sayfa adreslerini tutar; tokenlı medya adresleri burada tutulmaz.

`capture.cjs`, `grab.cjs`: TLS doğrulaması açık, iki eşzamanlı istekle gerçek yanıt toplama. Ham yanıtlar ve tokenlı adresler yalnız `tools/test-results/sites180/` altında geliştirme verisidir; yayımlanmaz ve WGT'ye girmez.

`new-sites.cjs`: yeni sekiz sitenin kanonik ES5 adaptörlerini üretir. Seçiciler gerçek yakalanmış sayfalardan alınır. `build-core.cjs`: 1.7.0 tabanından iki yerleşik siteli imzalı 1.8.0 çekirdeği üretir. `build-packages.cjs`: 20 bağımsız paketi üretir; anahtar yalnız kullanıcı hesabının depo dışı alanında tutulur.

`lab.cjs`, `catalog-check.cjs`, `tests.cjs`: sayfa betiklerini çalıştırmadan katalog ve kaynak veri biçimleri. `first-package.cjs`, `all-packages.cjs`, `lifecycle.cjs`: imzalı yükleyici, 22 site, bağımsız güncelleme/geri dönüş/kaldırma/yeniden kurma. Lifecycle'ın 1.0.1 paketi yalnız QA fixture'ıdır; gerçek depoya yayımlanmaz.

`probe-all.cjs [case-XX ...]`, `probe-new.cjs`: uygulamanın gerçek çözümleyicilerini bilgisayar ağında çalıştırır; sonuçlar TV oynatma kabulü değildir. `media-check.cjs`: HLS ana/alt playlist, anahtar ve medya parçası; MP4 için kısmi Range erişimi. Kısmi parça erişimi decoder hazırlığı veya tam oynatma olarak gösterilmez.

`origins.cjs`: gerçek/historik fixture ve decoder ailelerinden imzalı köken envanteri. `tls.cjs`: WGT native modülünün CA kaynak dosyasıyla bilgisayarda hostname/SNI/zincir kontrolü; gerçek Tizen native testi ayrıca gerekir. `verify.cjs`: imza, ES5, dosya/boyut özetleri, 8 MiB/128 köken ve değişmeyen WGT denetimi.

İlgili testler: `node --test tools/sites180/tests.cjs tools/hdf-series132.test.cjs tools/filmizlebabam-host.test.cjs tools/ddizi.test.cjs tools/multisite0140.test.cjs tools/plugins/numeric-origins.test.cjs`.
