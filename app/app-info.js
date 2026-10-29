/* Application identity and honest playback support, shared by catalog and player. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  var info = { version: '1.0.0' };
  info.support = function (controller) {
    var c = controller || {},
      tracks = c.tracks || {},
      settings = c.settings || {},
      mse = false;
    try {
      mse = !!(root.Hls && root.Hls.isSupported());
    } catch (ignore) {}
    var caps = c.capStore
        ? c.capStore.describe(c.engineId())
        : c.engineCaps
          ? c.engineCaps()
          : { id: 'html5', maxHeight: 1080 },
      native = caps.id === 'avplay',
      rates =
        (c.verifiedRates ? c.verifiedRates() : settings.verifiedRates || [1]).join(tr('x, ')) + 'x';
    var formats = [
      tr('En fazla ') + caps.maxHeight + 'p',
      caps.hevc ? tr('HEVC onaylı') : tr('HEVC doğrulama bekliyor'),
      caps.hdr ? tr('HDR10/PQ onaylı') : tr('HDR doğrulama bekliyor')
    ];
    ['ac3', 'eac3', 'dts'].forEach(function (f) {
      formats.push(
        f.toUpperCase() + (caps[f] ? tr(' TV hoparlörlerinde onaylı') : tr(' doğrulama bekliyor'))
      );
    });
    return [
      {
        title: tr('Oynatma motoru'),
        detail:
          (native ? tr('Samsung AVPlay') : tr('HTML5 / hls.js')) +
          tr(' etkin. ') +
          (mse ? tr('HLS/MSE kullanılabilir. ') : '') +
          (c.capStore && c.capStore.available('avplay')
            ? tr('Native motor kullanılabilir. ')
            : '') +
          tr('Her kaynağın hazırlığı ve medya uyumu ayrıca sınanır.')
      },
      {
        title: tr('Ses dili'),
        detail: (tracks.audio || []).length
          ? tracks.audio.filter(function (t) {
              return !t.blockedReason;
            }).length +
            tr(' seçilebilir ses parçası. Türkçe tercihi, yayında uygun ses varsa uygulanır.')
          : tr('Ayrı ses parçası bildirilmedi. Gömülü sesin dili uygulamadan değiştirilemeyebilir.')
      },
      {
        title: tr('Ses ve görüntü senkronu'),
        detail:
          (caps.subtitleOffset
            ? tr('Metin altyazısının zamanı ayarlanabilir. ')
            : tr('Etkin native altyazıda bağımsız zaman kaydırma kullanılamıyor. ')) +
          tr(
            'Belgelenmiş ve TV’de doğrulanmış bağımsız ses gecikmesi API’si bulunmadığı için sesi görüntüden bağımsız kaydırma kapalıdır.'
          )
      },
      {
        title: tr('Oynatma hızı'),
        detail:
          tr('Etkin hızlar: ') +
          rates +
          tr(
            '. Diğer hızlar player içindeki sesli denemeden sonra açılır; onayınızı geri alabilirsiniz.'
          )
      },
      {
        title: tr('Görüntü ve ses biçimleri'),
        detail:
          formats.join(' · ') +
          tr(
            '. Onaylar bu cihaz, sürüm ve motor içindir; Dolby Vision, HLG ve harici surround/passthrough onayı verilmez.'
          )
      },
      {
        title: tr('Altyazılar'),
        detail: tr(
          'Yayının sunduğu SRT, WebVTT ve HLS metin altyazıları kullanılabilir. Videoya basılı yazı kapatılamaz; eksik altyazı üretilemez.'
        )
      },
      {
        title: tr('Sarma ve giriş atlama'),
        detail: tr(
          'Sarma görüntüsü ve giriş atlama, kaynak uygun görselleri veya zamanları sağlarsa açılır. Aksi halde zamanla sarma kullanılabilir.'
        )
      },
      {
        title: tr('Oynatma sorunu yaşarsanız'),
        detail: tr(
          'Önce başka ses veya kaynak seçin; gerekirse bağlantıları yenileyin. Uygun kaynakta diğer motor bir kez denenir; bütün toparlamalar 60 saniye ve beş deneme sınırını paylaşır. HTTP 404, erişim engeli ve hazırlık hatası kaynak başarısı sayılmaz.'
        )
      }
    ];
  };
  root.AppInfo = info;
})(window);
