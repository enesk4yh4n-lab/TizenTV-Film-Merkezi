/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/filmcibaba/filmizle-parser.js */
/* Filmizle/Keremiya data adapter. Site scripts are never evaluated. */
(function (root) {
  'use strict';
  var P = root.CatalogUtils,
    BASE = (root.SiteAddresses ? root.SiteAddresses.base('filmizle', 'https://filmizle.ink') : 'https://filmizle.ink');
  function text(n, q) {
    return P.clean(n && (q ? n.querySelector(q) : n) && (q ? n.querySelector(q) : n).textContent);
  }
  function safe(value, page) {
    var u = P.url(value, page || BASE + '/');
    try {
      var parsed = new root.URL(u);
      return parsed.origin === BASE && !parsed.username && !parsed.password ? u : '';
    } catch (ignore) {
      return '';
    }
  }
  function id(page, type) {
    var path = new root.URL(page).pathname;
    if (type !== 'series' && type !== 'collection' && /^\/[^/]+\/[1-9]\d*\/$/.test(path)) path = path.replace(/\/[1-9]\d*\/$/, '/');
    return (
      'filmizle:' +
      (type === 'series' ? 'series:' : type === 'collection' ? 'collection:' : 'movie:') +
      path.replace(/^\/+|\/+$/g, '')
    );
  }
  function sortValue(url) {
    var m = /[?&]sort=(date|views|imdb|comments)(?:&|$)/.exec(url);
    return m ? m[1] : '';
  }
  function withSort(url, value) {
    var parsed = new root.URL(url),
      fields = parsed.search
        .replace(/^\?/, '')
        .split('&')
        .filter(function (field) {
          return field && !/^sort=/.test(field);
        });
    if (value) fields.push('sort=' + encodeURIComponent(value));
    return parsed.origin + parsed.pathname + (fields.length ? '?' + fields.join('&') : '');
  }
  function image(n, page) {
    var img = n && n.querySelector('img');
    return img
      ? P.url(
          img.getAttribute('data-src') ||
            img.getAttribute('data-litespeed-src') ||
            img.getAttribute('data-catalog-src'),
          page
        )
      : '';
  }
  function numeric(value) {
    var m = /\d+(?:[.,]\d+)?/.exec(value);
    return m ? Number(m[0].replace(',', '.')) : null;
  }
  function language(n) {
    var dub = false,
      sub = false;
    Array.prototype.forEach.call(n.querySelectorAll('[title]'), function (x) {
      var flags = P.languageBadges(x.getAttribute('title'));
      dub = dub || flags.dubbed;
      sub = sub || flags.subtitled;
    });
    return dub && sub
      ? 'Dublaj & Altyazılı'
      : dub
        ? 'Türkçe Dublaj'
        : sub
          ? 'Türkçe Altyazılı'
          : '';
  }
  function series(title, n, hint) {
    return (
      /\b\d+\s*\.?\s*sezon\b/i.test(title) ||
      /Dizi/i.test(text(n, '.v100-meta-row')) ||
      hint === 'series'
    );
  }
  function cards(d, page, hint) {
    var seen = {},
      result = [];
    Array.prototype.forEach.call(
      d.querySelectorAll('a.v100-card, .custom-card-wrapper, .v50-card'),
      function (box) {
        var a = box.tagName === 'A' ? box : box.querySelector('.movie-title a, a[href]'),
          u = safe(a && a.getAttribute('href'), page),
          title =
            text(box, '.v100-title, .movie-title, .v50-details h3') ||
            P.clean(a && a.getAttribute('title'));
        if (!u || !title || seen[u]) return;
        seen[u] = true;
        var article = /\/haber\//.test(new root.URL(u).pathname);
        if (article && !/(?:kronolojik|izleme s[ıi]ras[ıi]|top\s*\d+|en iyi.+film)/i.test(title))
          return;
        var type = article ? 'collection' : series(title, box, hint) ? 'series' : 'movie';
        /* The home/search template prints 2026 for old titles: do not treat it as release year. */
        var year = text(box, '.movie-release'),
          match = /\b(?:19|20)\d{2}\b/.exec(year);
        result.push({
          contentId: id(u, type),
          providerId: 'filmizle',
          type: type,
          pageUrl: u,
          title: title,
          titleAliases: aliases(title),
          yearHint: type === 'movie' ? yearHint(title, u) : null,
          poster: image(box, page),
          year: match ? Number(match[0]) : null,
          imdb: numeric(text(box, '.v100-imdb-tag, .v50-imdb-tag, .imdb')),
          language: language(box)
        });
      }
    );
    return result;
  }
  function parseList(body, page, hint) { if(root.SiteAddresses)page=root.SiteAddresses.resolve(page);
    var d = P.envelope(body).doc,
      n = d.querySelector('a.loadnavi, a[rel=next], .v50-pagination a.next'),
      u = safe(n && n.getAttribute('href'), page);
    if (u && sortValue(page) && !sortValue(u)) u = withSort(u, sortValue(page));
    return {
      cards: cards(d, page, hint),
      next: u && u !== page ? { kind: 'url', url: u } : null,
      options: {}
    };
  }
  function home(body) {
    var d = P.envelope(body).doc,
      all = cards(d, BASE + '/'),
      genres = [],
      seen = {};
    Array.prototype.forEach.call(d.querySelectorAll('a.v100-view-all'), function (a) {
      var u = safe(a.getAttribute('href'));
      if (u && /\/Kategori\/tur\//.test(u) && !seen[u]) {
        seen[u] = true;
        var section = a.parentNode;
        genres.push({ value: u, label: text(section, 'h3') || text(a) });
      }
    });
    if (!all.length) throw new Error('Filmizle katalog biçimi tanınamadı.');
    return {
      hero: all[0],
      movies: all
        .filter(function (x) {
          return x.type === 'movie';
        })
        .slice(0, 30),
      series: all
        .filter(function (x) {
          return x.type === 'series';
        })
        .slice(0, 18),
      genres: genres,
      links: {
        new: BASE + '/Kategori/en-populer-filmler/',
        recommended: BASE + '/Kategori/en-populer-filmler/?sort=views',
        rated: BASE + '/Kategori/en-populer-filmler/?sort=imdb',
        liked: BASE + '/Kategori/en-populer-filmler/?sort=comments'
      }
    };
  }
  function aliases(title) {
    var out = [],
      m = /\(([^()]+)\)/.exec(title),
      parts = title.split(/\s+[–—-]\s+/);
    if (m && !/^\d{4}$/.test(m[1])) out.push(m[1]);
    if (parts.length === 2)
      parts.forEach(function (part) {
        if (root.ContentIdentity && /^[0-9 ]*$/.test(root.ContentIdentity.name(part))) return;
        if (out.indexOf(part) < 0) out.push(part);
      });
    return out;
  }
  /* A year in the title/permalink is only a hint; publication timestamps are never release years. */
  function yearHint(title, page) {
    var I = root.ContentIdentity,
      m = I && /\s((?:19|20)\d{2})$/.exec(I.name(title));
    if (m) return Number(m[1]);
    var years = [],
      pattern = /(?:^|[-/])((?:19|20)\d{2})(?=[-/]|$)/g,
      path = new root.URL(page).pathname;
    while ((m = pattern.exec(path))) if (years.indexOf(Number(m[1])) < 0) years.push(Number(m[1]));
    return years.length === 1 ? years[0] : null;
  }
  function collection(body, card) {
    var d = P.envelope(body).doc,
      scope = d.querySelector('.news-content.article-content'),
      items = [],
      heading = text(d, 'h1');
    if (!scope) throw new Error('Bu yazıda sıralı film koleksiyonu bulunamadı.');
    Array.prototype.forEach.call(scope.querySelectorAll('h2,h3'), function (h) {
      var label = text(h),
        m = /^(\d+)\.\s*(.+?)\s*\(((?:19|20)\d{2})\)/.exec(label);
      if (!m) return;
      var y = Number(m[3]),
        t = P.clean(m[2]),
        parts = t.split(/\s*[-–]\s*/);
      items.push({
        ordinal: Number(m[1]),
        title: t,
        year: y,
        titleAliases: parts.length > 1 ? parts : []
      });
    });
    if (items.length < 2)
      throw new Error('Bu yazıda doğrulanabilir sıralı film listesi bulunamadı.');
    return {
      contentId: id(card.pageUrl, 'collection'),
      legacyContentIds: [id(card.pageUrl, 'movie')],
      providerId: 'filmizle',
      type: 'collection',
      pageUrl: card.pageUrl,
      title: heading || card.title,
      poster: card.poster || '',
      description: 'Filmleri bu koleksiyondaki sırayla keşfedin ve izleyin.',
      collectionItems: items.slice(0, 200),
      genres: [],
      cast: [],
      seasons: [],
      episodes: [],
      sources: [],
      subtitles: []
    };
  }
  function detail(body, card) {
    if (card.type === 'collection' || /\/haber\//.test(new root.URL(card.pageUrl).pathname))
      return collection(body, card);
    var env = P.envelope(body),
      d = env.doc,
      result = root.PlayerCore.copy(card),
      title = text(d, '.p-v12-main-title');
    if (!title) throw new Error('Filmizle detay biçimi tanınamadı.');
    result.title = title;
    result.titleAliases = aliases(title);
    var original = /\(([^()]+)\)/.exec(title);
    if (original && !/^\d{4}$/.test(original[1])) result.originalTitle = P.clean(original[1]);
    result.description = text(d, '.p-v12-story-content');
    result.poster = image(d.querySelector('.p-v12-poster-main'), card.pageUrl) || card.poster;
    result.type =
      series(title, d, card.type) || !!d.querySelector('.p-v12-meta-info a[href*="/dizi-izle/"]')
        ? 'series'
        : 'movie';
    result.contentId = id(card.pageUrl, result.type);
    result.genres = [];
    result.cast = [];
    result.seasons = [];
    result.episodes = [];
    result.sources = [];
    result.subtitles = [];
    result.yearHint = yearHint(title, card.pageUrl);
    // This template's year can be the post date. Keep it as an unverified hint.
    var metaYear = text(d, '.p-v12-meta-info > .meta-item');
    if (!result.yearHint && /^(?:19|20)\d{2}$/.test(metaYear)) result.yearHint = Number(metaYear);
    result.imdb = numeric(text(d, '.p-v12-imdb-badge')) || card.imdb;
    Array.prototype.forEach.call(d.querySelectorAll('.p-v12-meta-info a[rel]'), function (a) {
      var name = text(a);
      if (name) result.genres.push(name);
    });
    if (result.type === 'series') {
      /* Numbered pages also exist on movies. Only a verified series detail gets episodes. */
      var m = /(\d+)\s*\.?\s*Sezon/i.exec(title),
        season = m ? Number(m[1]) : 1,
        links = [],
        seen = {};
      var current = d.querySelector('.p-v12-ep-list .current, .p-v12-ep-list > span');
      if (current && /^[1-9]\d*$/.test(text(current)))
        links.push({ page: card.pageUrl, number: Number(text(current)) });
      Array.prototype.forEach.call(
        d.querySelectorAll('.p-v12-ep-list a.post-page-numbers'),
        function (a) {
          var page = safe(a.getAttribute('href'), card.pageUrl),
            number = Number(text(a));
          if (page && number > 0 && Math.floor(number) === number)
            links.push({ page: page, number: number });
        }
      );
      links
        .sort(function (a, b) {
          return a.number - b.number;
        })
        .forEach(function (link) {
          if (seen[link.number]) return;
          seen[link.number] = true;
          result.episodes.push({
            contentId: result.contentId + ':s' + season + ':e' + link.number,
            providerId: 'filmizle',
            pageUrl: link.page,
            title: title + ' · ' + link.number + '. Bölüm',
            episodeTitle: link.number + '. Bölüm',
            type: 'episode',
            poster: result.poster,
            seriesTitle: title,
            seriesPageUrl: card.pageUrl,
            episode: { seriesId: result.contentId, season: season, number: link.number },
            sources: []
          });
        });
      result.seasons = [season];
    }
    return result;
  }
  root.FilmizleParser = {
    base: BASE,
    safe: safe,
    withSort: withSort,
    list: parseList,
    home: home,
    detail: detail,
    cards: cards
  };
})(window);


/* siteler/filmcibaba/filmizle-provider.js */
(function (root) {
 'use strict';
 var P = root.FilmizleParser, BASE = P.base, Client = root.CatalogClient;
 function Provider(cache, network) { Client.call(this,cache,network,{base:BASE,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}}); this.base = BASE; this.links = { new: BASE + '/Kategori/en-populer-filmler/', recommended: BASE + '/Kategori/en-populer-filmler/?sort=views', rated: BASE + '/Kategori/en-populer-filmler/?sort=imdb', liked: BASE + '/Kategori/en-populer-filmler/?sort=comments' }; }
 Provider.prototype = Object.create(Client.prototype); Provider.prototype.constructor = Provider;
 Provider.prototype.fetch = function (url, parse, force, scope) { if (!P.safe(url)) return Promise.reject(new Error('Filmizle dışı katalog bağlantısı reddedildi.')); return this.request(url, null, parse, force, 'filmizle0172-' + scope); };
 Provider.prototype.home = function (force) { var self = this; return this.fetch(BASE + '/', P.home, force, 'home').then(function (data) { self.links = data.links; self.filterOptions = { genres: data.genres, order: [{ value: 'date', label: 'Yeni eklenenler' }, { value: 'views', label: 'En çok izlenenler' }, { value: 'imdb', label: 'IMDb puanı' }, { value: 'comments', label: 'En çok yorumlananlar' }] }; return data; }); };
 Provider.prototype.options = function () { var self = this; return this.filterOptions ? Promise.resolve(this.filterOptions) : this.home().then(function () { return self.filterOptions; }); };
 Provider.prototype.list = function (query, next, force) {
  query = query || {}; var filters = query.filters || {}, hint = query.type === 'series' ? 'series' : null;
  if (filters.year || filters.language || filters.imdb) return Promise.reject(new Error('Bu site yıl/dil/IMDb birleşik filtre isteği sunmuyor.'));
  var url = next && next.url || filters.genre || query.url || (hint ? BASE + '/Kategori/dizi-izle/' : this.links.new);
  if (hint && filters.genre) return Promise.reject(new Error('Bu sitede dizi ve tür birleşimi doğrulanmadı.'));
  if (!next && query.order) url = P.withSort(url, /^(date|views|imdb|comments)$/.test(query.order) ? query.order : /avg/.test(query.order) ? 'comments' : 'imdb');
  return this.fetch(url, function (body) { var value = P.list(body, url, hint); if (!hint) value.cards = value.cards.filter(function (c) { return c.type !== 'series'; }); return value; }, force, 'list');
 };
 Provider.prototype.search = function (query, force,next) { query = root.CatalogUtils.clean(query); if (!query || query.length > 100) return Promise.reject(new Error('Arama 1–100 karakter olmalı.')); var first = BASE + '/?s=' + encodeURIComponent(query), url = root.CatalogSearch.pageUrl(first,next); return this.fetch(url, function (body) { return root.CatalogSearch.pageResult(P.list(body,url),first,url); }, force, 'search'); };
 Provider.prototype.identity = function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);return this.fetch(card.pageUrl,function(body){var d=P.detail(body,card);if(d.type==='series'&&/\b1\.?\s*Sezon\b/i.test(d.title)){var doc=root.CatalogUtils.envelope(body).doc,n=doc.querySelector('.p-v12-meta-info > .meta-item'),value=root.CatalogUtils.clean(n&&n.textContent);if(/^(?:19|20)\d{2}$/.test(value))d.yearHint=Number(value);}return d;},force,'identity0170-detail');};
 Provider.prototype.detail = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card); return this.fetch(card.pageUrl, function (body) { return P.detail(body, card); }, force, 'detail'); };
 Provider.prototype.seriesLanguage = function () { return Promise.resolve({ language: '' }); };
 root.FilmizleProvider = Provider;
})(window);


/* siteler/filmcibaba/filmizle-resolver.js */
/* Hotstream settings are decrypted as JSON data, never executed as page code. */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var error = new Error('Filmizle · ' + message);
    error.stage = stage;
    return error;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.filmizleNetwork = root.ChainNetwork.createClient();
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.filmizleNetwork.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      lastError,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network = self.filmizleNetwork || (self.filmizleNetwork = root.ChainNetwork.createClient());
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    if (progress && progress.client) network = progress.client(network, check, deadline);
    function get(url, ref, stage) {
      check();
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    if (!root.FilmizleParser.safe(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz içerik sayfası.'));
    self.log('Filmizle: içerik sayfası alınıyor.');
    return get(content.pageUrl, root.FilmizleParser.base + '/', 'page')
      .then(function (page) {
        var pages = content.type === 'episode' || content.type === 'series' ? [{ url: content.pageUrl, number: 1 }] : root.Hotstream.moviePages(page.body, content.pageUrl);
        var queue = [], seen = {};
        function collect(body, sourcePage) {
          check();
          var links = root.Hotstream.frames(body, sourcePage.url);
          if (!links.length) {
            lastError = fail('embed', 'Desteklenen Hotstream oynatıcı bağlantısı bulunamadı.');
            options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: 'embed', detail: lastError.message });
          }
          links.forEach(function (url, i) {
            if (seen[url]) return;
            seen[url] = true;
            var id = sourcePage.number === 1 ? 'hotstream-' + i : 'hotstream-page-' + sourcePage.number + '-' + i;
            var label = 'Hotstream' + (sourcePage.number === 1 ? (i ? ' ' + (i + 1) : '') : ' ' + sourcePage.number + (i ? ' / ' + (i + 1) : ''));
            var option = { sourceId: id, label: label, pageUrl: sourcePage.url, status: 'pending' };
            options.push(option); queue.push({ url: url, index: i, pageUrl: sourcePage.url, option: option });
          });
        }
        function publish() {
          if (progress) progress.publish(sources, options);
        }
        return pages.reduce(function (previous, sourcePage) {
          return previous.then(function () {
            check();
            if (sourcePage.url === content.pageUrl) { collect(page.body, sourcePage); return; }
            return get(sourcePage.url, content.pageUrl, 'page').then(function (response) { collect(response.body, sourcePage); }, function (e) {
              check(); lastError = e;
              options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: e.stage || 'page', detail: e.message });
            });
          });
        }, Promise.resolve()).then(function () {
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return { id: entry.option.sourceId, label: entry.option.label, type: 'hls' };
          });
        return queue.reduce(function (promise, entry) {
          var url = entry.url,
            i = entry.index,
            option = entry.option;
          return promise.then(function () {
            return (progress ? progress.wait(check) : Promise.resolve().then(check))
              .then(function () {
                return get(url, entry.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = root.Hotstream.settings(embed.body);
                return get(data.url, url, 'manifest').then(function (manifest) {
                  if (!/^\s*#EXTM3U/.test(manifest.body))
                    throw fail('manifest', 'HLS manifesti yerine farklı bir yanıt alındı.');
                  sources.push({
                    id: option.sourceId,
                    label: option.label,
                    sourcePageUrl: entry.pageUrl,
                    url: data.url,
                    referer: url,
                    userAgent: 'Mozilla/5.0',
                    type: 'hls',
                    status: 'ready',
                    transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                    seekMode: 'media-event',
                    subtitles: [],
                  });
                  option.status = 'ready';
                  option.detail = 'HLS erişimi doğrulandı';
                  publish();
                });
              })
              .catch(function (e) {
                check();
                lastError = e;
                option.status = 'error';
                option.stage = e.stage || 'embed';
                option.detail = e.message;
                publish();
                self.log('Filmizle: ' + (e.stage || 'embed') + ' aşaması başarısız.');
              });
          });
        }, Promise.resolve());
        });
      })
      .then(function () {
        check();
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || fail('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.FilmizleSourceResolver = Resolver;
  root.FilmizleResolver = root.Hotstream;
})(window);


/* siteler/filmcibaba/site.js */
(function(root){'use strict';var site={"id": "filmizle", "name": "Filmci Baba", "base": "https://filmizle.ink", "mark": "FB", "subtitle": "filmizle.ink · Film ve diziler", "prefix": "filmizle:", "storagePrefix": "site.filmizle.", "ui": {"movieRail": "Öne çıkan filmler", "seriesRail": "Diziler", "recommended": "En çok izlenenler", "liked": "En çok yorumlananlar", "filterHint": "Sitenin sunduğu tür ve sıralama seçenekleri.", "filterSummary": "Site filtresi", "defaultOrder": "date"}};site.posterBackground='linear-gradient(145deg,#6d376d,#241b3f)';site.Provider=root.FilmizleProvider;site.Resolver=root.FilmizleSourceResolver;site.collectionQuery=function(type,key){return {type:type,order:{new:'date',recommended:'views',rated:'imdb',liked:'comments'}[key]};};site.filterFields=function(type){return type==='series'?['order']:['genres','order'];};root.SiteRegistry.register(site);})(window);

})(window);
