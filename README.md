# Film Merkezi

Samsung Tizen 3.0 ve üzeri için ES5 tabanlı medya uygulaması. **WGT 1.6.0 / çekirdek 1.10.0**. Bu dağıtım hiçbir film/dizi sitesi veya site eklentisi içermez.

- İlk kurulumda boş ana sayfa açılır; zorunlu site indirme ekranı yoktur.
- Güncelleme bilgisi açılışta otomatik denetlenir. Yeni paket varsa bildirim açılır; indirme ve kurulum kullanıcı seçimine bağlıdır.
- Site deposu şu an boştur. Yeni siteler ancak proje sahibinin sonraki talimatıyla eklenir.
- İnternet olmadığında arayüz, ayarlar ve yerel oynatıcı altyapısı açılır.
- TLS sertifika/hostname ve paket RSA imza doğrulaması açıktır. PC/proxy çalışma bağımlılığı yoktur.

## İndirme

[Film-Merkezi-TV-1.6.0-public.wgt](Film-Merkezi-TV-1.6.0-public.wgt) geliştirici imzası içermez. TV kurulum aracınızın cihazınıza uygun sertifikalarla imzalaması gerekir. [SHA-256](SHA256SUMS.txt). Eski uygulamaların çevrim içi geçişi bu dağıtımın kapsamında değildir; yeni WGT kurulmalıdır.

## Güncelleme adresleri

- Çekirdek: [github-eklenti/update.json](github-eklenti/update.json)
- İsteğe bağlı site deposu: [github-eklenti/sites/repository.json](github-eklenti/sites/repository.json)

`updates/`, `addons/` ve eski site kaynak/paketleri güncel ana daldan kaldırılmıştır. Yeni adresler `github-eklenti/` altında toplanır. Site paketleri ileride p001 gibi tarafsız kodlarla adlandırılacaktır; adlandırma, gerekli adreslerin veya telif bildirimlerinin gizlendiği anlamına gelmez.

## Kaynak ve lisanslar

- [Uygulama kaynağı](uygulama/)
- [Native TLS, Mozilla CA ve üretim kaynakları](kaynak/ortak/ag/native/)
- [Paketleme](tools/distribution/README.md)
- [Üçüncü taraf lisansları ve teşekkürler](THIRD_PARTY_NOTICES.md)
- [MIT lisansı](LICENSE)
- [Sürüm ve ilgili doğrulamalar](docs/SURUM_1.6.0.md)

HTML5/hls.js ve Samsung AVPlay adaptörleri ortak kontrollerle kullanılır. Testler bu sürümde boş başlangıç/güncelleme akışına aittir; gerçek TV oynatma veya tüm Tizen sürümleri için yeni kabul yapıldığı iddia edilmez. Özel anahtarlar, sertifikalar ve QA kayıtları dağıtıma alınmaz.
