/* Independent, opt-in, signed site plugins. This is not a JavaScript sandbox. */
(function (root) {
  'use strict';
  var S = root.FilmPluginSchema, V = root.FilmUpdateVerify, D = root.FilmDependencies;
  var MAX_PACKAGES = 512, MAX_STORAGE = 67108864, STATE_BYTES = 12582912;
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function serial(a, fn) { var p = Promise.resolve(); a.forEach(function (v) { p = p.then(function () { return fn(v); }); }); return p; }
  function pruneRecords(state, keys) { [state.plugins, state.previousSet, state.pendingSet && state.pendingSet.previous, state.bootSet && state.bootSet.previous].filter(Boolean).forEach(function (set) { keys.forEach(function (key) { delete set[key]; }); }); }
  function pointer(p) { return p && /^[a-f0-9]{64}$/.test(p.hash) && typeof p.signature === 'string' && p.signature.length < 1024; }
  function validSet(set, repositories) {
    if (!set || typeof set !== 'object' || Array.isArray(set) || Object.keys(set).length > MAX_PACKAGES) return false;
    return Object.keys(set).every(function (key) {
      var p = set[key];
      if (!p || key !== p.repoId + '/' + p.id || !S.id(p.id) || !repositories[p.repoId] || typeof p.enabled !== 'boolean' || p.type !== undefined && ['site', 'resolver'].indexOf(p.type) < 0) return false;
      if (![p.active, p.previous, p.pending].every(function (record) { return !record || pointer(record) && S.version(record.version); })) return false;
      if (p.dependencies !== undefined && (!Array.isArray(p.dependencies) || p.dependencies.length > 16 || !p.dependencies.every(function (d) { return d && /^[a-f0-9]{64}$/.test(d.publisher) && S.id(d.id) && S.version(d.minVersion) && S.version(d.maxVersion) && S.compare(d.minVersion, d.maxVersion) < 0; }))) return false;
      return true;
    });
  }
  function validResume(value) {
    return value === undefined || Array.isArray(value) && value.length <= MAX_PACKAGES * 41 &&
      value.every(function (hash, index) { return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) && (index === 0 || hash > value[index - 1]); });
  }
  function boundedBudget(value, maximum, fallback) {
    return typeof value === 'number' && value >= 1 && value <= maximum && value % 1 === 0 ? value : fallback;
  }
  function budgetError(kind, message) { var error = new Error(message); error.budgetKind = kind; return error; }
  function storedAddress(value) { if (typeof value !== 'string' || value.length > 2048) return false; var u = new root.URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.hash && !u.search && (!u.port || u.port === '443'); }
  function Manager(core, options) {
    options = options || {}; this.core = core; this.bundledPaths = {}; this.bundledSeed = null; this.store = options.store || new root.FilmUpdateStore('film-plugins'); this.client = options.client || root.ChainNetwork.createClient({ preferXHR: true }); this.search = root.FilmRepositorySearch ? new root.FilmRepositorySearch() : null;
    this.transport = options.transport || root.FilmNativeTLS; this.state = { schemaVersion: 1, seq: 0, repositories: {}, plugins: {} }; this.loaded = {}; this.errors = {}; this.scriptErrors = {}; this.loading = ''; this.busy = ''; this.note = ''; this.blocked = false; this.generation = 0; this.currentTask = null; this.writes = Promise.resolve(); this.sizes = {}; this.totalBytes = 0; this.inventory = null; this.candidate = null; this.app = null; this.staging = {}; this.siteBlobStaging180 = true;
  }
  Manager.prototype.originLimit = function () {
    var manifest = this.core.selected || this.core.baseline || {}, budget = manifest.networkOriginBudget, nativeLimit = this.transport && this.transport.capabilities ? this.transport.capabilities().maxOrigins : 128;
    if (typeof budget !== 'number' || budget < 1 || budget > 2048 || budget % 1 !== 0) budget = 128;
    if (typeof nativeLimit !== 'number' || nativeLimit < 128 || nativeLimit > 2048 || nativeLimit % 1 !== 0) nativeLimit = 128;
    return Math.min(budget, nativeLimit);
  };
  Manager.prototype.packageLimit = function () {
    return boundedBudget((this.core.selected || this.core.baseline || {}).pluginPackageBudget, MAX_PACKAGES, 64);
  };
  Manager.prototype.storageLimit = function () {
    return boundedBudget((this.core.selected || this.core.baseline || {}).pluginStorageBudget, MAX_STORAGE, 8388608);
  };
  Manager.prototype.packageCount = function (keys) {
    var distinct = Object.create(null);
    Object.keys(this.state.plugins).concat(keys).forEach(function (key) { distinct[key] = true; });
    return Object.keys(distinct).length;
  };
  Manager.prototype.checkPackageLimit = function (rows) {
    var limit = this.packageLimit(), count = this.packageCount(rows.map(function (row) { return row.key; }));
    // A lower signed policy preserves existing records and still allows their updates.
    if (count > Math.max(limit, Object.keys(this.state.plugins).length)) throw budgetError('packages', limit + ' package limit');
  };
  Manager.prototype.storageUsed = function () { return this.totalBytes; };
  Manager.prototype.updateSize = function (name, size) {
    this.totalBytes += (size || 0) - (this.sizes[name] || 0);
    if (size === null) delete this.sizes[name];
    else this.sizes[name] = size;
  };
  Manager.prototype.commit = function (change) {
    var self = this; if (this.core.bootStopped) return Promise.reject(new Error('Başlangıç iptal edildi.')); if (this.blocked) return Promise.reject(new Error('Eklenti kaydı salt okunur; mevcut veri korunuyor.'));
    var task = this.writes.then(function () { if (self.core.bootStopped) throw new Error('Başlangıç iptal edildi.'); var next = clone(self.state); change(next); next.seq++; var text = JSON.stringify(next); if (V.bytes(text).length > STATE_BYTES) throw new Error('Eklenti kayıt sınırına ulaşıldı.'); return self.store.write(next.seq % 2 ? 'state-a.json' : 'state-b.json', text).then(function () { self.state = next; }); });
    this.writes = task.then(function () {}, function () {}); return task;
  };
  Manager.prototype.init = function () {
    var self = this;
    return self.store.ready().then(function () { return Promise.all(['state-a.json', 'state-b.json'].map(function (p) { return self.store.read(p); })); }).then(function (rows) {
      var good = []; rows.forEach(function (raw) { if (!raw) return; try { var s = JSON.parse(raw); if (V.bytes(raw).length > STATE_BYTES || s.schemaVersion !== 1 || typeof s.seq !== 'number' || s.seq < 1 || s.seq % 1 || !s.repositories || Array.isArray(s.repositories) || !s.plugins || Array.isArray(s.plugins) || Object.keys(s.repositories).length > 16 || Object.keys(s.plugins).length > MAX_PACKAGES) throw new Error(); Object.keys(s.repositories).forEach(function (id) { var r = s.repositories[id]; if (!r || r.id !== id || !/^repo-[a-f0-9]{16}-[a-z0-9-]{1,20}$/.test(id) || !storedAddress(r.url) || !/^[a-f0-9]{64}$/.test(r.fingerprint) || typeof r.publicKey !== 'string' || r.publicKey.length > 800 || typeof r.enabled !== 'boolean' || r.displayName !== undefined && (typeof r.displayName !== 'string' || r.displayName.length > 100) || !pointer(r.catalog)) throw new Error(); }); Object.keys(s.plugins).forEach(function (key) { var p = s.plugins[key]; if (!p || key !== p.repoId + '/' + p.id || !S.id(p.id) || !s.repositories[p.repoId] || typeof p.enabled !== 'boolean' || p.active && !pointer(p.active) || p.pending && !pointer(p.pending) || p.previous && !pointer(p.previous)) throw new Error(); }); if (!validResume(s.resumeSet) || !validSet(s.plugins, s.repositories) || s.previousSet !== undefined && !validSet(s.previousSet, s.repositories) || [s.pendingSet, s.bootSet].some(function (record) { return record !== undefined && (!record || !validSet(record.previous, s.repositories)); })) throw new Error('Invalid package transaction snapshot'); good.push(s); } catch (ignore) {} });
      good.sort(function (a, b) { return b.seq - a.seq; }); if (good.length) self.state = good[0]; else if (rows.some(function (v) { return !!v; })) throw new Error('Eklenti kaydı okunamadı; üzerine yazılmadı.');
    }).catch(function (e) { self.blocked = true; self.note = e.message || 'Eklenti depolaması açılamadı.'; });
  };
  Manager.prototype.blob = function (hash) { var self = this; if (!/^[a-f0-9]{64}$/.test(hash)) return Promise.reject(new Error('Geçersiz eklenti özeti.')); return this.store.read('obj-' + hash + '.txt').then(function (text) { return text === null && self.bundledPaths[hash] ? self.core.local(self.bundledPaths[hash]) : text; }).then(function (text) { if (typeof text !== 'string') { var missing = new Error('Eklenti dosyası bulunamadı.'); missing.missingBlob = true; throw missing; } return V.sha(text).then(function (actual) { if (actual !== hash) throw new Error('Eklenti dosyası bozulmuş.'); if (self.busy === 'download') self.staging[hash] = true; return text; }); }); };
  Manager.prototype.readRecord = function (repo, p) { var self = this; if (!pointer(p)) return Promise.reject(new Error('Eklenti kaydı geçersiz.')); return self.blob(p.hash).then(function (text) { return new V.Trust(repo.publicKey).verify(text, p.signature).then(function () { return text; }); }); };
  Manager.prototype.gc = function () {
    var self = this, keep = clone(this.staging), inspected = {};
    (this.state.resumeSet || []).forEach(function (hash) { keep[hash] = true; });
    Object.keys(this.loaded).forEach(function (key) { var p = self.loaded[key]; keep[p.record.hash] = true; p.manifest.files.forEach(function (f) { keep[f.sha256] = true; }); });
    Object.keys(this.state.repositories).forEach(function (id) { keep[self.state.repositories[id].catalog.hash] = true; });
    var snapshots = [this.state.plugins, this.state.previousSet, this.state.pendingSet && this.state.pendingSet.previous, this.state.bootSet && this.state.bootSet.previous].filter(Boolean);
    var records = []; snapshots.forEach(function (set) { Object.keys(set).forEach(function (key) { records.push(set[key]); }); });
    return serial(records, function (p) { return serial([p.active, p.previous, p.pending].filter(Boolean), function (record) { if (inspected[record.hash]) return; inspected[record.hash] = keep[record.hash] = true; return self.blob(record.hash).then(function (text) { var m = S.manifest(text); m.files.forEach(function (f) { keep[f.sha256] = true; }); }); }); }).then(function () { return self.store.list(); }).then(function (names) { return serial(names.filter(function (n) { return !keep[n.slice(4, -4)]; }), function (n) { return self.store.remove(n).then(function () { self.updateSize(n, null); }); }); }).catch(function () { /* Unreadable referenced data is preserved, never guessed away. */ });
  };
  Manager.prototype.measure = function () {
    var self = this; if (this.inventory) return this.inventory;
    this.inventory = this.gc().then(function () {
      self.totalBytes = 0;
      self.sizes = {};
      if (self.store.objectSizes) return self.store.objectSizes().then(function (sizes) {
        Object.keys(sizes).forEach(function (name) { self.updateSize(name, sizes[name]); });
      });
      return self.store.list().then(function (names) { return serial(names, function (n) { return self.store.read(n).then(function (t) { if (t !== null) self.updateSize(n, V.bytes(t).length); }); }); });
    }).catch(function (error) { self.inventory = null; throw error; });
    return this.inventory;
  };
  Manager.prototype.storageError = function () {
    var limit = this.storageLimit() / 1048576;
    return budgetError('storage', 'Kurulum ' + limit + ' MiB eklenti alanını aşıyor. / Installation exceeds the ' + limit + ' MiB plugin budget.');
  };
  Manager.prototype.put = function (text) { var self = this; return this.measure().then(function () { return V.sha(text); }).then(function (hash) {
    var n = 'obj-' + hash + '.txt', size = V.bytes(text).length; self.staging[hash] = true;
    return self.blob(hash).then(function (old) { return old === text; }, function () { return false; }).then(function (exists) {
      if (exists) return;
      if (self.storageUsed() - (self.sizes[n] || 0) + size > self.storageLimit()) throw self.storageError();
      return self.store.write(n, text).catch(function () { return self.gc().then(function () { return self.store.write(n, text); }); });
    }).then(function () { self.updateSize(n, size); return hash; });
  }); };
  Manager.prototype.guard = function (token, began) { if (token !== this.generation || Date.now() - began > 120000 || this.app && this.app.controller.content) throw new Error('Eklenti işlemi iptal edildi veya süresi doldu.'); };
  Manager.prototype.operation = function (label, fn) {
    var self = this; if (this.busy || this.core.busy || this.blocked || this.app && this.app.controller.content) return Promise.reject(new Error(this.blocked ? this.note : 'Önce mevcut işlemden veya oynatıcıdan çıkın.'));
    this.busy = label; this.note = ''; this.staging = {}; var token = ++this.generation, began = Date.now();
    function finish(error, value) {
      self.staging = {};
      return self.gc().then(function () { self.busy = ''; if (error) throw error; return value; }, function (cleanupError) { self.busy = ''; throw error || cleanupError; });
    }
    function check() { self.guard(token, began); }
    if (label === 'download') check.progress = function () { check(); began = Date.now(); };
    this.operationTask = Promise.resolve().then(function () { return fn(check); }).then(function (value) { return finish(null, value); }, function (e) { self.note = e.message; return finish(e); });
    return this.operationTask;
  };
  Manager.prototype.fetch = function (url, check, limit) {
    var self = this, task, timeout = 20000; check();
    if (this.transport && this.transport.supported()) task = this.transport.request(url, '', { timeoutMs: timeout, byteLimit: limit || 1048576 });
    else task = { promise: this.client.get(url, '', {}, { siteAddresses: false, timeoutMs: timeout }), cancel: function () { self.client.cancel(); } };
    this.currentTask = task; return task.promise.then(function (r) { self.currentTask = null; check(); if (!r || typeof r.body !== 'string' || V.bytes(r.body).length > (limit || 1048576)) throw new Error('Eklenti sunucusu geçersiz veya çok büyük yanıt döndürdü.'); if (check.progress) check.progress(); return r.body; }, function (e) { self.currentTask = null; throw e; });
  };
  Manager.prototype.cancel = function () { this.generation++; if (this.search) this.search.cancel(); if (this.currentTask) this.currentTask.cancel(); this.client.cancel(); };
  Manager.prototype.probe = function (url) {
    var self = this;
    return this.operation('probe', function (check) { var normalized = S.address(url), raw, signature, repo, tempId;
      return V.sha(normalized).then(function (hash) { tempId = 'probe-' + hash.slice(0, 24); return self.transport.registerRepository(tempId, normalized, ''); }).then(function () { return self.fetch(normalized, check, S.indexByteLimit); }).then(function (t) { raw = t; repo = S.repository(t); return self.fetch(S.signatureAddress(normalized), check, 1024); }).then(function (sig) { signature = sig; var trust = new V.Trust(repo.publicKey); return trust.key.then(function (k) { if (k.algorithm.modulusLength !== 2048) throw new Error('Yayıncı anahtarı RSA-2048 olmalı.'); return trust.verify(raw, signature); }); }).then(function () { return S.fingerprint(repo.publicKey); }).then(function (fingerprint) { check(); self.candidate = { url: normalized, text: raw, signature: signature, repository: repo, fingerprint: fingerprint, tempId: tempId }; return self.candidate; }).catch(function (e) { if (tempId) self.transport.removeRepository(tempId).catch(function () {}); throw e; });
    });
  };
  Manager.prototype.discardCandidate = function () { var c = this.candidate; this.candidate = null; if (c) this.transport.removeRepository(c.tempId).catch(function () {}); };
  Manager.prototype.renameRepository = function (id, value) {
    var name = String(value || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if (!name || name.length > 100 || /[\x00-\x1f]/.test(name)) return Promise.reject(new Error('Depo adı 1–100 karakter olmalı. / Repository name must contain 1–100 characters.'));
    return this.commit(function (s) { if (!s.repositories[id]) throw new Error('Depo bulunamadı.'); s.repositories[id].displayName = name; });
  };
  Manager.prototype.approve = function (replaceId) {
    var self = this, c = this.candidate; if (!c) return Promise.reject(new Error('Önce depoyu inceleyin.'));
    return this.operation('trust', function (check) {
      var id = 'repo-' + c.fingerprint.slice(0, 16) + '-' + c.repository.id.slice(0, 20), old = replaceId && self.state.repositories[replaceId];
      var rotated = old && old.publicKey !== c.repository.publicKey;
      if (old && old.publisherId !== c.repository.id) throw new Error('Farklı depo kimliği; bu adresi ayrı depo olarak ekleyin. / Different repository identity; add it separately.');
      if (old && !rotated && c.repository.revision < old.revision) throw new Error('Eski depo revizyonu reddedildi.');
      if (!old && self.state.repositories[id]) throw new Error('Bu yayıncının deposu zaten ekli. Adresini depo ekranından değiştirebilirsiniz.');
      if (!old && Object.keys(self.state.repositories).length >= 16) throw new Error('En fazla 16 depo eklenebilir.');
      if (rotated && Object.keys(self.state.repositories).length >= 16) throw new Error('Yeni yayıncı kaydı için depo sınırında yer yok. / Repository limit reached.');
      return new V.Trust(c.repository.publicKey).verify(c.text, c.signature).then(function () { check(); return self.transport.registerRepository(id, c.url, c.repository.publicKey); }).then(function () { return self.put(c.text); }).then(function (hash) { check(); return self.commit(function (s) { s.repositories[id] = { id: id, publisherId: c.repository.id, name: c.repository.name, displayName: old && old.displayName || '', url: c.url, publicKey: c.repository.publicKey, fingerprint: c.fingerprint, enabled: old ? old.enabled : true, revision: c.repository.revision, catalog: { hash: hash, signature: c.signature } }; if (rotated) s.repositories[old.id].enabled = false; }); }).then(function () { if (rotated || old && old.url !== c.url) self.restartNeeded = true; self.keyChanged = null; self.discardCandidate(); return id; }, function (error) { var restore = old && old.id === id ? self.transport.registerRepository(old.id, old.url.replace(/filmmerkezi201-repository\.json$/,'filmmerkezi-repository.json'), old.publicKey) : self.transport.removeRepository(id); return restore.then(function () { throw error; }, function () { error.message += ' / Reopen the app to restore connection permissions.'; throw error; }); });
    });
  };
  Manager.prototype.catalog = function (repoId) { var r = this.state.repositories[repoId]; if (!r) return Promise.reject(new Error('Depo bulunamadı.')); return this.readRecord(r, r.catalog).then(function (text) { var index = S.repository(text); if (index.publicKey !== r.publicKey || index.id !== r.publisherId) throw new Error('Depo yayıncısı eşleşmiyor.'); return index; }); };
  Manager.prototype.checkRepository = function (repoId) {
    var self = this, r = this.state.repositories[repoId]; if (!r) return Promise.reject(new Error('Depo bulunamadı.'));
    if (/\/filmmerkezi201-repository\.json$/.test(r.url)) return Promise.reject(new Error('Bu depo adresi değişti. Depo seçeneklerinden filmmerkezi-repository.json adresini girin.'));
    return this.operation('check', function (check) { var raw, index, sig; return self.transport.registerRepository(r.id,r.url,r.publicKey).then(function () { return self.fetch(r.url + '?check=' + Date.now(), check, S.indexByteLimit); }).then(function (text) { raw = text; index = S.repository(text); if (index.publicKey !== r.publicKey || index.id !== r.publisherId) { self.keyChanged = repoId; throw new Error('Yayıncı anahtarı değişti; yeni anahtara otomatik güvenilmedi.'); } return self.fetch(S.signatureAddress(r.url) + '?check=' + Date.now(), check, 1024); }).then(function (signature) { sig = signature; return new V.Trust(r.publicKey).verify(raw, sig); }).then(function () { if (index.revision < r.revision) throw new Error('Eski depo revizyonu reddedildi.'); return V.sha(raw); }).then(function (hash) { if (index.revision === r.revision && hash !== r.catalog.hash) throw new Error('Depo revizyonu çelişiyor.'); return self.put(raw); }).then(function (hash) { check(); return self.commit(function (s) { var repo = s.repositories[repoId]; repo.revision = index.revision; repo.name = index.name; repo.catalog = { hash: hash, signature: sig }; }); }).then(function () { return index; }); });
  };
  Manager.prototype.selectInstallation = function (repoId, pluginId, check, options) {
    options = options || {};
    var self = this, requests = options.requests || [{ repoId: repoId, id: pluginId }];
    var core = options.coreVersion || self.core.status().current, config = self.core.config;
    var installed = [], candidates = [], catalogs = {}, reads = {}, requirements = [], roots = [], count = 0;
    var approved = options.approved || null;
    function catalog(repo) {
      return catalogs[repo.id] || (catalogs[repo.id] = self.catalog(repo.id));
    }
    function allowed(key, publisher, version, hash) {
      return !approved || approved.some(function (pin) { return pin.key === key && pin.publisher === publisher && pin.version === version && pin.hash === hash; });
    }
    function read(repo, item) {
      var key = repo.id + '/' + item.id, record = self.state.plugins[key];
      var current = record && (record.pending || record.active), requirement = S.compatibility(item, config, core);
      if (requirement || current && S.compare(item.version, current.version) < 0 || !allowed(key, repo.fingerprint, item.version, item.manifestSha256)) return Promise.resolve(requirement);
      if (current && current.version === item.version && current.hash !== item.manifestSha256) return Promise.reject(new Error('Aynı eklenti sürümü farklı dosyalarla yayımlanmış.'));
      if (current && current.version === item.version && !record.needsDownload && !approved) return Promise.resolve(null);
      var lookup = repo.id + '/' + item.manifest;
      if (reads[lookup]) return reads[lookup];
      if (++count > MAX_PACKAGES + 128) throw new Error('Eklenti sürüm doğrulama sınırına ulaşıldı.');
      check();
      var raw, signature, base = S.repositoryRoot(repo.url);
      reads[lookup] = self.fetch(base + item.manifest, check, 16384).then(function (text) {
        raw = text;
        return V.sha(raw);
      }).then(function (hash) {
        if (hash !== item.manifestSha256) throw new Error('Manifest özeti eşleşmiyor.');
        return self.fetch(base + item.manifest.replace(/manifest\.json$/, 'manifest.sig'), check, 1024);
      }).then(function (value) {
        signature = value;
        return new V.Trust(repo.publicKey).verify(raw, signature);
      }).then(function () {
        check();
        var m = S.manifest(raw);
        if (m.id !== item.id || m.version !== item.version || m.type !== item.type ||
          item.minAppVersion && item.minAppVersion !== m.minAppVersion ||
          item.minCoreVersion && item.minCoreVersion !== m.minCoreVersion ||
          !V.sameRequirements(item.requires, m.requires)) throw new Error('Eklenti manifesti depo kaydıyla eşleşmiyor.');
        var blocked = S.compatibility(m, config, core);
        if (blocked) return blocked;
        candidates.push({ key: key, publisher: repo.fingerprint, manifest: m, raw: raw, signature: signature, repo: repo, item: item });
        m.dependencies.forEach(function (d) { requirements.push(d); });
        return null;
      });
      return reads[lookup];
    }
    function loadDependencies(position) {
      if (position >= requirements.length) return Promise.resolve();
      var d = requirements[position];
      return serial(Object.keys(self.state.repositories).sort(), function (id) {
        var repo = self.state.repositories[id];
        if (!repo.enabled || repo.fingerprint !== d.publisher) return;
        return catalog(repo).then(function (index) {
          return serial(S.choices(index, d.id).filter(function (item) { return item.type === 'resolver' && D.satisfies(item.version, d); }), function (item) { return read(repo, item); });
        });
      }).then(function () { return loadDependencies(position + 1); });
    }
    return serial(Object.keys(self.state.plugins).sort(), function (key) {
      check();
      var p = self.state.plugins[key], repo = self.state.repositories[p.repoId], record = p.pending || p.active;
      if (!p.enabled || !repo || !repo.enabled || !record) return;
      return self.readRecord(repo, record).then(function (raw) {
        var m = S.manifest(raw), c = { key: key, publisher: repo.fingerprint, manifest: m, repo: repo, raw: raw, signature: record.signature, installed: true };
        installed.push(c);
        if (!S.compatibility(m, config, core) && allowed(key, repo.fingerprint, m.version, record.hash)) candidates.push(c);
      }).catch(function (e) { if (!p.needsDownload || !e.missingBlob) throw e; });
    }).then(function () {
      return serial(requests, function (request) {
        var repo = self.state.repositories[request.repoId], key = request.repoId + '/' + request.id, firstBlocked;
        if (!repo || !repo.enabled) throw new Error('Depo etkin değil.');
        roots.push({ key: key, publisher: repo.fingerprint, id: request.id });
        return catalog(repo).then(function (index) {
          return serial(S.choices(index, request.id), function (item) { return read(repo, item).then(function (blocked) { firstBlocked = firstBlocked || blocked; }); });
        }).then(function () {
          if (candidates.some(function (c) { return c.key === key && !c.installed; })) return;
          var error = new Error(firstBlocked ? firstBlocked.message : 'Daha yeni uyumlu eklenti sürümü yok.');
          if (firstBlocked) error.requirement = firstBlocked;
          throw error;
        });
      });
    }).then(function () { return loadDependencies(0); }).then(function () {
      return D.select(roots, candidates, installed, check);
    });
  };
  Manager.prototype.installationPlan = Manager.prototype.selectInstallation;
  Manager.prototype.download = function (repoId, pluginId) {
    var self = this;
    return this.operation('download', function (check) {
      var plan, records = {}, allOrigins = {};
      return self.installationPlan(repoId, pluginId, check).then(function (rows) {
        rows.forEach(function (c) { Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (key !== c.key && p.enabled && r && r.enabled && r.fingerprint === c.publisher && p.id === c.manifest.id) throw new Error('Publisher package already installed through another repository: ' + p.id); }); });
        var siteOwners = {};
        Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key]; if (p.enabled && p.siteId && !rows.some(function (c) { return c.key === key; })) siteOwners[p.siteId] = key; });
        rows.forEach(function (c) { if (c.manifest.type !== 'site') return; var id = c.manifest.site.id; if (siteOwners[id] && siteOwners[id] !== c.key) throw new Error('Site identity already installed: ' + id); siteOwners[id] = c.key; });
        plan = rows; self.lastPlan = rows.map(function (c) { return { key: c.key, type: c.manifest.type, name: c.manifest.name, version: c.manifest.version }; });
        self.checkPackageLimit(rows);
        return self.beginDownload(rows, check).then(function () { return serial(rows, function (c) {
          var m = c.manifest, old = self.state.plugins[c.key], base = S.repositoryRoot(c.repo.url);
          if (old && old.active && S.compare(m.version, old.active.version) < 0) throw new Error('Downgrade requires rollback');
          if (old && old.active && old.active.version === m.version && old.active.hash !== (c.item ? c.item.manifestSha256 : old.active.hash)) throw new Error('Immutable package version changed');
          return serial(m.files, function (f) {
            check(); return self.blob(f.sha256).catch(function () {
              if (!c.item) throw new Error('Installed dependency file missing');
              return self.fetch(base + c.item.manifest.replace(/manifest\.json$/, 'runtime/') + f.path, check, Math.max(1, f.size));
            }).then(function (text) { return V.sha(text).then(function (hash) {
              if (hash !== f.sha256 || V.bytes(text).length !== f.size) throw new Error('Package file mismatch: ' + f.path);
              return self.put(text).then(function () { check.progress(); });
            }); });
          }).then(function () { return self.policy(c.repo, m); }).then(function (a) {
            V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; });
            return self.put(c.raw);
          }).then(function (hash) { records[c.key] = { hash: hash, signature: c.signature, version: m.version }; });
        }); });
      }).then(function () {
        return serial(Object.keys(self.state.plugins), function (key) {
          var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (records[key] || !p.enabled || !r || !r.enabled || !(p.pending || p.active)) return;
          return self.readRecord(r, p.pending || p.active).then(function (text) { var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (ignore) { return; } return self.policy(r, m); }).then(function (a) { if (a) V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; }); });
        });
      }).then(function () {
        return self.core.local(self.core.baseline.networkPolicy.file).then(function (text) { V.networkPolicy(text).forEach(function (origin) { allOrigins[origin] = true; }); });
      }).then(function () {
        if (Object.keys(allOrigins).length > self.originLimit()) throw new Error('Network origin budget exceeded');
        check(); return self.commit(function (state) {
          if (!state.pendingSet) state.pendingSet = { previous: clone(state.plugins) };
          delete state.resumeSet;
          plan.forEach(function (c) {
            var m = c.manifest, p = state.plugins[c.key] || { repoId: c.repo.id, id: m.id, active: null, previous: null };
            p.pending = records[c.key]; p.enabled = true; p.type = m.type; p.name = m.name; p.siteId = m.site && m.site.id; p.error = ''; p.dependencies = m.dependencies;
            state.plugins[c.key] = p;
          });
        });
      }).then(function () { self.note = 'Packages verified; restart to activate / Paketler dogrulandi; yeniden acin'; return records[repoId + '/' + pluginId]; });
    });
  };
  Manager.prototype.policy = function (repo, m) { var self = this, entries = {}; m.files.forEach(function (f) { entries[f.path] = f; }); return Promise.all([self.blob(entries[m.networkPolicy.file].sha256), self.blob(entries[m.networkPolicy.signature].sha256)]).then(function (a) { return new V.Trust(repo.publicKey).verify(a[0], a[1]).then(function () { var origins = V.networkPolicy(a[0]); if (m.type === 'site' && origins.indexOf(m.site.base) < 0) throw new Error('Site adresi imzalı ağ izinlerinde bulunmuyor.'); return a; }); }); };
  Manager.prototype.preflightStorage = function (manifest, raw) {
    var self = this, files = {};
    return V.sha(raw).then(function (hash) {
      manifest.files.forEach(function (file) { files[file.sha256] = file.size; });
      files[hash] = V.bytes(raw).length;
      return self.checkStorage(files);
    });
  };
  Manager.prototype.checkStorage = function (files) {
    var self = this;
    return this.measure().then(function () {
      var extra = Object.keys(files).reduce(function (total, hash) {
        return total + Math.max(0, files[hash] - (self.sizes['obj-' + hash + '.txt'] || 0));
      }, 0);
      if (extra && self.storageUsed() + extra > self.storageLimit()) throw self.storageError();
      if (extra && self.store.freeBytes) return self.store.freeBytes().then(function (free) {
        if (free !== null && free < extra) throw budgetError('storage', 'Cihazda kurulum için yeterli boş alan yok. / Not enough free space to install.');
      });
    });
  };
  Manager.prototype.beginDownload = function (rows, check) {
    var self = this, files = Object.create(null);
    function add(hash, size) {
      if (files[hash] !== undefined && files[hash] !== size) throw new Error('Conflicting package file sizes');
      files[hash] = size;
    }
    return serial(rows, function (row) {
      check();
      row.manifest.files.forEach(function (file) { add(file.sha256, file.size); });
      return V.sha(row.raw).then(function (hash) { add(hash, V.bytes(row.raw).length); });
    }).then(function () {
      var hashes = Object.keys(files).sort();
      check();
      if (JSON.stringify(hashes) === JSON.stringify(self.state.resumeSet)) return;
      return self.commit(function (state) { state.resumeSet = hashes; }).then(function () { return self.gc(); });
    }).then(function () { check(); return self.checkStorage(files); }).then(function () { check(); });
  };
  Manager.prototype.discardDownload = function () {
    var self = this;
    if (this.busy || !this.state.resumeSet) return Promise.resolve();
    return this.operation('discard', function () {
      return self.commit(function (state) { delete state.resumeSet; });
    });
  };
  Manager.prototype.preflightOrigins = function (repo, manifest, replacing, enablingRepository) {
    var self = this, all = {}, count = 0;
    function add(text) { V.networkPolicy(text).forEach(function (origin) { if (!all[origin]) { all[origin] = true; count++; } }); }
    function corePolicy(m, local) { if (!m || !m.networkPolicy) return Promise.resolve(); return (local ? self.core.local(m.networkPolicy.file) : self.core.source(m.networkPolicy.file)).then(add); }
    return corePolicy(this.core.baseline, true).then(function () { return corePolicy(self.core.selected, false); }).then(function () {
      return serial(Object.keys(self.state.plugins), function (key) {
        var p = self.state.plugins[key], r = self.state.repositories[p.repoId];
        if (key === replacing || !p.enabled || !r || !r.enabled && r.id !== enablingRepository || !(p.pending || p.active)) return;
        return self.readRecord(r, p.pending || p.active).then(function (text) { var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (e) { return null; } return self.policy(r, m); }).then(function (a) { if (a) add(a[0]); });
      });
    }).then(function () { return manifest ? self.policy(repo, manifest) : null; }).then(function (a) {
      if (a) add(a[0]);
      if (count > self.originLimit()) throw new Error('Ağ izin sınırı aşılıyor (' + count + '/' + self.originLimit() + '). Önce bazı siteleri kapatın; mevcut kurulum değişmedi. / Network origin budget exceeded; disable some sites first.');
      return count;
    });
  };
  Manager.prototype.toggle = function (key, enabled) {
    var self = this, p = this.state.plugins[key], r = p && this.state.repositories[p.repoId];
    if (!enabled && p) this.assertUnused(key);
    if (!p || !r) return Promise.reject(new Error('Eklenti bulunamadı.'));
    return this.operation('toggle', function () { return (enabled && (p.pending || p.active) ? self.readRecord(r, p.pending || p.active).then(function (text) { return self.preflightOrigins(r, S.manifest(text, self.core.config.appVersion), key); }) : Promise.resolve()).then(function () { return self.commit(function (s) { s.plugins[key].enabled = enabled; }); }); });
  };
  Manager.prototype.setRepositoryEnabled = function (id, enabled) {
    var self = this;
    if (!enabled) Object.keys(this.state.plugins).forEach(function (key) { if (self.state.plugins[key].repoId === id) self.assertUnused(key, id); });
    if (!this.state.repositories[id]) return Promise.reject(new Error('Depo bulunamadı.'));
    return this.operation('toggle', function () { return (enabled ? self.preflightOrigins(null, null, null, id) : Promise.resolve()).then(function () { return self.commit(function (s) { s.repositories[id].enabled = enabled; }); }); });
  };
  Manager.prototype.removePlugin = function (key) { if (this.busy || this.app && this.app.controller.content) return Promise.reject(new Error('Exit player first')); this.assertUnused(key); return this.commit(function (s) { pruneRecords(s, [key]); }); };
  Manager.prototype.assertUnused = function (key, removingRepo) {
    var self = this, p = this.state.plugins[key], r = p && this.state.repositories[p.repoId]; if (!p || !r) return;
    var dependent = Object.keys(this.state.plugins).filter(function (k) { var other = self.state.plugins[k]; return k !== key && other.enabled && other.repoId !== removingRepo && (other.dependencies || []).some(function (d) { return d.publisher === r.fingerprint && d.id === p.id; }); });
    if (dependent.length) throw new Error('Package is required by: ' + dependent.join(', '));
  };
  Manager.prototype.rollback = function () { if (this.busy || this.app && this.app.controller.content) return Promise.reject(new Error('Exit player first')); return this.commit(function (s) {
    if (!s.previousSet) throw new Error('No previous consistent package set');
    s.pendingSet = { previous: clone(s.plugins) }; var previous = s.previousSet;
    s.plugins = clone(previous); delete s.previousSet;
  }); };
  Manager.prototype.removeRepository = function (id) { var self = this; if (this.busy || this.app && this.app.controller.content) return Promise.reject(new Error('Exit player first')); Object.keys(this.state.plugins).forEach(function (key) { if (self.state.plugins[key].repoId === id) self.assertUnused(key, id); }); return this.commit(function (s) { var keys = {}; [s.plugins, s.previousSet, s.pendingSet && s.pendingSet.previous, s.bootSet && s.bootSet.previous].filter(Boolean).forEach(function (set) { Object.keys(set).forEach(function (key) { if (set[key].repoId === id) keys[key] = true; }); }); pruneRecords(s, Object.keys(keys)); delete s.repositories[id]; }).then(function () { self.note = 'Depo kaldırıldı. Açık eklentiler yeniden açılışta kapanacak; izleme kayıtları korunur.'; }); };
  Manager.prototype.prepare = function () {
    var self = this; if (this.blocked) return Promise.resolve();
    return this.commit(function (s) {
      if (s.bootSet) { s.plugins = s.bootSet.previous; delete s.bootSet; delete s.pendingSet; }
      else if (s.pendingSet) {
        s.bootSet = s.pendingSet; delete s.pendingSet;
        Object.keys(s.plugins).forEach(function (key) { var p = s.plugins[key]; if (p.pending) { p.previous = p.active; p.active = p.pending; p.pending = null; } p.booting = false; });
      }
    }).then(function () {
      return serial(Object.keys(self.state.repositories), function (id) { var r = self.state.repositories[id]; if (!r.enabled) return; return S.fingerprint(r.publicKey).then(function (fp) { if (fp !== r.fingerprint) throw new Error('Publisher mismatch'); return self.transport.registerRepository(id, r.url.replace(/filmmerkezi201-repository\.json$/,'filmmerkezi-repository.json'), r.publicKey); }).catch(function (e) { self.errors[id] = e.message; }); });
    }).then(function () { return serial(Object.keys(self.state.plugins), function (key) { return self.loadPlugin(key); }); }).then(function () { self.bindDependencies(); }).catch(function (e) { self.note = e.message; });
  };
  Manager.prototype.bindDependencies = function () {
    var self = this, identities = {}, visiting = {}, order = [];
    Object.keys(this.loaded).forEach(function (key) {
      var p = self.loaded[key], identity = p.repo.fingerprint + '/' + p.manifest.id;
      if (identities[identity]) { self.errors[key] = 'Duplicate publisher package'; delete self.loaded[key]; return; }
      identities[identity] = key;
    });
    function visit(key) {
      if (order.indexOf(key) >= 0) return;
      if (visiting[key]) throw new Error('Dependency cycle');
      var p = self.loaded[key]; if (!p) throw new Error('Dependency unavailable');
      visiting[key] = true; p.bindings = {};
      p.manifest.dependencies.forEach(function (d) {
        var target = identities[d.publisher + '/' + d.id], dependency = self.loaded[target];
        if (!dependency || dependency.manifest.type !== 'resolver' || !D.satisfies(dependency.manifest.version, d)) throw new Error('Missing or incompatible resolver: ' + d.id);
        visit(target); p.bindings[d.id] = target;
      });
      delete visiting[key]; order.push(key);
    }
    Object.keys(this.loaded).forEach(function (key) { try { visit(key); } catch (e) { self.errors[key] = e.message; delete self.loaded[key]; visiting = {}; } });
    this.loadOrder = order.filter(function (key) { return !!self.loaded[key]; });
  };
  Manager.prototype.loadPlugin = function (key) {
    var self = this, p = this.state.plugins[key], repo = this.state.repositories[p.repoId];
    if (!p.enabled || !p.active || !repo || !repo.enabled) return Promise.resolve();
    if (this.errors[repo.id]) { this.errors[key] = this.errors[repo.id]; return Promise.resolve(); }
    var canRestore = !!p.previous;
    return this.readRecord(repo, p.active).then(function (text) {
      var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (error) { self.errors[key] = error.message; return; }
      var requirement = S.compatibility(m, self.core.config, self.core.status().current);
      if (requirement) { self.errors[key] = requirement.message; return; }
      if (m.id !== p.id || m.version !== p.active.version) throw new Error('Kurulu eklenti kimliği eşleşmiyor.');
      return S.fingerprint(repo.publicKey).then(function (publisher) {
        var rules = self.core.selected && self.core.selected.pluginMinimums || [], blocked = rules.some(function (r) {
          return r.publisher === publisher && r.id === m.id && S.compare(m.version, r.version) < 0;
        });
        if (blocked) { self.errors[key] = 'Eklentiyi güncelleyin / Update this plugin'; delete self.loaded[key]; return; }
        delete self.errors[key];
        return self.policy(repo, m).then(function (a) { return self.transport.configureRepository(repo.id, p.id, a[0], a[1]).then(function () { return a; }); }).then(function (a) {
          self.loaded[key] = { manifest: m, repo: repo, record: p.active, prefix: 'plugins/' + key + '/', assets: {}, origins: V.networkPolicy(a[0]) };
        });
      });
    }).catch(function (e) { self.errors[key] = e.message; });
  };
  Manager.prototype.groups = function () { var self = this; return (this.loadOrder || Object.keys(this.loaded)).map(function (key) { var p = self.loaded[key]; return p.manifest.modules.map(function (f) { return p.prefix + f; }); }); };
  Manager.prototype.owns = function (path) { return typeof path === 'string' && path.indexOf('plugins/') === 0; };
  Manager.prototype.owner = function (path) { var self = this; return Object.keys(this.loaded).filter(function (key) { return path.indexOf(self.loaded[key].prefix) === 0; })[0]; };
  Manager.prototype.asset = function (key, path) { var self = this, p = this.loaded[key]; if (!p) return Promise.reject(new Error('Eklenti etkin değil.')); var file = p.manifest.files.filter(function (f) { return f.path === path; })[0]; if (!file) return Promise.reject(new Error('Eklenti dosyası manifestte yok.')); if (!p.assets[path]) p.assets[path] = self.blob(file.sha256).then(function (text) { if (V.bytes(text).length !== file.size) throw new Error('Eklenti dosya boyutu eşleşmiyor.'); return text; }); return p.assets[path]; };
  Manager.prototype.contextFor = function (key) {
    var self = this, p = this.loaded[key]; if (!p) throw new Error('Package not loaded');
    return { key: key, id: p.manifest.id, type: p.manifest.type, site: p.manifest.site ? clone(p.manifest.site) : null,
      readJSON: function (path) { return self.asset(key, path).then(function (text) { return JSON.parse(text); }); },
      createClient: function (options) { return root.PackageNetwork.createClient(key, options); },
      createResolver: function (id, log, now) { return root.ResolverRegistry.create(key, id, log, now); },
      registerResolver: function (definition) { if (self.loading !== key) throw new Error('Registration outside module load'); root.ResolverRegistry.register(definition); },
      registerLoader: function (id, factory) { if (self.loading !== key) throw new Error('Registration outside module load'); root.ResolverRegistry.registerLoader(id, factory); }
    };
  };
  Manager.prototype.context = function () { if (!this.loading) throw new Error('Context only available during module load'); return this.contextFor(this.loading); };
  Manager.prototype.appendScript = function (script, path) {
    var self = this, key = this.owner(path), p = this.loaded[key]; if (!p) return Promise.reject(new Error('Eklenti dosyası bulunamadı.'));
    this.loading = key; this.loadingScript = script;
    var start = this.state.plugins[key].booting ? Promise.resolve() : this.commit(function (s) { s.plugins[key].booting = true; });
    return start.then(function () { if (self.core.bootStopped) throw new Error('Başlangıç iptal edildi.'); return self.asset(key, path.slice(p.prefix.length)); }).then(function (text) { if (self.core.bootStopped) throw new Error('Başlangıç iptal edildi.'); if (root.FilmBootProgress) root.FilmBootProgress.stage('Eklenti başlatılıyor: ' + p.manifest.name, 'Starting extension: ' + p.manifest.name); var url = root.URL.createObjectURL(new Blob([text], { type: 'application/javascript' })); function release() { root.URL.revokeObjectURL(url); script.removeEventListener('load', release); script.removeEventListener('error', release); if (self.loadingScript === script) { self.loading = ''; self.loadingScript = null; } } script.addEventListener('load', release); script.addEventListener('error', release); script.src = url; document.head.appendChild(script); });
  };
  Manager.prototype.registryFinished = function (sites) {
    var self = this, failed = []; this.loadRollback = !!this.state.bootSet;
    Object.keys(this.loaded).forEach(function (key) {
      var p = self.loaded[key], valid = p.manifest.type === 'resolver' ? root.ResolverRegistry.has(key) : sites.some(function (site) { return site.id === p.manifest.site.id && site.pluginKey === key && site.prefix === p.manifest.site.prefix && new root.URL(site.base).origin === p.manifest.site.base; });
      if (self.scriptErrors[key] || !valid) failed.push(key);
    });
    Object.keys(this.errors).forEach(function (key) { if (self.state.plugins[key] && self.state.plugins[key].enabled) failed.push(key); });
    return this.commit(function (s) {
      if (failed.length && s.bootSet) { s.plugins = s.bootSet.previous; delete s.bootSet; }
      else { if (!failed.length) s.previousSet = s.bootSet ? s.bootSet.previous : s.previousSet; delete s.bootSet; failed.forEach(function (key) { if (s.plugins[key]) s.plugins[key].error = self.errors[key] || self.scriptErrors[key] || 'Package registration failed'; }); }
      Object.keys(s.plugins).forEach(function (key) { s.plugins[key].booting = false; });
    }).then(function () { return failed.length > 0 && !!self.loadRollback; }).catch(function (e) { self.note = e.message; return false; });
  };
  Manager.prototype.bind = function (app) { var self = this; this.app = app; app.controller.on('open', function () { if (self.busy || self.search) self.cancel(); }); };
  root.FilmPluginManager = Manager;
})(window);
