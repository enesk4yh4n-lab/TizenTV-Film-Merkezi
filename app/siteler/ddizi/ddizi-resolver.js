(function (root) {
  'use strict';
  var P = root.DdiziParser,
    D = root.DdiziDecoder;
  function fail(stage, message) {
    var e = new Error('DDizi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.clients = [];
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.clients.forEach(function (c) {
      c.cancel();
    });
    this.clients = [];
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      options = [],
      sources = [],
      last,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    if (!P.episodeUrl(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz DDizi bölüm sayfası.'));
    if (self.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    function get(url, ref, stage, retried) {
      check();
      var client = (root.DdiziNetwork || root.ChainNetwork).createClient({
        destination: 'downloads',
        deadline: deadline,
      });
      if (progress && progress.client) client = progress.client(client, check, deadline);
      self.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
      }
      return client.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          release();
          check();
          self.log('DDizi: ' + stage + ' / ' + r.method);
          return r;
        },
        function (e) {
          release();
          check();
          if (
            !retried &&
            !/403|429|engeli|Dogrulama/.test(e.message) &&
            (e.stage === 'timeout' || /Native|XHR|zaman|HTTP 5\d\d/.test(e.message)) &&
            deadline - self.now() > 12000
          )
            return get(url, ref, stage, true);
          e.requestStage = stage;
          e.stage = e.stage || stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (first) {
        var list = D.alternatives(first.body, content.pageUrl),
          index = 0;
        list.forEach(function (a, i) {
          options.push({
            sourceId: 'ddizi-' + i,
            label: a.label,
            pageUrl: a.url,
            status: 'pending',
            stage: '',
            detail: '',
          });
        });
        var queue = list.map(function (a, i) {
          return { alternative: a, index: i };
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return {
              id: options[entry.index].sourceId,
              label: entry.alternative.label,
              type: 'hls',
              stability: { autoPriority: /Dublaj/i.test(entry.alternative.label) ? 0 : 1 },
            };
          });
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check))
            .then(function () {
              var entry = queue.shift();
              if (!entry) return;
              var i = entry.index,
                a = entry.alternative,
                option = options[i];
              return (
                a.url === content.pageUrl
                  ? Promise.resolve(first)
                  : get(a.url, content.pageUrl, 'page')
              )
                .then(function (page) {
                  var embed = D.frame(page.body, a.url);
                  return get(embed, a.url, 'embed').then(function (response) {
                    var data = D.stream(response.body, embed);
                    if (data.type === 'youtube') {
                      if (!root.YoutubeSource)
                        throw fail('unsupported', 'YouTube çözümleyici modülü pakette bulunamadı.');
                      var youtubeTask = root.YoutubeSource.createTask(
                        data.videoId,
                        deadline,
                        self.log,
                        hints
                      );
                      self.clients.push(youtubeTask);
                      function releaseYoutube() {
                        var at = self.clients.indexOf(youtubeTask);
                        if (at >= 0) self.clients.splice(at, 1);
                      }
                      return youtubeTask.promise.then(
                        function (source) {
                          releaseYoutube();
                          check();
                          source.id = option.sourceId;
                          source.label = a.label + ' · YouTube';
                          source.order = i;
                          source.languagePriority = /Dublaj/i.test(a.label) ? 0 : 1;
                          sources.push(source);
                          option.status = 'ready';
                          option.label = source.label;
                          option.detail = 'YouTube güncel misafir oturumu / H.264-AAC HLS hazır';
                        },
                        function (e) {
                          releaseYoutube();
                          throw e;
                        }
                      );
                    }
                    if (data.type === 'mp4') {
                      /* Observed itag18 H264/AAC progressive path passed actual Tizen3 play/pause/seek. Other formats stay gated. */
                      if (
                        !/(^|\.)googlevideo\.com$/.test(new root.URL(data.url).hostname) ||
                        !/[?&]itag=18(?:&|$)/.test(data.url) ||
                        !/[?&]mime=video(?:\/|%2F)mp4(?:&|$)/i.test(data.url)
                      )
                        throw fail(
                          'unsupported',
                          'Bu MP4 biçimi TV motoru için henüz doğrulanmadı.'
                        );
                      sources.push({
                        id: option.sourceId,
                        label: a.label + ' · MP4 360p',
                        url: data.url,
                        referer: data.referer,
                        type: 'mp4',
                        mp4Verified: true,
                        seekMode: 'media-event',
                        subtitles: [],
                        order: i,
                        languagePriority: 1,
                      });
                      option.status = 'ready';
                      option.label = a.label + ' · MP4 360p';
                      option.detail =
                        'Kaynak sayfasından taze MP4 adresi alındı; erişim oynatılırken sınanır';
                      return;
                    }
                    return get(data.url, data.referer, 'manifest')
                      .catch(function (e) {
                        /* This CDN also publicly serves the same URL over HTTP; only use a validated legacy fallback. */
                        if (
                          new root.URL(data.url).hostname !== 'video.twimg.com' ||
                          data.referer ||
                          /403|429|engeli|Dogrulama/.test(e.message)
                        )
                          throw e;
                        return get(data.url.replace(/^https:/, 'http:'), '', 'manifest').then(
                          function (r) {
                            if (!/^\s*#EXTM3U/.test(r.body))
                              throw fail('manifest', 'Alternatif yayın listesi geçersiz.');
                            data.url = data.url.replace(/^https:/, 'http:');
                            return r;
                          }
                        );
                      })
                      .then(function (manifest) {
                        if (!/^\s*#EXTM3U/.test(manifest.body))
                          throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
                        /* Streambox reports a placeholder 1920x1333 for its sole stream; use the actual media playlist. */
                        var entries =
                          manifest.body.match(/#EXT-X-STREAM-INF:[^\r\n]+\r?\n([^\r\n#]+)/g) || [];
                        if (
                          new root.URL(data.url).hostname === 'streambox.xyz' &&
                          entries.length === 1 &&
                          !/#EXT-X-MEDIA:/.test(manifest.body)
                        ) {
                          var child = root.CatalogUtils.url(entries[0].split(/\r?\n/)[1], data.url),
                            parsed;
                          try {
                            parsed = new root.URL(child);
                          } catch (ignore) {
                            throw fail('manifest', 'Alt yayın adresi okunamadı.');
                          }
                          if (
                            parsed.origin !== 'https://streambox.xyz' ||
                            !/^\/m3\//.test(parsed.pathname)
                          )
                            throw fail('manifest', 'Alt yayın adresi desteklenmiyor.');
                          return get(child, data.referer, 'variant').then(function (r) {
                            if (!/^\s*#EXTM3U/.test(r.body) || !/#EXTINF:/.test(r.body))
                              throw fail('manifest', 'Alt HLS yayını alınamadı.');
                            data.url = child;
                            return r;
                          });
                        }
                        return manifest;
                      })
                      .then(function (manifest) {
                        sources.push({
                          id: option.sourceId,
                          label: a.label,
                          url: data.url,
                          referer: data.referer,
                          destination: 'downloads',
                          userAgent: 'Mozilla/5.0',
                          type: 'hls',
                          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                          seekMode: 'media-event',
                          subtitles: [],
                          order: i,
                          languagePriority: /Dublaj/i.test(a.label) ? 0 : 1,
                        });
                        option.status = 'ready';
                        option.detail = 'HLS erişimi doğrulandı';
                      });
                  });
                })
                .catch(function (e) {
                  check();
                  last = e;
                  option.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                  option.stage = e.stage || 'decode';
                  option.detail = root.PlayerCore.safeMessage(e.message);
                  self.log('DDizi: ' + a.label + ' / ' + option.stage + ' · ' + option.detail);
                })
                .then(function () {
                  check();
                  publish();
                });
            })
            .then(worker);
        }
        return progress && progress.enabled ? worker() : Promise.all([worker(), worker()]);
      })
      .then(function () {
        check();
        sources.sort(function (a, b) {
          return a.languagePriority - b.languagePriority || a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var e = last || fail('decode', 'Oynatılabilir DDizi kaynağı bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.DdiziSourceResolver = Resolver;
})(window);
