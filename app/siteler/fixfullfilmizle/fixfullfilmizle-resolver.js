(function (root) {
  'use strict';
  var P = root.FixFullParser,
    D = root.FixFullDecoder;
  function error(stage, message) {
    var e = new Error('FixFullFilmİzle · ' + message);
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
    this.clients.slice().forEach(function (client) {
      client.cancel();
    });
    this.clients = [];
  };
  // The TV's Download API rejects these servers' MP4 range responses. A paused,
  // short-lived HTML5 probe verifies an actual decoded first frame on this device.
  function mp4Probe(url, timeout) {
    var stop = function () {},
      promise = new Promise(function (resolve, reject) {
        var video = document.createElement('video'),
          done = false,
          timer;
        function finish(error) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          video.removeEventListener('loadeddata', ready);
          video.removeEventListener('canplay', ready);
          video.removeEventListener('error', failed);
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
            if (video.parentNode) video.parentNode.removeChild(video);
          } catch (ignore) {}
          if (error) reject(error);
          else resolve();
        }
        function ready() {
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            isFinite(video.duration) &&
            video.duration > 0
          )
            finish();
        }
        function failed() {
          var e = error(
            'media',
            'BRONZ MP4 medya hazırlığı başarısız (kod ' +
              ((video.error && video.error.code) || 0) +
              ').'
          );
          finish(e);
        }
        stop = function () {
          var e = error('cancel', 'İptal edildi');
          e.cancelled = true;
          finish(e);
        };
        timer = setTimeout(
          function () {
            finish(error('media', 'BRONZ MP4 ilk karesi zamanında hazırlanmadı.'));
          },
          Math.max(1, timeout)
        );
        try {
          video.preload = 'auto';
          video.muted = true;
          video.style.cssText = 'position:absolute;left:-10000px;width:2px;height:2px;opacity:0';
          video.addEventListener('loadeddata', ready);
          video.addEventListener('canplay', ready);
          video.addEventListener('error', failed);
          document.body.appendChild(video);
          video.src = url;
          video.load();
        } catch (e) {
          finish(error('media', 'BRONZ MP4 hazırlığı başlatılamadı.'));
        }
      });
    return {
      promise: promise,
      cancel: function () {
        stop();
      },
    };
  }
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      last = null,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    var page = P.movieUrl(content.pageUrl);
    if (!page) return Promise.reject(error('page', 'Geçersiz film/bölüm adresi.'));
    function check() {
      if (token !== self.generation) {
        var e = error('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw error('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    function request(url, ref, stage, body, json, end, preferXHR) {
      check();
      var client = root.ChainNetwork.createClient({
        destination: 'downloads',
        preferXHR: preferXHR === true || stage === 'page',
      });
      if (progress && progress.client)
        client = progress.client(client, check, Math.min(deadline, end || deadline));
      self.clients.push(client);
      return new Promise(function (resolve, reject) {
        var done = false,
          timer = setTimeout(
            function () {
              if (done) return;
              done = true;
              client.cancel();
              release();
              reject(error(stage, 'Kaynak isteği zamanında yanıt vermedi.'));
            },
            Math.max(
              1,
              Math.min(
                hints && hints.mediaActive && hints.mediaActive() ? 45000 : 12000,
                deadline - self.now(),
                (end || deadline) - self.now()
              )
            )
          );
        function release() {
          var i = self.clients.indexOf(client);
          if (i >= 0) self.clients.splice(i, 1);
        }
        var headers =
          body !== undefined
            ? {
                'Content-Type': json
                  ? 'application/json'
                  : 'application/x-www-form-urlencoded; charset=UTF-8',
              }
            : { 'User-Agent': 'Mozilla/5.0' };
        if (body !== undefined && !json) headers['X-Requested-With'] = 'XMLHttpRequest';
        var task =
          body === undefined ? client.get(url, ref, headers) : client.post(url, body, headers);
        task.then(
          function (response) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            release();
            try {
              check();
              self.log('FixFull: ' + stage + ' / ' + response.method);
              resolve(response);
            } catch (e) {
              reject(e);
            }
          },
          function (e) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            release();
            try {
              check();
              e.stage = stage;
              reject(e);
            } catch (cancel) {
              reject(cancel);
            }
          }
        );
      });
    }
    function hls(data, ref, label, option, order, end) {
      return request(
        data.url,
        ref,
        'manifest',
        undefined,
        false,
        end,
        new root.URL(ref).hostname === 'vidara.to'
      ).then(function (manifest) {
        if (!/^\s*#EXTM3U/.test(manifest.body))
          throw error('manifest', 'HLS yerine farklı bir yanıt alındı.');
        sources.push({
          id: option.sourceId,
          label: label,
          url: data.url,
          referer: ref,
          destination: 'downloads',
          userAgent: 'Mozilla/5.0',
          type: 'hls',
          preferredEngine: data.preferredEngine || null,
          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
          seekMode: 'media-event',
          subtitles: data.subtitles || [],
          order: order,
        });
        option.status = 'ready';
        option.detail = 'HLS erişimi doğrulandı';
      });
    }
    function mp4(data, ref, label, option, order, end) {
      check();
      var http = 'unknown',
        lastProbe;
      function add(verified, probed) {
        sources.push({
          id: option.sourceId,
          label: label,
          url: data.url,
          referer: ref,
          type: 'mp4',
          mp4Verified: verified,
          engineSupport: {
            html5: verified ? 'verified' : probed ? 'failed' : 'unknown',
            avplay: 'unknown',
          },
          validation: { http: http },
          subtitles: [],
          order: order,
        });
        option.status = verified ? 'ready' : 'candidate';
        option.detail = verified
          ? 'MP4 ilk karesi HTML5 motorunda doğrulandı'
          : probed
            ? 'Aktif MP4 adayı; HTML5 hazırlığı doğrulanmadı, uygun motorla sınanacak'
            : 'Aktif MP4 adayı; oynayan videoyu kesmemek için medya hazırlığı kaynak seçimine bırakıldı';
      }
      function range() {
        if (!root.MediaNetwork) return Promise.resolve();
        var job = root.MediaNetwork.request(data.url, {
          only: 'xhr',
          binary: true,
          kind: 'mp4-header',
          rangeStart: 0,
          rangeEnd: 4096,
          byteLimit: 8192,
          timeoutMs: Math.max(1, Math.min(3000, deadline - self.now(), end - self.now())),
        });
        self.clients.push(job);
        return job.promise
          .then(
            function () {
              check();
              http = 'verified';
            },
            function (e) {
              check();
              if ([403, 404, 410].indexOf(e.code) >= 0) {
                var failed = error('http', 'MP4 HTTP ' + e.code);
                failed.code = e.code;
                throw failed;
              }
              if (/HTML hata|yerine HTML/i.test(e.message))
                throw error('http', 'MP4 yerine HTML hata sayfası alındı.');
            }
          )
          .then(
            function (v) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              return v;
            },
            function (e) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              throw e;
            }
          );
      }
      if (progress && progress.enabled && hints && hints.mediaActive && hints.mediaActive()) {
        add(false, false);
        return Promise.resolve();
      }
      return range().then(function () {
        check();
        var job = mp4Probe(
          data.url,
          Math.max(1, Math.min(12000, deadline - self.now(), end - self.now()))
        );
        self.clients.push(job);
        return job.promise
          .then(
            function () {
              check();
              add(true, true);
            },
            function (e) {
              check();
              lastProbe = e;
              add(false, true);
            }
          )
          .then(
            function (v) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              return v;
            },
            function (e) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              throw e;
            }
          );
      });
    }
    function player(body, url, ref, label, option, order, depth, end) {
      check();
      if (depth > 3) return Promise.reject(error('decode', 'Oynatıcı yönlendirme sınırı aşıldı.'));
      var parsed = new root.URL(url);
      if (parsed.hostname === 'vidara.to') {
        var settings = D.vidaraSettings(body, url);
        return request(
          settings.api,
          url,
          'api',
          JSON.stringify({ filecode: settings.filecode, device: 'web', codecs: [] }),
          true,
          end
        ).then(function (response) {
          return hls(D.vidaraMedia(response.body), url, label, option, order, end);
        });
      }
      if (parsed.hostname === 'vevocloud.com')
        throw error('unsupported', 'Bu Vevocloud yanıt biçimi henüz doğrulanmadı.');
      var data = D.settings(body, url);
      if (data.kind === 'mp4') return mp4(data, url, label, option, order, end);
      var referer = new root.URL(ref).origin + '/';
      return request(
        data.api,
        url,
        'api',
        'hash=' + data.hash + '&r=' + encodeURIComponent(referer),
        false,
        end
      ).then(function (response) {
        var next = D.media(response.body);
        if (next.kind === 'hls') {
          next.subtitles = data.subtitles;
          return hls(next, url, label, option, order, end);
        }
        return request(next.url, url, 'host', undefined, false, end).then(function (remote) {
          return player(remote.body, next.url, url, label, option, order, depth + 1, end);
        });
      });
    }
    return request(page, P.base + '/', 'page')
      .then(function (first) {
        var list = D.alternatives(first.body, page),
          index = 0;
        list.forEach(function (item, i) {
          options.push({
            sourceId: 'fixfull-' + i,
            label: item.label,
            pageUrl: item.url,
            status: 'pending',
            stage: '',
            detail: '',
          });
        });
        var queue = list.map(function (item, i) {
          return { item: item, index: i };
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            var o = options[entry.index];
            return {
              id: o.sourceId,
              label: o.label,
              type: 'hls',
              stability: { autoPriority: /bronz/i.test(o.label) ? 20 : 0 },
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
                item = entry.item,
                option = options[i],
                end = Math.min(
                  deadline,
                  self.now() + (hints && hints.mediaActive && hints.mediaActive() ? 45000 : 28000)
                );
              return (
                item.url === page
                  ? Promise.resolve(first)
                  : request(item.url, page, 'page', undefined, false, end)
              )
                .then(function (response) {
                  var wrapper = D.frame(response.body, item.url);
                  return request(wrapper, item.url, 'embed', undefined, false, end).then(
                    function (remote) {
                      var inner = D.wrappedFrame(remote.body);
                      return request(inner, wrapper, 'player', undefined, false, end).then(
                        function (remote) {
                          return player(remote.body, inner, wrapper, item.label, option, i, 0, end);
                        }
                      );
                    }
                  );
                })
                .catch(function (e) {
                  check();
                  last = e;
                  option.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                  option.stage = e.stage || 'decode';
                  option.detail = root.PlayerCore.safeMessage(e.message);
                  self.log('FixFull: ' + item.label + ' / ' + option.stage + ' · ' + option.detail);
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
          return a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var e = last || error('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.FixFullSourceResolver = Resolver;
})(window);
