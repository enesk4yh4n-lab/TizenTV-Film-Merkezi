/* Session-scoped optional media request adapter, behind the common HLS loader. */
(function (root) {
  'use strict';
  function open(source) {
    var closed = false, tasks = [], virtual = {}, bytes = 0, adapter = null;
    if (source.loaderId) {
      var config = JSON.stringify(source.loaderConfig || {});
      if (config.length > 16384) throw new Error('Loader configuration too large');
      var prefix = source.packageKey + '/';
      adapter = root.ResolverRegistry.loader(prefix + source.loaderId)({
        config: JSON.parse(config),
        request: function (url, options) { return transport(url, options); },
        put: function (id, text) {
          if (closed || !/^[a-zA-Z0-9-]{1,80}$/.test(id) || typeof text !== 'string') throw new Error('Invalid virtual resource');
          var url = 'https://film-virtual.invalid/' + id, previous = virtual[url] || '';
          bytes += root.FilmUpdateVerify.bytes(text).length - root.FilmUpdateVerify.bytes(previous).length;
          if (bytes > 1048576) throw new Error('Virtual media limit');
          virtual[url] = text; return url;
        }
      });
      if (!adapter || typeof adapter.load !== 'function' || typeof adapter.destroy !== 'function') throw new Error('Invalid media loader');
    }
    function transport(url, options) {
      options = options || {}; root.PackageNetwork.assert(source.packageKey, url);
      var p = root.FilmPlugins.loaded[source.packageKey], copy = {};
      Object.keys(options).forEach(function (k) { copy[k] = options[k]; });
      copy.packageKey = source.packageKey; copy.repositoryId = p.repo.id; copy.pluginId = p.manifest.id;
      return root.MediaNetwork.request(url, copy);
    }
    return {
      request: function (url, options) {
        if (closed) return { promise: Promise.reject(new Error('Media session closed')), cancel: function () {} };
        var deadline = typeof options.deadline === 'function' ? options.deadline() : options.deadline;
        var limit = options.byteLimit || (options.binary ? 8388608 : 2097152), task, timer, finish;
        if (Object.prototype.hasOwnProperty.call(virtual, url)) task = { promise: Promise.resolve({ data: virtual[url], status: 200, url: url }), cancel: function () {} };
        else if (/^https:\/\/film-virtual\.invalid\//.test(url)) task = { promise: Promise.reject(new Error('Virtual resource missing')), cancel: function () {} };
        else { try { task = adapter ? adapter.load(url, options) : transport(url, options); } catch (error) { return { promise: Promise.reject(error), cancel: function () {} }; } }
        if (!task || !task.promise || typeof task.cancel !== 'function') return { promise: Promise.reject(new Error('Invalid loader task')), cancel: function () {} };
        var wrapped = { promise: new Promise(function (resolve, reject) {
          var done = false;
          finish = function (error, response) {
            if (done) return; done = true; clearTimeout(timer);
            var i = tasks.indexOf(wrapped); if (i >= 0) tasks.splice(i, 1);
            if (error) reject(error); else resolve(response);
          };
          timer = setTimeout(function () { try { task.cancel(); } catch (ignore) {} finish(new Error('Media loader timeout')); }, Math.max(1, Math.min(options.timeoutMs || 30000, (deadline || Infinity) - Date.now())));
          task.promise.then(function (r) {
            if (closed) return finish(new Error('Media session closed'));
            var size = r && (typeof r.data === 'string' ? root.FilmUpdateVerify.bytes(r.data).length : r.data && r.data.byteLength);
            if (typeof size !== 'number' || size > limit || options.binary && !(r.data instanceof ArrayBuffer)) {
              var e = new Error('Invalid or oversized media loader response'); e.byteLimitExceeded = size > limit; e.byteLimit = limit; finish(e);
            } else finish(null, r);
          }, function (e) { finish(e); });
        }), cancel: function () { try { task.cancel(); } finally { var e = new Error('Cancelled'); e.cancelled = true; finish(e); } } };
        tasks.push(wrapped); return wrapped;
      },
      destroy: function () { if (closed) return; closed = true; tasks.slice().forEach(function (t) { try { t.cancel(); } catch (ignore) {} }); tasks = []; virtual = {}; bytes = 0; if (adapter) { try { adapter.destroy(); } catch (error) { if (root.FilmPlugins) root.FilmPlugins.note = 'Media loader cleanup failed: ' + error.message; } } adapter = null; }
    };
  }
  root.PackageMediaLoader = { open: open };
})(window);
