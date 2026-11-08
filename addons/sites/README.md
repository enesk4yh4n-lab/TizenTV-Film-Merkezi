# Film Merkezi site eklentileri

Bu imzalı depo **22 bağımsız site paketi** sunar. HDFilmCehennemi ve Filmci Baba (Filmizle.ink) da çevrimiçi eklentidir; WGT'de yerleşik sağlayıcı yoktur. Güncelleme Merkezi üzerinden kurulabilir, güncellenebilir, kapatılabilir, kaldırılabilir veya önceki sürüme dönülebilir.

Güncel normal başlangıç: **WGT 1.5.0 + çekirdek 1.9.0**. Yeni HDF/Filmci Baba ve Diziyou/Diziboxum 1.0.2 bu WGT'yi ister. Önceden yayımlanmış diğer paketlerin minimum sürümü ve eski dosyaları korunur. Son 22 paket WGT içinde de vardır; ilk açılışta ayrıca indirilmez. Sonraki güncellemeler ve yeni site kurulumları kullanıcı onayına bağlıdır.

Depo adresi: `https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/addons/sites/repository.json`

Yayıncı parmak izi: `247fdf077b7d36c0d2ab3a909024308abda39adf9f5b34f1b66b5fe55cdf6ac4`.

Önce çekirdek güncellemesini uygulayın. Aynı site başka bir depoda kuruluysa farklı kimlikle ikinci kopyasını kurmayın. Film İzle Babam'ın adresi `https://filmizlebabam.icu`; eski site kimliği ve kayıt kapsamı korunur.

Paketin kurulabilmesi sitenin veya her kaynağının erişilebilir/oynatılabilir olduğu anlamına gelmez. Erişim engelleri, kaldırılmış yayınlar ve yetki gerektiren kaynaklar ayrı raporlanır. Bu kanal genel Release veya Apps2Samsung yayını değildir.

Kanonik kaynaklar `deneme/siteler/<site>/`, üretim projeleri `kaynak/site-eklentileri/<site>/`, üretici `tools/sites180/build-packages.cjs` içindedir. Üretici Plugin SDK ile ES5 doğrulaması, dosya özetleri, ağ izinleri ve RSA imzaları üretir. Özel anahtar dağıtıma girmez. Yayımlanan bir sürümün dosyaları değiştirilmez; düzeltmeler yeni eklenti sürümüyle yayımlanır. `--rebuild-draft` yalnız yayımlanmamış yerel taslak içindir.

MIT telif ve lisans metni her pakette `LICENSE.txt` olarak bulunur. Ortak CryptoJS/hls.js/native bileşenlerinin bildirimleri ana uygulamanın üçüncü taraf lisans ekranında korunur.
