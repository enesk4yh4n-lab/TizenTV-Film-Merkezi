/* Hotstream settings are decrypted as JSON data, never executed as page code. */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var error = new Error('Filmizle · ' + message);
    error.stage = stage;
    return error;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.filmizleNetwork = root.ChainNetwork.createClient();
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.filmizleNetwork.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      lastError,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network = self.filmizleNetwork || (self.filmizleNetwork = root.ChainNetwork.createClient());
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    if (progress && progress.client) network = progress.client(network, check, deadline);
    function get(url, ref, stage) {
      check();
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    if (!root.FilmizleParser.safe(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz içerik sayfası.'));
    self.log('Filmizle: içerik sayfası alınıyor.');
    return get(content.pageUrl, root.FilmizleParser.base + '/', 'page')
      .then(function (page) {
        var links = root.Hotstream.frames(page.body, content.pageUrl);
        if (!links.length)
          throw fail('embed', 'Desteklenen Hotstream oynatıcı bağlantısı bulunamadı.');
        var queue = links.map(function (url, i) {
          var option = {
            sourceId: 'hotstream-' + i,
            label: 'Hotstream' + (i ? ' ' + (i + 1) : ''),
            status: 'pending',
          };
          options.push(option);
          return { url: url, index: i, option: option };
        });
        function publish() {
          if (progress) progress.publish(sources, options);
        }
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return { id: entry.option.sourceId, label: entry.option.label, type: 'hls' };
          });
        return queue.reduce(function (promise, entry) {
          var url = entry.url,
            i = entry.index,
            option = entry.option;
          return promise.then(function () {
            return (progress ? progress.wait(check) : Promise.resolve().then(check))
              .then(function () {
                return get(url, content.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = root.Hotstream.settings(embed.body);
                return get(data.url, url, 'manifest').then(function (manifest) {
                  if (!/^\s*#EXTM3U/.test(manifest.body))
                    throw fail('manifest', 'HLS manifesti yerine farklı bir yanıt alındı.');
                  sources.push({
                    id: 'hotstream-' + i,
                    label: 'Hotstream' + (i ? ' ' + (i + 1) : ''),
                    url: data.url,
                    referer: url,
                    userAgent: 'Mozilla/5.0',
                    type: 'hls',
                    status: 'ready',
                    transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                    seekMode: 'media-event',
                    subtitles: [],
                  });
                  option.status = 'ready';
                  option.detail = 'HLS erişimi doğrulandı';
                  publish();
                });
              })
              .catch(function (e) {
                check();
                lastError = e;
                option.status = 'error';
                option.stage = e.stage || 'embed';
                option.detail = e.message;
                publish();
                self.log('Filmizle: ' + (e.stage || 'embed') + ' aşaması başarısız.');
              });
          });
        }, Promise.resolve());
      })
      .then(function () {
        check();
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || fail('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.FilmizleSourceResolver = Resolver;
  root.FilmizleResolver = root.Hotstream;
})(window);
