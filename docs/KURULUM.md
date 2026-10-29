# Apps2Samsung ile kurulum

1. TV ve telefon/bilgisayarı aynı yerel ağa bağlayın. TV'nin Apps ekranında geliştirici modunu açın; Host PC IP alanına kurulumu yapan telefon/bilgisayarın adresini yazın. Gerekirse TV'yi yeniden başlatın.
2. Apps2Samsung'u resmî deposundan kurun: https://github.com/Apps2Samsung/Apps2Samsung . TV'yi taratın veya yerel IP'sini girin.
3. Genel katalog başvurusu kabul edilene kadar Custom WGT/TPK üzerinden **Film-Merkezi-TV-1.0.0-public.wgt** seçin. Kaynak ZIP'i uygulama paketi değildir.
4. Apps2Samsung sertifika gerektiğinde Samsung hesabı girişi açar. Sertifikayı kullanıcının TV'sine göre oluşturur ve WGT'yi yeniden imzalar. Geçerli profil aynı TV'yi kapsıyorsa tekrar giriş gerekmeyebilir.
5. Kurulumdan sonra uygulamayı açın ve kullanım bilgilendirmesini okuyun. Normal kullanımda kurulum telefonu/bilgisayarı veya ek sunucu gerekmez.

Genel WGT imzasızdır; geliştiriciye ait özel anahtar, parola ve DUID listesi içermez. Samsung hesabı/parola/tokenları bu projenin issue'larına gönderilmez. Mevcut uygulamayı farklı author sertifikasıyla güncellemek engellenebilir; sertifika yenilemesini her seferinde zorlamayın. Kaldırma işlemi kayıtları silebilir.

Uygulama bazı yetişkin içerik sunabilen kaynaklar içerir. Başvuru `adult: true` olarak yapılır; Apps2Samsung'un 18+ filtresi kapalıyken görünmeyebilir. Kabul ve katalogya dağıtım zamanını Apps2Samsung yöneticileri belirler.
