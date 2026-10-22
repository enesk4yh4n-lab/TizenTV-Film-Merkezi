/* Application identity and honest playback support, shared by catalog and player. */
(function (root) {
 'use strict';
 var info = { version: '0.4.6', producer: 'HDfilmCehennemi TV contributors' };
 info.support = function (controller) {
  var c = controller || {}, tracks = c.tracks || {}, settings = c.settings || {}, mse = false;
  try { mse = !!(root.Hls && root.Hls.isSupported()); } catch (ignore) {}
  var rates = (settings.verifiedRates || [1]).join('x, ') + 'x';
  return [
   { title: 'Film oynatma', detail: mse ? 'HLS oynatma yolu kullanılabilir. Her yayının görüntü ve ses uyumluluğu ayrıca değişebilir.' : 'Bu cihazda HLS/MSE oynatma yolu kullanılamıyor.' },
   { title: 'Ses dili', detail: (tracks.audio || []).length ? tracks.audio.filter(function (t) { return !t.blockedReason; }).length + ' seçilebilir ses parçası. Türkçe tercihi, yayında uygun ses varsa uygulanır.' : 'Ayrı ses parçası bildirilmedi. Gömülü sesin dili uygulamadan değiştirilemeyebilir.' },
   { title: 'Ses ve görüntü senkronu', detail: 'Altyazı zamanı ayarlanabilir. Sesi görüntüden bağımsız kaydırma bu sürümde desteklenmiyor.' },
   { title: 'Oynatma hızı', detail: 'Etkin hızlar: ' + rates + '. Diğer hızlar player içindeki sesli denemeden sonra açılır; onayınızı geri alabilirsiniz.' },
   { title: 'Görüntü ve ses biçimleri', detail: '1080p üstü, HDR, HEVC/Dolby Vision ve Dolby/DTS bildiren seçenekler doğrulama bekliyor. Bu sürümde seçime kapalıdır.' },
   { title: 'Altyazılar', detail: 'Yayının sunduğu SRT, WebVTT ve HLS metin altyazıları kullanılabilir. Videoya basılı yazı kapatılamaz; eksik altyazı üretilemez.' },
   { title: 'Sarma ve giriş atlama', detail: 'Sarma görüntüsü ve giriş atlama, kaynak uygun görselleri veya zamanları sağlarsa açılır. Aksi halde zamanla sarma kullanılabilir.' },
   { title: 'Oynatma sorunu yaşarsanız', detail: 'Önce başka ses veya kaynak seçin; gerekirse bağlantıları yenileyin. MP4 ve alternatif AVPlay yolu bu sürümde genel oynatma desteği sayılmaz.' }
  ];
 };
 root.AppInfo = info;
})(window);
