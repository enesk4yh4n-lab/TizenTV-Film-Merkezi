# Film Merkezi dağıtımı

WGT **1.6.0**, içindeki başlangıç çekirdeği **1.10.0**. WGT sitesi olmayan erişim/oynatma kabuğudur; uygulama/ tam paket kaynağıdır. Çevrim içi çekirdek **1.10.1** ve isteğe bağlı P001–P022 paketleri github-eklenti/ altında sunulur. Bunlar WGT'nin içine eklenmez.

Desteklenen sayfalar, kullanıcı tarafından kurulan eklentilerle Tizen'e uyarlanır. Uygulama genel amaçlı bir web tarayıcısı değildir. Eklenti geliştirmek ve kendi deponuzdan yayımlamak için [SDK rehberine](../../SDK/README.md) bakın. Gerçek adresler kod/izinlerde, zorunlu telif bildirimleri lisanslarda korunur.

Genel kaynaktan imzasız paket hazırlamak:

    python tools/distribution/package.py

Üretim dosyaları açık izin listesiyle seçilir. SDK, testler, özel anahtarlar ve cihaz sertifikaları WGT'ye alınmaz. İmzalı cihaz paketi için mevcut uygulama/tizen_web_project.yaml projesini kendi Tizen SDK profilinizle derleyin. Yayımlanan public WGT imzasızdır; kurulum aracı/kişi kendi TV'sine uygun sertifikalarla imzalar.

Native kaynaklar kaynak/ortak/ag/native/ altındadır. Pepper 47 SDK ve hazırlanmış Mbed TLS 3.6.7 kütüphaneleriyle tools/build-native-http.py --source kaynak/ortak/ag/native/secure-http.cpp --out uygulama/ortak/ag/native kullanılır. Mozilla CA girdisi, MPL-2.0, Apache-2.0 ve diğer zorunlu bildirimler korunur. TLS doğrulaması kapatılmaz.

Güncelleme bilgisi açılışta denetlenir; indirme/kurulum kullanıcı seçimiyle olur. Yeni eklentiler işaretli başlamaz. İnternet yoksa boş ana sayfa açılabilir; katalog ve medya erişiminin çalıştığı varsayılmaz.
