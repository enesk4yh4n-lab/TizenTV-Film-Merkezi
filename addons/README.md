# Film Merkezi — bağımsız site eklentileri

Güncel deneme **Film Merkezi Update Test 1.4.1** uygulamasıdır. HDF video parçaları native TLS üzerinden alınır; katalog HTML erişiminin çalışan taşıma yolu korunur. Ana 14 siteli Film Merkezi 1.2.0 ve Apps2Samsung kaydı bu denemeden etkilenmez.

**Güncel bileşen 1.5.0:** Site yönetimi ve ayrı uygulama/site güncelleme ekranları eklendi. Önceki HDF bölüm düzeltmesi ve sekiz kategorili ayarlar korunur. WGT 1.4.1 kuruluysa yeni WGT gerekmez: **Seçenekler → Oynatma ve kaynaklar → Güncellemeler / Güncelleme merkezi** üzerinden indirin ve uygulayın. Daha eski düz menüde Güncellemeler doğrudan Seçenekler altındadır.

- [İmzasız test WGT’sini indir](app/Film-Merkezi-Update-Test-1.4.1-public.wgt). Apps2Samsung gibi bir kurucu bunu TV’ye uygun sertifikayla imzalamalıdır; dosya doğrudan her TV’ye kurulabilen evrensel imzalı paket değildir.
- [Eklenti geliştirme SDK’sı 1.0.2](sdk/Film-Merkezi-Plugin-SDK-1.0.2.zip).
- [Geliştirici kılavuzu, dosya haritası ve sınırlar](DEVELOPER.md).
- [Native TLS ve decoder üretim kaynakları / lisansları](../updates/pilot/sources/Film-Merkezi-Update-Test-Kaynak-1.4.1.zip).

1.4.1, dönen CDN numaraları için dar kapsamlı `https://*.cdnimages{n}.cyou` izinlerini destekler. `{n}` yalnız 1–6 rakam eşler; genel `.cyou` izni verilmez. TLS, yayıncı imzası ve 8/12 MiB medya sınırları korunur. Bu yeni native yetenek için WGT bir kez güncellenmelidir. Sayısal izin kullanan eklentiler minimum uygulama sürümünü 1.4.1 bildirmelidir.

## Kullanım

**Seçenekler → Katalog ve siteler → Site yönetimi → Yeni site eklentisi kur → Depo ekle → Adresi düzenle → Depoyu incele → Yayıncıya güven → Eklentilere gözat → Yükle → Uygula ve yeniden aç.**

Site yönetimi; kurulu sürümü, hazır güncellemeyi, etkin/kapalı durumunu ve önceki sürüme dönüşü gösterir. Güncelleme merkezinde **Uygulama / çekirdek** ve **Site eklentileri** ayrı seçilir. Site kontrolü yalnız depo bilgilerini alır; kod indirme kullanıcı seçimiyle yapılır. HDF ve Filmizle şimdilik yerleşik olarak işaretlidir; bağımsız pakete taşıma sonraki aşamadır. Kalan 12 site bu sürümde eklenmedi. Kararlı dağıtım ve Apps2Samsung kaydı bu pilot değişikliğine dahil değildir.

Bir kez bu WGT kurulduktan sonra uyumlu site eklentileri kendi yayıncısının deposundan yüklenebilir ve güncellenebilir. Film Merkezi yayın anahtarı veya onayı gerekmez. Yayıncı SDK ile ücretsiz olarak kendi anahtarını üretir. Kullanıcı ilk eklemede anahtar parmak izini görür ve yayıncıya güvenmeyi seçer. TLS doğrulaması devam eder.

Örnek depolar farklı yayıncı anahtarları kullanır; gerçek film sitesi yerine açıkça test yayını kataloğu sunarlar:

```text
https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/addons/examples/a/repository.json
https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/addons/examples/b/repository.json
```

Kendi deponuz `https://sunucu/yol/repository.json` biçiminde olabilir. GitHub `blob` bağlantısı da kabul edilir. Kullanıcı birden fazla depo ekleyebilir; adres değiştirme, kapatma, kaldırma ve önceki eklenti sürümüne dönme işlemleri vardır. Başka bir yayıncı anahtarına sessiz geçiş yapılmaz.

## Kapsam

Eklentiler uygulamayla aynı JavaScript yetkilerini kullanır; ayrı klasörler sandbox sağlamaz. Native ikili, CSP ve uygulama izinleri eklentiyle değişmez; bu değişiklikler yeni WGT gerektirir. API v1 uyumlu ES5 provider/resolver kodu gerekir. Standart bir web sitesinin adresini eklemek, o site için otomatik çözümleyici üretmez.

Tizen 3 emülatöründeki sonuçlar fiziksel TV sesi veya kumandası için kabul sayılmaz. Bu test uygulamasının 8/9/10 uyumluluğu ayrıca doğrulanmalıdır.
