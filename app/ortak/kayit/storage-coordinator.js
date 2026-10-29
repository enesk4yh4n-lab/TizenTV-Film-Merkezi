/* Shared storage policy. Disposable catalog data never evicts user records. */
(function (root) {
  'use strict';
  var CACHE = 'chainprobe.catalog.cache.v1';
  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }
  function fault(message) {
    var error = new Error(message);
    error.storageUnavailable = true;
    return error;
  }

  function Coordinator(storage, notify) {
    this.raw = storage;
    this.notify = notify || function () {};
    this.limit = 1024 * 1024;
    this.policies = {};
    this.blocked = {};
    this.warned = {};
  }
  Coordinator.prototype.warn = function (key, message) {
    if (!this.warned[key]) {
      this.warned[key] = true;
      this.notify(message);
    }
  };
  Coordinator.prototype.getItem = function (key) {
    return this.raw ? this.raw.getItem(key) : null;
  };
  Coordinator.prototype.removeItem = function (key) {
    if (this.blocked[key]) throw fault('Okunamayan kayıt korunuyor.');
    if (!this.raw) throw fault('Depolama kullanılamıyor.');
    this.raw.removeItem(key);
  };
  Coordinator.prototype.scope = function (prefix) {
    var self = this;
    return {
      getItem: function (key) {
        return self.getItem(prefix + key);
      },
      setItem: function (key, value) {
        self.setItem(prefix + key, value);
      },
      removeItem: function (key) {
        self.removeItem(prefix + key);
      },
      protect: function (key) {
        self.protect(prefix + key);
      },
      registerCache: function (key, policy) {
        self.registerCache(prefix + key, policy);
      }
    };
  };
  Coordinator.prototype.protect = function (key) {
    this.blocked[key] = true;
    this.warn(
      key,
      'Bir kayıt okunamadı veya sürümü tanınmıyor; mevcut veri korunuyor. Bu oturum kullanılabilir.'
    );
  };
  Coordinator.prototype.registerCache = function (key, policy) {
    this.policies[key] = policy;
  };
  Coordinator.prototype.discover = function () {
    if (!this.raw) return;
    var self = this,
      keys = [],
      i;
    try {
      for (i = 0; i < this.raw.length; i++) keys.push(this.raw.key(i));
    } catch (ignore) {
      return;
    }
    keys.forEach(function (key) {
      if (!key || key.slice(-CACHE.length) !== CACHE || self.policies[key] || self.blocked[key])
        return;
      try {
        var data = JSON.parse(self.raw.getItem(key));
        if (!object(data) || data.version !== 1 || !object(data.items)) return;
        self.policies[key] = {
          candidates: function () {
            return Object.keys(data.items).map(function (id) {
              var row = data.items[id];
              return {
                id: id,
                at: (row && (row.used || row.at)) || 0,
                bytes: JSON.stringify(row).length * 2 + id.length * 2
              };
            });
          },
          evict: function (id) {
            delete data.items[id];
          },
          serialize: function () {
            return JSON.stringify(data);
          }
        };
      } catch (ignore) {}
    });
  };
  Coordinator.prototype.trim = function (all) {
    var self = this,
      candidates = [],
      bytes = 0,
      changed = {};
    this.discover();
    Object.keys(this.policies).forEach(function (key) {
      if (self.blocked[key]) return;
      var policy = self.policies[key];
      policy.candidates().forEach(function (item) {
        bytes += item.bytes;
        candidates.push({ key: key, item: item });
      });
    });
    candidates.sort(function (a, b) {
      return a.item.at - b.item.at;
    });
    candidates.some(function (candidate) {
      if (!all && bytes <= self.limit) return true;
      self.policies[candidate.key].evict(candidate.item.id);
      bytes -= candidate.item.bytes;
      changed[candidate.key] = true;
      return false;
    });
    Object.keys(changed).forEach(function (key) {
      try {
        self.raw.setItem(key, self.policies[key].serialize());
      } catch (ignore) {
        /* Pure caches can be removed; mixed user documents must stay intact. */
        if (key.slice(-CACHE.length) === CACHE) {
          try {
            self.raw.removeItem(key);
          } catch (ignore2) {}
        }
      }
    });
  };
  Coordinator.prototype.setItem = function (key, value) {
    if (this.blocked[key]) throw fault('Okunamayan kayıt korunuyor.');
    if (!this.raw) throw fault('Depolama kullanılamıyor.');
    this.trim(false);
    var policy = this.policies[key];
    if (policy) value = policy.serialize();
    try {
      this.raw.setItem(key, value);
    } catch (first) {
      this.trim(true);
      if (policy) value = policy.serialize();
      try {
        this.raw.setItem(key, value);
      } catch (second) {
        this.warn(key, 'Değişiklik kaydedilemedi; bu oturumda korunuyor.');
        throw second;
      }
    }
  };

  function read(storage, key, fallback, valid, notify) {
    try {
      var text = storage && storage.getItem(key);
      if (text === null || text === undefined || text === '') return fallback;
      var value = JSON.parse(text);
      if (!object(value) || value.version !== 1 || (valid && !valid(value)))
        throw fault('Geçersiz kayıt');
      return value;
    } catch (error) {
      if (storage && storage.protect) storage.protect(key);
      else if (notify) notify('Kayıt okunamadı; bu oturum kullanılabilir.');
      return fallback;
    }
  }
  root.StorageCoordinator = Coordinator;
  root.SafeStorage = { read: read, object: object };
})(window);
