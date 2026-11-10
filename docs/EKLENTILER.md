# Eklenti ve güncelleme haritası

WGT **1.9.1**, çekirdek **1.12.1**, SDK **1.3.0**. Hazır site deposu gelmez; kullanıcı arayıp seçer veya adresini ekler.

- Depo indeksi: `filmmerkezi-repository.json`; imzası: `filmmerkezi-repository.sig`.
- **Güncelleme Merkezi → Eklenti depoları → GitHub’da depo ara**: depo adı veya kullanıcı adıyla README araması.
- SDK, README keşif işaretini otomatik ekler. Alt klasör için `--github-root` kullanılır. [SDK](../SDK/README.md).
- Sonuç seçmek kurulum veya güven onayı değildir. Depo doğrulanınca **Ekle**, ardından istenen paketler seçilir.
- Çekirdek işaretçisi `github-eklenti/update.json` ve `update.sig` olarak kalır. Paketler ayrı sürümlenir; `packages/pNNN/sürüm/manifest.json` yolu değişmedi.
- İmzalar, dosya özetleri, TLS ve ağ bütçeleri korunur. Eklentiler uygulama yetkileriyle çalışır; arama sonucu veya imza içerik/erişim hakkı sağlamaz.

Eski depo dosyası adı desteklenmez; yeni WGT kurulmalıdır. Eski sürüm paket dosyaları tarihsel kayıt olarak korunur. [Sürüm notu](SURUM_1.9.1.md).
