/* Public GitHub repository discovery. Never trusts or installs a search result. */
(function (root) {
  'use strict';
  var NAME = 'filmmerkezi201-repository.json', API = 'https://api.github.com';
  function message(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function Search() { this.task = null; this.generation = 0; }
  Search.prototype.cancel = function () { this.generation++; if (this.task) this.task.cancel(); this.task = null; };
  Search.prototype.read = function (url, token) {
    var self = this, task;
    if (root.FilmNativeTLS && root.FilmNativeTLS.supported()) task = root.FilmNativeTLS.request(url, '', { timeoutMs: 15000, byteLimit: 262144 });
    else {
      var xhr = new root.XMLHttpRequest(), abort;
      task = { promise: new Promise(function (resolve, reject) {
        var done = false;
        function finish(error, value) { if (done) return; done = true; xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = xhr.onabort = null; if (error) reject(error); else resolve(value); }
        abort = function () { finish(new Error(message('Arama iptal edildi.', 'Search cancelled.'))); xhr.abort(); };
        xhr.open('GET', url, true); xhr.timeout = 15000;
        xhr.onload = function () { finish(null, { status: xhr.status, body: xhr.responseText }); };
        xhr.onerror = xhr.ontimeout = function () { finish(new Error(message('GitHub bağlantısı kurulamadı.', 'Could not connect to GitHub.'))); };
        xhr.onabort = function () { finish(new Error(message('Arama iptal edildi.', 'Search cancelled.'))); };
        xhr.onprogress = function (e) { if (e.loaded > 262144) abort(); };
        xhr.send();
      }), cancel: function () { if (abort) abort(); } };
    }
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
    if (!text || text.length > 80 || /[\x00-\x1f"\\]/.test(text) || mode === 'user' && !/^[A-Za-z0-9-]{1,39}$/.test(text)) return Promise.reject(new Error(message('Geçerli bir depo adı veya GitHub kullanıcı adı yazın.', 'Enter a valid repository name or GitHub username.')));
    var token = this.generation, query = (mode === 'user' ? 'user:' + text : text.replace(/[:<>]/g, ' ')) + ' "' + NAME + '" in:readme', number = Math.max(1, Math.min(10, Number(page) || 1));
    return this.read(API + '/search/repositories?q=' + encodeURIComponent(query) + '&per_page=10&page=' + number, token).then(function (data) {
      if (!data || !Array.isArray(data.items)) throw new Error(message('GitHub arama yanıtı geçersiz.', 'Invalid GitHub search response.'));
      var rows = data.items.filter(function (r) { return r && typeof r.full_name === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.full_name) && typeof r.default_branch === 'string' && /^[A-Za-z0-9_./-]{1,100}$/.test(r.default_branch) && r.default_branch.indexOf('..') < 0 && !r.private; }).slice(0, 10).map(function (r) { return { fullName: r.full_name, branch: r.default_branch, description: typeof r.description === 'string' ? r.description.slice(0, 200) : '' }; });
      return { items: rows, page: number, next: rows.length === 10 && number < 10 && data.total_count > number * 10, incomplete: !!data.incomplete_results };
    });
  };
  Search.prototype.address = function (repo) {
    this.cancel();
    var token = this.generation;
    if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.fullName) || !/^[A-Za-z0-9_./-]{1,100}$/.test(repo.branch) || repo.branch.indexOf('..') >= 0) return Promise.reject(new Error('Invalid repository'));
    return this.read(API + '/repos/' + repo.fullName + '/readme?ref=' + encodeURIComponent(repo.branch), token).then(function (data) {
      var text = '', path = NAME, marker;
      if (data && data.encoding === 'base64' && typeof data.content === 'string' && data.content.length < 180000) text = root.atob(data.content.replace(/\s/g, ''));
      marker = /<!--\s*film-merkezi201-repository:\s*([A-Za-z0-9_./-]+)\s*-->/.exec(text);
      if (marker) path = marker[1];
      if (path.indexOf('..') >= 0 || path.charAt(0) === '/' || !/(^|\/)filmmerkezi201-repository\.json$/.test(path)) throw new Error(message('README depo adresi geçersiz.', 'Invalid repository address in README.'));
      return root.FilmPluginSchema.address('https://raw.githubusercontent.com/' + repo.fullName + '/' + repo.branch + '/' + path);
    });
  };
  root.FilmRepositorySearch = Search;
})(window);
