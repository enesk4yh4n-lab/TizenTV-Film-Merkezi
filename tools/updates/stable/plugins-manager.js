/* Independent, opt-in, signed site plugins. This is not a JavaScript sandbox. */
(function (root) {
  'use strict';
  var S = root.FilmPluginSchema, V = root.FilmUpdateVerify, LIMIT = 8388608;
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function serial(a, fn) { var p = Promise.resolve(); a.forEach(function (v) { p = p.then(function () { return fn(v); }); }); return p; }
  function pointer(p) { return p && /^[a-f0-9]{64}$/.test(p.hash) && typeof p.signature === 'string' && p.signature.length < 1024; }
  function Manager(core, options) {
    options = options || {}; this.core = core; this.bundledPaths = {}; this.bundledSeed = null; this.store = options.store || new root.FilmUpdateStore('film-plugins'); this.client = options.client || root.ChainNetwork.createClient({ preferXHR: true });
    this.transport = options.transport || root.FilmNativeTLS; this.state = { schemaVersion: 1, seq: 0, repositories: {}, plugins: {} }; this.loaded = {}; this.errors = {}; this.scriptErrors = {}; this.loading = ''; this.busy = ''; this.note = ''; this.blocked = false; this.generation = 0; this.currentTask = null; this.writes = Promise.resolve(); this.sizes = {}; this.inventory = null; this.candidate = null; this.app = null; this.staging = {}; this.siteBlobStaging180 = true;
  }
  Manager.prototype.commit = function (change) {
    var self = this; if (this.blocked) return Promise.reject(new Error('Eklenti kaydı salt okunur; mevcut veri korunuyor.'));
    var task = this.writes.then(function () { var next = clone(self.state); change(next); next.seq++; var text = JSON.stringify(next); if (V.bytes(text).length > 1048576) throw new Error('Eklenti kayıt sınırına ulaşıldı.'); return self.store.write(next.seq % 2 ? 'state-a.json' : 'state-b.json', text).then(function () { self.state = next; }); });
    this.writes = task.then(function () {}, function () {}); return task;
  };
  Manager.prototype.loadBundled = function () {
    var self = this, config = root.FilmUpdateConfig.officialRepository, index, text, signature, repoId, trust, seed = { plugins: {} };
    if (!config || !config.bundled) return Promise.resolve();
    return Promise.all([this.core.local(config.bundled + '/repository.json'), this.core.local(config.bundled + '/repository.sig')]).then(function (a) {
      text = a[0]; signature = a[1]; index = S.repository(text); trust = new V.Trust(index.publicKey);
      return S.fingerprint(index.publicKey).then(function (fp) { if (fp !== config.fingerprint) throw new Error('WGT site yayıncısı eşleşmiyor.'); repoId = 'repo-' + fp.slice(0,16) + '-' + index.id.slice(0,20); return trust.verify(text, signature); });
    }).then(function () { return V.sha(text); }).then(function (hash) {
      self.bundledPaths[hash] = config.bundled + '/repository.json'; seed.revision = hash;
      seed.repo = { id: repoId, publisherId: index.id, name: index.name, url: config.url, publicKey: index.publicKey, fingerprint: config.fingerprint, enabled: true, revision: index.revision, catalog: { hash: hash, signature: signature } };
      return serial(index.plugins, function (item) {
        var file = config.bundled + '/' + item.manifest, raw;
        return Promise.all([self.core.local(file), self.core.local(file.replace(/manifest\.json$/, 'manifest.sig'))]).then(function (a) { raw = a[0]; return trust.verify(raw,a[1]).then(function () { return V.sha(raw); }).then(function (hash) {
          if (hash !== item.manifestSha256) throw new Error('WGT site manifest özeti eşleşmiyor.');
          var m = S.manifest(raw,self.core.config.appVersion); if (m.id !== item.id || m.version !== item.version) throw new Error('WGT site kimliği eşleşmiyor.');
          self.bundledPaths[hash] = file;m.files.forEach(function (f) { self.bundledPaths[f.sha256] = file.replace(/manifest\.json$/, 'runtime/') + f.path; });
          seed.plugins[repoId+'/'+m.id] = { repoId: repoId, id: m.id, siteId: m.site.id, name: m.name, enabled: true, active: { hash: hash, signature: a[1], version: m.version }, previous: null, pending: null, booting: false, error: '' };
        }); });
      });
    }).then(function () { self.bundledSeed = seed; });
  };
  Manager.prototype.seedBundled = function () {
    var self = this, seed = this.bundledSeed;if (!seed || this.blocked || this.state.bundledRevision === seed.revision) return Promise.resolve();
    return this.commit(function (s) {
      var repo = s.repositories[seed.repo.id];
      if (repo && (repo.publicKey !== seed.repo.publicKey || repo.publisherId !== seed.repo.publisherId)) throw new Error('WGT deposu mevcut yayıncıyla çelişiyor.');
      if (!repo) s.repositories[seed.repo.id] = clone(seed.repo);
      else if (repo.revision < seed.repo.revision) { repo.catalog = clone(seed.repo.catalog);repo.revision = seed.repo.revision; }
      Object.keys(seed.plugins).forEach(function (key) {
        var p = s.plugins[key], baseline = seed.plugins[key];
        // WGT upgrades add missing baseline sites once; deliberate removals and
        // disabled repositories are preserved on every subsequent launch.
        if (!p) s.plugins[key] = clone(baseline);
        else if (p.active && !p.pending && S.compare(baseline.active.version,p.active.version)>0) { p.previous = p.active;p.active = clone(baseline.active);p.booting = false;p.error = ''; }
      });s.bundledRevision = seed.revision;
    }).then(function () { self.note = ''; });
  };
  Manager.prototype.init = function () {
    var self = this;
    return this.loadBundled().then(function () { return self.store.ready(); }).then(function () { return Promise.all(['state-a.json', 'state-b.json'].map(function (p) { return self.store.read(p); })); }).then(function (rows) {
      var good = []; rows.forEach(function (raw) { if (!raw) return; try { var s = JSON.parse(raw); if (V.bytes(raw).length > 1048576 || s.schemaVersion !== 1 || typeof s.seq !== 'number' || s.seq < 1 || s.seq % 1 || !s.repositories || Array.isArray(s.repositories) || !s.plugins || Array.isArray(s.plugins) || Object.keys(s.repositories).length > 16 || Object.keys(s.plugins).length > 64) throw new Error(); Object.keys(s.repositories).forEach(function (id) { var r = s.repositories[id]; if (!r || r.id !== id || !/^repo-[a-f0-9]{16}-[a-z0-9-]{1,20}$/.test(id) || S.address(r.url) !== r.url || !/^[a-f0-9]{64}$/.test(r.fingerprint) || typeof r.publicKey !== 'string' || r.publicKey.length > 800 || typeof r.enabled !== 'boolean' || !pointer(r.catalog)) throw new Error(); }); Object.keys(s.plugins).forEach(function (key) { var p = s.plugins[key]; if (!p || key !== p.repoId + '/' + p.id || !S.id(p.id) || !s.repositories[p.repoId] || typeof p.enabled !== 'boolean' || p.active && !pointer(p.active) || p.pending && !pointer(p.pending) || p.previous && !pointer(p.previous)) throw new Error(); }); good.push(s); } catch (ignore) {} });
      good.sort(function (a, b) { return b.seq - a.seq; }); if (good.length) self.state = good[0]; else if (rows.some(function (v) { return !!v; })) throw new Error('Eklenti kaydı okunamadı; üzerine yazılmadı.');
    }).then(function () { return self.seedBundled(); }).catch(function (e) { self.blocked = true; self.note = e.message || 'Eklenti depolaması açılamadı.'; });
  };
  Manager.prototype.blob = function (hash) { var self = this; if (!/^[a-f0-9]{64}$/.test(hash)) return Promise.reject(new Error('Geçersiz eklenti özeti.')); return this.store.read('obj-' + hash + '.txt').then(function (text) { return text === null && self.bundledPaths[hash] ? self.core.local(self.bundledPaths[hash]) : text; }).then(function (text) { if (typeof text !== 'string') throw new Error('Eklenti dosyası bulunamadı.'); return V.sha(text).then(function (actual) { if (actual !== hash) throw new Error('Eklenti dosyası bozulmuş.'); if (self.busy === 'download') self.staging[hash] = true; return text; }); }); };
  Manager.prototype.readRecord = function (repo, p) { var self = this; if (!pointer(p)) return Promise.reject(new Error('Eklenti kaydı geçersiz.')); return self.blob(p.hash).then(function (text) { return new V.Trust(repo.publicKey).verify(text, p.signature).then(function () { return text; }); }); };
  Manager.prototype.gc = function () {
    var self = this, keep = clone(this.staging);
    Object.keys(this.loaded).forEach(function (key) { var p = self.loaded[key]; keep[p.record.hash] = true; p.manifest.files.forEach(function (f) { keep[f.sha256] = true; }); });
    Object.keys(this.state.repositories).forEach(function (id) { keep[self.state.repositories[id].catalog.hash] = true; });
    return serial(Object.keys(this.state.plugins), function (key) { var p = self.state.plugins[key]; return serial([p.active, p.previous, p.pending].filter(Boolean), function (record) { keep[record.hash] = true; return self.blob(record.hash).then(function (text) { var m = S.manifest(text, self.core.config.appVersion); m.files.forEach(function (f) { keep[f.sha256] = true; }); }); }); }).then(function () { return self.store.list(); }).then(function (names) { return serial(names.filter(function (n) { return !keep[n.slice(4, -4)]; }), function (n) { return self.store.remove(n).then(function () { delete self.sizes[n]; }); }); }).catch(function () { /* Unreadable referenced data is preserved, never guessed away. */ });
  };
  Manager.prototype.measure = function () {
    var self = this; if (this.inventory) return this.inventory;
    this.inventory = this.gc().then(function () { return self.store.list(); }).then(function (names) { return serial(names, function (n) { return self.store.read(n).then(function (t) { self.sizes[n] = t === null ? 0 : V.bytes(t).length; }); }); }); return this.inventory;
  };
  Manager.prototype.put = function (text) { var self = this; return this.measure().then(function () { return V.sha(text); }).then(function (hash) {
    var n = 'obj-' + hash + '.txt', size = V.bytes(text).length; self.staging[hash] = true;
    function fits() { return Object.keys(self.sizes).reduce(function (sum, key) { return sum + self.sizes[key]; }, 0) - (self.sizes[n] || 0) + size <= LIMIT; }
    return (fits() ? Promise.resolve() : self.gc()).then(function () { if (!fits()) throw new Error('Eklenti dosyaları 8 MiB sınırını aşıyor. Kurulu eklentiler silinmedi.'); return self.blob(hash).then(function (old) { return old === text; }, function () { return false; }); }).then(function (exists) { if (exists) return; return self.store.write(n, text).catch(function () { return self.gc().then(function () { return self.store.write(n, text); }); }); }).then(function () { self.sizes[n] = size; return hash; });
  }); };
  Manager.prototype.guard = function (token, began) { if (token !== this.generation || Date.now() - began > 120000 || this.app && this.app.controller.content) throw new Error('Eklenti işlemi iptal edildi veya süresi doldu.'); };
  Manager.prototype.operation = function (label, fn) {
    var self = this; if (this.busy || this.core.busy || this.blocked || this.app && this.app.controller.content) return Promise.reject(new Error(this.blocked ? this.note : 'Önce mevcut işlemden veya oynatıcıdan çıkın.'));
    this.busy = label; this.note = ''; this.staging = {}; var token = ++this.generation, began = Date.now();
    return Promise.resolve().then(function () { return fn(function () { self.guard(token, began); }); }).then(function (value) { self.staging = {}; self.busy = ''; return self.gc().then(function () { return value; }); }, function (e) { self.staging = {}; self.busy = ''; self.note = e.message; return self.gc().then(function () { throw e; }); });
  };
  Manager.prototype.fetch = function (url, check, limit) {
    var self = this, task, timeout = 20000; check();
    if (this.transport && this.transport.supported()) task = this.transport.request(url, '', { timeoutMs: timeout, byteLimit: limit || 1048576 });
    else task = { promise: this.client.get(url, '', {}, { siteAddresses: false, timeoutMs: timeout }), cancel: function () { self.client.cancel(); } };
    this.currentTask = task; return task.promise.then(function (r) { self.currentTask = null; check(); if (!r || typeof r.body !== 'string' || V.bytes(r.body).length > (limit || 1048576)) throw new Error('Eklenti sunucusu geçersiz veya çok büyük yanıt döndürdü.'); return r.body; }, function (e) { self.currentTask = null; throw e; });
  };
  Manager.prototype.cancel = function () { this.generation++; if (this.currentTask) this.currentTask.cancel(); this.client.cancel(); };
  Manager.prototype.probe = function (url) {
    var self = this;
    return this.operation('probe', function (check) { var normalized = S.address(url), raw, signature, repo, tempId;
      return V.sha(normalized).then(function (hash) { tempId = 'probe-' + hash.slice(0, 24); return self.transport.registerRepository(tempId, normalized, ''); }).then(function () { return self.fetch(normalized, check, 65536); }).then(function (t) { raw = t; repo = S.repository(t); return self.fetch(normalized.replace(/repository\.json$/, 'repository.sig'), check, 1024); }).then(function (sig) { signature = sig; var trust = new V.Trust(repo.publicKey); return trust.key.then(function (k) { if (k.algorithm.modulusLength !== 2048) throw new Error('Yayıncı anahtarı RSA-2048 olmalı.'); return trust.verify(raw, signature); }); }).then(function () { return S.fingerprint(repo.publicKey); }).then(function (fingerprint) { check(); self.candidate = { url: normalized, text: raw, signature: signature, repository: repo, fingerprint: fingerprint, tempId: tempId }; return self.candidate; }).catch(function (e) { if (tempId) self.transport.removeRepository(tempId).catch(function () {}); throw e; });
    });
  };
  Manager.prototype.discardCandidate = function () { var c = this.candidate; this.candidate = null; if (c) this.transport.removeRepository(c.tempId).catch(function () {}); };
  Manager.prototype.approve = function (replaceId) {
    var self = this, c = this.candidate; if (!c) return Promise.reject(new Error('Önce depoyu inceleyin.'));
    return this.operation('trust', function (check) {
      var id = 'repo-' + c.fingerprint.slice(0, 16) + '-' + c.repository.id.slice(0, 20), old = replaceId && self.state.repositories[replaceId];
      if (old && (old.publicKey !== c.repository.publicKey || old.publisherId !== c.repository.id)) throw new Error('Yayıncı değişti. Bu adresi ayrı bir depo olarak ekleyin.');
      if (old && c.repository.revision < old.revision) throw new Error('Eski depo revizyonu reddedildi.');
      if (!old && self.state.repositories[id]) throw new Error('Bu yayıncının deposu zaten ekli. Adresini depo ekranından değiştirebilirsiniz.');
      if (!old && Object.keys(self.state.repositories).length >= 16) throw new Error('En fazla 16 depo eklenebilir.');
      return new V.Trust(c.repository.publicKey).verify(c.text, c.signature).then(function () { check(); return self.transport.registerRepository(id, c.url, c.repository.publicKey); }).then(function () { return self.put(c.text); }).then(function (hash) { check(); return self.commit(function (s) { s.repositories[id] = { id: id, publisherId: c.repository.id, name: c.repository.name, url: c.url, publicKey: c.repository.publicKey, fingerprint: c.fingerprint, enabled: old ? old.enabled : true, revision: c.repository.revision, catalog: { hash: hash, signature: c.signature } }; }); }).then(function () { self.discardCandidate(); return id; });
    });
  };
  Manager.prototype.catalog = function (repoId) { var r = this.state.repositories[repoId]; if (!r) return Promise.reject(new Error('Depo bulunamadı.')); return this.readRecord(r, r.catalog).then(function (text) { var index = S.repository(text); if (index.publicKey !== r.publicKey || index.id !== r.publisherId) throw new Error('Depo yayıncısı eşleşmiyor.'); return index; }); };
  Manager.prototype.checkRepository = function (repoId) {
    var self = this, r = this.state.repositories[repoId]; if (!r) return Promise.reject(new Error('Depo bulunamadı.'));
    return this.operation('check', function (check) { var raw, index, sig; return self.transport.registerRepository(r.id, r.url, r.publicKey).then(function () { return self.fetch(r.url + '?check=' + Date.now(), check, 65536); }).then(function (text) { raw = text; index = S.repository(text); if (index.publicKey !== r.publicKey || index.id !== r.publisherId) throw new Error('Yayıncı anahtarı değişti; yeni anahtara otomatik güvenilmedi.'); return self.fetch(r.url.replace(/repository\.json$/, 'repository.sig') + '?check=' + Date.now(), check, 1024); }).then(function (signature) { sig = signature; return new V.Trust(r.publicKey).verify(raw, sig); }).then(function () { if (index.revision < r.revision) throw new Error('Eski depo revizyonu reddedildi.'); return V.sha(raw); }).then(function (hash) { if (index.revision === r.revision && hash !== r.catalog.hash) throw new Error('Depo revizyonu çelişiyor.'); return self.put(raw); }).then(function (hash) { check(); return self.commit(function (s) { var repo = s.repositories[repoId]; repo.revision = index.revision; repo.name = index.name; repo.catalog = { hash: hash, signature: sig }; }); }).then(function () { return index; }); });
  };
  Manager.prototype.download = function (repoId, pluginId) {
    var self = this, repo = this.state.repositories[repoId], key = repoId + '/' + pluginId; if (!repo) return Promise.reject(new Error('Depo bulunamadı.'));
    return this.operation('download', function (check) { var item, raw, sig, m, base, record;
      if (Object.keys(self.state.plugins).length >= 64 && !self.state.plugins[key]) throw new Error('64 eklenti sınırına ulaşıldı.');
      return self.catalog(repoId).then(function (catalog) { item = catalog.plugins.filter(function (p) { return p.id === pluginId; })[0]; if (!item) throw new Error('Eklenti depoda bulunamadı.'); base = repo.url.replace(/repository\.json$/, ''); return self.fetch(base + item.manifest, check, 16384); }).then(function (text) { raw = text; return V.sha(text); }).then(function (hash) { if (hash !== item.manifestSha256) throw new Error('Eklenti manifest özeti eşleşmiyor.'); return self.fetch(base + item.manifest.replace(/manifest\.json$/, 'manifest.sig'), check, 1024); }).then(function (signature) { sig = signature; return new V.Trust(repo.publicKey).verify(raw, sig); }).then(function () {
        m = S.manifest(raw, self.core.config.appVersion); if (m.id !== item.id || m.version !== item.version) throw new Error('Eklenti kimliği veya sürümü eşleşmiyor.');
        var existing = self.state.plugins[key]; if (existing && existing.active && S.compare(m.version, existing.active.version) < 0) throw new Error('Eski eklenti sürümüne yalnız Geri dön işlemiyle geçilebilir.');
        if (existing && existing.active && existing.active.version === m.version && existing.active.hash !== item.manifestSha256) throw new Error('Aynı eklenti sürümü farklı dosyalarla yayımlanmış.');
        var conflict = root.SiteRegistry && root.SiteRegistry.get(m.site.id); if (conflict && !(self.loaded[key] && self.loaded[key].manifest.site.id === m.site.id)) throw new Error('Bu site kimliği zaten kullanımda: ' + m.site.id);
        return serial(m.files, function (file) {
          check();
          return self.blob(file.sha256).catch(function () {
            return self.fetch(base + item.manifest.replace(/manifest\.json$/, 'runtime/') + file.path, check, Math.max(1, file.size)).then(function (text) {
              return V.sha(text).then(function (hash) { if (hash !== file.sha256 || V.bytes(text).length !== file.size) throw new Error('Eklenti dosyası bozulmuş: ' + file.path); return self.put(text); }).then(function () { return self.blob(file.sha256); });
            });
          });
        });
      }).then(function () { return self.policy(repo, m); }).then(function () { check(); return self.put(raw); }).then(function (hash) { record = { hash: hash, signature: sig, version: m.version }; check(); return self.commit(function (s) { var p = s.plugins[key] || { repoId: repoId, id: pluginId, enabled: true, active: null, previous: null }; p.pending = record; p.name = m.name; p.siteId = m.site.id; p.error = ''; s.plugins[key] = p; }); }).then(function () { self.note = 'Eklenti doğrulandı. Yeniden açıldığında etkinleşecek.'; return record; });
    });
  };
  Manager.prototype.policy = function (repo, m) { var self = this, entries = {}; m.files.forEach(function (f) { entries[f.path] = f; }); return Promise.all([self.blob(entries[m.networkPolicy.file].sha256), self.blob(entries[m.networkPolicy.signature].sha256)]).then(function (a) { return new V.Trust(repo.publicKey).verify(a[0], a[1]).then(function () { var origins = V.networkPolicy(a[0]); if (origins.indexOf(m.site.base) < 0) throw new Error('Site adresi imzalı ağ izinlerinde bulunmuyor.'); return a; }); }); };
  Manager.prototype.toggle = function (key, enabled) { return this.commit(function (s) { if (!s.plugins[key]) throw new Error('Eklenti bulunamadı.'); s.plugins[key].enabled = enabled; }); };
  Manager.prototype.removePlugin = function (key) { return this.commit(function (s) { delete s.plugins[key]; }); };
  Manager.prototype.rollback = function (key) { return this.commit(function (s) { var p = s.plugins[key]; if (!p || !p.previous) throw new Error('Önceki sürüm yok.'); var old = p.active; p.active = p.previous; p.previous = old; p.pending = null; p.booting = false; p.error = ''; }); };
  Manager.prototype.removeRepository = function (id) { var self = this; return this.commit(function (s) { Object.keys(s.plugins).forEach(function (key) { if (s.plugins[key].repoId === id) delete s.plugins[key]; }); delete s.repositories[id]; }).then(function () { self.note = 'Depo kaldırıldı. Açık eklentiler yeniden açılışta kapanacak; izleme kayıtları korunur.'; }); };
  Manager.prototype.prepare = function () {
    var self = this; if (this.blocked) return Promise.resolve();
    return this.commit(function (s) { Object.keys(s.plugins).forEach(function (key) { var p = s.plugins[key]; if (p.booting) { p.active = p.previous || null; p.previous = null; p.pending = null; p.enabled = !!p.active; p.error = 'Önceki eklenti başlangıcı tamamlanmadı; güvenli sürüme dönüldü.'; } else if (p.pending) { p.previous = p.active; p.active = p.pending; p.pending = null; } p.booting = false; }); }).then(function () {
      return serial(Object.keys(self.state.repositories), function (id) { var r = self.state.repositories[id]; if (!r.enabled) return; return S.fingerprint(r.publicKey).then(function (fp) { if (fp !== r.fingerprint) throw new Error('Yayıncı parmak izi eşleşmiyor.'); return self.transport.registerRepository(id, r.url, r.publicKey); }).catch(function (e) { self.errors[id] = e.message; }); });
    }).then(function () { return serial(Object.keys(self.state.plugins), function (key) { return self.loadPlugin(key); }); }).catch(function (e) { self.note = e.message; });
  };
  Manager.prototype.loadPlugin = function (key) {
    var self = this, p = this.state.plugins[key], repo = this.state.repositories[p.repoId]; if (!p.enabled || !p.active || !repo || !repo.enabled || this.errors[repo.id]) return Promise.resolve();
    var canRestore = !!p.previous;
    return this.readRecord(repo, p.active).then(function (text) { var m = S.manifest(text, self.core.config.appVersion); if (m.id !== p.id || m.version !== p.active.version) throw new Error('Kurulu eklenti kimliği eşleşmiyor.'); return self.policy(repo, m).then(function (a) { return self.transport.configureRepository(repo.id, p.id, a[0], a[1]); }).then(function () { self.loaded[key] = { manifest: m, repo: repo, record: p.active, prefix: 'plugins/' + key + '/', assets: {} }; }); }).catch(function (e) { return self.failPlugin(key, e.message).then(function () { if (canRestore) return self.loadPlugin(key); }); });
  };
  Manager.prototype.failPlugin = function (key, message) { var self = this; delete this.loaded[key]; return this.commit(function (s) { var p = s.plugins[key]; if (!p) return; p.error = message; p.active = p.previous || null; p.previous = null; p.pending = null; p.enabled = !!p.active; p.booting = false; }).catch(function (e) { self.note = e.message; }); };
  Manager.prototype.groups = function () { var self = this; return Object.keys(this.loaded).map(function (key) { var p = self.loaded[key]; return p.manifest.modules.map(function (f) { return p.prefix + f; }); }); };
  Manager.prototype.owns = function (path) { return typeof path === 'string' && path.indexOf('plugins/') === 0; };
  Manager.prototype.owner = function (path) { var self = this; return Object.keys(this.loaded).filter(function (key) { return path.indexOf(self.loaded[key].prefix) === 0; })[0]; };
  Manager.prototype.asset = function (key, path) { var self = this, p = this.loaded[key]; if (!p) return Promise.reject(new Error('Eklenti etkin değil.')); var file = p.manifest.files.filter(function (f) { return f.path === path; })[0]; if (!file) return Promise.reject(new Error('Eklenti dosyası manifestte yok.')); if (!p.assets[path]) p.assets[path] = self.blob(file.sha256).then(function (text) { if (V.bytes(text).length !== file.size) throw new Error('Eklenti dosya boyutu eşleşmiyor.'); return text; }); return p.assets[path]; };
  Manager.prototype.context = function () { var self = this, key = this.loading, p = this.loaded[key]; if (!p) throw new Error('Eklenti bağlamı yalnız modül yüklenirken alınabilir.'); return { key: key, id: p.manifest.id, site: clone(p.manifest.site), readJSON: function (path) { return self.asset(key, path).then(function (text) { return JSON.parse(text); }); }, createClient: function () { return root.ChainNetwork.createClient(); } }; };
  Manager.prototype.appendScript = function (script, path) {
    var self = this, key = this.owner(path), p = this.loaded[key]; if (!p) return Promise.reject(new Error('Eklenti dosyası bulunamadı.'));
    this.loading = key;
    var start = this.state.plugins[key].booting ? Promise.resolve() : this.commit(function (s) { s.plugins[key].booting = true; });
    return start.then(function () { return self.asset(key, path.slice(p.prefix.length)); }).then(function (text) { var url = root.URL.createObjectURL(new Blob([text], { type: 'application/javascript' })); function release() { root.URL.revokeObjectURL(url); script.removeEventListener('load', release); script.removeEventListener('error', release); if (self.loading === key) self.loading = ''; } script.addEventListener('load', release); script.addEventListener('error', release); script.src = url; document.head.appendChild(script); });
  };
  Manager.prototype.registryFinished = function (sites) {
    var self = this, failed = [], success = [];
    Object.keys(this.loaded).forEach(function (key) { var p = self.loaded[key], found = sites.filter(function (s) { return s.id === p.manifest.site.id; })[0], valid = false; try { valid = !!found && found.pluginKey === key && found.prefix === p.manifest.site.prefix && new root.URL(found.base).origin === p.manifest.site.base; } catch (ignore) {} if (self.scriptErrors[key] || !valid) failed.push(key); else success.push(key); });
    return serial(failed, function (key) { return self.failPlugin(key, self.scriptErrors[key] || 'Eklenti geçerli site kaydı oluşturmadı.'); }).then(function () { return self.commit(function (s) { success.forEach(function (key) { if (s.plugins[key]) s.plugins[key].booting = false; }); }); }).then(function () { return failed.length > 0; }).catch(function (e) { self.note = e.message; return false; });
  };
  Manager.prototype.bind = function (app) { var self = this; this.app = app; app.controller.on('open', function () { if (self.busy) self.cancel(); }); };
  root.FilmPluginManager = Manager;
})(window);
