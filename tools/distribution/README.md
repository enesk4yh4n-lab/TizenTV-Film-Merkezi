# Boş Film Merkezi dağıtımı

WGT 1.6.0 / çekirdek 1.10.0. Genel GitHub kaynağı `uygulama/`, imzalı güncelleme kanalı `github-eklenti/` dizinidir. WGT hiçbir site içermez. Site deposu başlangıçta boştur; yeni site yalnız proje sahibinin talimatıyla yayımlanır.

Yalnız yerelde tutulan sağlayıcı kaynakları `deneme/saglayicilar/p001`–`p022` altındadır. Bunlar genel GitHub ağacına aktarılmaz. Eski site/izleme kimlikleri dosya adları olarak kullanılmaz. Üçüncü taraf telif ve lisans bildirimleri korunur.

Genel kaynaktan imzasız paket hazırlamak:

```text
python tools/distribution/package.py
```

İmzalı cihaz paketi için mevcut `uygulama/tizen_web_project.yaml` projesi kendi Tizen SDK imzalama profilinizle SDK build runner üzerinden derlenir. Özel anahtarlar, sertifikalar ve QA kayıtları genel kaynakta bulunmaz. `Film-Merkezi-TV-1.6.0-public.wgt` geliştirici imzası içermez; kurulumu yapan araç/kişi cihazına uygun sertifikalarla imzalar.

Native kaynaklar `kaynak/ortak/ag/native/` altındadır. Pepper 47 SDK ve hazırlanmış Mbed TLS 3.6.7 kütüphaneleriyle `tools/build-native-http.py --source kaynak/ortak/ag/native/secure-http.cpp --out uygulama/ortak/ag/native` kullanılır. Mozilla CA girdisi ve MPL-2.0, Apache-2.0 ve diğer zorunlu bildirimler korunur. TLS doğrulamasını kapatmayın.

Uygulama açılışta yalnız güncelleme bilgisini denetler; kod kendiliğinden indirilmez. Güncelleme gelince seçim ekranı açılır; yeni siteler işaretli başlamaz. İnternet yoksa boş ana sayfa kullanılabilir, Güncelleme Merkezi'nden yeniden denetlenebilir.
