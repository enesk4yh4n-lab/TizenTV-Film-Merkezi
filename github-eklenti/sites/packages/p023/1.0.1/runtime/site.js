/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P023';site.subtitle='P023';site.mark='P023';register(site);};

/* saglayicilar/p023/site.js */
/* P023: inert public catalog and official full-length YouTube source records. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils, id = 'sinetopya', base = 'https://sinetopya.com';
  function fail(stage, message) { var e = new Error('P023 · ' + message); e.stage = stage; return e; }
  function networkError(e) {
    if (e && !e.cancelled && /HTTP\s*403\b/i.test(e.message || '')) {
      var blocked = fail('access', 'Site erişimi engellendi (HTTP 403). Tarayıcıda istenen insan doğrulaması TV ağ istemcisinde tamamlanamıyor.');
      blocked.code = 403; return blocked;
    }
    return e;
  }
  function safe(value, page) {
    try {
      var u = new root.URL(value, page || base + '/club');
      return u.origin === base && !u.username && !u.password &&
        /^\/club(?:\/|$)/.test(u.pathname) ? u.href : '';
    } catch (ignore) { return ''; }
  }
  function route(value) {
    var url = safe(value), u = url && new root.URL(url),
      m = u && /^\/club\/(film|dizi)\/(\d+)-([^/]+)(?:\/sezon\/(\d+))?\/?$/.exec(u.pathname);
    return m ? { url: url, type: m[1] === 'film' ? 'movie' : 'series', key: m[2],
      path: '/club/' + m[1] + '/' + m[2] + '-' + m[3], season: Number(m[4] || 1) } : null;
  }
  function contentId(r) { return id + ':' + r.type + ':' + r.key; }
  function clubPath(value, page) {
    if (/^\/(?:\?|$)/.test(value || '')) value = '/club' + value.slice(1);
    else if (/^\/(?:film|dizi|ara)(?:\/|\?)/.test(value || '')) value = '/club' + value;
    return safe(value, page);
  }
  function poster(value) {
    var m = /^\/t\/p\/poster\/(\w+\.(?:jpg|png))$/.exec(value || '');
    if (m) return 'https://image.tmdb.org/t/p/w342/' + m[1];
    try { var u = new root.URL(value); return u.origin === 'https://image.tmdb.org' ? u.href : ''; }
    catch (ignore) { return ''; }
  }
  function records(body) {
    if (typeof body !== 'string' || body.length > 2097152) throw fail('decode', 'Yanıt boyut sınırını aşıyor.');
    if (/cf-chl-|challenge-platform|Just a moment|Güvenlik doğrulaması yapılıyor/.test(body))
      throw fail('access', 'Site insan doğrulaması istiyor; TV erişimi engellendi.');
    var wire = '', values = [], map = {}, re = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi, m;
    while ((m = re.exec(body))) {
      var match = /^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]);
      if (match) try { var chunk = JSON.parse(match[1]); if (chunk[0] === 1 && typeof chunk[1] === 'string') wire += chunk[1]; } catch (ignore) {}
    }
    // Text records are byte-counted and can end immediately before the next
    // JSON record. Splitting only on newlines loses valid series data.
    var at = 0;
    while (at < wire.length) {
      if (wire.charAt(at) === '\n' || wire.charAt(at) === '\r') { at++; continue; }
      var head = /^([a-f0-9]*):/.exec(wire.slice(at, at + 40)), end, raw;
      if (!head) throw fail('decode', 'Akış veri kaydı okunamadı.');
      at += head[0].length;
      if (wire.charAt(at) === 'T') {
        var header = /^T([a-f0-9]{1,8}),/.exec(wire.slice(at, at + 12)), bytes = 0, start, size;
        if (!header) throw fail('decode', 'Metin veri kaydı okunamadı.');
        size = parseInt(header[1], 16); at += header[0].length; start = at;
        if (size > 2097152) throw fail('decode', 'Metin veri kaydı boyut sınırını aşıyor.');
        while (at < wire.length && bytes < size) {
          var ch = wire.charCodeAt(at++);
          if (ch < 128) bytes++;
          else if (ch < 2048) bytes += 2;
          else if (ch >= 55296 && ch <= 56319 && wire.charCodeAt(at) >= 56320 && wire.charCodeAt(at) <= 57343) { bytes += 4; at++; }
          else bytes += 3;
        }
        if (bytes !== size) throw fail('decode', 'Metin veri kaydı eksik veya bozuk.');
        map[head[1]] = wire.slice(start, at);
      } else {
        end = wire.indexOf('\n', at); if (end < 0) end = wire.length;
        raw = wire.slice(at, end); at = end;
        if (/^[\[{\"]/.test(raw)) try {
          var value = JSON.parse(raw); map[head[1]] = value; values.push(value);
        } catch (ignore) {}
      }
    }
    // Flight references are data paths, never JavaScript. Resolve only known JSON
    // records and own properties, with a depth cap; module/import records stay inert.
    values.ref = function (value, depth) {
      var ref = typeof value === 'string' && /^\$L?([a-f0-9]+)(?::([a-zA-Z0-9_:-]+))?$/.exec(value);
      if (!ref || (depth || 0) > 30 || !Object.prototype.hasOwnProperty.call(map, ref[1])) return value;
      var v = map[ref[1]], parts = ref[2] ? ref[2].split(':') : [];
      for (var i = 0; i < parts.length; i++) {
        v = values.ref(v, (depth || 0) + 1);
        if (parts[i] === 'props' && Array.isArray(v) && v[0] === '$') v = v[3];
        else if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, parts[i])) v = v[parts[i]];
        else return null;
      }
      return typeof v === 'string' && v !== value ? values.ref(v, (depth || 0) + 1) : v;
    };
    return values;
  }
  function walk(value, visit) { root.SitePayload.walk(value, visit); }
  function resolvedWalk(value, data, visit) {
    var count = 0, seen = {};
    function next(v, depth) {
      if (depth > 60 || ++count > 60000) return;
      if (typeof v === 'string' && /^\$L?[a-f0-9]+(?::|$)/.test(v)) {
        if (seen[v]) return;
        seen[v] = true; v = data.ref(v);
      }
      if (!v || typeof v !== 'object') return;
      visit(v);
      Object.keys(v).forEach(function (k) { next(v[k], depth + 1); });
    }
    next(value, 0);
  }
  function list(body, page) {
    var data = records(body), cards = [], seen = {}, next = null, recognized = false, grid = null;
    walk(data, function (v) { if (!grid && !Array.isArray(v) && typeof v.open === 'number' && typeof v.total === 'number' && v.children) grid = v; });
    // The server sends cumulative pages plus ten hidden look-ahead cards.
    // Return only the advertised current page, not the already loaded prefix.
    var size = grid && grid.size > 0 && grid.size <= 200 ? grid.size : 60,
      start = grid && Number(new root.URL(page).searchParams.get('sayfa') || 1) > 1 ? Math.max(0, grid.open - size) : 0,
      visible = grid && Array.isArray(grid.children) && grid.open >= 0 && grid.open % 1 === 0
        ? grid.children.slice(start, Math.min(grid.open, start + size)) : grid || data;
    resolvedWalk(visible, data, function (v) {
      if (Array.isArray(v)) return;
      if (v.more && typeof v.more.href === 'string') {
        var n = clubPath(v.more.href, page), current = new root.URL(page), target = n && new root.URL(n);
        if (target && target.pathname === current.pathname && target.searchParams.get('sayfa') &&
            Number(target.searchParams.get('sayfa')) > Number(current.searchParams.get('sayfa') || 1)) {
          // The site can omit unchanged filters from its continuation link.
          ['yapim', 'tur', 'dil', 'sirala', 'q', 'bolum', 'donem'].forEach(function (key) {
            if (current.searchParams.has(key) && !target.searchParams.has(key))
              target.searchParams.set(key, current.searchParams.get(key));
          });
          next = { url: target.href };
        }
      }
      if (!v.href || !/(?:^|\s)\S+_card(?:\s|$)/.test(v.className || '')) return;
      var url = clubPath(v.href, page), r = route(url), info = null, meta = '';
      if (!r || seen[contentId(r)]) return;
      resolvedWalk(v.children, data, function (child) {
        if (Array.isArray(child)) return;
        if (!info && typeof child.title === 'string' && typeof child.src === 'string') info = child;
        if (/_meta(?:\s|$)/.test(child.className || '') && typeof child.children === 'string') meta = child.children;
      });
      if (!info || !U.clean(info.title)) return;
      seen[contentId(r)] = true;
      cards.push({ contentId: contentId(r), providerId: id, type: r.type, pageUrl: base + r.path,
        title: U.clean(info.title), rawTitle: U.clean(info.title), poster: poster(info.src),
        year: Number(info.year) || null, imdb: null, language: '', catalogMeta: U.clean(meta) });
    });
    if (grid && grid.more && typeof grid.more.href === 'string') {
      var continuation = clubPath(grid.more.href, page), from = new root.URL(page), to = continuation && new root.URL(continuation);
      if (to && to.pathname === from.pathname && Number(to.searchParams.get('sayfa')) > Number(from.searchParams.get('sayfa') || 1)) {
        ['yapim', 'tur', 'dil', 'sirala', 'q', 'bolum', 'donem'].forEach(function (key) {
          if (from.searchParams.has(key) && !to.searchParams.has(key)) to.searchParams.set(key, from.searchParams.get(key));
        });
        next = { url: to.href };
      }
    }
    recognized = /ucretsiz-izle-baslik|_query|"bolum"|\/ara\?/.test(body) || cards.length > 0;
    if (!recognized) throw fail('catalog', 'Katalog alanı bulunamadı; yanıt biçimi değişmiş olabilir.');
    return { cards: cards, next: next };
  }
  function seriesData(data, key) {
    var found = null;
    walk(data, function (v) {
      if (!found && !Array.isArray(v) && String(v.tmdbId) === key &&
          Array.isArray(v.episodes) && Array.isArray(v.channels)) found = v;
    });
    return found;
  }
  function movieSources(data, key) {
    var found = [], seen = {};
    function add(v, playerGroup) {
      if (!v || typeof v !== 'object') return;
      var watched = data.ref(v.watched);
      if (!watched || watched.kind !== 'film' || String(watched.tmdbId) !== key) return;
      var source = data.ref(v.source);
      if (source && (playerGroup || source.playsInApp === true) && source.playsInApp !== false && /^[\w-]{11}$/.test(source.youtubeVideoId || '') &&
          !seen[source.youtubeVideoId]) {
        seen[source.youtubeVideoId] = true;
        found.push({ videoId: source.youtubeVideoId, label: U.clean(source.name || source.channelName || 'YouTube'),
          language: source.audioOption === 'tr_dub' ? 'Türkçe Dublaj' :
            source.audioOption === 'tr_sub' ? 'Türkçe Altyazılı' : '' });
      }
    }
    walk(data, function (v) {
      if (Array.isArray(v)) return;
      if (Array.isArray(v.sources) && /^[\w-]{11}$/.test(v.first || ''))
        v.sources.forEach(function (entry) { add(data.ref(entry), true); });
      if (v.emphasis === 'page') add(v, false);
    });
    return found;
  }
  function episodeSources(e, data) {
    return (e.x || []).filter(function (s) { return /^[\w-]{11}$/.test(s.v || ''); }).map(function (s) {
      var channel = (data.channels || [])[s.c];
      return { videoId: s.v, label: U.clean(channel && channel.name || 'YouTube'), language: '' };
    });
  }
  function detail(body, card) {
    var r = route(card.pageUrl), data = records(body), env = U.envelope(body), schema = null;
    if (!r) throw fail('page', 'Geçersiz içerik adresi.');
    env.schema.some(function (v) {
      if (v['@type'] === (r.type === 'movie' ? 'Movie' : 'TVSeries') &&
          route(v.url) && contentId(route(v.url)) === contentId(r)) { schema = v; return true; }
      return false;
    });
    if (!schema || !U.clean(schema.name)) throw fail('detail', 'İçeriğe bağlı detay verisi bulunamadı.');
    var year = /\b((?:19|20)\d{2})\b/.exec(schema.datePublished || schema.startDate || ''),
      result = { contentId: contentId(r), providerId: id, type: r.type, pageUrl: base + r.path,
        title: U.clean(schema.name), rawTitle: U.clean(schema.name), originalTitle: U.clean(schema.alternateName),
        description: U.clean(schema.description), poster: poster(schema.image) || card.poster || '',
        year: year ? Number(year[1]) : card.year || null, imdb: null, duration: '', genres: [], cast: [],
        episodes: [], seasons: [], sources: [], subtitles: [] },
      duration = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(schema.duration || '');
    if (duration) result.duration = (Number(duration[1] || 0) * 60 + Number(duration[2] || 0)) + ' dk';
    if (typeof schema.sameAs === 'string' && /^https:\/\/(?:www\.)?imdb\.com\/title\/tt\d+\/$/.test(schema.sameAs)) {
      Array.prototype.some.call(env.doc.querySelectorAll('a[href]'), function (a) {
        if (a.getAttribute('href') !== schema.sameAs) return false;
        var rating = /^\s*(\d(?:[.,]\d)?)\s*$/.exec(a.textContent);
        if (rating) result.imdb = Number(rating[1].replace(',', '.'));
        return !!rating;
      });
    }
    result.genres = Array.isArray(schema.genre) ? schema.genre.filter(function (g) { return typeof g === 'string'; }) : [];
    (Array.isArray(schema.actor) ? schema.actor : []).forEach(function (a) { if (a && a.name) result.cast.push(U.clean(a.name)); });
    if (r.type === 'series') {
      var sd = seriesData(data, r.key), seen = {};
      if (sd) sd.episodes.forEach(function (e) {
        var s = Number(e.s), n = Number(e.e), key = s + ':' + n;
        if (!s || s < 1 || s % 1 || !n || n < 1 || n % 1 || seen[key] || !episodeSources(e, sd).length) return;
        seen[key] = true;
        result.episodes.push({ contentId: id + ':episode:' + r.key + ':' + key, providerId: id, type: 'episode',
          pageUrl: base + r.path + (s > 1 ? '/sezon/' + s : '') + '#bolum-' + n + '-ad',
          title: result.title + ' · ' + s + '. Sezon ' + n + '. Bölüm', episodeTitle: U.clean(e.n),
          poster: result.poster, year: result.year, seriesPageUrl: result.pageUrl,
          episode: { seriesId: result.contentId, season: s, number: n }, sources: [], subtitles: [] });
        if (result.seasons.indexOf(s) < 0) result.seasons.push(s);
      });
      result.episodes.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
      result.seasons.sort(function (a, b) { return a - b; });
      if (card.type === 'episode') result.selectedEpisodePageUrl = card.pageUrl;
    }
    return root.ContentIdentity ? root.ContentIdentity.attachDetail(result, root.ContentIdentity.fromPage(body, result.pageUrl)) : result;
  }
  function Provider(cache, network) {
    root.CatalogClient.call(this, cache, network || root.ChainNetwork.createClient({ destination: 'downloads' }),
      { base: base, headers: { Accept: 'text/html' } });
  }
  Provider.prototype = Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url, parse, force, scope) {
    url = safe(url);
    if (!url) return Promise.reject(fail('page', 'Site dışı istek reddedildi.'));
    return this.request(url, null, parse, force, 'p023-1-' + scope).catch(function (e) { throw networkError(e); });
  };
  Provider.prototype.home = function (force) {
    var url = base + '/club?sirala=populer';
    return this.fetch(url, function (body) {
      var value = list(body, url);
      return { hero: value.cards[0] || null, movies: value.cards.filter(function (c) { return c.type === 'movie'; }),
        series: value.cards.filter(function (c) { return c.type === 'series'; }), next: value.next };
    }, force, 'home');
  };
  Provider.prototype.list = function (query, next, force) {
    query = query || {};
    var url = base + '/club', u = new root.URL(url), filters = query.filters || {}, signature = JSON.stringify(query),
      orders = { date: 'yeni', views: 'populer', imdb: 'imdb', title: 'ad', year: 'yil-yeni' };
    u.searchParams.set('sirala', orders[query.order] || 'populer');
    if (query.type) u.searchParams.set('yapim', query.type === 'series' ? 'dizi' : 'film');
    if (filters.genre) u.searchParams.set('tur', filters.genre);
    if (filters.language) u.searchParams.set('dil', filters.language);
    if (filters.year || filters.imdb) return Promise.reject(fail('filter', 'Site yıl veya IMDb alt sınırı filtresi sunmuyor.'));
    if (next) {
      if (next.signature !== signature || !safe(next.url) || new root.URL(next.url).pathname !== '/club')
        return Promise.reject(fail('page', 'Devam bağlantısı listeyle eşleşmiyor.'));
      url = next.url;
    } else url = u.href;
    return this.fetch(url, function (body) { var v = list(body, url); if (v.next) v.next.signature = signature; return v; }, force, 'list');
  };
  Provider.prototype.search = function (query, force, next) {
    query = U.clean(query);
    if (!query || query.length > 100) return Promise.reject(fail('search', 'Arama 1–100 karakter olmalı.'));
    var first = base + '/club/ara?q=' + encodeURIComponent(query) + '&bolum=ucretsiz', url;
    try { url = root.CatalogSearch.pageUrl(first, next); } catch (e) { return Promise.reject(e); }
    return this.fetch(url, function (body) { return root.CatalogSearch.pageResult(list(body, url), first, url); }, force, 'search');
  };
  Provider.prototype.detail = function (card, force) {
    var r = route(card.pageUrl);
    if (!r) return Promise.reject(fail('page', 'Geçersiz içerik adresi.'));
    return this.fetch(base + r.path, function (body) { return detail(body, card); }, force, 'detail');
  };
  Provider.prototype.options = function () {
    var url = base + '/club';
    return this.fetch(url, function (body) {
      records(body);
      var d = U.envelope(body).doc, out = { genres: [], years: [], lang: [], imdb: [] }, seen = {};
      Array.prototype.forEach.call(d.querySelectorAll('nav[aria-label="Filtreler"] a[href]'), function (a) {
        var link = safe(a.getAttribute('href'), url), u = link && new root.URL(link), key, value;
        if (!u || u.pathname !== '/club') return;
        key = u.searchParams.has('tur') ? 'genres' : u.searchParams.has('dil') ? 'lang' : '';
        value = key && u.searchParams.get(key === 'genres' ? 'tur' : 'dil');
        if (value && !seen[key + value]) { seen[key + value] = true; out[key].push({ value: value, label: U.clean(a.textContent) }); }
      });
      return out;
    }, false, 'options');
  };
  Provider.prototype.seriesLanguage = function () { return Promise.resolve({ language: '' }); };
  function Resolver(log, now) { this.log = log || function () {}; this.now = now || Date.now; this.generation = 0; this.clients = []; }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.clients.splice(0).forEach(function (c) { c.cancel(); });
  };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    this.cancel();
    var self = this, token = self.generation, r = route(content.pageUrl), sources = [], options = [], last,
      progress = root.SourceProgress && new root.SourceProgress(notify, hints),
      network = root.ChainNetwork.createClient({ destination: 'downloads' });
    self.clients.push(network);
    function check() {
      if (self.generation !== token) { var e = fail('cancel', 'Kaynak araması iptal edildi.'); e.cancelled = true; throw e; }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    function publish() { if (progress) progress.publish(sources, options); }
    function release(client) { var n = self.clients.indexOf(client); if (n >= 0) self.clients.splice(n, 1); }
    function finish() { release(network); network.cancel(); }
    var work = Promise.resolve().then(function () {
      check();
      if (!r) throw fail('page', 'Geçersiz içerik adresi.');
      var client = progress ? progress.client(network, check, deadline) : network;
      return client.get(base + r.path, base + '/club', { Accept: 'text/html' },
        { deadline: deadline, timeoutMs: Math.max(1, deadline - self.now()) });
    }).then(function (response) {
      check();
      var data = records(response.body), candidates = [], sd, ep = content.episode;
      // Validate the response against the selected title before considering any source.
      detail(response.body, content);
      if (content.type === 'episode') {
        sd = seriesData(data, r.key);
        if (!sd || !ep) throw fail('episode', 'Bölüm kimliği bulunamadı.');
        sd.episodes.some(function (e) {
          if (Number(e.s) === Number(ep.season) && Number(e.e) === Number(ep.number)) {
            candidates = episodeSources(e, sd); return true;
          } return false;
        });
      } else if (r.type === 'movie') candidates = movieSources(data, r.key);
      if (!candidates.length) throw fail('unavailable', 'Bu içerik/bölüm için ücretsiz tam video kaynağı bulunamadı. Fragman ve ücretli bağlantılar kullanılmaz.');
      candidates.forEach(function (c) { options.push({ sourceId: 'p023-yt-' + c.videoId, label: c.label, pageUrl: content.pageUrl, status: 'pending' }); });
      var jobs = candidates.map(function (c, i) { return { candidate: c, option: options[i] }; });
      if (progress) jobs = progress.order(jobs, function (j) { return { id: j.option.sourceId, label: j.option.label }; });
      publish();
      function next() {
        check();
        var job = jobs.shift();
        if (!job) return;
        return (progress ? progress.wait(check) : Promise.resolve()).then(function () {
          check();
          if (!root.YoutubeSource) throw fail('unsupported', 'YouTube çözümleyicisi çekirdekte bulunamadı.');
          job.option.status = 'resolving'; publish();
          var task = root.YoutubeSource.createTask(job.candidate.videoId, deadline, self.log, hints);
          self.clients.push(task);
          return task.promise.then(function (source) {
            release(task); check();
            source.id = job.option.sourceId; source.label = job.candidate.label;
            source.language = job.candidate.language; sources.push(source);
            job.option.status = 'ready';
          }, function (e) { release(task); throw e; });
        }).catch(function (e) {
          check(); last = e; job.option.status = 'error'; job.option.stage = e.stage || 'decode';
          job.option.detail = root.PlayerCore.safeMessage(e.message);
        }).then(function () { check(); publish(); return next(); });
      }
      return next();
    }).then(function () {
      check(); sources.options = options;
      if (!sources.length) { var e = last || fail('decode', 'Oynatılabilir kaynak bulunamadı.'); e.sourceOptions = options; throw e; }
      return sources;
    });
    return work.then(function (v) { finish(); return v; }, function (e) { finish(); throw networkError(e); });
  };
  root.SiteRegistry.register({ id: id, name: 'P023', base: base, prefix: id + ':', storagePrefix: 'site.' + id + '.',
    mark: 'P023', subtitle: 'P023', contentTypes: ['movie', 'series'], collectionKeys: ['new', 'recommended'],
    Provider: Provider, Resolver: Resolver, ui: { movieRail: 'Filmler', seriesRail: 'Diziler', defaultOrder: 'views',
      filterHint: 'Sitenin ücretsiz film ve dizi kataloğu.' },
    collectionQuery: function (type, key) { return { type: type, order: key === 'new' ? 'date' : 'views' }; },
    filterFields: function () { return ['genres', 'lang']; } });
})(window);


})(window);
