/* Read-only summaries from signed GitHub indexes. */
(function (root) {
  'use strict';
  var cache = Object.create(null), nextId = 0;
  function Service() { this.generation = 0; this.active = []; }

  Service.prototype.cancel = function () {
    this.generation++;
    this.active.slice().forEach(function (stop) { stop(); });
  };

  Service.prototype.read = function (item, token, deadline) {
    var self = this, search = root.FilmRepositorySearch, schema = root.FilmPluginSchema;
    var transport = root.FilmNativeTLS, key = item.fullName + '|' + item.branch, cached = cache[key];
    var expires = Math.min(deadline, Date.now() + 7000), request, reader, timer, stopped = false, rejectStop;
    if (cached && Date.now() - cached.at < 300000) return Promise.resolve(cached.value);

    function check() {
      if (stopped || token !== self.generation || Date.now() >= expires) throw Error('Repository count cancelled');
    }
    function stop() {
      if (stopped) return;
      stopped = true;
      if (reader) reader.cancel();
      if (request) request.cancel();
      rejectStop(Error('Repository count cancelled'));
    }
    function track(task) {
      request = task;
      return task.promise.then(function (response) {
        request = null;
        check();
        return response;
      }, function (error) {
        request = null;
        throw error;
      });
    }
    function text(address, limit, useNative) {
      function browser() {
        check();
        return track(search.httpsText(address, Math.max(1, expires - Date.now()), limit));
      }
      check();
      var result = useNative ? track(transport.request(address, '', {
        timeoutMs: Math.max(1, Math.min(3000, expires - Date.now())),
        byteLimit: limit
      })).catch(function (error) {
        if (error.stage === 'http' || error.byteLimitExceeded) throw error;
        return browser();
      }) : browser();
      return result.then(function (response) {
        var status = response && (response.status || response.statusCode);
        if (status !== 200 || typeof response.body !== 'string' || root.FilmUpdateVerify.bytes(response.body).length > limit) {
          var error = Error('Invalid repository summary response');
          error.code = status;
          throw error;
        }
        return response.body;
      });
    }
    function indexAt(address) {
      var id = 'count-' + Date.now().toString(36) + '-' + (++nextId), registered = false, raw, index;
      function cleanup() {
        return registered ? transport.removeRepository(id).catch(function () {}) : Promise.resolve();
      }
      function register() {
        if (!transport || !transport.supported()) return Promise.resolve();
        return new Promise(function (resolve) {
          var decided = false, wait = root.setTimeout(settle, Math.max(1, Math.min(2000, expires - Date.now())));
          function settle() {
            if (decided) return;
            decided = true;
            root.clearTimeout(wait);
            resolve();
          }
          transport.registerRepository(id, address, '').then(function () {
            if (decided) { transport.removeRepository(id).catch(function () {}); return; }
            registered = true;
            settle();
          }, settle);
        });
      }
      return register().then(function () {
        return text(address, 65536, registered).catch(function (error) {
          if (error.code === 404) error.indexMissing = true;
          throw error;
        });
      }).then(function (value) {
        raw = value;
        index = schema.repository(raw);
        return text(schema.signatureAddress(address), 1024, registered);
      }).then(function (signature) {
        check();
        var trust = new root.FilmUpdateVerify.Trust(index.publicKey);
        return trust.key.then(function (k) {
          if (k.algorithm.modulusLength !== 2048) throw Error('Invalid publisher key');
          return trust.verify(raw, signature);
        });
      }).then(function () {
        return cleanup().then(function () {
          return { count: index.plugins.filter(function (plugin) { return plugin.type === 'site'; }).length, revision: index.revision, address: address };
        });
      }, function (error) {
        return cleanup().then(function () { throw error; });
      });
    }

    var cancelled = new Promise(function (resolve, reject) { rejectStop = reject; });
    self.active.push(stop);
    timer = root.setTimeout(stop, Math.max(1, expires - Date.now()));
    var work = Promise.resolve().then(function () {
      check();
      var address = search.indexAddress(item);
      return indexAt(address).catch(function (error) {
        if (!error.indexMissing) throw error;
        check();
        reader = new search();
        return reader.address(item).then(function (alternate) {
          check();
          if (alternate === address) throw error;
          return indexAt(alternate);
        });
      });
    });
    function finish() {
      root.clearTimeout(timer);
      var at = self.active.indexOf(stop);
      if (at >= 0) self.active.splice(at, 1);
    }
    return Promise.race([work, cancelled]).then(function (value) {
      finish();
      check();
      cache[key] = { at: Date.now(), value: value };
      var keys = Object.keys(cache);
      if (keys.length > 40) delete cache[keys[0]];
      return value;
    }, function (error) {
      finish();
      throw error;
    });
  };

  Service.prototype.load = function (items, notify) {
    this.cancel();
    var self = this, token = this.generation, deadline = Date.now() + 15000, position = 0;
    var list = items.slice(0, 10);
    function next() {
      if (token !== self.generation || position >= list.length) return Promise.resolve();
      var item = list[position++];
      var reading = Date.now() < deadline ? self.read(item, token, deadline) : Promise.resolve(null);
      return reading.catch(function () { return null; }).then(function (value) {
        if (token !== self.generation) return;
        notify(item, value);
        return next();
      });
    }
    return Promise.all([next(), next()]);
  };

  root.FilmRepositoryCounts = Service;
})(window);
