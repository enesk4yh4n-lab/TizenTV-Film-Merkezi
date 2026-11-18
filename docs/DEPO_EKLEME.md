# Film Merkezi — depo ve eklenti ekleme

[Ana sayfa](../README.md) · [TV’ye kurulum](KURULUM.md)

Depo, kurulabilecek site ve çözümleyici paketlerinin listesidir. Eklemek bütün paketlerini otomatik kurmaz. Yalnız güvendiğiniz yayıncıları ekleyin.

## 1. Depolar ekranını açın

İlk kurulumdaki **Depolar** ekranından veya boş ana sayfadaki **Depo ekle** düğmesinden başlayabilirsiniz. Sonradan erişmek için:

**Seçenekler → Güncelleme Merkezi → Depo ekle**

![Güncelleme Merkezi](gorseller/guncelleme-merkezi.png)

## 2. GitHub’da arayın

**GitHub’da depo ara** seçeneğini açın. **Arama metni · OK ile klavye** üzerinden depo adını yazıp **Ara** deyin. Kullanıcı adıyla aramak için arama türünü değiştirin.

![GitHub depo arama formu](gorseller/depo-arama.png)

**TizenTV-Film-Merkezi** ana deposu P002/R002 çiftini sunar. **Film-Merkezi-Eklentiler** deposu aynı çifti de içerir. Bir depodan kurduysanız paketi ikinci kez kurmanız gerekmez.

Sonuçtan depoyu seçin. Gösterilen ad/adresi kontrol edip güveniyorsanız **Ekle** deyin. Teknik ayrıntıları açmak zorunlu değildir. Arama sonucu bir içerik/yayıncı onayı değildir.

## 3. Aramayla bulamazsanız adres kullanın

**+ Adresle depo ekle → Adresi düzenle · OK ile klavye** yolundan GitHub depo bağlantısını veya doğrudan HTTPS indeks adresini girin. **Devam et** sonrasında inceleyip **Ekle** deyin.

![Adresle depo ekleme](gorseller/depo-adres.png)

WGT **2.0.3** ile güncel indeks adı **`filmmerkezi-repository.json`**. Eski `filmmerkezi201-repository.json` adresi kayıtlıysa önce WGT 2.0.3’e geçin. **Güncelleme Merkezi → Depolarım → Adresini değiştir** yolundan aynı deponun yeni HTTPS adresini girin. Uygulama, yayıncı anahtarı ve depo kimliği eşleştiğinde mevcut paket kayıtlarını korur.

- [Ana deponun HTTPS indeks adresi](https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/filmmerkezi-repository.json)
- [Eklentiler deposunun HTTPS indeks adresi](https://raw.githubusercontent.com/enesk4yh4n-lab/Film-Merkezi-Eklentiler/main/filmmerkezi-repository.json)

## 4. Paketi kurun

Eklenen depoda **Eklentilere gözat** deyin. Site paketini seçip **Kurulumu incele** üzerinden gerekli çözümleyicileri de içeren özeti okuyun ve paketleri yükleyin. Gerekli çözümleyici siteyle birlikte kurulum planına alınır.

İndirme/doğrulama tamamlanınca **Uygula ve yeniden aç** deyin. Yeniden açılışta kurulan etkin siteler katalogda kullanılabilir olur. Eklenti sürümünün uygulamanızla uyumlu olması gerekir.

## Güncelleme ve yönetim

- **Güncelleme Merkezi → Kontrol et:** Çekirdek ve etkin depoların eklenti güncellemelerini birlikte denetler. Bulunan güncellemeleri inceleyip yükleyin.
- **Depo adını değiştir:** Yalnız bu TV’de görünen adı değiştirir.
- **Depoyu kaldır:** O depodan kurulan eklentileri de kaldırır; Listem ve izleme kayıtlarını silmez.
- **Depo bulunamadı / GitHub sınırı:** Bekleyin veya yayıncıdan doğru HTTPS adresini alın.

*Görseller uygulamanın kendi arayüzünden, yalıtılmış Chromium ortamında alınmıştır. Görsellerde arama, ekleme veya kurulum sonucu canlandırılmamıştır.*
