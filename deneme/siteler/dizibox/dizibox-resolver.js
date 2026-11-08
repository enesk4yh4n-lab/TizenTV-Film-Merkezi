(function (root) {
  'use strict';
  var P = root.DiziboxParser,
    D = root.DiziboxDecoder;
  function fail(stage, message) {
    var e = new Error('Dizibox · ' + message);
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
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      last,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    function check(job) {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if ((job && job.expired) || self.now() >= deadline)
        throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    /* A successful XHR page must not force XHR on the next Referer-protected embed. */
    function get(url, ref, stage, job) {
      check(job);
      var browserManifest =
        stage === 'manifest' &&
        /(^|\.)(vmpx\.online|vkuser\.net|okcdn\.ru)$/.test(new root.URL(url).hostname);
      var client = root.ChainNetwork.createClient({
        destination: 'downloads',
        preferXHR: stage === 'page' || browserManifest,
      });
      if (progress && progress.client)
        client = progress.client(
          client,
          function () {
            check(job);
          },
          deadline
        );
      self.clients.push(client);
      if (job) job.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
        if (job) {
          i = job.clients.indexOf(client);
          if (i >= 0) job.clients.splice(i, 1);
        }
      }
      return client.get(url, ref).then(
        function (r) {
          release();
          check(job);
          self.log('Dizibox: ' + stage + ' / ' + r.method);
          return r;
        },
        function (e) {
          release();
          check(job);
          e.stage = stage;
          throw e;
        }
      );
    }
    function walk(body, page, label, depth, job) {
      check(job);
      var frames = D.frames(body, page);
      if (frames.length && depth < 3)
        return get(frames[0], page, 'embed', job).then(function (r) {
          return walk(r.body, frames[0], label, depth + 1, job);
        });
      var data = D.stream(body, page);
      if (data.type === 'mp4')
        return Promise.resolve({
          label: label,
          url: data.url,
          referer: page,
          type: 'mp4',
          status: 'candidate',
          stability: { autoPriority: 20 },
          mp4Verified: false,
          engineSupport: { html5: 'unknown', avplay: 'unknown' },
          mediaProfile: data.mediaProfile,
          thumbnails: data.thumbnails,
          subtitles: data.subtitles,
          playbackRequirements: { requiredHeaders: [] },
        });
      return get(data.url, page, 'manifest', job).then(function (r) {
        check(job);
        if (!/^\s*#EXTM3U/.test(r.body))
          throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
        return {
          label: label,
          url: data.url,
          referer: page,
          type: 'hls',
          status: 'ready',
          stability:
            new root.URL(data.url).hostname === 'dbx.molystream.org'
              ? { initialBufferSeconds: 10, maxBufferSeconds: 25, autoPriority: 50 }
              : /(^|\.)(vkuser\.net|okcdn\.ru)$/.test(new root.URL(data.url).hostname)
                ? { autoMaxHeight: 360 }
                : null,
          playbackRequirements: {
            requiredHeaders: /^dbx\.molystream\.org$/i.test(new root.URL(data.url).hostname)
              ? ['Referer']
              : [],
          },
          transport: /^XHR/.test(r.method) ? 'xhr' : 'native',
          destination: 'downloads',
          seekMode: 'media-event',
          subtitles: data.subtitles,
        };
      });
    }
    if (!P.safe(content.pageUrl)) return Promise.reject(fail('page', 'Geçersiz bölüm sayfası.'));
    if (self.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    self.log('Dizibox: bölüm sayfası alınıyor.');
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (r) {
        var first = r.body,
          alternatives = D.alternatives(first, content.pageUrl),
          queue = [];
        alternatives.forEach(function (a, i) {
          var option = {
            sourceId: 'dizibox-' + i,
            label: a.label,
            pageUrl: a.url,
            status: 'pending',
            stage: '',
            detail: '',
          };
          options.push(option);
          if (!/^(DBX Pro|Moly\+|Odnok|Kaynak 1)$/i.test(a.label)) {
            option.status = 'unsupported';
            option.detail = 'Bu oynatıcı henüz desteklenmiyor.';
          } else queue.push({ alternative: a, option: option, index: i });
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return {
              id: entry.option.sourceId,
              label: entry.option.label,
              type: 'hls',
              stability: {
                autoPriority: /DBX Pro/i.test(entry.option.label)
                  ? 50
                  : /Odnok/i.test(entry.option.label)
                    ? 20
                    : 0,
              },
            };
          });
        function attempt(entry) {
          check();
          var a = entry.alternative,
            o = entry.option,
            job = { expired: false, clients: [] },
            ms = Math.max(
              1,
              Math.min(
                hints && hints.mediaActive && hints.mediaActive() ? 45000 : 30000,
                deadline - self.now() - 15000
              )
            );
          return new Promise(function (resolve) {
            var done = false,
              timer = setTimeout(function () {
                job.expired = true;
                job.clients.slice().forEach(function (client) {
                  client.cancel();
                });
                finish(fail('timeout', 'Bu kaynak zamanında çözümlenemedi.'));
              }, ms);
            function finish(error, source) {
              if (done) return;
              done = true;
              clearTimeout(timer);
              if (error) {
                last = error;
                o.status = error.stage === 'unsupported' ? 'unsupported' : 'error';
                o.stage = error.stage || 'decode';
                o.detail = root.PlayerCore
                  ? root.PlayerCore.safeMessage(error.message)
                  : String(error.message).slice(0, 180);
                self.log('Dizibox: ' + a.label + ' / ' + o.stage + ' · ' + o.detail);
              } else {
                source.id = o.sourceId;
                source.order = entry.index;
                sources.push(source);
                o.status = source.status || 'ready';
                o.detail =
                  source.type === 'mp4'
                    ? 'Aktif MP4 adayı; oynatma motorunda hazırlık doğrulaması bekliyor'
                    : 'HLS erişimi doğrulandı';
              }
              resolve();
            }
            self.log('Dizibox: ' + a.label + ' çözümleniyor.');
            (a.url === content.pageUrl
              ? Promise.resolve({ body: first })
              : get(a.url, content.pageUrl, 'page', job)
            )
              .then(function (page) {
                return walk(page.body, a.url, a.label, 0, job);
              })
              .then(function (source) {
                check(job);
                finish(null, source);
              })
              .catch(function (e) {
                finish(e);
              });
          });
        }
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check)).then(
            function () {
              var entry = queue.shift();
              return entry
                ? attempt(entry)
                    .then(function () {
                      check();
                      publish();
                    })
                    .then(worker)
                : undefined;
            }
          );
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
          var error = last || fail('embed', 'Oynatılabilir kaynak bulunamadı.');
          error.sourceOptions = options;
          throw error;
        }
        return sources;
      });
  };
  root.DiziboxSourceResolver = Resolver;
})(window);
