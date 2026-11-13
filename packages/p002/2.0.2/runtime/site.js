/* P002: public catalog data, no downloaded site code is executed. ES5. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context(), site = context.site, BASE = site.base;
  function text(v) { return String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function fold(v) { return text(v).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/\u0307/g, ''); }
  function url(v) {
    var u;
    try { u = new root.URL(v, BASE + '/'); } catch (ignore) { return ''; }
    return u.protocol === 'https:' && u.hostname === 'puhutv.com' && !u.username && !u.password && (!u.port || u.port === '443') ? u.href : '';
  }
  function nextData(body) {
    var m = /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(body || '');
    if (!m) throw new Error('P002: katalog verisi bulunamadı.');
    var parsed; try { parsed = JSON.parse(m[1]); } catch (e) { throw new Error('P002: katalog yanıtı okunamadı.'); }
    if (!parsed.props || !parsed.props.pageProps) throw new Error('P002: sayfa bilgileri eksik.');
    return parsed.props.pageProps;
  }
  function rows(p) {
    var d = p && p.data && p.data.data;
    if (Array.isArray(p && p.data)) return p.data;
    if (Array.isArray(d)) return d;
    return d && Array.isArray(d.container_items) ? d.container_items.reduce(function (a, r) { return a.concat(r.items || []); }, []) : [];
  }
  function artwork(value, width, height) {
    if (typeof value !== 'string' || !value) return '';
    try {
      var u = new root.URL(value);
      if (u.protocol !== 'https:' || u.hostname !== 'img-puhutv.mncdn.com' || u.username || u.password || u.port && u.port !== '443') return value;
      var path = u.pathname.replace(/^\/mnresize\/\d+\/\d+(?=\/media\/)/, '');
      if (path.indexOf('/media/') !== 0) return value;
      u.pathname = '/mnresize/' + width + '/' + height + path;
      return u.href;
    } catch (ignore) { return value; }
  }
  function card(item) {
    var m = item && item.meta || {}, type = item && item.type, page = url(item && (item.web_url || m.web_url || m.slug || item.slug));
    if (!item || !/^(?:title|life)_(?:movie|serie)$/.test(type || '') || !item.id || !page || !/-detay(?:[?#]|$)/.test(page) || item.cta_external_url) return null;
    if (/canli-yayin/.test(new root.URL(page).pathname)) return null;
    var title = text(item.name), year = Number(m.released_at || m.productionDate || m.year), score = Number(m.imdb_score);
    if (!title) return null;
    type = /serie$/.test(type) ? 'series' : 'movie';
    var original = item.image_vertical_mobile || item.image_vertical_web_mobile || item.image || '';
    return { contentId: site.prefix + type + ':' + item.id, providerId: site.id, type: type, title: title, pageUrl: page,
      poster: artwork(original, 360, 540), posterLarge: artwork(original, 720, 1080),
      year: year >= 1880 && year <= 2200 ? year : null, imdb: score > 0 && score <= 10 ? score : null,
      description: text(m.short_description || m.description), genres: (m.genres || []).map(function (g) { return text(g.name || g.display_name); }).filter(Boolean),
      genreIds: (m.genres || []).map(function (g) { return String(g.slug || g.name || g.display_name || ''); }), language: '' };
  }
  function cards(items) {
    var seen = {}, result = [];
    (items || []).forEach(function (item) { var c = card(item); if (c && !seen[c.contentId]) { seen[c.contentId] = true; result.push(c); } });
    return result;
  }
  function episode(item, parent, season) {
    var n = Number(item && item.meta && item.meta.position), page = url(item && item.slug);
    if (!item || item.type !== 'asset_episode' || !item.id || !page || n < 1 || n % 1 || season < 1) return null;
    return { contentId: site.prefix + 'episode:' + item.id, providerId: site.id, type: 'episode', pageUrl: page,
      title: parent.title + ' · ' + text(item.name), episodeTitle: text(item.name),
      poster: artwork(item.image || parent.poster, 360, 540), posterLarge: artwork(item.image || parent.posterLarge || parent.poster, 720, 1080),
      year: parent.year, description: text(item.meta.short_description),
      episode: { seriesId: parent.contentId, seriesTitle: parent.title, season: season, number: n } };
  }
  function cancelled() { var e = new Error('P002: işlem iptal edildi.'); e.cancelled = true; return e; }
  function Provider() { this.client = context.createClient(); this.generation = 0; this.pending = 0; this.listCache = null; }
  Provider.prototype.cancel = function () { this.generation++; this.client.cancel(); };
  Provider.prototype.isIdle = function () { return this.pending === 0; };
  Provider.prototype.check = function (token) { if (token !== this.generation) throw cancelled(); if (this.deadline && Date.now() >= this.deadline) throw new Error('P002: katalog isteğinin süresi doldu.'); };
  Provider.prototype.get = function (address, token, json) {
    var self = this; self.check(token); self.pending++;
    return self.client.get(address, BASE + '/', {}, { deadline: self.deadline || Date.now() + 30000, timeoutMs: 15000 }).then(function (response) {
      self.pending--; self.check(token);
      if (!json) return nextData(response.body);
      try { return JSON.parse(response.body); } catch (e) { throw new Error('P002: arama yanıtı okunamadı.'); }
    }, function (e) { self.pending--; self.check(token); throw e; });
  };
  Provider.prototype.home = function () {
    return this.get(BASE + '/', this.generation).then(function (p) {
      var all = cards(rows(p)), movies = all.filter(function (c) { return c.type === 'movie'; }), series = all.filter(function (c) { return c.type === 'series'; });
      return { hero: series[0] || movies[0] || null, movies: movies.slice(0,48), series: series.slice(0,48), genres: [], links: {} };
    });
  };
  Provider.prototype.list = function (query, next) {
    query = query || {}; var self = this, token = self.generation, type = query.type || 'movie';
    var key = type === 'series' ? BASE + '/dizi' : BASE + '/', cursor = key + '|' + JSON.stringify(query.filters || {}), offset = next && next.key === cursor ? Number(next.offset) : 0;
    if (!isFinite(offset) || offset < 0 || offset % 1) return Promise.reject(new Error('P002: sayfa konumu geçersiz.'));
    var load = self.listCache && self.listCache.key === key ? Promise.resolve(self.listCache.cards) : self.get(key, token).then(function (p) {
      var all = cards(rows(p)).filter(function (c) { return c.type === type; }); self.listCache = { key: key, cards: all }; return all;
    });
    return load.then(function (all) {
      self.check(token); var f = query.filters || {}, selected = all.filter(function (c) {
        return (!f.genre || c.genreIds.some(function (g) { return fold(g) === fold(f.genre); })) && (!f.year || c.year === Number(f.year)) && (!f.imdb || c.imdb !== null && c.imdb >= Number(f.imdb));
      });
      // The page already supplied this whole set. The cursor only windows that
      // real data; no unobserved server pages or episode links are invented.
      return { cards: selected.slice(offset, offset + 48), next: offset + 48 < selected.length ? { key: cursor, offset: offset + 48 } : null };
    });
  };
  Provider.prototype.search = function (query) {
    query = text(query); if (!query) return Promise.resolve({ cards: [], next: null });
    if (query.length > 100) return Promise.reject(new Error('En fazla 100 karakter yazabilirsiniz.'));
    return this.get('https://appservice.puhutv.com/search/search?query=' + encodeURIComponent(fold(query)) + '&v=2&source=web', this.generation, true).then(function (p) {
      if (p.recommendation || !p.total_count) return { cards: [], next: null };
      var items = (p.data || []).reduce(function (a, group) { return a.concat(group.data || []); }, []);
      return { cards: cards(items), next: null };
    });
  };
  Provider.prototype.detail = function (input) {
    var self = this, token = self.generation, address = url(input.pageUrl);
    if (!address) return Promise.reject(new Error('P002: içerik bağlantısı geçersiz.'));
    return self.get(address, token).then(function (p) {
      var raw = (p.details || p.watchDetails || {}).data, d = card(raw), meta = raw && raw.meta || {};
      if (!d) throw new Error('P002: film veya dizi bilgisi okunamadı.');
      d.description = text(meta.description || meta.short_description); d.originalTitle = '';
      d.cast = (meta.casts || []).map(function (v) { return text(v.name || v.display_name); }).filter(Boolean);
      d.genres = (meta.genres || []).map(function (g) { return text(g.name || g.display_name); }).filter(Boolean);
      d.episodes = []; d.seasons = []; d.fetchedAt = Date.now();
      d.watchPageUrl = url(raw.to_watch_asset_slug);
      if (d.type !== 'series') return d;
      var seasons = (meta.seasons || []).filter(function (s) { return Number(s.position) > 0 && url(s.slug); }).sort(function (a,b) { return Number(a.position) - Number(b.position); });
      var initial = (p.episodeData || p.episodes || {}).data, seen = {};
      return seasons.reduce(function (chain, season) {
        return chain.then(function () {
          self.check(token); return initial && Number(initial.id) === Number(season.id) ? { episodes: initial.episodes, episode_count: initial.episode_count } : self.get(url(season.slug), token).then(function (value) { return value.episodes && value.episodes.data; });
        }).then(function (data) {
          if (!data || !Array.isArray(data.episodes)) throw new Error('P002: sezon bölümleri okunamadı.');
          if (Number(data.episode_count) > data.episodes.length) throw new Error('P002: sezon bölüm listesi eksik; yeniden deneyin.');
          d.seasons.push(Number(season.position));
          data.episodes.forEach(function (item) { var e = episode(item, d, Number(season.position)); if (e && !seen[e.contentId]) { seen[e.contentId] = true; d.episodes.push(e); } });
        });
      }, Promise.resolve()).then(function () {
        self.check(token); d.episodes.sort(function (a,b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
        if (!d.episodes.length) throw new Error('P002: oynatılabilir bölüm bulunamadı.');
        var selected = d.episodes.filter(function (e) { return e.pageUrl === address; })[0];
        if (selected) { d.selectedEpisodeId = selected.contentId; d.selectedEpisodePageUrl = selected.pageUrl; }
        return d;
      });
    });
  };
  Provider.prototype.seriesLanguage = function () { return Promise.resolve({ language: '' }); };
  Provider.prototype.identity = function (input) {
    var self = this, token = self.generation, address = url(input.pageUrl);
    if (!address) return Promise.reject(new Error('P002: içerik bağlantısı geçersiz.'));
    return self.get(address, token).then(function (p) {
      var raw = (p.details || p.watchDetails || {}).data, d = card(raw);
      if (!d || d.contentId !== input.contentId) throw new Error('P002: içerik kimliği doğrulanamadı.');
      d.identityEvidence = { version: 2, pageUrl: d.pageUrl, title: d.title, type: d.type, typeVerified: true, detailChecked: true };
      if (d.year) { d.identityEvidence.year = d.year; d.identityEvidence.yearVerified = true; }
      return d;
    });
  };
  Provider.prototype.options = function () {
    return this.get(BASE + '/dizi', this.generation).then(function (p) {
      var genres = {}, years = {}; cards(rows(p)).forEach(function (c) { c.genreIds.forEach(function (g,i) { genres[g] = c.genres[i] || g; }); if (c.year) years[c.year] = true; });
      return { genres: Object.keys(genres).map(function (g) { return { value: g, label: genres[g] }; }), years: Object.keys(years).sort().reverse().map(function (y) { return { value: y, label: y }; }), languages: [], order: [{ value: 'site', label: 'Site sırası' }] };
    });
  };
  function Resolver(log, now) { this.resolver = context.createResolver('r002', log, now); }
  Resolver.prototype.cancel = function () { this.resolver.cancel(); };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) { return this.resolver.resolve(content, deadline, notify, hints); };
  root.SiteRegistry.register({ id: site.id, name: site.name, base: BASE, prefix: site.prefix, storagePrefix: 'site.' + site.id + '.', mark: 'P', subtitle: 'P002',
    Provider: Provider, Resolver: Resolver, Parser: { nextData: nextData, card: card, cards: cards, episode: episode }, contentTypes: ['movie','series'],
    ui: { movieRail: 'Filmler ve belgeseller', seriesRail: 'Diziler', defaultOrder: 'site', filterHint: 'Kaynağın sunduğu bilgilerle filtrele', filterSummary: 'P002' },
    filterFields: function () { return ['genre','year','imdb','order']; }, collectionQuery: function (type) { return { type: type, order: 'site' }; } });
})(window);
