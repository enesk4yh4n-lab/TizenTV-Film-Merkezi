/* Core installer uses the existing verified stores, transport and atomic pending set. */
(function(root){'use strict';var S=root.FilmPluginSchema,V=root.FilmUpdateVerify;function serial(a,fn){var p=Promise.resolve();a.forEach(function(v,index){p=p.then(function(){return fn(v,index);});});return p;}function clone(v){return JSON.parse(JSON.stringify(v));}
  function countOrigins(core,packages){var set={};core.forEach(function(o){set[o]=true;});Object.keys(packages).forEach(function(k){packages[k].forEach(function(o){set[o]=true;});});return Object.keys(set).length;}
  function capacityKey(owner,groups){
    function core(manifest){if(!manifest)return null;var policy=manifest.networkPolicy||{};return {version:manifest.version,budget:manifest.networkOriginBudget,policy:policy,files:(manifest.files||[]).filter(function(f){return f.path===policy.file||f.path===policy.signature;}).map(function(f){return [f.path,f.sha256,f.size];})};}
    var state=owner.state;
    return JSON.stringify({application:owner.core.config&&owner.core.config.appVersion,current:owner.core.status&&owner.core.status().current,baseline:core(owner.core.baseline),selected:core(owner.core.selected),limit:owner.originLimit ? owner.originLimit() : 128,
      repositories:Object.keys(state.repositories).sort().map(function(key){var r=state.repositories[key];return [key,r.enabled,r.url,r.fingerprint,r.publicKey,r.revision,r.catalog&&r.catalog.hash,r.catalog&&r.catalog.signature];}),
      packages:Object.keys(state.plugins).sort().map(function(key){var p=state.plugins[key];return [key,p.repoId,p.enabled,p.active,p.pending,p.dependencies];}),
      groups:groups.map(function(g){return [g.key,g.repoId,g.pluginId,g.version,g.updateKeys];}).sort(function(a,b){return a[0]<b[0]?-1:a[0]>b[0]?1:0;})});
  }
  function previewCapacity(groups,isCurrent,notify){
    var owner=this,key=capacityKey(owner,groups),cached=owner.capacityPreviewCache,stopped=false,ticket={},task;
    function current(){if(stopped||isCurrent&&!isCurrent()){var error=Error('Capacity preview cancelled');error.cancelled=true;throw error;}}
    if(cached&&cached.key===key){task=Promise.resolve().then(function(){current();return cached.value;});task.cancel=function(){stopped=true;};return task;}
    // Only completed, fully verified results survive a screen close. Never persist them.
    owner.capacityPreviewCache=null;owner.capacityPreviewTicket=ticket;
    var work=calculateCapacity.call(owner,groups,isCurrent,notify);
    task=work.then(function(value){current();if(owner.capacityPreviewTicket===ticket&&capacityKey(owner,groups)===key&&!Object.keys(value.plans).some(function(k){return !!value.plans[k].error;}))owner.capacityPreviewCache={key:key,value:value};return value;});
    task.cancel=function(){stopped=true;if(work.cancel)work.cancel();};return task;
  }
  function calculateCapacity(groups,isCurrent,notify){
    var owner=this,view=Object.create(this),cache={},policies={},base={},plans={},core=[],stopped=false;
    view.currentTask=null;
    view.fetch=function(url,check,limit){if(!cache[url])cache[url]=owner.fetch.call(view,url,check,limit);return cache[url];};
    view.readRecord=function(repo,record){var key='record|'+repo.id+'|'+record.hash+'|'+record.signature;if(!cache[key])cache[key]=owner.readRecord.call(view,repo,record);return cache[key];};
    view.catalog=function(id){var key='catalog|'+id;if(!cache[key])cache[key]=owner.catalog.call(view,id);return cache[key];};
    function check(){if(stopped||isCurrent&&!isCurrent()){var e=Error('Capacity preview cancelled');e.cancelled=true;throw e;}}
    function report(phase,done,total){if(notify)notify({phase:phase,done:done,total:total});}
    function policy(c){var m=c.manifest,key=c.key+'|'+m.files.map(function(f){return f.sha256;}).join('|');if(policies[key])return policies[key];
      function file(name){var f=m.files.filter(function(v){return v.path===name;})[0];if(!f)throw Error('Missing signed network policy');return owner.blob(f.sha256).catch(function(){if(!c.item)throw Error('Installed policy missing');return view.fetch(S.repositoryRoot(c.repo.url)+c.item.manifest.replace(/manifest\.json$/,'runtime/')+f.path,check,f.size);}).then(function(text){check();return V.sha(text).then(function(hash){if(hash!==f.sha256||V.bytes(text).length!==f.size)throw Error('Policy hash mismatch');return text;});});}
      policies[key]=file(m.networkPolicy.file).then(function(text){return file(m.networkPolicy.signature).then(function(sig){return new V.Trust(c.repo.publicKey).verify(text,sig).then(function(){return V.networkPolicy(text);});});});return policies[key];
    }
    var promise=owner.core.local(owner.core.baseline.networkPolicy.file).then(function(text){core=V.networkPolicy(text);return serial(Object.keys(owner.state.plugins),function(key,index){check();report('installed',index,Object.keys(owner.state.plugins).length);var p=owner.state.plugins[key],r=owner.state.repositories[p.repoId];if(!p.enabled||!r||!r.enabled||!(p.pending||p.active))return;return owner.readRecord(r,p.pending||p.active).then(function(text){var m=S.manifest(text,owner.core.config.appVersion);return policy({key:key,repo:r,manifest:m});}).then(function(origins){base[key]=origins;});});}).then(function(){return serial(groups,function(group,index){check();report('dependencies',index,groups.length);return view.installationPlan(group.repoId,group.pluginId||group.key.slice(group.key.lastIndexOf('/')+1),check).then(function(rows){var entries={};return serial(rows,function(c){return policy(c).then(function(origins){entries[c.key]=origins;});}).then(function(){plans[group.key]={entries:entries,rows:rows};report('dependencies',index+1,groups.length);});}).catch(function(e){check();plans[group.key]={error:e.message};});});}).then(function(){check();var limit=owner.originLimit?owner.originLimit():128;return {limit:limit,current:countOrigins(core,base),evaluate:function(keys){var entries={},candidates={},roots=[],installed=[];Object.keys(base).forEach(function(k){entries[k]=base[k];});keys.forEach(function(key){var p=plans[key];if(!p||p.error)throw Error(p&&p.error||'Capacity information unavailable');roots.push(key);p.rows.forEach(function(c){var old=candidates[c.key];if(old&&old.manifest.version!==c.manifest.version)throw Error('Resolver version conflict');candidates[c.key]=c;});Object.keys(p.entries).forEach(function(k){entries[k]=p.entries[k];});});if(roots.length)root.FilmDependencies.plan(roots,Object.keys(candidates).map(function(k){return candidates[k];}),installed);return {used:countOrigins(core,entries),remaining:limit-countOrigins(core,entries)};},own:function(keys){var selected={};keys.forEach(function(k){if(base[k])selected[k]=base[k];});return countOrigins([],selected);},plans:plans};});
    promise.cancel=function(){stopped=true;if(view.currentTask&&view.currentTask.cancel)view.currentTask.cancel();};return promise;
  }
  function installationPlan(repoId, pluginId, check, options) {
    if (this.selectInstallation) return this.selectInstallation(repoId, pluginId, check, options);
    options = options || {}; var requests = options.requests || [{repoId:repoId,id:pluginId}], self = this, candidates = [], installed = [], visited = {};
    function read(repo, item) {
      var key = repo.id + '/' + item.id;
      if (visited[key]) return visited[key];
      var raw, sig, base = S.repositoryRoot(repo.url);
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
      var plan, records = {}, allOrigins = {}, progress={stage:'planning',packages:[],current:'',downloaded:0,reused:0,processed:0,total:0,packageBytes:0,packageTotal:0,installed:0,installTotal:0};
      function emit(stage,c){progress.stage=stage;if(c){progress.current=c.manifest.id;progress.currentKey=c.key;progress.packages.forEach(function(p){if(p.key===c.key){p.stage=stage;p.bytes=progress.packageBytes;}});}if(options.onProgress)options.onProgress(progress.current,clone(progress));}
      function installed(c){progress.installed++;progress.packages.forEach(function(p){if(p.key===c.key)p.installed++;});}
      emit('planning');
      return self.installationPlan(repoId, pluginId, check, options).then(function (rows) {
        if(options.approved)rows.forEach(function(c){var pin=options.approved.filter(function(p){return p.key===c.key;})[0];if(!pin||pin.publisher!==c.publisher||pin.version!==c.manifest.version||pin.hash!==(c.item?c.item.manifestSha256:(self.state.plugins[c.key].pending||self.state.plugins[c.key].active).hash))throw new Error('Approved package changed; check again');});
        rows.forEach(function (c) { Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (key !== c.key && p.enabled && r && r.enabled && r.fingerprint === c.publisher && p.id === c.manifest.id) throw new Error('Publisher package already installed through another repository: ' + p.id); }); });
        var siteOwners = {};
        Object.keys(self.state.plugins).forEach(function (key) { var p = self.state.plugins[key]; if (p.enabled && p.siteId && !rows.some(function (c) { return c.key === key; })) siteOwners[p.siteId] = key; });
        rows.forEach(function (c) { if (c.manifest.type !== 'site') return; var id = c.manifest.site.id; if (siteOwners[id] && siteOwners[id] !== c.key) throw new Error('Site identity already installed: ' + id); siteOwners[id] = c.key; });
        plan = rows;progress.packages=rows.map(function(c){var size=c.manifest.files.reduce(function(n,f){return n+f.size;},0),units=1;progress.total+=size;progress.installTotal+=units;return {key:c.key,id:c.manifest.id,stage:'waiting',bytes:0,total:size,installed:0,installTotal:units};});emit('planning');self.lastPlan = rows.map(function (c) { return { key: c.key, type: c.manifest.type, name: c.manifest.name, version: c.manifest.version }; });
        if (self.checkPackageLimit) self.checkPackageLimit(rows);
        else if (Object.keys(self.state.plugins).concat(rows.map(function (c) { return c.key; })).filter(function (key, i, a) { return a.indexOf(key) === i; }).length > 64) throw new Error('64 package limit');
        var start = self.beginDownload ? self.beginDownload(rows, check) : Promise.resolve();
        return start.then(function () { return serial(rows, function (c) {
          progress.packageBytes=0;progress.packageTotal=c.manifest.files.reduce(function(n,f){return n+f.size;},0);emit('storage',c);
          var m = c.manifest, old = self.state.plugins[c.key], base = S.repositoryRoot(c.repo.url);
          if (old && old.active && S.compare(m.version, old.active.version) < 0) throw new Error('Downgrade requires rollback');
          if (old && old.active && old.active.version === m.version && old.active.hash !== (c.item ? c.item.manifestSha256 : old.active.hash)) throw new Error('Immutable package version changed');
          var storage = self.beginDownload ? Promise.resolve() : self.preflightStorage(m, c.raw);
          return storage.then(function () { return serial(m.files, function (f) {
            check();var fetched=false,loaded=0,baseBytes=progress.processed,packageBytes=progress.packageBytes;emit('reading',c);return self.blob(f.sha256).catch(function () {
              if (!c.item) throw new Error('Installed dependency file missing');
              fetched=true;emit('downloading',c);var url=base+c.item.manifest.replace(/manifest\.json$/,'runtime/')+f.path;if(!self.transport||!self.transport.supported())return self.fetch(url,check,Math.max(1,f.size));var task=self.transport.request(url,'',{timeoutMs:20000,byteLimit:Math.max(1,f.size),onprogress:function(size){try{check();}catch(ignore){return;}var n=Math.max(loaded,Math.min(f.size,Number(size)||0));progress.downloaded+=n-loaded;loaded=n;progress.processed=baseBytes+loaded;progress.packageBytes=packageBytes+loaded;emit('downloading',c);}});self.currentTask=task;return task.promise.then(function(r){self.currentTask=null;check();if(!r||typeof r.body!=='string')throw Error('Invalid package response');return r.body;},function(e){self.currentTask=null;throw e;});
            }).then(function (text) {check();if(fetched){var size=V.bytes(text).length;progress.downloaded+=Math.max(0,size-loaded);}else progress.reused+=f.size;progress.processed=baseBytes+f.size;progress.packageBytes=packageBytes+f.size;emit('verifying',c);return V.sha(text).then(function (hash) {
              if (hash !== f.sha256 || V.bytes(text).length !== f.size) throw new Error('Package file mismatch: ' + f.path);
              return self.put(text).then(function(){if(check.progress)check.progress();else check();emit('verifying',c);});
            }); });
          }); }).then(function () { return self.policy(c.repo, m); }).then(function (a) {
            V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; });
            return self.put(c.raw);
          }).then(function (hash) {check();emit('verified',c);records[c.key] = { hash: hash, signature: c.signature, version: m.version }; });
        }); });
      }).then(function () {
        return serial(Object.keys(self.state.plugins), function (key) {
          var p = self.state.plugins[key], r = self.state.repositories[p.repoId]; if (records[key] || !p.enabled || !r || !r.enabled || !(p.pending || p.active)) return;
          return self.readRecord(r, p.pending || p.active).then(function (text) { var m; try { m = S.manifest(text, self.core.config.appVersion); } catch (ignore) { return; } return self.policy(r, m); }).then(function (a) { if (a) V.networkPolicy(a[0]).forEach(function (origin) { allOrigins[origin] = true; }); });
        });
      }).then(function () {
        return self.core.local(self.core.baseline.networkPolicy.file).then(function (text) { V.networkPolicy(text).forEach(function (origin) { allOrigins[origin] = true; }); });
      }).then(function () {
        if (countOrigins(Object.keys(allOrigins), {}) > (self.originLimit ? self.originLimit() : 128)) throw new Error('Network origin budget exceeded');
        check();emit('installing');return self.commit(function (state) {
          if (!state.pendingSet) state.pendingSet = { previous: clone(state.plugins) };
          delete state.resumeSet;
          plan.forEach(function (c) {
            var m = c.manifest, p = state.plugins[c.key] || { repoId: c.repo.id, id: m.id, active: null, previous: null };
            p.pending = records[c.key]; if (typeof p.enabled !== 'boolean') p.enabled = true; p.type = m.type; p.name = m.name; p.siteId = m.site && m.site.id; p.error = ''; p.dependencies = m.dependencies;
            state.plugins[c.key] = p;
          });
        });
      }).then(function () {plan.forEach(function(c){installed(c);});progress.packages.forEach(function(p){p.stage='ready';});emit('ready');self.note = 'Packages verified; restart to activate / Paketler dogrulandi; yeniden acin'; self.restartNeeded = true; return records[repoId + '/' + pluginId]; });
    });
  };

root.FilmPackageInstaller={countOrigins:countOrigins,attach:function(manager){if(!manager||manager.coreInstaller215)return;manager.installationPlan=installationPlan;manager.download=download;manager.previewCapacity=previewCapacity;manager.coreInstaller215=true;}};
})(window);
