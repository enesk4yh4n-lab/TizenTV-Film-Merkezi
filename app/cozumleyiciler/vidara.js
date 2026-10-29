/* Active Vidara/Gasobni data only; no remote JavaScript is executed. */
(function (root) {
  'use strict';
  var D = root.WebPlayerData,
    U = root.CatalogUtils;
  function failure(message) {
    return D.fail('decode', message);
  }
  function host(value) {
    var url = D.publicUrl(value),
      u = url && new root.URL(url);
    return u &&
      /^(vidara\.to|gasobni\.com)$/.test(u.hostname) &&
      !u.search &&
      !u.hash &&
      /^\/e\/[A-Za-z0-9]{8,24}$/.test(u.pathname)
      ? url
      : '';
  }
  function settings(body, page) {
    var url = host(page),
      u = url && new root.URL(url),
      d = D.doc(body);
    if (
      !u ||
      !d.querySelector('#jwplayer') ||
      !/apiURL\s*=\s*['"]\/api\/stream['"]/.test(body) ||
      !/file\s*:\s*t\.streaming_url/.test(body)
    )
      throw failure('Aktif Vidara/Gasobni oynatıcısı tanınamadı.');
    var result = {
        api: u.origin + '/api/stream',
        filecode: u.pathname.split('/')[2],
        referer: u.origin + '/',
        mirror: '',
      },
      m = /\b(?:var|let|const)\s+MIRROR\s*=\s*/.exec(body);
    if (m) {
      try {
        var mirror = host(D.literal(body, m.index + m[0].length).value),
          target = mirror && new root.URL(mirror);
        if (target && target.hostname !== u.hostname && target.pathname === u.pathname)
          result.mirror = mirror;
      } catch (ignore) {}
    }
    return result;
  }
  function media(body, filecode) {
    var data;
    try {
      data = JSON.parse(body);
    } catch (ignore) {
      throw failure('Vidara/Gasobni yanıtı JSON değil.');
    }
    if (filecode && data && data.filecode && data.filecode !== filecode)
      throw failure('Vidara/Gasobni video kimliği eşleşmiyor.');
    var url = D.publicUrl(data && data.streaming_url),
      subtitles = [];
    if (!url || !/\.m3u8$/i.test(new root.URL(url).pathname))
      throw failure('Vidara/Gasobni aktif HLS adresi bulunamadı.');
    (Array.isArray(data.subtitles) ? data.subtitles : []).forEach(function (t) {
      var file = t && t.type === 0 && D.publicUrl(t.file_path);
      if (file)
        subtitles.push({
          url: file,
          label: U.clean(t.language) || 'Altyazı',
          language: t.language || '',
          type: /\.srt(?:\?|$)/i.test(file) ? 'srt' : 'vtt',
        });
    });
    return { kind: 'hls', type: 'hls', url: url, subtitles: subtitles, preferredEngine: 'avplay' };
  }
  root.VidaraDecoder = { host: host, settings: settings, media: media };
})(window);
