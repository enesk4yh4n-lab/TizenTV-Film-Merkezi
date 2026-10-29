/* The TV SDK can retain completed DownloadCallback objects for the app lifetime.
 * Keep those objects separate from request/promise/media closures. */
(function (root) {
  'use strict';
  function noop() {}
  function lateCompleted(id, path) {
    if (typeof path !== 'string' || !path) return;
    try {
      root.tizen.filesystem.resolve(
        path,
        function (file) {
          if (file.parent) file.parent.deleteFile(file.fullPath, noop, noop);
        },
        noop,
        'rw'
      );
    } catch (ignore) {}
  }
  root.NativeDownloadCallbacks = {
    create: function (callbacks) {
      var listener;
      function forward(name, args) {
        var fn = callbacks && callbacks[name];
        if (fn) return fn.apply(null, args);
      }
      listener = {
        onprogress: function () {
          return forward('onprogress', arguments);
        },
        onpaused: function () {
          return forward('onpaused', arguments);
        },
        oncanceled: function () {
          return forward('oncanceled', arguments);
        },
        oncompleted: function () {
          if (!callbacks) return lateCompleted.apply(null, arguments);
          return forward('oncompleted', arguments);
        },
        onfailed: function () {
          return forward('onfailed', arguments);
        }
      };
      return {
        listener: listener,
        release: function () {
          callbacks = null;
          // Some SDKs retain the object, others copy its functions. The null
          // gate protects both; shared terminal functions also release gates.
          try {
            listener.onprogress =
              listener.onpaused =
              listener.oncanceled =
              listener.onfailed =
                noop;
            listener.oncompleted = lateCompleted;
          } catch (ignore) {}
        }
      };
    }
  };
})(window);

(function (root) {
  'use strict';
  var seq = 0,
    LIMIT = 2 * 1024 * 1024;

  function createClient(options) {
    var destination = (options && options.destination) || 'documents';
    var active = [],
      preferXHR = !!(options && options.preferXHR),
      generation = 0,
      client;
    function get(url, referer, forceXHR, extraHeaders, postBody, policy) {
      return new Promise(function (resolve, reject) {
        var done = false,
          id = null,
          x = null,
          callbackScope = null,
          timer = null,
          job = {
            cancel: function () {
              finish(new Error('Iptal edildi'));
            }
          };
        active.push(job);
        function cleanup(path) {
          try {
            tizen.filesystem.resolve(
              path,
              function (f) {
                if (f.parent)
                  f.parent.deleteFile(
                    f.fullPath,
                    function () {},
                    function () {}
                  );
              },
              function () {},
              'rw'
            );
          } catch (ignore) {}
        }
        function finish(error, value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (callbackScope) {
            callbackScope.release();
            callbackScope = null;
          }

          active.splice(active.indexOf(job), 1);
          if (error) {
            try {
              if (id !== null) tizen.download.cancel(id);
              if (x) x.abort();
            } catch (ignore) {}
            reject(error);
          } else resolve(value);
        }
        function validate(body, method) {
          if (body.length > LIMIT) return finish(new Error('Yanit boyutu siniri'));
          if (
            /<title[^>]*>\s*(Just a moment|Attention Required)|cf-browser-verification|cf-mitigated/i.test(
              body
            )
          )
            return finish(new Error('Dogrulama/erisim engeli'));
          finish(null, { body: body, method: method, url: url });
        }
        var ms = policy
          ? Math.max(
              1,
              Math.min(policy.timeoutMs || 30000, (policy.deadline || Infinity) - Date.now())
            )
          : forceXHR
            ? 16000
            : 10000;
        timer = setTimeout(function () {
          finish(
            new Error(
              (forceXHR ? 'XHR' : 'Native ag') + ' zaman asimi (' + Math.ceil(ms / 1000) + ' sn)'
            )
          );
        }, ms);
        if (
          !forceXHR &&
          root.tizen &&
          tizen.download &&
          tizen.DownloadRequest &&
          tizen.filesystem
        ) {
          try {
            if (
              tizen.systeminfo &&
              tizen.systeminfo.getCapability &&
              tizen.systeminfo.getCapability('http://tizen.org/feature/download') === false
            )
              throw new Error('Download capability false');
            var headers = { Accept: '*/*' };
            if (referer) headers.Referer = referer;
            Object.keys(extraHeaders || {}).forEach(function (key) {
              headers[key] = extraHeaders[key];
            });
            var req = new tizen.DownloadRequest(
              url,
              destination,
              'chain_' + Date.now() + '_' + ++seq + '.txt',
              'ALL',
              headers
            );
            var scope = (callbackScope = root.NativeDownloadCallbacks.create({
              onprogress: function (i, r) {
                if (r > LIMIT) finish(new Error('Indirme boyutu siniri'));
              },
              oncompleted: function (i, path) {
                if (done) {
                  cleanup(path);
                  return;
                }
                tizen.filesystem.resolve(
                  path,
                  function (file) {
                    if (file.fileSize > LIMIT) {
                      cleanup(path);
                      finish(new Error('Dosya boyutu siniri'));
                      return;
                    }
                    file.readAsText(
                      function (body) {
                        cleanup(path);
                        if (!done) validate(body, 'NativeDownload');
                      },
                      function (e) {
                        cleanup(path);
                        finish(new Error('Dosya okuma: ' + e.name));
                      },
                      'UTF-8'
                    );
                  },
                  function (e) {
                    cleanup(path);
                    finish(new Error('Dosya erisimi: ' + e.name));
                  },
                  'rw'
                );
              },
              onfailed: function (i, e) {
                finish(new Error('NativeDownload: ' + e.name + ' ' + (e.message || '')));
              }
            }));
            id = tizen.download.start(req, scope.listener);
            if (id === -1)
              finish(
                new Error('Ag baglantisi yok')
              ); /* Callback-owned state; never synchronously query the download service. */
            return;
          } catch (e) {
            finish(new Error('Native API: ' + e.message));
            return;
          }
        }
        try {
          x = new XMLHttpRequest();
          x.open(postBody === undefined ? 'GET' : 'POST', url, true);
          Object.keys(extraHeaders || {}).forEach(function (key) {
            if (!/^(referer|origin|user-agent|cookie|host)$/i.test(key) && x.setRequestHeader)
              x.setRequestHeader(key, extraHeaders[key]);
          });
          x.onload = function () {
            if (x.status >= 200 && x.status < 300)
              validate(x.responseText, 'XHR (Referer tarayici kontrolunde)');
            else finish(new Error('HTTP ' + x.status));
          };
          x.onerror = function () {
            finish(new Error('XHR ag/CORS/TLS'));
          };
          x.send(postBody === undefined ? null : postBody);
        } catch (e) {
          finish(e);
        }
      });
    }
    function remember(result) {
      preferXHR = /^XHR/.test(result.method);
      return result;
    }
    client = {
      get: function (url, referer, extraHeaders, policy) {
        var firstXHR = preferXHR,
          token = generation;
        return get(url, referer, firstXHR, extraHeaders, undefined, policy)
          .then(remember)
          .catch(function (error) {
            if (
              token !== generation ||
              !root.tizen ||
              /Iptal|boyutu|erisim engeli/.test(error.message) ||
              (policy && Date.now() >= policy.deadline)
            )
              throw error;
            if (client.onstatus)
              client.onstatus(
                error.message +
                  '; ' +
                  (firstXHR ? 'Native alternatif' : 'XHR fallback') +
                  ' deneniyor'
              );
            return get(url, referer, !firstXHR, extraHeaders, undefined, policy)
              .then(remember)
              .catch(function (nextError) {
                throw new Error(error.message + '; ' + nextError.message);
              });
          });
      },
      post: function (url, body, headers, policy) {
        return get(
          url,
          '',
          true,
          headers,
          typeof body === 'string' ? body : JSON.stringify(body),
          policy
        );
      },
      cancel: function () {
        generation++;
        active.slice().forEach(function (job) {
          job.cancel();
        });
      }
    };
    return client;
  }
  root.ChainNetwork = createClient();
  root.ChainNetwork.createClient = createClient;
})(window);
