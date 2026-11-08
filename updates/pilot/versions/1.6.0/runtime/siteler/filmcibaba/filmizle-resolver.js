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
        var pages = content.type === 'episode' || content.type === 'series' ? [{ url: content.pageUrl, number: 1 }] : root.Hotstream.moviePages(page.body, content.pageUrl);
        var queue = [], seen = {};
        function collect(body, sourcePage) {
          check();
          var links = root.Hotstream.frames(body, sourcePage.url);
          if (!links.length) {
            lastError = fail('embed', 'Desteklenen Hotstream oynatıcı bağlantısı bulunamadı.');
            options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: 'embed', detail: lastError.message });
          }
          links.forEach(function (url, i) {
            if (seen[url]) return;
            seen[url] = true;
            var id = sourcePage.number === 1 ? 'hotstream-' + i : 'hotstream-page-' + sourcePage.number + '-' + i;
            var label = 'Hotstream' + (sourcePage.number === 1 ? (i ? ' ' + (i + 1) : '') : ' ' + sourcePage.number + (i ? ' / ' + (i + 1) : ''));
            var option = { sourceId: id, label: label, pageUrl: sourcePage.url, status: 'pending' };
            options.push(option); queue.push({ url: url, index: i, pageUrl: sourcePage.url, option: option });
          });
        }
        function publish() {
          if (progress) progress.publish(sources, options);
        }
        return pages.reduce(function (previous, sourcePage) {
          return previous.then(function () {
            check();
            if (sourcePage.url === content.pageUrl) { collect(page.body, sourcePage); return; }
            return get(sourcePage.url, content.pageUrl, 'page').then(function (response) { collect(response.body, sourcePage); }, function (e) {
              check(); lastError = e;
              options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: e.stage || 'page', detail: e.message });
            });
          });
        }, Promise.resolve()).then(function () {
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
                return get(url, entry.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = root.Hotstream.settings(embed.body);
                return get(data.url, url, 'manifest').then(function (manifest) {
                  if (!/^\s*#EXTM3U/.test(manifest.body))
                    throw fail('manifest', 'HLS manifesti yerine farklı bir yanıt alındı.');
                  sources.push({
                    id: option.sourceId,
                    label: option.label,
                    sourcePageUrl: entry.pageUrl,
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
        });
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
