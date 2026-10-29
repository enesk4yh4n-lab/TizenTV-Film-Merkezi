/* Public YouTube requests made on this TV. No proxy, cookies or external executable. */
(function (root) {
  'use strict';
  function createClient() {
    var disposed = false,
      active = [],
      generation = 0,
      serial = 0,
      frame = null,
      frameReady = false,
      waiting = [],
      mediaRequest = MediaNetwork.request;
    function readyListener(e) {
      if (
        frame &&
        e.source === frame.contentWindow &&
        e.origin === 'null' &&
        e.data &&
        e.data.channel === 'YTExtract1' &&
        e.data.ready
      ) {
        frameReady = true;
        var list = waiting;
        waiting = [];
        list.forEach(function (send) {
          send();
        });
      }
    }
    root.addEventListener('message', readyListener);
    function framePost(url, body, method, limit) {
      return new Promise(function (resolve, reject) {
        var id = ++serial,
          done = false,
          timer = setTimeout(function () {
            finish(new Error('Uygulama içi API çerçevesi zaman aşımı.'));
          }, 20000);
        function finish(error, value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          root.removeEventListener('message', receive);
          var i = waiting.indexOf(send);
          if (i >= 0) waiting.splice(i, 1);
          remove(job);
          if (error) reject(error);
          else resolve(value);
        }
        function receive(e) {
          var d = e.data;
          if (
            !frame ||
            e.source !== frame.contentWindow ||
            e.origin !== 'null' ||
            !d ||
            d.channel !== 'YTExtract1' ||
            d.id !== id
          )
            return;
          if (d.error) finish(new Error(d.error));
          else finish(null, d);
        }
        function send() {
          if (!done)
            frame.contentWindow.postMessage(
              {
                channel: 'YTExtract1',
                id: id,
                url: url,
                body: body,
                method: method || 'POST',
                limit: limit,
              },
              '*'
            );
        }
        var job = {
          cancel: function () {
            if (frame && frameReady)
              frame.contentWindow.postMessage({ channel: 'YTExtract1', cancel: id }, '*');
            finish(new Error('İptal edildi'));
          },
        };
        active.push(job);
        root.addEventListener('message', receive);
        if (!frame) {
          frame = document.createElement('iframe');
          frame.setAttribute('sandbox', 'allow-scripts');
          frame.style.display = 'none';
          frame.src = 'cozumleyiciler/youtube/api-frame.html';
          document.body.appendChild(frame);
        }
        if (frameReady) send();
        else waiting.push(send);
      });
    }
    function allowed(value) {
      try {
        var u = new URL(value);
        return (
          u.protocol === 'https:' &&
          !u.username &&
          !u.password &&
          /(^|\.)(youtube\.com|googlevideo\.com|ytimg\.com|youtubei\.googleapis\.com)$/.test(
            u.hostname
          )
        );
      } catch (e) {
        return false;
      }
    }
    function fail(message) {
      return new Error(message);
    }
    function remove(job) {
      var i = active.indexOf(job);
      if (i >= 0) active.splice(i, 1);
    }
    function cancel() {
      generation++;
      active.slice().forEach(function (job) {
        job.cancel();
      });
      active = [];
    }
    function fetchOnTv(input, init) {
      if (disposed) return Promise.reject(fail('YouTube client closed'));
      init = init || {};
      var token = generation,
        url = typeof input === 'string' ? input : input.url || String(input),
        method = init.method || input.method || 'GET',
        headers = new Headers(init.headers || input.headers || {}),
        body = init.body;
      if (!allowed(url)) return Promise.reject(fail('YouTube dışı istek reddedildi.'));
      var u = new URL(url),
        row = { host: u.hostname, path: u.pathname, method: method, droppedHeaders: [] };
      if (root.YTX_NOTE) root.YTX_NOTE('request', row);
      function response(data, status, mime) {
        if (token !== generation) throw fail('İptal edildi');
        row.status = status;
        row.bytes = typeof data === 'string' ? data.length : data.byteLength;
        if (
          root.YTX_OPTIONS &&
          YTX_OPTIONS.report &&
          u.hostname === 'manifest.googlevideo.com' &&
          typeof data === 'string' &&
          data.length < 128000
        )
          row.manifest = data;
        var r = new Response(data, {
          status: status,
          headers: { 'Content-Type': mime || 'application/json' },
        });
        Object.defineProperty(r, 'url', { value: url });
        return r;
      }
      if (method === 'GET' && init.preferNative && root.tizen && tizen.download) {
        var job = NativeMedia.request(url, {
          binary: false,
          byteLimit: 8 * 1024 * 1024,
          timeoutMs: 18000,
          destination: 'downloads',
          referer: 'https://www.youtube.com/',
          userAgent: headers.get('user-agent') || 'Mozilla/5.0',
          kind: 'youtube-metadata',
        });
        active.push(job);
        return job.promise.then(
          function (r) {
            remove(job);
            row.transport = 'native';
            return response(r.data, 200, r.mimeType);
          },
          function (e) {
            remove(job);
            row.error = e.message;
            throw e;
          }
        );
      }
      var readyBody =
        body !== undefined
          ? Promise.resolve(body)
          : method === 'GET'
            ? Promise.resolve(null)
            : input && typeof input.text === 'function'
              ? input.clone().text()
              : Promise.resolve(null);
      return readyBody.then(function (data) {
        if (
          method === 'POST' &&
          u.hostname === 'www.youtube.com' &&
          u.pathname === '/youtubei/v1/player'
        ) {
          var api = new URL(url);
          api.hostname = 'youtubei.googleapis.com';
          row.host = api.hostname;
          row.transport = 'local-opaque-frame';
          return framePost(api.href, data).then(function (r) {
            return response(r.body, r.status, r.mime);
          });
        }
        return new Promise(function (resolve, reject) {
          var x = new XMLHttpRequest(),
            done = false,
            timer,
            job = {
              cancel: function () {
                finish(fail('İptal edildi'));
              },
            };
          active.push(job);
          function finish(error, result) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            remove(job);
            if (error) {
              try {
                x.abort();
              } catch (ignore) {}
              row.error = error.message;
              reject(error);
            } else resolve(result);
          }
          try {
            x.open(method, url, true);
            x.withCredentials = false;
            headers.forEach(function (value, key) {
              if (
                /^(?:origin|referer|user-agent|cookie|host|content-length|accept-encoding|connection|sec-)/i.test(
                  key
                )
              ) {
                row.droppedHeaders.push(key);
                return;
              }
              x.setRequestHeader(key, value);
            });
            timer = setTimeout(function () {
              finish(fail('YouTube XHR 18 saniye zaman aşımı.'));
            }, 18000);
            x.onprogress = function (event) {
              if (event.loaded > 8 * 1024 * 1024) finish(fail('YouTube yanıt boyutu sınırı.'));
            };
            x.onload = function () {
              if (done) return;
              try {
                row.transport = 'xhr';
                if (x.status >= 400) {
                  try {
                    var body = JSON.parse(x.responseText);
                    row.serverError = {
                      message: String((body.error && body.error.message) || '').slice(0, 250),
                      status: body.error && body.error.status,
                    };
                  } catch (ignore) {
                    row.serverError = {
                      message: x.responseText
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .slice(0, 180),
                    };
                  }
                }
                finish(
                  null,
                  response(x.responseText, x.status, x.getResponseHeader('Content-Type'))
                );
              } catch (e) {
                finish(e);
              }
            };
            x.onerror = function () {
              finish(fail('YouTube XHR ağ/CORS/TLS hatası (HTTP ' + x.status + ').'));
            };
            x.onabort = function () {
              if (!done) finish(fail('İptal edildi'));
            };
            x.send(data);
          } catch (e) {
            finish(e);
          }
        });
      });
    }
    function binary(url, limit) {
      if (!allowed(url)) return Promise.reject(fail('YouTube dışı medya isteği reddedildi.'));
      var u = new URL(url),
        row = {
          host: u.hostname,
          path: u.pathname,
          method: 'GET',
          transport: 'main-WGT-XHR',
          range: u.searchParams.get('range'),
        };
      if (root.YTX_NOTE) root.YTX_NOTE('request', row);
      var job = mediaRequest(url, {
        binary: true,
        only: 'xhr',
        byteLimit: limit,
        timeoutMs: 15000,
        kind: 'youtube-media',
      });
      active.push(job);
      var promise = job.promise.then(
        function (r) {
          remove(job);
          row.status = r.code;
          row.bytes = r.data && r.data.byteLength;
          if (!r.data || r.data.byteLength > limit) throw fail('YouTube ikili veri sınırı');
          return r;
        },
        function (e) {
          remove(job);
          row.error = e.message;
          row.status = e.code;
          if (!e.cancelled) root.YTX_LAST_MEDIA_ERROR = { code: e.code || 0, message: e.message };
          throw e;
        }
      );
      promise.cancel = function () {
        job.cancel();
      };
      return promise;
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      root.removeEventListener('message', readyListener);
      waiting = [];
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      frame = null;
      frameReady = false;
    }
    return { fetch: fetchOnTv, cancel: cancel, allowed: allowed, binary: binary, dispose: dispose };
  }
  root.YoutubeNetwork = createClient();
  root.YoutubeNetwork.createClient = createClient;
})(window);
