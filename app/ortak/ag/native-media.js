/* Native binary/text transport for the HLS loader; no downloaded code execution. */
(function (root) {
  'use strict';
  var serial = 0;
  function sizeError(limit) {
    var error = new Error('[media-size-limit] Medya parcasi boyut siniri: ' + limit);
    error.byteLimitExceeded = true;
    error.byteLimit = limit;
    return error;
  }

  function request(url, options) {
    options = options || {};
    var cancelled = false,
      cancelJob = function () {},
      promise = new Promise(function (resolve, reject) {
        var done = false,
          id = null,
          callbackScope = null,
          timer = null,
          firstTimer = null,
          readTimer = null,
          streamHandle = null,
          fileJob = null,
          fileReadMode = 'readBytes',
          path = null,
          reading = false,
          mimeType = '',
          received = 0,
          state = 'baslatiliyor',
          timeout = options.timeoutMs || 25000,
          limit = options.byteLimit || (options.binary ? 8 * 1024 * 1024 : 2 * 1024 * 1024),
          times = { start: Date.now(), first: 0, downloadEnd: 0, readStart: 0, readEnd: 0 };
        function status(message) {
          if (!done && options.onstatus) options.onstatus(message);
        }
        function unavailable(message) {
          var e = new Error(message);
          e.nativeUnavailable = true;
          return e;
        }
        function cleanup() {
          if (!path || reading) return;
          var remove = path;
          path = null;
          try {
            tizen.filesystem.resolve(
              remove,
              function (file) {
                if (file.parent)
                  file.parent.deleteFile(
                    file.fullPath,
                    function () {},
                    function () {}
                  );
              },
              function () {},
              'rw'
            );
          } catch (ignore) {}
        }
        function closeStream() {
          if (!streamHandle) return;
          var current = streamHandle;
          streamHandle = null;
          try {
            current.close();
          } catch (ignore) {}
          reading = false;
        }
        function finish(error, data) {
          if (done) {
            cleanup();
            return;
          }
          done = true;
          if (callbackScope) {
            callbackScope.release();
            callbackScope = null;
          }
          if (fileJob) {
            fileJob.cancel();
            fileJob = null;
            reading = false;
          }
          times.readEnd = Date.now();
          if (data)
            data.timings = {
              firstByteMs: times.first ? times.first - times.start : null,
              downloadMs: times.downloadEnd ? times.downloadEnd - times.start : null,
              fileReadMs: times.readStart ? times.readEnd - times.readStart : null,
              totalMs: times.readEnd - times.start,
              bytes: received,
              fileReadMode: fileReadMode
            };

          clearTimeout(timer);
          clearTimeout(firstTimer);
          clearTimeout(readTimer);
          closeStream();
          cleanup();
          if (error) {
            try {
              if (id !== null && id >= 0) tizen.download.cancel(id);
            } catch (ignore) {}
            reject(error);
          } else resolve(data);
        }
        cancelJob = function () {
          cancelled = true;
          finish(new Error('Iptal edildi'));
        };
        if (!/^https?:\/\//i.test(url)) {
          finish(new Error('Desteklenmeyen medya adresi'));
          return;
        }
        if (!root.tizen || !tizen.download || !tizen.DownloadRequest || !tizen.filesystem) {
          finish(unavailable('Native medya API mevcut degil'));
          return;
        }
        try {
          if (
            tizen.systeminfo &&
            tizen.systeminfo.getCapability &&
            tizen.systeminfo.getCapability('http://tizen.org/feature/download') === false
          ) {
            finish(unavailable('Download capability false'));
            return;
          }
        } catch (ignore) {}
        timer = setTimeout(function () {
          finish(
            new Error(
              'Native medya ' +
                timeout / 1000 +
                ' sn zaman asimi; durum ' +
                state +
                '; alinan ' +
                received +
                ' bayt'
            )
          );
        }, timeout);
        if (options.firstByteTimeoutMs)
          firstTimer = setTimeout(
            function () {
              finish(new Error('Native ilk veri zaman asimi'));
            },
            Math.min(timeout, options.firstByteTimeoutMs)
          );
        try {
          var headers = { Accept: '*/*' };
          if (options.userAgent) headers['User-Agent'] = options.userAgent;
          if (options.referer) headers.Referer = options.referer;
          var scope = (callbackScope = root.NativeDownloadCallbacks.create({
            onprogress: function (job, size, total) {
              if (done) return;

              received = size;
              state = 'DOWNLOADING';
              if (size > limit) {
                finish(sizeError(limit));
                return;
              }
              if (size > 0) {
                if (!times.first) times.first = Date.now();
                clearTimeout(firstTimer);
                if (!done && options.onprogress) options.onprogress(size, total || 0);
              }
            },
            onpaused: function () {
              finish(new Error('Native indirme duraklatildi (PAUSED)'));
            },
            oncanceled: function () {
              finish(new Error('Native indirme iptal edildi (CANCELED)'));
            },
            onfailed: function (job, error) {
              finish(
                new Error(
                  'Native medya: ' + error.name + (error.message ? ' ' + error.message : '')
                )
              );
            },
            oncompleted: function (job, filePath) {
              path = filePath;
              times.downloadEnd = Date.now();
              times.readStart = Date.now();
              state = 'dosya okunuyor';
              clearTimeout(firstTimer);
              if (done) {
                cleanup();
                return;
              }
              try {
                if (tizen.download.getMIMEType) mimeType = tizen.download.getMIMEType(job) || '';
              } catch (ignore) {}
              try {
                tizen.filesystem.resolve(
                  path,
                  function (file) {
                    if (done) {
                      cleanup();
                      return;
                    }
                    if (file.fileSize > limit) {
                      finish(sizeError(limit));
                      return;
                    }
                    if (typeof file.fileSize !== 'number' || file.fileSize < 0) {
                      finish(new Error('Medya dosyasi boyut siniri'));
                      return;
                    }
                    reading = true;
                    try {
                      if (!options.binary) {
                        file.readAsText(
                          function (text) {
                            reading = false;
                            finish(null, { data: text, url: url, mimeType: mimeType });
                          },
                          function (e) {
                            reading = false;
                            finish(new Error('Playlist okuma: ' + e.name));
                          },
                          'UTF-8'
                        );
                        return;
                      }
                      if (root.NativeFileBytes) {
                        fileJob = root.NativeFileBytes.read(file);
                        fileJob.promise.then(
                          function (result) {
                            fileJob = null;
                            reading = false;
                            fileReadMode = result.mode;
                            finish(null, { data: result.data, url: url, mimeType: mimeType });
                          },
                          function (error) {
                            fileJob = null;
                            reading = false;
                            finish(error);
                          }
                        );
                        return;
                      }
                      file.openStream(
                        'r',
                        function (stream) {
                          if (done) {
                            try {
                              stream.close();
                            } catch (ignore) {}
                            reading = false;
                            cleanup();
                            return;
                          }
                          streamHandle = stream;
                          var data,
                            offset = 0;
                          try {
                            data = new Uint8Array(file.fileSize);
                          } catch (e) {
                            finish(new Error('Medya bellegi ayrilamadi'));
                            return;
                          }
                          function chunk() {
                            readTimer = null;
                            if (done) return;
                            try {
                              var count = Math.min(65536, file.fileSize - offset),
                                bytes = stream.readBytes(count);
                              if (!bytes || bytes.length !== count)
                                throw new Error('Eksik medya verisi');
                              data.set(bytes, offset);
                              offset += bytes.length;
                              if (offset < file.fileSize) {
                                readTimer = setTimeout(chunk, 0);
                                return;
                              }
                              closeStream();
                              finish(null, { data: data.buffer, url: url, mimeType: mimeType });
                            } catch (e) {
                              finish(new Error('Ikili medya okuma: ' + e.message));
                            }
                          }
                          chunk();
                        },
                        function (e) {
                          reading = false;
                          finish(new Error('Medya dosyasi acma: ' + e.name));
                        }
                      );
                    } catch (e) {
                      reading = false;
                      finish(new Error('Medya dosyasi okuma: ' + e.message));
                    }
                  },
                  function (e) {
                    finish(new Error('Medya dosyasi erisimi: ' + e.name));
                  },
                  'rw'
                );
              } catch (e) {
                finish(e);
              }
            }
          }));
          id = tizen.download.start(
            new tizen.DownloadRequest(
              url,
              options.destination || 'documents',
              'media_' + Date.now() + '_' + ++serial + '.bin',
              'ALL',
              headers
            ),
            scope.listener
          );
          if (typeof id !== 'number' || id < 0) {
            finish(
              unavailable(
                'Native indirme baslatilamadi; is kimligi ' + id + ' (ag kullanilamiyor olabilir)'
              )
            );
            return;
          }
          // Completion, progress and failure callbacks own state; avoid synchronous bridge polling.
        } catch (e) {
          finish(e);
        }
      });
    return {
      promise: promise,
      cancel: function () {
        if (!cancelled) cancelJob();
      }
    };
  }
  root.NativeMedia = { request: request };
})(window);
