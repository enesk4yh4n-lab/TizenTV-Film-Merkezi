/* Opt-in startup contract for a future WGT adapter. Loading this file does nothing. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.first-run-core-handoff.v1';
  function Service(options) {
    options = options || {};
    this.core = options.core; this.storage = options.storage;
    this.notify = options.notify || function () {};
    this.task = null; this.waiter = null;
    this.state = { phase: 'idle', actions: [] };
  }
  Service.prototype.emit = function (phase, error, detail) {
    this.state = { phase: phase, error: error && error.message || '', detail: detail || '', actions: phase === 'choice' ? ['retry', 'continue'] : [] };
    try { this.notify(this.state); } catch (ignore) {}
  };
  Service.prototype.start = function (options) {
    if (this.task) return this.task;
    var self = this;
    /* Caller must explicitly opt in AND identify an incomplete first installation. */
    if (!options || options.enabled !== true || options.firstInstall !== true) return Promise.resolve({ action: 'continue', reason: 'inactive' });
    this.task = this.resume().then(function (result) { return result || self.attempt(); });
    return this.task;
  };
  Service.prototype.resume = function () {
    var self = this, raw, marker;
    try {
      if (!this.storage) throw Error('Startup transition storage unavailable');
      raw = this.storage.getItem(KEY);
      if (!raw) return Promise.resolve(null);
      if (raw.length > 512) throw Error('Startup transition record invalid');
      marker = JSON.parse(raw);
      if (!marker || marker.schemaVersion !== 1 || typeof marker.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(marker.version) || !/^[a-f0-9]{64}$/.test(marker.hash)) throw Error('Startup transition record invalid');
    } catch (e) { return this.choice(e); }
    var record = this.core && this.core.state && this.core.state.active;
    return Promise.resolve().then(function () { return record && typeof record.text === 'string' ? root.FilmUpdateVerify.sha(record.text) : ''; }).then(function (hash) {
      self.storage.removeItem(KEY);
      /* An unsuccessful boot/rollback must not restart the same automatic update. */
      var restored = hash !== marker.hash;
      self.emit('ready', null, restored ? 'previous-core' : 'updated-core');
      return { action: 'continue', reason: restored ? 'previous-core' : 'updated-core' };
    }, function (e) { return self.choice(e); }).catch(function (e) { return self.choice(e); });
  };
  Service.prototype.attempt = function () {
    var self = this, core = this.core, pointer, markerWritten = false;
    function idle() { if (!core || core.busy || core.checking || core.blocked || core.app && core.app.controller.content) throw Error('Startup core update unavailable or busy'); }
    return Promise.resolve().then(function () {
      idle(); self.emit('checking'); return core.check();
    }).then(function (status) {
      if (!status.available) { self.emit('ready'); return { action: 'continue', reason: 'current' }; }
      pointer = core.found;
      if (!pointer || !/^[a-f0-9]{64}$/.test(pointer.manifestSha256)) throw Error('Startup update pointer invalid');
      self.emit('downloading', null, status.available);
      return core.download().then(function () {
        pointer = core.found || pointer;
        /* download() verifies the manifest, signatures and every file before pending. */
        var pending = core.state && core.state.pending;
        if (!pending || typeof pending.text !== 'string') throw Error('Verified pending core missing');
        self.emit('verifying');
        return root.FilmUpdateVerify.sha(pending.text).then(function (hash) {
          if (hash !== pointer.manifestSha256) throw Error('Pending core hash mismatch');
          var marker = JSON.stringify({ schemaVersion: 1, version: status.available, hash: hash });
          self.storage.setItem(KEY, marker);
          markerWritten = true;
          if (self.storage.getItem(KEY) !== marker) throw Error('Startup transition record not saved');
          self.emit('applying'); return core.apply();
        });
      }).then(function () {
        self.emit('reload'); return { action: 'reload', reason: 'updated', version: status.available };
      });
    }).catch(function (error) {
      if (markerWritten) { try { self.storage.removeItem(KEY); } catch (ignore) {} }
      return self.choice(error);
    });
  };
  Service.prototype.choice = function (error) {
    var self = this;
    return new Promise(function (resolve) { self.waiter = resolve; self.emit('choice', error); });
  };
  Service.prototype.retry = function () {
    if (!this.waiter) return false;
    var done = this.waiter; this.waiter = null;
    var self = this;
    done(this.resume().then(function (result) { return result || self.attempt(); })); return true;
  };
  Service.prototype.continueCurrent = function () {
    if (!this.waiter) return false;
    var done = this.waiter; this.waiter = null;
    this.emit('ready'); done({ action: 'continue', reason: 'user-choice' }); return true;
  };
  Service.key = KEY;
  root.FilmFirstRunUpdate = Service;
})(window);
