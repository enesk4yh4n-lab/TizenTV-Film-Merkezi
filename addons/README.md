# Film Merkezi — bağımsız site eklentileri

Bu özellik **Film Merkezi Update Test 1.4.0** uygulamasındadır. Ana 14 siteli Film Merkezi 1.2.0 ve Apps2Samsung kaydı bu denemeden etkilenmez.

- [İmzasız test WGT’sini indir](app/Film-Merkezi-Update-Test-1.4.0-public.wgt). Apps2Samsung gibi bir kurucu bunu TV’ye uygun sertifikayla imzalamalıdır; dosya doğrudan her TV’ye kurulabilen evrensel imzalı paket değildir.
- [Eklenti geliştirme SDK’sı 1.0.1](sdk/Film-Merkezi-Plugin-SDK-1.0.1.zip).
- [Geliştirici kılavuzu, dosya haritası ve sınırlar](DEVELOPER.md).
- [Native TLS ve decoder üretim kaynakları / lisansları](../updates/pilot/sources/Film-Merkezi-Update-Test-Kaynak-1.4.0.zip).

## Kullanım

**Seçenekler → Eklenti depoları → Depo ekle → Adresi düzenle → Depoyu incele → Yayıncıya güven → Eklentilere gözat → Yükle → Uygula ve yeniden aç.**

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
