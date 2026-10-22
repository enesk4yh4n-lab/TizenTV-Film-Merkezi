# Uyumluluk ve test sınırları

22 Ekim 2026 · sürüm 0.4.6.

**Tizen 3.0 gerçek TV’de sorunsuz günlük kullanım bildirimi alınmıştır.** Cihaz:
Samsung UE55MU7500, yazılım 1410. Bildirim kullanıcı deneyimidir; tüm kaynaklarda
uzun süreli test, her codec ve her fiziksel kumanda senaryosunun sertifikasyonu değildir.

| Ortam | Sonuç | Kanıt / sınır |
|---|---|---|
| Tizen 3.0 / gerçek Samsung TV | Kullanıcı günlük kullanımda sorun bildirmedi | UE55MU7500, yazılım 1410; temel sürüm 0.4.6 |
| Tizen 3.0 / emülatör, temel sürüm | 5 dk 32 sn tur; 43 kontrol, sıfır kaydedilmiş hata | Önceki özel derleme; genel paket sonucu ayrı satırdadır |
| Tizen 3.0 / emülatör, genel paket | Katalog, Mayday ve Phony oynatma/kontrol kontrolleri geçti | 56,978 sn kısa tur; 8 kontrol, sıfır hata; dağıtım kaynağının geçici imzalı test kopyası |
| Tizen-sim / Tizen 10.0 ortamı | Kullanıcı uygulamanın açıldığını bildirdi | Yalnız açılış; ayrıntılı oynatma, ses, ağ ve kumanda testleri yapılmadı |
| Tizen 10.0 / Samsung TV emülatörü | Sertifika aşamasında engellendi; uygulama çalışması doğrulanamadı | Emülatör açıldı, SDB bağlantısı kuruldu; kurulum mevcut yerel Tizen test sertifikasını reddetti |
| Tizen 4.0, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0 | Denenmedi | SDK klasörünün bulunması emülatör testi değildir |
| Diğer gerçek TV modelleri | Denenmedi | Model başına görüntü, ses ve kumanda sonucu gerekir |

Genel paket; kişisel kimlik, iletişim ve imza bilgilerinin çıkarıldığı ayrı dağıtımdır.
TV bildirimi temel sürüme aittir; genel WGT'nin ayrıca fiziksel TV'de denenmiş olduğu
iddia edilmez. İmzalama ve uygulama kimliği değişikliği kurulum/kayıt davranışını etkileyebilir.

Genel paket kısa turunda iki içeriğin medya saati 11 sn üzerinde ilerledi; native
ağ yolu kullanıldı. H.264/AAC bilgileri alındı. Duraklatma, Durdur/Vazgeç ve
Geri/Kaydet ve çık kontrol edildi. Bu kısa tur uzun oynatma, fiziksel TV sesi veya
fiziksel Smart Remote kabulü değildir. [Temiz dağıtım doğrulaması](DOGRULAMA.json).

Yalnız uygulamanın açılması veya manifest alınması video/ses oynatıldığını kanıtlamaz.
Emülatör sonucu fiziksel TV sonucu yerine geçmez. Önceki uzun emülatör turlarında
aralıklı durma/zaman aşımı görüldüğünden bütün donmaların kesin çözüldüğü ileri sürülmez.

## Tizen-sim / Tizen 10.0 açılış bildirimi

Kullanıcı, uygulamayı tizen-sim üzerinde Tizen 10.0 ortamında açabildiğini bildirdi.
Yalnız uygulama açılışı doğrulanmış kullanıcı bildirimidir; ayrıntılı test yapılmadı.
Kullanılan tizen-sim sürümü/ayrıntılı yapılandırması bildirilmedi. Bu kayıt, aşağıdaki
Samsung TV emülatörünün sertifika denemesinden ayrı tutulur; gerçek TV uyumluluğu,
native API, HLS ağ erişimi, görüntü/ses ve kumanda desteği sonucu çıkarılmaz.

## Samsung TV 10.0 emülatörü denemesinin ayrıntısı

Resmî 10.0.6 TV imajı ve Linux TV emülatör bileşenleriyle WSL/KVM üzerinde ayrı
bir VM açıldı. İmzalama için geçici test kopyası kullanıldı; dağıtılan imzasız WGT'ye
sertifika eklenmedi. İmza zinciri kontrolü `Invalid certificate chain` hatasıyla
kurulumu reddetti; dolayısıyla katalog/oynatma/kumanda testine geçilemedi.

[Samsung'un uygulama kurulum politikası](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-emulator/application-install-policy.html),
TV Extension 7.0.1 ve sonrasında Samsung sertifikası gerektiğini belirtir. Bu
ortamda uygun Samsung profili sağlanmadığından güvenlik kontrolü değiştirilmedi.
Bu sonuç “10.0 uyumsuz” veya “10.0 sorunsuz” diye yorumlanamaz.
