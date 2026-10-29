# Paket dışı üretim kaynakları

Bu klasör TV'de yüklenmez ve WGT'ye alınmaz. Paketlemede aynı sürümdeki `Film-Merkezi-Kaynak-<sürüm>.zip` arşivine, lisanslar ve native bildirimlerinin kopyalarıyla birlikte konur. WGT dağıtılırken bu kaynak arşivini de yanında bulundurun.

`siteler/hdfilmcehennemi/decoder-kaynak/src/` içindeki üç MIT kaynak dosyası gereklidir: `tools/build.ps1` bunlardan paketlenen `siteler/hdfilmcehennemi/decoder.js` ve `cozumleyiciler/literal-media.js` dosyalarını üretir. Kanonik kaynaklar silinmez; TV yalnız üretilmiş dosyaları kullanır.

`ortak/ag/native/` içindeki C++/header/PEM dosyaları native HTTPS modülünü yeniden derlemek içindir. Mozilla CA verisi NEXE dosyalarına gömülüdür; TV ayrı PEM/header dosyası yüklemez. `build-hashes.json` kaynakları ve paketlenen üç ikiliyi doğrulamak için geliştirme makinesinde kullanılır. `README.md` derleme notudur.

Çalışma zamanı modülü `deneme/ortak/ag/native/` altında kalır: `https-arm.nexe`, `https-x86-32.nexe`, `https-x86-64.nexe`, `secure-http.nmf` ve `notices/` klasörünün tamamı. MPL-2.0, Apache-2.0, Chromium ve SDK bildirimleri bu klasörde korunur; `deneme/THIRD_PARTY_NOTICES.md` kaynak konumlarını açıklar.

TLS kütüphanelerini üretmek için `tools/build-native-tls.py`, native ikilileri üretmek için `tools/build-native-http.py` kullanılır. Her iki araç bu kaynak klasörünü okur; normal WGT paketlemesi mevcut doğrulanmış ikilileri kullanır.
