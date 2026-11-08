# Film Merkezi 1.6.0 — boş dağıtım ve tarafsız dosya düzeni

9 Kasım 2026. Kullanıcının son kararıyla GitHub'daki bütün site kaynakları/paketleri kaldırılır; yerel site kaynakları korunur. Yeni siteler yeniden talimat verilene kadar yayımlanmaz.

## Düzen

- Yeni güncelleme adresi: `https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/github-eklenti/update.json`.
- Site deposu: aynı kökte `sites/repository.json`. İmzalı fakat **boş** (`plugins: []`).
- WGT: 1.6.0, çekirdek 1.10.0; hiçbir site kodu veya site paketi içermez. Başlangıç arayüzü ve player çevrimdışı da yüklenir. Paket yok diye zorunlu kurulum ekranı açılmaz.
- Gelecekte `p001` gibi tarafsız paket kimlikleri ve klasörler kullanılabilir. Yerel kaynaklar `deneme/saglayicilar/p001`–`p022` altına taşındı. Klasör adı dışındaki içerik adları, alan adları ve zorunlu telif bildirimlerini gizleme iddiası yoktur.
- Yeni genel uygulama kaynağı `uygulama/`, üretim ve MPL/CA kaynakları `kaynak/`, paketleme aracı `tools/distribution/` altındadır. Eski `updates/`, `addons/`, site kaynak klasörleri ve eski WGT/ZIP kopyaları GitHub'ın güncel ana dalından kaldırılır. Yerel tarihsel dosyalar silinmez.
- Yeni paket aynı uygulama kimliğini taşır. Kullanıcının kararı doğrultusunda eski kurulumların site paketleri ve eski güncelleme adresleriyle uyumluluk sağlama hedefi yoktur. Yeni WGT kurulmalıdır; eski kurulumu kaldırarak veri temizliği yapılmadı.

## İlgili doğrulamalar

Altı tarayıcı kontrolü geçti: sağlıklı boş ana sayfa, boş imzalı depoda otomatik denetim, menü/Güncelleme Merkezi erişimi, gelecekteki paket bildirimi/odak/Geri, açık onayla imzalı test eklentisinin kurulup yeniden açılması, ilk kurulumda çevrimdışı kullanılabilir boş ana sayfa. Testteki `p099` eklentisi yalnız yalıtılmış sunucuda kullanıldı; genel depoya konmadı.

WGT dosya listesi açık izin listesiyle sınırlandı. Public paket 129 dosya içerir, geliştirici imzaları yoktur. Yerel cihaz paketi 131 dosyadır. İmzalı paketin 261 XML imza referansı doğrulandı. Yeni native ikililer yalnız izinli GitHub yolunu değiştirir; CA girdisi, TLS hostname/sertifika doğrulaması, RSA imzaları ve kaynak köken izinleri korunur. Üç mimari (arm/x86-32/x86-64) derlendi.

SDK paket üretimi başarılı oldu; dış çıktı dizinini bulamayan wrapper için geçici yol uyumluluğu uygulandı, SDK dosyası sonrasında geri yüklendi. Üretilen WGT içeriği ve imzaları ayrıca bağımsız denetlendi. QA araçları WGT'ye alınmadı. Bu turda gerçek TV/emülatör oynatma kabulü yapılmadı; yeni paket site içermediğinden oynatma kaynağı yoktur.

## Yayın sınırı

Silme GitHub'daki güncel dosyalar ve eski Release indirme ekleri içindir; Git geçmişinin yeniden yazılması, tag silinmesi veya üçüncü taraf kopyaların kaldırılması değildir. Eski kurulumlara otomatik geçiş vaadi verilmez. Lisanslar ve özel imzalama anahtarları korunur; özel anahtarlar hiçbir genel dosyaya eklenmez.
