# Film Merkezi güncellemeleri

Etkin kanal `updates/update.json`, çekirdek sürümü **1.9.0**, minimum WGT **1.5.0**.
`versions/<sürüm>/` altındaki imzalı tam setler yayımlandıktan sonra değişmez. TV, aynı açılışta yalnız bir set kullanır; WGT'nin içindeki güncel çekirdek çevrimdışı başlangıç setidir.

HDFilmCehennemi ve Filmci Baba dahil **22 sitenin tamamı**, `addons/sites/repository.json` üzerinden ayrı güncellenir. Son imzalı site paketleri WGT'de `bundled/sites/` altında da bulunur; ilk açılışta indirme veya site seçimi zorunluluğu yoktur. Çekirdek setinin sabit sağlayıcı listesi boştur; siteler aynı eklenti yükleyicisinden kaydolur. WGT kopyası değişmez yedektir, çevrimiçi güncelleme etkin paket kaydının yerini alır.

Uygulama her açılışta çekirdeği ve etkin eklenti depolarını denetler. **Güncelleme Merkezi → Kontrol et** aynı birleşik denetimi elle başlatır. İndirme, yeni site ekleme ve yeniden açılış kullanıcı seçimiyle yapılır. Depoların imzaları ve TLS doğrulaması korunur.

`pilot/` yalnız eski WGT'ler için dondurulmuş uyumluluk arşividir; etkin yayın adresi değildir. Eski dosyalar ve imzalar değiştirilmez. Yerel özel anahtar klasöründeki tarihsel `pilot` adı da yayın kanalını belirlemez.

Üretim ve test komutları: [tools/updates/README.md](../tools/updates/README.md). Bu yayın genel GitHub Release veya Apps2Samsung kaydını güncellemez.
