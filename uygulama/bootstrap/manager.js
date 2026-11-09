/* Fixed, signed, opt-in component updates. One coherent manifest per launch. */
(function (root) {
  'use strict';
  var V = root.FilmUpdateVerify, CONFIG = root.FilmUpdateConfig;
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function local(path) { return new Promise(function (resolve, reject) { var x = new XMLHttpRequest(); x.open('GET', path, true); x.timeout = 15000; x.ontimeout = function () { reject(new Error('Paket dosyası okuma süresi doldu: ' + path)); }; x.onload = function () { if (x.status === 0 || x.status === 200) resolve(x.responseText); else reject(new Error('Paket dosyası okunamadı: ' + path)); }; x.onerror = function () { reject(new Error('Paket dosyası okunamadı: ' + path)); }; x.send(); }); }
  function serial(items, operation) { var p = Promise.resolve(); items.forEach(function (v, i) { p = p.then(function () { return operation(v, i); }); }); return p; }
  function Manager(options) {
    options = options || {};
    this.config = clone(options.config || CONFIG); this.channels = new root.FilmCoreChannel(this.config); this.bootStopped = false; this.migrationOffer = null; this.storage = options.storage || new root.FilmUpdateStore(); this.trust = new V.Trust(this.config.publicKey);
    this.client = options.client || root.ChainNetwork.createClient({ preferXHR: true, destination: 'downloads' }); this.local = options.local || local;
    this.state = { schemaVersion: 1, seq: 0, active: null, previous: null, pending: null, booting: false, revision: 0, checkedAt: 0 };
    this.selected = null; this.baseline = null; this.baselineRecord = null; this.entries = {}; this.groups = []; this.found = null; this.busy = ''; this.note = ''; this.blocked = false; this.generation = 0; this.writes = Promise.resolve(); this.checking = null; this.downloading = null; this.app = null; this.healthy = false; this.watchdog = null;
  }
  Manager.prototype.record = function (record) { var self = this; if (!record || typeof record.text !== 'string' || record.text.length > 131072) return Promise.reject(new Error('Bileşen kaydı geçersiz.')); return this.channels.verifyRecord(record).then(function (key) { var m = V.manifest(record.text, self.config.appVersion); m._signer = key; return m; }); };
  Manager.prototype.commit = function (patch) {
    var self = this;
    if (this.bootStopped) return Promise.reject(new Error('Başlangıç iptal edildi.'));
    if (this.blocked) return Promise.reject(new Error('Güncelleme alanı kullanılamıyor.'));
    var task = this.writes.then(function () { if (self.bootStopped) throw new Error('Başlangıç iptal edildi.'); var next = clone(self.state); Object.keys(patch).forEach(function (key) { next[key] = patch[key]; }); next.seq++; return self.storage.write(next.seq % 2 ? 'state-a.json' : 'state-b.json', JSON.stringify(next)).then(function () { if (self.bootStopped) throw new Error('Başlangıç iptal edildi.'); self.state = next; }); });
    this.writes = task.then(function () {}, function () {}); return task;
  };
  Manager.prototype.init = function (bundledOnly) {
    var self = this;
    return Promise.all([this.local('bundled/manifest.json'), this.local('bundled/manifest.sig')]).then(function (values) { self.baselineRecord = { text: values[0], signature: values[1] }; return self.record(self.baselineRecord); }).then(function (m) {
      self.baseline = m;
      if (bundledOnly) { self.blocked = true; return; }
      return self.storage.ready().then(function () { return Promise.all(['state-a.json', 'state-b.json'].map(function (p) { return self.storage.read(p); })); }).then(function (rows) {
        var states = [];
        rows.forEach(function (text) { if (!text) return; try { if (text.length > 524288) throw new Error(); var s = JSON.parse(text); if (s.schemaVersion !== 1 || typeof s.seq !== 'number' || s.seq < 1 || s.seq % 1 || typeof s.revision !== 'number') throw new Error(); states.push(s); } catch (ignore) {} });
        states.sort(function (a, b) { return b.seq - a.seq; });
        if (states.length) self.state = states[0];
        else if (rows.some(function (v) { return !!v; })) { self.blocked = true; self.note = 'Güncelleme kaydı okunamadı; paket içi sürüm kullanılıyor.'; }
      }, function () { self.blocked = true; self.note = 'Güncelleme alanı kullanılamıyor; paket içi sürüm kullanılıyor.'; });
    }).then(function () {
      if (self.blocked) return;
      return self.channels.restore(self.state.channelChain || []).then(function () {
        self.config.channel = self.channels.current.channel; self.trust = new V.Trust(self.channels.current.publicKey);
      }).catch(function (e) { self.blocked = true; self.state.active = null; self.note = e.message; self.channels = new root.FilmCoreChannel({ channel: self.channels.anchor.channel, publicKey: self.channels.anchor.publicKey, appVersion: self.config.appVersion }); });
    }).then(function () { return self.blocked ? null : self.clean(); });
  };
  Manager.prototype.get = function (path, metadata, channel) {
    var self = this, url = (channel || this.config.channel) + '/' + path + (metadata ? '?check=' + Date.now() : ''), ms = metadata ? 10000 : 30000, task;
    if (root.FilmUpdateHttp && root.FilmUpdateHttp.supported()) {
      task = this.nativeTask = root.FilmUpdateHttp.request(url, '', { timeout: ms, deadline: Date.now() + ms });
      task = task.promise.then(function (r) { self.nativeTask = null; return r; }, function (e) { self.nativeTask = null; throw e; });
    } else task = this.client.get(url, '', {}, { siteAddresses: false, timeoutMs: ms, deadline: Date.now() + ms });
    return task.then(function (r) { if (!r || typeof r.body !== 'string' || (metadata && V.bytes(r.body).length > 131072)) throw new Error('Güncelleme yanıtı geçersiz.'); return r.body; });
  };
  Manager.prototype.check = function () {
    if (this.checking) return this.checking;
    if (this.busy) return Promise.reject(new Error('Başka bir güncelleme işlemi sürüyor.'));
    var self = this, text, pointer, token = this.generation;
    this.busy = 'check'; this.note = ''; this.errorReport = null;
    var task = this.registerChannel().then(function () { return self.get('update.json', true); }).then(function (v) { text = v; return self.get('update.sig', true); }).then(function (signature) { return self.trust.verify(text, signature); }).then(function () {
      if (token !== self.generation) throw new Error('Güncelleme iptal edildi.');
      pointer = V.pointer(text, self.config.appVersion);
      if (pointer.updateVersion.split(".").map(Number).reduce(function (r, n, i) { return r || n - Number(self.config.componentMinVersion.split(".")[i]); }, 0) < 0) throw new Error("Bu kanal eski çekirdek sürümü sunuyor.");
      if (pointer.revision < self.state.revision) throw new Error('Eski güncelleme bildirimi reddedildi.');
      if (pointer.revision === self.state.revision && self.state.pointerHash) return V.sha(text).then(function (hash) { if (hash !== self.state.pointerHash) throw new Error('Güncelleme revizyonu çelişiyor.'); });
    }).then(function () { return V.sha(text); }).then(function (hash) {
      if (token !== self.generation) throw new Error('Güncelleme iptal edildi.');
      return self.commit({ revision: pointer.revision, pointerHash: hash, checkedAt: Date.now() });
    }).then(function () { self.migrationOffer = null; self.migrationDetails = null; if (!pointer.migration) return; return self.channels.next(pointer.migration).then(function (details) { return V.fingerprint(details.publicKey).then(function (hash) { self.migrationOffer = pointer.migration; self.migrationDetails = { channel: details.channel, fingerprint: hash }; }); }); }).then(function () { var current = self.selected && self.selected.version, newer = !current || root.FilmPluginSchema.compare(pointer.updateVersion, current) > 0; self.found = newer ? pointer : null; self.note = newer ? 'Yeni bileşen sürümü bulundu.' : 'Bileşenler güncel.'; return self.status(); });
    this.checking = task.then(function (result) { self.checking = null; self.busy = ''; return result; }, function (e) { self.checking = null; self.busy = ''; self.note = e.message; self.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'core-check',error:e}); throw e; }); return this.checking;
  };
  Manager.prototype.registerChannel = function (descriptor, id) {
    var c = descriptor || this.channels.current;
    if (!c.sequence && !descriptor) return Promise.resolve();
    return root.FilmNativeTLS.registerRepository(id || 'core-channel-' + c.sequence, c.channel + '/repository.json', c.publicKey);
  };
  Manager.prototype.migrate = function () {
    var self = this, offer = this.migrationOffer, candidate, raw, pointer, token = this.generation;
    if (!offer || this.busy || this.blocked || (this.app && this.app.controller.content) || (root.FilmPlugins && root.FilmPlugins.busy)) return Promise.reject(new Error('Kanal geçişi şu anda kullanılamıyor.'));
    this.busy = 'migration';
    return this.channels.next(offer).then(function (p) { candidate = p; return self.registerChannel(p, 'core-candidate-' + p.sequence); }).then(function () { return self.get('update.json', true, candidate.channel); }).then(function (text) { raw = text; return self.get('update.sig', true, candidate.channel); }).then(function (sig) { return new V.Trust(candidate.publicKey).verify(raw, sig); }).then(function () {
      pointer = V.pointer(raw, self.config.appVersion);
      if (pointer.revision < candidate.minRevision || !V.compatible(self.config.componentMinVersion, pointer.updateVersion) || self.selected && !V.compatible(self.selected.version, pointer.updateVersion)) throw new Error('Hedef kanal eski çekirdek veya revizyon sunuyor.');
      return V.sha(raw);
    }).then(function (hash) {
      if (token !== self.generation) throw new Error('Kanal geçişi iptal edildi.');
      return self.commit({ channelChain: self.channels.chain.concat([offer]), revision: pointer.revision, pointerHash: hash, pending: null, checkedAt: Date.now() });
    }).then(function () { self.busy = ''; return true; }, function (e) { self.busy = ''; self.note = e.message; throw e; });
  };
  Manager.prototype.cancel = function () { this.generation++; this.client.cancel(); if (this.nativeTask) this.nativeTask.cancel(); };
  Manager.prototype.download = function () {
    if (root.FilmPlugins && root.FilmPlugins.busy) return Promise.reject(new Error("Eklenti işlemi sürüyor."));
    if (this.downloading) return this.downloading;
    if (this.app && this.app.controller.content) return Promise.reject(new Error('Önce oynatıcıdan çıkın.'));
    if (this.blocked) return Promise.reject(new Error('Güncelleme alanı kullanılamıyor.'));
    var self = this, pointer, record, m, token, began = Date.now(), fetched = 0, reused = 0;
    var task = this.check().then(function () {
      pointer = self.found; if (!pointer) throw new Error('Yeni çekirdek güncellemesi yok.'); token = self.generation; self.busy = 'download';
      return self.get(pointer.manifest, false);
    }).then(function (text) { record = { text: text }; return V.sha(text); }).then(function (hash) { if (hash !== pointer.manifestSha256) throw new Error('Manifest özeti eşleşmiyor.'); return self.get('versions/' + pointer.updateVersion + '/manifest.sig', false); }).then(function (signature) { record.signature = signature; return self.record(record); }).then(function (value) {
      m = value; if (m.version !== pointer.updateVersion) throw new Error('Bileşen sürümleri eşleşmiyor.');
      return serial(m.files, function (file) {
        function active() { if (token !== self.generation || Date.now() - began > 120000 || (self.app && self.app.controller.content)) throw new Error('Güncelleme iptal edildi veya süresi doldu.'); }
        active();
        var bundled = self.baseline.files.filter(function (v) { return v.path === file.path && v.sha256 === file.sha256; })[0];
        if (bundled) { reused++; return; }
        return self.storage.read('obj-' + file.sha256 + '.txt').then(function (text) { return text === null ? false : V.sha(text).then(function (hash) { return hash === file.sha256 && V.bytes(text).length === file.size; }); }).then(function (valid) {
          active(); if (valid) { reused++; return; }
          return self.get('versions/' + m.version + '/runtime/' + file.path, false).then(function (text) { active(); return V.sha(text).then(function (hash) { active(); if (hash !== file.sha256 || V.bytes(text).length !== file.size) throw new Error('Dosya özeti eşleşmiyor: ' + file.path); return self.storage.write('obj-' + file.sha256 + '.txt', text); }); }).then(function () { fetched++; });
        });
      });
    }).then(function () { if (token !== self.generation) throw new Error('Güncelleme iptal edildi.'); return self.commit({ pending: record }); }).then(function () { self.note = 'Güncelleme doğrulandı; uygulamaya hazır.'; self.lastDownload = { fetched: fetched, reused: reused, version: m.version }; return self.status(); });
    this.downloading = task.then(function (v) { self.busy = ''; self.downloading = null; return self.clean().then(function () { return v; }); }, function (e) { self.busy = ''; self.downloading = null; self.note = e.message; self.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'core-download',error:e}); return self.clean().then(function () { throw e; }); }); return this.downloading;
  };
  Manager.prototype.clean = function () {
    var self = this, keep = {};
    [this.state.active, this.state.previous, this.state.pending].forEach(function (r) { if (!r) return; try { V.manifest(r.text, self.config.appVersion).files.forEach(function (f) { keep['obj-' + f.sha256 + '.txt'] = true; }); } catch (ignore) {} });
    return this.storage.list().then(function (names) { return serial(names.filter(function (n) { return !keep[n]; }), function (n) { return self.storage.remove(n); }); }).then(function () {}, function () {});
  };
  Manager.prototype.apply = function () {
    if (root.FilmPlugins && root.FilmPlugins.busy) return Promise.reject(new Error("Eklenti işlemi sürüyor."));
    var self = this;
    if (!this.state.pending || this.busy || (this.app && this.app.controller.content)) return Promise.reject(new Error('Güncelleme şu anda uygulanamaz.'));
    return this.record(this.state.pending).then(function () { return self.commit({ previous: self.state.active || self.baselineRecord, active: self.state.pending, pending: null, booting: false }); }).then(function () { return self.clean(); });
  };
  Manager.prototype.rollback = function () {
    if (this.busy || (this.app && this.app.controller.content)) return Promise.reject(new Error('Önce oynatıcıdan çıkın.'));
    var self = this;
    return this.commit({ active: this.state.previous || null, previous: null, pending: null, booting: false }).then(function () { return self.clean(); });
  };
  Manager.prototype.source = function (path) {
    var self = this, file = this.entries[path]; if (!file) return Promise.reject(new Error('Manifestte dosya yok: ' + path));
    var bundled = this.baseline.files.some(function (f) { return f.path === path && f.sha256 === file.sha256; });
    return (bundled ? this.local(path) : this.storage.read('obj-' + file.sha256 + '.txt')).then(function (text) { if (self.bootStopped) throw new Error('Başlangıç iptal edildi.'); if (typeof text !== 'string') throw new Error('Bileşen dosyası eksik: ' + path); return V.sha(text).then(function (hash) { if (hash !== file.sha256 || V.bytes(text).length !== file.size) throw new Error('Bileşen dosyası bozuk: ' + path); return text; }); });
  };
  Manager.prototype.appendScript = function (script, path) {
    if (this.bootStopped) return Promise.reject(new Error('Başlangıç iptal edildi.'));
    if (root.FilmPlugins && root.FilmPlugins.owns(path)) return root.FilmPlugins.appendScript(script, path);
    var self = this; return this.source(path).then(function (text) { if (self.bootStopped) throw new Error('Başlangıç iptal edildi.'); var url = root.URL.createObjectURL(new Blob([text], { type: 'application/javascript' })); function release() { root.URL.revokeObjectURL(url); script.removeEventListener('load', release); script.removeEventListener('error', release); } script.addEventListener('load', release); script.addEventListener('error', release); script.src = url; document.head.appendChild(script); });
  };
  Manager.prototype.modules = function () { return this.groups; };
  Manager.prototype.status = function () {
    function v(record) { try { return record && JSON.parse(record.text).version || ''; } catch (ignore) { return ''; } }
    return { application: this.config.appVersion, current: this.selected ? this.selected.version : this.baseline && this.baseline.version, previous: v(this.state.previous), pending: v(this.state.pending), available: this.found && this.found.updateVersion || '', busy: this.busy, note: this.note, blocked: this.blocked, download: this.lastDownload || null };
  };
  Manager.prototype.markHealthy = function () { if (this.healthy || this.bootStopped) return; this.healthy = true; if (root.FilmBootRecovery) root.FilmBootRecovery.healthy(); clearTimeout(this.watchdog); if (root.FilmBootProgress) root.FilmBootProgress.finish(); else document.getElementById('update-boot').style.display = 'none'; if (!this.blocked) this.commit(this.recoveryRecord ? { booting: false, active: this.recoveryRecord, previous: this.state.active, pending: null } : { booting: false }).catch(function () {}); };
  Manager.prototype.bind = function (app) {
    var self = this; this.app = app; if (root.FilmPlugins) root.FilmPlugins.bind(app); this.markHealthy(); app.controller.on('open', function () { if (self.downloading) self.cancel(); });
    if (!this.blocked && root.FilmUpdateCoordinator) root.FilmUpdateCoordinator.start(app);
  };
  root.FilmUpdateManager = Manager;
})(window);
