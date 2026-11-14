/* Core installer uses the existing verified stores, transport and atomic pending set. */
(function(root){'use strict';var S=root.FilmPluginSchema,V=root.FilmUpdateVerify;function serial(a,fn){var p=Promise.resolve();a.forEach(function(v){p=p.then(function(){return fn(v);});});return p;}function clone(v){return JSON.parse(JSON.stringify(v));}
  function installationPlan(repoId, pluginId, check, options) {
    options = options || {}; var requests = options.requests || [{repoId:repoId,id:pluginId}], self = this, candidates = [], installed = [], visited = {};
    function read(repo, item) {
      var key = repo.id + '/' + item.id;
      if (visited[key]) return visited[key];
      var raw, sig, base = repo.url.replace(/filmmerkezi-repository\.json$/, '');
      visited[key] = self.fetch(base + item.manifest, check, 16384).then(function (text) {
        raw = text; return V.sha(text);
      }).then(function (hash) {
        if (hash !== item.manifestSha256) throw new Error('Package manifest hash mismatch');
        return self.fetch(base + item.manifest.replace(/manifest\.json$/, 'manifest.sig'), check, 1024);
      }).then(function (signature) { sig = signature; return new V.Trust(repo.publicKey).verify(raw, sig); }).then(function () {
        var m = S.manifest(raw, self.core.config.appVersion);
        if (m.id !== item.id || m.version !== item.version || m.type !== item.type || S.compare(options.coreVersion || self.core.status().current, m.minCoreVersion) < 0) throw new Error('Package identity or core version mismatch');
        var c = { key: key, publisher: repo.fingerprint, manifest: m, raw: raw, signature: sig, repo: repo, item: item }; candidates.push(c);
        return serial(m.dependencies, function (d) {
          return serial(Object.keys(self.state.repositories), function (id) {
            var r = self.state.repositories[id]; if (!r.enabled || r.fingerprint !== d.publisher) return;
            return self.catalog(id).then(function (catalog) {
              var dep = catalog.plugins.filter(function (x) { return x.id === d.id && x.type === 'resolver' && root.FilmDependencies.satisfies(x.version, d); })[0];
              return dep && !visited[r.id + '/' + dep.id] ? read(r, dep) : null;
            });
          });
        }).then(function () { return c; });
      });
      return visited[key];
    }
    return serial(Object.keys(this.state.plugins), function (key) {
      var p = self.state.plugins[key], r = self.state.repositories[p.repoId];
      if (!p.enabled || !r || !r.enabled || !(p.pending || p.active)) return;
      return self.readRecord(r, p.pending || p.active).then(function (text) {
        var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (e) { return; }
        var c = { key: key, publisher: r.fingerprint, manifest: m, repo: r, raw: text, signature: (p.pending || p.active).signature, installed: true };
        candidates.push(c); installed.push(c);
      });
    }).then(function () {
      return serial(requests, function(request) { var repo=self.state.repositories[request.repoId]; if(!repo||!repo.enabled)throw new Error('Repository disabled');return self.catalog(repo.id).then(function(catalog){var item=catalog.plugins.filter(function(x){return x.id===request.id;})[0];if(!item)throw new Error('Package not found');return read(repo,item);}); });
    }).then(function () {
      var latest = {}; candidates.forEach(function (c) { if (!latest[c.key] || !c.installed) latest[c.key] = c; });
      return root.FilmDependencies.plan(requests.map(function(r){return r.repoId+'/'+r.id;}), Object.keys(latest).map(function (key) { return latest[key]; }), installed);
    });
  };
  function download(repoId, pluginId, options) {
    options = options || {}; var self = this;
    return this.operation('download', function (check) {
      var plan, records = {}, allOrigins = {}, progress={stage:'planning',packages:[],current:'',downloaded:0,reused:0,processed:0,total:0,packageBytes:0,packageTotal:0};
      function emit(stage,c){progress.stage=stage;if(c){progress.current=c.manifest.id;progress.packages.forEach(function(p){if(p.id===c.manifest.id)p.stage=stage;});}if(options.onProgress)options.onProgress(progress.current,clone(progress));}
      emit('planning');
      return self.installationPlan(repoId, pluginId, check, options).then(function (rows) {
        if(options.approved)rows.forEach(function(c){var pin=options.approved.filter(function(p){return p.key===c.key;})[0];if(!pin||pin.publisher!==c.publisher||pin.version!==c.manifest.version||pin.hash!==(c.item?c.item.manifestSha256:(self.state.plugins[c.key].pending||self.state.plugins[c.key].active).hash))throw new Error('Approved package changed; check again');});
        rows.forEach(function (c) { Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (key !== c.key && p.enabled && r && r.enabled && r.fingerprint === c.publisher && p.id === c.manifest.id) throw new Error('Publisher package already installed through another repository: ' + p.id); }); });
        var siteOwners = {};
        Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key]; if (p.enabled && p.siteId && !rows.some(function (c) { return c.key === key; })) siteOwners[p.siteId] = key; });
        rows.forEach(function (c) { if (c.manifest.type !== 'site') return; var id = c.manifest.site.id; if (siteOwners[id] && siteOwners[id] !== c.key) throw new Error('Site identity already installed: ' + id); siteOwners[id] = c.key; });
        plan = rows;progress.packages=rows.map(function(c){return {id:c.manifest.id,stage:'waiting'};});rows.forEach(function(c){c.manifest.files.forEach(function(f){progress.total+=f.size;});});emit('planning');self.lastPlan = rows.map(function (c) { return { key: c.key, type: c.manifest.type, name: c.manifest.name, version: c.manifest.version }; });
        if (Object.keys(self.state.plugins).concat(rows.map(function (c) { return c.key; })).filter(function (key, i, a) { return a.indexOf(key) === i; }).length > 64) throw new Error('64 package limit');
        return serial(rows, function (c) {
          progress.packageBytes=0;progress.packageTotal=c.manifest.files.reduce(function(n,f){return n+f.size;},0);emit('storage',c);
          var m = c.manifest, old = self.state.plugins[c.key], base = c.repo.url.replace(/filmmerkezi-repository\.json$/, '');
          if (old && old.active && S.compare(m.version, old.active.version) < 0) throw new Error('Downgrade requires rollback');
          if (old && old.active && old.active.version === m.version && old.active.hash !== (c.item ? c.item.manifestSha256 : old.active.hash)) throw new Error('Immutable package version changed');
          return self.preflightStorage(m, c.raw).then(function () { return serial(m.files, function (f) {
            check();var fetched=false,loaded=0,baseBytes=progress.processed,packageBytes=progress.packageBytes;emit('reading',c);return self.blob(f.sha256).catch(function () {
              if (!c.item) throw new Error('Installed dependency file missing');
              fetched=true;emit('downloading',c);var url=base+c.item.manifest.replace(/manifest\.json$/,'runtime/')+f.path;if(!self.transport||!self.transport.supported())return self.fetch(url,check,Math.max(1,f.size));var task=self.transport.request(url,'',{timeoutMs:20000,byteLimit:Math.max(1,f.size),onprogress:function(size){try{check();}catch(ignore){return;}var n=Math.max(loaded,Math.min(f.size,Number(size)||0));progress.downloaded+=n-loaded;loaded=n;progress.processed=baseBytes+loaded;progress.packageBytes=packageBytes+loaded;emit('downloading',c);}});self.currentTask=task;return task.promise.then(function(r){self.currentTask=null;check();if(!r||typeof r.body!=='string')throw Error('Invalid package response');return r.body;},function(e){self.currentTask=null;throw e;});
            }).then(function (text) {check();if(fetched){var size=V.bytes(text).length;progress.downloaded+=Math.max(0,size-loaded);}else progress.reused+=f.size;progress.processed=baseBytes+f.size;progress.packageBytes=packageBytes+f.size;emit('verifying',c);return V.sha(text).then(function (hash) {
              if (hash !== f.sha256 || V.bytes(text).length !== f.size) throw new Error('Package file mismatch: ' + f.path);
              return self.put(text);
            }); });
          }); }).then(function () { return self.policy(c.repo, m); }).then(function (a) {
            V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; });
            return self.put(c.raw);
          }).then(function (hash) {progress.packages.forEach(function(p){if(p.id===m.id)p.stage='verified';});emit('verified',c);records[c.key] = { hash: hash, signature: c.signature, version: m.version }; });
        });
      }).then(function () {
        return serial(Object.keys(self.state.plugins), function (key) {
          var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (records[key] || !p.enabled || !r || !r.enabled || !(p.pending || p.active)) return;
          return self.readRecord(r, p.pending || p.active).then(function (text) { var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (ignore) { return; } return self.policy(r, m); }).then(function (a) { if (a) V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; }); });
        });
      }).then(function () {
        return self.core.local(self.core.baseline.networkPolicy.file).then(function (text) { V.networkPolicy(text).forEach(function (origin) { allOrigins[origin] = true; }); });
      }).then(function () {
        if (Object.keys(allOrigins).length > 128) throw new Error('Network origin budget exceeded');
        check();emit('installing');return self.commit(function (state) {
          if (!state.pendingSet) state.pendingSet = { previous: clone(state.plugins) };
          plan.forEach(function (c) {
            var m = c.manifest, p = state.plugins[c.key] || { repoId: c.repo.id, id: m.id, active: null, previous: null };
            p.pending = records[c.key]; if (typeof p.enabled !== 'boolean') p.enabled = true; p.type = m.type; p.name = m.name; p.siteId = m.site && m.site.id; p.error = ''; p.dependencies = m.dependencies;
            state.plugins[c.key] = p;
          });
        });
      }).then(function () {progress.packages.forEach(function(p){p.stage='ready';});emit('ready');self.note = 'Packages verified; restart to activate / Paketler dogrulandi; yeniden acin'; self.restartNeeded = true; return records[repoId + '/' + pluginId]; });
    });
  };

root.FilmPackageInstaller={attach:function(manager){if(!manager||manager.coreInstaller215)return;manager.installationPlan=installationPlan;manager.download=download;manager.coreInstaller215=true;}};
})(window);
