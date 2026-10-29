/* Page resolution has its own lifetime; signed CDN URLs are never storage keys. */
(function (root) {
  'use strict';
  function origin(url) {
    var m = /^(https?:\/\/[^/]+)/i.exec(url);
    return m ? m[1] + '/' : '';
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.network = root.ChainNetwork.createClient
      ? root.ChainNetwork.createClient()
      : root.ChainNetwork;
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.network.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      provisional = 0,
      lastError = null,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function failure(stage, message) {
      var e = new Error(message);
      e.stage = stage;
      return e;
    }
    function check() {
      if (self.generation !== token) {
        var e = new Error('İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw new Error('Kaynak arama süresi doldu.');
    }
    var network =
      progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function get(url, ref, stage) {
      check();
      return network.get(url, ref).then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          e.stage = stage;
          throw e;
        }
      );
    }
    function publish() {
      if (progress)
        progress.publish(
          sources.filter(function (s) {
            return s.status === 'ready';
          }),
          options
        );
    }
    function wait() {
      return progress ? progress.wait(check) : Promise.resolve().then(check);
    }
    function key(name, index) {
      return (
        String(name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') +
        '-' +
        index
      );
    }
    function add(s, name, ref, subtitles, id) {
      if (!s.url || !/^https?:\/\//i.test(s.url)) return;
      var existing = sources.filter(function (c) {
        return c.url === s.url;
      })[0];
      var subs = (s.subtitles || []).concat(subtitles || []).filter(function (x, i, a) {
        return (
          x.url &&
          /^https?:\/\//i.test(x.url) &&
          a
            .map(function (t) {
              return t.url;
            })
            .indexOf(x.url) === i
        );
      });
      if (existing) {
        existing.subtitles = existing.subtitles.concat(subs);
        return existing;
      }
      var source = {
        id: id,
        label: name,
        name: name,
        url: s.url,
        type: 'hls',
        quality: s.quality || null,
        referer: ref,
        subtitles: subs,
        status: 'unchecked',
      };
      sources.push(source);
      return source;
    }
    function validate(source, option) {
      if (!source) {
        option.status = 'error';
        option.detail = 'Geçerli yayın adresi bulunamadı.';
        publish();
        return Promise.resolve();
      }
      if (source.id !== option.sourceId) {
        option.status = 'unsupported';
        option.detail = 'Bu yayın listede başka kaynak adıyla zaten var.';
        publish();
        return Promise.resolve();
      }
      return get(source.url, source.referer, 'manifest')
        .then(function (r) {
          source.playlist = /^\s*#EXTM3U/.test(r.body);
          source.transport = /^XHR/.test(r.method) ? 'xhr' : 'native';
          source.status = source.playlist ? 'ready' : 'invalid';
          option.status = source.playlist ? 'ready' : 'error';
          option.detail = source.playlist
            ? 'HLS erişimi doğrulandı'
            : 'Yanıt bir HLS yayın listesi değil.';
          if (!source.playlist)
            lastError = failure('manifest', source.label + ': ' + option.detail);
        })
        .catch(function (e) {
          check();
          source.status = 'unverified';
          option.status = 'candidate';
          option.detail = 'Yayın listesi doğrulanamadı; oynatılırken sınanır.';
          self.log(source.label + ': doğrulama yapılamadı.');
        })
        .then(publish);
    }
    if (!content.pageUrl)
      return Promise.reject(new Error('Bağlantı yenilemek için içerik sayfası gerekli.'));
    self.log('Kaynak sayfası alınıyor.');
    return get(content.pageUrl, origin(content.pageUrl), 'page')
      .then(function (page) {
        var frames = root.ChainDecoder.catalog.players(
          page.body,
          content.pageUrl,
          'https://hdfilmcehennemi.mobi'
        );
        var direct = root.ChainDecoder.player.extractPlayer(page.body, content.pageUrl);
        direct.streams.forEach(function (s, i) {
          options.push({
            sourceId: key('Sayfa kaynağı', i),
            label: 'Sayfa kaynağı',
            status: 'pending',
          });
        });
        frames.forEach(function (f, i) {
          f.sourceId = key(f.name, direct.streams.length + i);
          options.push({ sourceId: f.sourceId, label: f.name, status: 'pending' });
        });
        publish();
        var ordered = progress
          ? progress.order(frames, function (f) {
              return { id: f.sourceId, label: f.name, type: 'hls' };
            })
          : frames;
        function frame(i) {
          check();
          if (i >= ordered.length) return Promise.resolve();
          var f = ordered[i],
            option = options.filter(function (o) {
              return o.sourceId === f.sourceId;
            })[0];
          self.log('Kaynak çözümleniyor: ' + f.name);
          return wait()
            .then(function () {
              return get(f.url, content.pageUrl, 'embed');
            })
            .then(function (r) {
              var result = root.ChainDecoder.player.extractPlayer(r.body, f.url);
              provisional += (result.provisional || []).length;
              if (!result.streams.length)
                throw failure('decode', f.name + ': oynatma adresi çözümlenemedi.');
              return result.streams.reduce(function (promise, s, j) {
                return promise.then(function () {
                  return wait().then(function () {
                    var target = j
                      ? {
                          sourceId: f.sourceId + '-' + j,
                          label: f.name + ' ' + (j + 1),
                          status: 'pending',
                        }
                      : option;
                    if (j) options.push(target);
                    return validate(
                      add(
                        s,
                        target.label,
                        /rapidrame/i.test(f.name) ? origin(content.pageUrl) : origin(f.url),
                        result.subtitles,
                        target.sourceId
                      ),
                      target
                    );
                  });
                });
              }, Promise.resolve());
            })
            .catch(function (e) {
              check();
              lastError = e;
              option.status = 'error';
              option.stage = e.stage || 'decode';
              option.detail = e.message;
              publish();
              self.log(f.name + ': ' + e.message);
            })
            .then(function () {
              return frame(i + 1);
            });
        }
        return direct.streams
          .reduce(function (promise, s, i) {
            return promise.then(function () {
              return wait().then(function () {
                return validate(
                  add(
                    s,
                    'Sayfa kaynağı',
                    origin(content.pageUrl),
                    direct.subtitles,
                    key('Sayfa kaynağı', i)
                  ),
                  options[i]
                );
              });
            });
          }, Promise.resolve())
          .then(function () {
            return frame(0);
          });
      })
      .then(function () {
        check();
        if (provisional) self.log('Doğrulanmamış metadata oynatma listesine alınmadı.');
        sources = sources
          .filter(function (s) {
            return s.status !== 'invalid';
          })
          .sort(function (a, b) {
            return (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1);
          });
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || failure('decode', 'Sayfada oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.HdfSourceResolver = Resolver;
  if (!root.SourceResolver) root.SourceResolver = Resolver;
})(window);
