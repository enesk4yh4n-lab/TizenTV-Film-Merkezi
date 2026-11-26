/* Core-owned repository browser; bootstrap remains unchanged in WGT. */
/* Public GitHub repository discovery. Never trusts or installs a search result. */
(function (root) {
  'use strict';
  var NAME = 'filmmerkezi-repository.json', API = 'https://api.github.com';
  function message(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function httpsText(url, timeout, limit) {
    var xhr = new root.XMLHttpRequest(), abort;
    var promise = new Promise(function (resolve, reject) {
      var done = false;
      function finish(error, value) {
        if (done) return;
        done = true;
        xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = xhr.onabort = null;
        if (error) reject(error); else resolve(value);
      }
      abort = function () { finish(new Error(message('Arama iptal edildi.', 'Search cancelled.'))); xhr.abort(); };
      xhr.open('GET', url, true);
      xhr.timeout = timeout;
      xhr.onload = function () { finish(null, { status: xhr.status, body: xhr.responseText }); };
      xhr.onerror = xhr.ontimeout = function () { finish(new Error(message('GitHub bağlantısı kurulamadı.', 'Could not connect to GitHub.'))); };
      xhr.onabort = abort;
      xhr.onprogress = function (e) { if (e.loaded > limit) abort(); };
      xhr.send();
    });
    return { promise: promise, cancel: function () { if (abort) abort(); } };
  }
  function indexAddress(repo, path) {
    if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.fullName) || !/^[A-Za-z0-9_./-]{1,100}$/.test(repo.branch) || repo.branch.indexOf('..') >= 0) throw new Error('Invalid repository');
    return root.FilmPluginSchema.address('https://raw.githubusercontent.com/' + repo.fullName + '/' + repo.branch + '/' + (path || NAME));
  }
  function Search() { this.task = null; this.generation = 0; this.cache = {}; }
  Search.httpsText = httpsText;
  Search.indexAddress = indexAddress;
  Search.prototype.cancel = function () { this.generation++; if (this.task) this.task.cancel(); this.task = null; };
  Search.prototype.read = function (url, token) {
    var self = this, task;
    if (root.FilmNativeTLS && root.FilmNativeTLS.supported()) task = root.FilmNativeTLS.request(url, '', { timeoutMs: 15000, byteLimit: 262144 });
    else task = httpsText(url, 15000, 262144);
    this.task = task;
    return task.promise.then(function (r) {
      if (token !== self.generation) throw new Error(message('Arama iptal edildi.', 'Search cancelled.'));
      self.task = null;
      var status = r && (r.status || r.statusCode);
      if (status === 403 || status === 429) throw new Error(message('GitHub istek sınırı veya erişim engeli. Biraz bekleyip yeniden deneyin.', 'GitHub rate limit or access restriction. Wait before retrying.'));
      if (!r || status !== 200 || typeof r.body !== 'string' || root.FilmUpdateVerify.bytes(r.body).length > 262144) throw new Error(message('GitHub yanıtı alınamadı.', 'Could not read the GitHub response.'));
      return JSON.parse(r.body);
    });
  };
  Search.prototype.search = function (text, mode, page) {
    this.cancel();
    text = String(text || '').replace(/^\s+|\s+$/g, '');
    if (text.length > 80 || /[\x00-\x1f"\\]/.test(text) || mode === 'user' && !/^[A-Za-z0-9-]{1,39}$/.test(text)) return Promise.reject(new Error(message('Geçerli bir depo adı veya GitHub kullanıcı adı yazın.', 'Enter a valid repository name or GitHub username.')));
     text = text || "film-merkezi"; var cacheKey = (mode || "repository") + "|" + text + "|" + (page || 1), cached = this.cache[cacheKey]; if (cached && Date.now() - cached.at < 300000) return Promise.resolve(JSON.parse(JSON.stringify(cached.value))); var self = this;
    var token = this.generation, query = (mode === 'user' ? 'user:' + text : text.replace(/[:<>]/g, ' ')) + ' "' + NAME + '" in:readme', number = Math.max(1, Math.min(10, Number(page) || 1));
    return this.read(API + '/search/repositories?q=' + encodeURIComponent(query) + '&per_page=10&page=' + number, token).then(function (data) {
      if (!data || !Array.isArray(data.items)) throw new Error(message('GitHub arama yanıtı geçersiz.', 'Invalid GitHub search response.'));
      var rows = data.items.filter(function (r) { return r && typeof r.full_name === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.full_name) && typeof r.default_branch === 'string' && /^[A-Za-z0-9_./-]{1,100}$/.test(r.default_branch) && r.default_branch.indexOf('..') < 0 && !r.private; }).slice(0, 10).map(function (r) { return { fullName: r.full_name, branch: r.default_branch, description: typeof r.description === 'string' ? r.description.slice(0, 200) : '' }; });
      var result = { items: rows, page: number, next: rows.length === 10 && number < 10 && data.total_count > number * 10, incomplete: !!data.incomplete_results }; self.cache[cacheKey] = {at:Date.now(),value:result}; var keys = Object.keys(self.cache); if (keys.length > 20) delete self.cache[keys[0]]; return result;
    });
  };
  Search.prototype.address = function (repo) {
    this.cancel();
    var token = this.generation;
    try { indexAddress(repo); } catch (error) { return Promise.reject(error); }
    return this.read(API + '/repos/' + repo.fullName + '/readme?ref=' + encodeURIComponent(repo.branch), token).then(function (data) {
      var text = '', path = NAME, marker;
      if (data && data.encoding === 'base64' && typeof data.content === 'string' && data.content.length < 180000) text = root.atob(data.content.replace(/\s/g, ''));
      marker = /<!--\s*film-merkezi-repository:\s*([A-Za-z0-9_./-]+)\s*-->/.exec(text);
      if (marker) path = marker[1];
      if (path.indexOf('..') >= 0 || path.charAt(0) === '/' || !/(^|\/)filmmerkezi-repository\.json$/.test(path)) throw new Error(message('README depo adresi geçersiz.', 'Invalid repository address in README.'));
      return indexAddress(repo, path);
    });
  };
  root.FilmRepositorySearch = Search;
})(window);

(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function draw(catalog, box, panel) {
    var manager = root.FilmPlugins, view = panel.pluginView || 'repositories';
    if(view==='setup-search'&&root.FilmRepositoryDiscovery){root.FilmRepositoryDiscovery.setup(catalog,box,panel);return;}
    function line(value, small) { var p = document.createElement('p'); p.className = small ? 'support-description' : 'catalog-note'; p.style.wordWrap = 'break-word'; p.textContent = value; box.appendChild(p); return p; }
    function button(label, key, fn, enabled) { var b = document.createElement('button'); b.type = 'button'; b.className = 'filter-field'; b.setAttribute('data-focus', key); b.textContent = label; b.disabled = enabled === false || !!panel.working && key !== 'plugins-cancel-work'; b.onclick = fn; box.appendChild(b); return b; }
    function show(next, focus) { if(panel.centerEntry&&(next==='repository'||next==='repositories')){if(next==='repository'&&panel.settingsParent&&panel.settingsParent.onboarding&&panel.repoId)panel.settingsParent.installRepo=panel.repoId;catalog.closePanel(true);return;} panel.pluginView = next; catalog.renderPanel(focus); }
    function work(fn, next, focus) { if (panel.working) return; panel.working = true; var promise; try { promise = fn(); } catch (e) { promise = Promise.reject(e); } catalog.renderPanel('plugins-cancel-work'); promise.then(function () { panel.working = false; if (catalog.panel === panel) { if(next) show(next,focus); else catalog.renderPanel(focus); } }, function (e) { panel.working = false; manager.note = e.message; manager.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'plugin-operation',siteId:panel.pluginId,error:e}); if (catalog.panel === panel) catalog.renderPanel(); }); }
    function back(next) { button(t('← Geri', '← Back'), 'plugins-back', function () { if(manager.search)manager.search.cancel();manager.discardCandidate(); show(next); }); }
    function name(repo) { return repo.displayName || repo.name; }
    function details(fingerprint) {
      button(t('Teknik ayrıntılar', 'Technical details'), 'plugins-details', function () { panel.technical = !panel.technical; catalog.renderPanel('plugins-details'); });
      if (panel.technical) line(t('Yayıncı anahtarı · SHA-256: ', 'Publisher key · SHA-256: ') + fingerprint.match(/.{1,8}/g).join(' '), true);
    }
    if (!manager) { line(t('Eklenti yöneticisi açılamadı.', 'Plugin manager is unavailable.')); return; }
    if (manager.note) line(manager.note);
    if (manager.errorReport && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(manager.errorReport, 'plugins-report-error'));
    if (panel.working || manager.busy) { line(t('İşlem sürüyor…', 'Working…')); button(t('İndirmeyi iptal et', 'Cancel transfer'), 'plugins-cancel-work', function () { manager.cancel(); }); return; }
    if (manager.blocked) { line(t('Eklenti kaydı korunuyor; bu oturumda değiştirilemez.', 'Plugin records are preserved and read-only in this session.')); if (panel.onboarding) button(t('Şimdilik atla', 'Skip for now'), 'plugins-setup-done', function () { root.FilmRepositorySetup.complete(catalog); }); return; }
    if (view === 'address') {
      line(t('filmmerkezi-repository.json adresi', 'filmmerkezi-repository.json address'));
      var input = document.createElement('input'); input.type = 'url'; input.id = 'plugins-url'; input.maxLength = 2048; input.value = panel.url || ''; input.readOnly = true; input.tabIndex = -1; input.style.cssText = 'box-sizing:border-box;width:100%;font-size:25px;padding:14px;background:#101d30;color:white;border:2px solid #576781'; input.oninput = function () { panel.url = input.value; if(panel.settingsParent&&panel.settingsParent.wizard)root.FilmRepositorySetup.checkpoint(3,{url:input.value}); }; box.appendChild(input);
      button(t('Adresi düzenle · OK ile klavye', 'Edit address · OK opens keyboard'), 'plugins-url-edit', function () { panel.inputEditing = true; input.readOnly = false; input.focus(); });
      button(t('Devam et', 'Continue'), 'plugins-probe', function () { panel.url = input.value; panel.technical = false; work(function () { return manager.probe(panel.url).then(function(){return manager.approve(panel.replaceId);}).then(function(id){panel.repoId=id;}); }, 'repository', 'plugins-browse'); });
      back(panel.replaceId ? 'repository' : 'repositories');
    } else if (view === 'rename') {
      var targetRepo = manager.state.repositories[panel.repoId]; if (!targetRepo) { show('repositories'); return; }
      line(t('Bu cihazdaki görünen ad', 'Display name on this device'));
      var alias = document.createElement('input'); alias.type = 'text'; alias.id = 'plugins-name'; alias.maxLength = 100; alias.value = panel.alias === undefined ? name(targetRepo) : panel.alias; alias.readOnly = true; alias.tabIndex = -1; alias.style.cssText = 'box-sizing:border-box;width:100%;font-size:25px;padding:14px;background:#101d30;color:white;border:2px solid #576781'; alias.oninput = function () { panel.alias = alias.value; }; box.appendChild(alias);
      button(t('Adı düzenle · OK ile klavye', 'Edit name · OK opens keyboard'), 'plugins-name-edit', function () { panel.inputEditing = true; alias.readOnly = false; alias.focus(); });
      button(t('Kaydet', 'Save'), 'plugins-name-save', function () { panel.alias = alias.value; work(function () { return manager.renameRepository(panel.repoId, panel.alias); }, 'repository', 'plugins-rename'); });
      back('repository');
    } else if (view === 'trust') {
      var candidate = manager.candidate; if (!candidate) { show('address'); return; }
      var knownId = 'repo-' + candidate.fingerprint.slice(0, 16) + '-' + candidate.repository.id.slice(0, 20);
      if (!panel.replaceId && manager.state.repositories[knownId]) panel.replaceId = knownId;
      line(candidate.repository.name); line(candidate.url, true);
      var previousRepo = manager.state.repositories[panel.replaceId];
      if (previousRepo && previousRepo.publicKey !== candidate.repository.publicKey) line(t('Yayıncı anahtarı değişti. Yalnız bu değişikliği bekliyorsanız yeniden güvenin. Önceki depo ve eklentileri silinmeden kapatılacak; yeni yayıncıdan paketleri yeniden seçebilirsiniz.', 'The publisher key changed. Trust it again only if you expected this change. The previous repository and plugins will be disabled and preserved; select packages from the new publisher again.'));
      details(candidate.fingerprint);
      line(t('Bu yayıncının eklentileri uygulamayla aynı JavaScript yetkileriyle çalışır. Yayıncıyı seçerek güven verirsiniz; Film Merkezi onayı gerekmez.', 'Plugins from this publisher run with the same JavaScript permissions as the app. You choose whom to trust; Film Merkezi approval is not required.'));
      button(panel.replaceId ? t('Adresi kaydet', 'Save address') : t('Ekle', 'Add'), 'plugins-trust', function () { work(function () { return manager.approve(panel.replaceId).then(function (id) { panel.repoId = id; }); }, 'repository', 'plugins-browse'); });
      back(panel.searchOrigin ? 'find' : 'address');
    } else if (view === 'confirm') {
      if (panel.confirmAction === 'repository') line(t('Bu depodan kurulan bütün eklentiler de kaldırılacak. Listem ve izleme kayıtları silinmez.', 'All plugins installed from this repository will also be removed. My list and viewing records are preserved.'));
      line(t('Kaldırma yeniden açılışta uygulanır. İzleme kayıtları silinmez.', 'Removal takes effect after restart. Viewing records are kept.'));
      button(t('Kaldır', 'Remove'), 'plugins-confirm-remove', function () { work(function () { return (panel.confirmAction === 'repository' ? manager.removeRepository(panel.repoId) : manager.removePlugin(panel.pluginKey)).then(function () { manager.restartNeeded = true;if(root.ChainApp&&root.ChainApp.siteManagement)root.ChainApp.siteManagement.changed(); }); }, panel.confirmAction === 'repository' ? 'repositories' : 'installed'); }); back(panel.confirmAction === 'repository' ? 'repository' : 'plugin');
    }
    var pending = Object.keys(manager.state.plugins).some(function (key) { return !!manager.state.plugins[key].pending; });
    if (pending || manager.restartNeeded) { line(t('Değişiklikler yeniden açılınca uygulanır.', 'Changes take effect after restart.')); button(t('Uygula ve yeniden aç', 'Apply and restart'), 'plugins-restart', function () { if (manager.busy || manager.core.busy || catalog.app.controller.content) return; if (catalog.hub) catalog.hub.flush(); root.location.reload(); }); }
  }
  function key(catalog, event) {
    var panel = catalog.panel; if (!panel || panel.kind !== 'plugins') return false;
    if (panel.pluginView === 'setup-search') {
      if (root.FilmRepositoryDiscovery && root.FilmRepositoryDiscovery.key(catalog, event)) return true;
      if (event.keyCode === 27 || event.keyCode === 10009) { event.preventDefault(); root.FilmRepositorySetup.complete(catalog); return true; }
      return false;
    }
    var renaming = panel.pluginView === 'rename', searching = panel.pluginView === 'find', input = document.getElementById(renaming ? 'plugins-name' : searching ? 'plugins-search' : 'plugins-url');
    var code = event.keyCode;
    if (panel.inputEditing) {
      if ([13, 65376, 65385, 27, 10009].indexOf(code) >= 0) { event.preventDefault(); panel.inputEditing = false; if (input) { if (renaming) panel.alias = input.value; else if (searching) panel.searchText = input.value; else panel.url = input.value; input.readOnly = true; input.blur(); } catalog.focus(searching ? 'plugins-search-run' : renaming ? code === 13 || code === 65376 ? 'plugins-name-save' : 'plugins-name-edit' : code === 13 || code === 65376 ? 'plugins-probe' : 'plugins-url-edit'); if (searching && (code === 13 || code === 65376)) { var run = catalog.findFocus('plugins-search-run'); if (run) run.click(); } }
      return true;
    }
    if (code === 27 || code === 10009) {
      if (panel.working) { event.preventDefault(); root.FilmPlugins.cancel(); return true; }
      if (root.FilmPlugins.busy) {
        root.FilmPlugins.cancel();
        function settled() { if (catalog.panel === panel && !panel.working && !panel.inputEditing) { var active = document.activeElement; catalog.renderPanel(active && active.getAttribute('data-focus')); } }
        if (root.FilmPlugins.operationTask) root.FilmPlugins.operationTask.then(settled, settled);
      }
      if (panel.pluginView === 'find' && root.FilmPlugins.search) root.FilmPlugins.search.cancel();
      if(panel.centerEntry&&panel.pluginView===panel.centerEntry){event.preventDefault();root.FilmPlugins.discardCandidate();catalog.closePanel(true);return true;}
      if (panel.pluginView && panel.pluginView !== 'repositories') {
        event.preventDefault(); root.FilmPlugins.discardCandidate();
        panel.pluginView = panel.pluginView === 'trust' ? panel.searchOrigin ? 'find' : 'address' : panel.pluginView === 'address' ? panel.replaceId ? 'repository' : 'repositories' : panel.pluginView === 'rename' || panel.pluginView === 'catalog' ? 'repository' : panel.pluginView === 'confirm' ? panel.confirmAction === 'repository' ? 'repository' : 'plugin' : panel.pluginView === 'plugin' ? panel.item ? 'catalog' : 'installed' : 'repositories';
        if(panel.centerEntry&&(panel.pluginView==='repository'||panel.pluginView==='repositories'))catalog.closePanel(true);else catalog.renderPanel(); return true;
      }
      root.FilmPlugins.discardCandidate();
      if (panel.onboarding) { event.preventDefault(); root.FilmRepositorySetup.complete(catalog); return true; }
    }
    return false;
  }
  root.FilmPluginPanel = { draw: draw, key: key };
})(window);
