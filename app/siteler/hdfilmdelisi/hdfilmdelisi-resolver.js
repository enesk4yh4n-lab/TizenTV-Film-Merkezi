(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error('HDFilmDelisi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.network = root.ChainNetwork.createClient({ destination: 'downloads' });
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.network.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      P = root.HdfilmDelisiParser,
      embed,
      media;
    if (!P.contentUrl(content.pageUrl))
      return Promise.reject(fail('scope', 'Geçersiz film/bölüm adresi.'));
    if (this.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    var progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network =
        progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function get(url, ref, stage, parse) {
      check();
      self.log('HDFilmDelisi: ' + stage);
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          check();
          try {
            return parse(r);
          } catch (e) {
            e.stage = stage;
            throw e;
          }
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page', function (r) {
      embed = root.HdfilmDelisiData.player(r.body).url;
      return embed;
    })
      .then(function () {
        return get(embed, content.pageUrl, 'embed', function (r) {
          media = root.HdfilmDelisiDecoder.media(r.body);
          return media;
        });
      })
      .then(function () {
        return get(media, embed, 'manifest', function (r) {
          if (!/^\s*#EXTM3U/.test(r.body))
            throw fail('manifest', 'Geçerli HLS manifesti alınamadı.');
          return [
            {
              id: 'hdfilmdelisi-vixolity',
              label: 'Vixolity',
              url: media,
              referer: embed,
              userAgent: 'Mozilla/5.0',
              destination: 'downloads',
              type: 'hls',
              status: 'ready',
              transport: /^XHR/.test(r.method) ? 'xhr' : 'native',
              seekMode: 'media-event',
              subtitles: [],
            },
          ];
        });
      });
  };
  root.HdfilmDelisiSourceResolver = Resolver;
})(window);
