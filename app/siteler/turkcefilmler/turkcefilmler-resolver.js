(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error('Türkçe Filmler · ' + message);
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
      P = root.TurkceFilmlerParser,
      D = root.TurkceFilmlerDecoder,
      sources = [],
      options = [],
      lastError,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    if (!P.movieUrl(content.pageUrl))
      return Promise.reject(fail('scope', 'Bu içerik genel film kapsamı dışında.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    var network =
      progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function request(promise, stage) {
      return promise.then(
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
    function get(url, ref, stage) {
      check();
      return request(network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }), stage);
    }
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (page) {
        P.detail(page.body, content);
        var links = D.frames(page.body);
        if (!links.length) throw fail('embed', 'Desteklenen oynatıcı bağlantısı bulunamadı.');
        var queue = links.map(function (url, i) {
          var option = {
            sourceId: 'turkcefilmler-' + i,
            label: 'DUAL' + (i ? ' ' + (i + 1) : ''),
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
        return queue.reduce(function (p, entry) {
          var url = entry.url,
            index = entry.index,
            option = entry.option;
          return p.then(function () {
            return (progress ? progress.wait(check) : Promise.resolve().then(check))
              .then(function () {
                return get(url, content.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = D.settings(embed.body);
                check();
                /* The embed receives the parent origin as document.referrer. The API rejects some full movie paths. */
                return request(
                  network.post(
                    data.api,
                    'hash=' + data.hash + '&r=' + encodeURIComponent(P.base + '/'),
                    {
                      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                      'X-Requested-With': 'XMLHttpRequest',
                    }
                  ),
                  'api'
                ).then(function (response) {
                  var media = D.media(response.body);
                  return get(media, url, 'manifest').then(function (manifest) {
                    if (!/^\s*#EXTM3U/.test(manifest.body))
                      throw fail('manifest', 'HLS manifesti alınamadı.');
                    sources.push({
                      id: 'turkcefilmler-' + index,
                      label: 'DUAL' + (index ? ' ' + (index + 1) : ''),
                      url: media,
                      referer: url,
                      userAgent: 'Mozilla/5.0',
                      destination: 'downloads',
                      type: 'hls',
                      status: 'ready',
                      transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                      seekMode: 'media-event',
                      subtitles: data.subtitles,
                    });
                    option.status = 'ready';
                    option.detail = 'HLS erişimi doğrulandı';
                    publish();
                  });
                });
              })
              .catch(function (e) {
                check();
                lastError = e;
                option.status = 'error';
                option.stage = e.stage || 'embed';
                option.detail = e.message;
                publish();
                self.log('Türkçe Filmler: ' + (e.stage || 'embed') + ' aşaması başarısız.');
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
  root.TurkceFilmlerSourceResolver = Resolver;
})(window);
