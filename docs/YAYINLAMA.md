# GitHub'da yayımlama

Bu klasör temiz kaynak deposudur; çalışan özel geliştirme klasörü değildir.

1. GitHub'da boş bir public depo açın. Bu klasörün içindekileri depo köküne yükleyin.
   Üstte fazladan `github-paylasim/` katmanı oluşturmadan `README.md`, `LICENSE`,
   `app/`, `vendor/` ve `scripts/` kökte görünsün.
2. Git kullanıyorsanız `.gitignore` dosyasını koruyun. `node_modules/`, `dist/`,
   imza/özel anahtar dosyaları ve kişisel test arşivlerini commit etmeyin.
3. `v0.4.6` etiketiyle bir GitHub Release oluşturun. `dist/` içindeki public WGT ve
   `SHA256SUMS.txt` dosyasını Release'e ekleyin. Kaynakları indirenler de paketi
   `python scripts/build.py` ile üretebilir.
4. Release açıklamasında [uyumluluk tablosundaki](UYUMLULUK.md) sınırları koruyun.
   Test edilmemiş Tizen sürümlerine “sorunsuz” yazmayın.
5. GitHub Issues'ı açabilir, varsa özel güvenlik bildirimini etkinleştirebilirsiniz.
   Geliştirici parolası, özel sertifika, Samsung hesabı veya iletişim adresi eklemeyin.

Proje deposu: [TizenTV-HDFilmCehennemi.wgt](https://github.com/enesk4yh4n-lab/TizenTV-HDFilmCehennemi.wgt).
İndirilebilir paketler [GitHub Releases](https://github.com/enesk4yh4n-lab/TizenTV-HDFilmCehennemi.wgt/releases)
bölümünde sunulur. Apps2Samsung topluluk kataloğuna kayıt yapılmamıştır.
