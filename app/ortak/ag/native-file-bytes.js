/* Read only our completed download files. No remote transport, server or new TV API. */
(function (root) {
  'use strict';
  var xhrUnavailable = false,
    report = { fast: 0, fallback: 0, lastFallback: null };
  function read(file) {
    var done = false,
      stream = null,
      xhr = null,
      timer = null,
      scheduled = null,
      resolveJob,
      rejectJob,
      started = Date.now(),
      size = file.fileSize,
      bytes,
      offset = 0;
    function close() {
      clearTimeout(timer);
      clearTimeout(scheduled);
      if (xhr) {
        var old = xhr;
        xhr = null;
        old.onload = old.onerror = old.onabort = null;
        try {
          old.abort();
        } catch (ignore) {}
      }
      if (stream) {
        try {
          stream.close();
        } catch (ignore2) {}
        stream = null;
      }
    }
    function finish(error, data, mode) {
      if (done) return;
      done = true;
      close();
      if (error) rejectJob(error);
      else {
        if (mode === 'fileXHR') report.fast++;
        resolveJob({ data: data, mode: mode, ms: Date.now() - started });
      }
    }
    function chunk() {
      scheduled = null;
      if (done) return;
      try {
        var count = Math.min(65536, size - offset),
          part = stream.readBytes(count);
        if (!part || part.length !== count) throw Error('Eksik medya verisi');
        bytes.set(part, offset);
        offset += count;
        if (offset < size) scheduled = setTimeout(chunk, 0);
        else finish(null, bytes.buffer, 'readBytes');
      } catch (error) {
        finish(error);
      }
    }
    function fallback(disable, reason) {
      if (done) return;
      if (disable === true) xhrUnavailable = true;
      report.fallback++;
      report.lastFallback = reason || 'file-xhr';
      close();
      try {
        bytes = new Uint8Array(size);
        file.openStream(
          'r',
          function (s) {
            if (done) {
              try {
                s.close();
              } catch (ignore) {}
              return;
            }
            stream = s;
            chunk();
          },
          function (e) {
            finish(Error('Medya dosyası açılamadı: ' + e.name));
          }
        );
      } catch (error) {
        finish(error);
      }
    }
    var promise = new Promise(function (resolve, reject) {
      resolveJob = resolve;
      rejectJob = reject;
      if (typeof size !== 'number' || size <= 0 || size > 8 * 1024 * 1024) {
        finish(Error('Medya dosyası boyut sınırı'));
        return;
      }
      var uri = '';
      try {
        if (file.toURI) uri = file.toURI();
      } catch (ignore) {}
      if (
        xhrUnavailable ||
        !root.XMLHttpRequest ||
        !/^file:\/\/\/[^?#]*\/media_\d+_\d+\.bin(?:\.[a-z0-9]{1,8})?$/.test(uri)
      ) {
        fallback(
          false,
          !uri
            ? 'no-uri'
            : xhrUnavailable
              ? 'unavailable'
              : 'uri-shape:' +
                uri.split(':')[0] +
                ':' +
                uri.slice(uri.lastIndexOf('/') + 1).replace(/\d/g, '#')
        );
        return;
      }
      try {
        xhr = new root.XMLHttpRequest();
        xhr.open('GET', uri, true);
        xhr.responseType = 'arraybuffer';
        timer = setTimeout(function () {
          fallback(true, 'timeout');
        }, 2500);
        xhr.onload = function () {
          if (done) return;
          var data = xhr.response;
          if ((xhr.status !== 0 && xhr.status !== 200) || !data || data.byteLength !== size) {
            fallback(
              true,
              'response-status:' + xhr.status + ':size:' + (data && data.byteLength) + '/' + size
            );
            return;
          }
          finish(null, data, 'fileXHR');
        };
        xhr.onerror = function () {
          fallback(true, 'xhr-error');
        };
        xhr.onabort = function () {
          if (!done) fallback(true, 'xhr-abort');
        };
        xhr.send();
      } catch (ignore2) {
        fallback(true, 'xhr-exception:' + ignore2.name);
      }
    });
    return {
      promise: promise,
      cancel: function () {
        var error = Error('İptal edildi');
        error.cancelled = true;
        finish(error);
      }
    };
  }
  root.NativeFileBytes = {
    read: read,
    report: function () {
      return { fast: report.fast, fallback: report.fallback, lastFallback: report.lastFallback };
    }
  };
})(window);
