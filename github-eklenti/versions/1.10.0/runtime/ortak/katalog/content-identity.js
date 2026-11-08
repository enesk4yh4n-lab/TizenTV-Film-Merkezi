/* Single data-only work identity service. ES5; source IDs never change. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils;
  var batchDepth = 0,
    batchFacts = [],
    textCache = Object.create(null),
    titleCache = Object.create(null),
    cacheEntries = 0;
  function withBatch(action) {
    batchDepth++;
    try {
      return action();
    } finally {
      if (!--batchDepth) {
        batchFacts.forEach(function (card) {
          delete card.__workIdentityFacts;
        });
        batchFacts = [];
        textCache = Object.create(null);
        titleCache = Object.create(null);
        cacheEntries = 0;
      }
    }
  }
  function invalidate(card) {
    if (card) delete card.__workIdentityFacts;
  }
  var brands =
    'netflix|disney(?:\\s+plus|\\+)?|hbo(?:\\s+max)?|max|amazon(?:\\s+prime)?|prime\\s+video|apple(?:\\s+tv\\+?)?|marvel|dc|hulu|paramount\\+?|peacock|mubi|blutv|exxen|gain|tabii';
  var countries =
    'hint|yerli|turk|turkce|yabanci|kore|korece|japon|japonca|cin|cince|fransiz|fransizca|ispanyol|ispanyolca|alman|almanca|italyan|italyanca|ingiliz|ingilizce|amerikan|rus|rusca';
  function clean(v) {
    return U.clean(v)
      .replace(/&#(x[0-9a-f]+|\d+);/gi, function (all, n) {
        var code = n.charAt(0).toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
        return code > 0 && code <= 65535 ? String.fromCharCode(code) : all;
      })
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .slice(0, 300);
  }
  function buildFold(v) {
    return clean(v)
      .replace(/İ/g, 'i')
      .toLowerCase()
      .replace(/\u0307/g, '')
      .replace(/[ıìíîï]/g, 'i')
      .replace(/[çćč]/g, 'c')
      .replace(/[ğģ]/g, 'g')
      .replace(/[öòóôõø]/g, 'o')
      .replace(/[şśš]/g, 's')
      .replace(/[üùúû]/g, 'u')
      .replace(/[âàáäãå]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/ñ/g, 'n');
  }
  function fold(v) {
    var key = String(v || '');
    if (batchDepth && textCache[key] !== undefined) return textCache[key];
    var value = buildFold(v);
    if (batchDepth && cacheEntries < 2048) {
      textCache[key] = value;
      cacheEntries++;
    }
    return value;
  }
  function normalized(v) {
    return fold(v)
      .replace(/\b(?:[a-z]\.){2,}[a-z]?\.?/g, function (s) {
        return s.replace(/\./g, '');
      })
      .replace(/[-–—:|’'"!?().,]+/g, ' ')
      .replace(/[^a-z0-9\u0370-\uffff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  function year(v) {
    var n = Number(v);
    return isFinite(n) && n % 1 === 0 && n >= 1888 && n <= 2100 ? n : null;
  }
  function imdb(v) {
    var s = String(v || ''),
      u,
      m;
    if (!s) return '';
    if (/^tt\d{7,10}$/.test(s)) return s;
    if (!/^https?:\/\//i.test(s)) return '';
    try {
      u = new root.URL(s);
    } catch (ignore) {}
    if (!u || !/(^|\.)imdb\.com$/.test(u.hostname) || u.username || u.password) return '';
    m = /^\/title\/(tt\d{7,10})(?:\/|$)/.exec(u.pathname);
    return m ? m[1] : '';
  }
  function url(v) {
    try {
      return new root.URL(v).href.replace(/#.*$/, '');
    } catch (ignore) {
      return '';
    }
  }
  function evidence(card) {
    var e = card.identityEvidence;
    if (!e || e.version !== 2 || !url(e.pageUrl) || url(e.pageUrl) !== url(card.pageUrl)) return {};
    var out = { version: 2, pageUrl: url(e.pageUrl) };
    ['type', 'imdbType'].forEach(function (k) {
      if (['movie', 'series', 'episode'].indexOf(e[k]) >= 0) out[k] = e[k];
    });
    ['title', 'originalTitle'].forEach(function (k) {
      if (typeof e[k] === 'string') out[k] = clean(e[k]);
    });
    if (year(e.year)) out.year = year(e.year);
    if (imdb(e.imdbId)) out.imdbId = imdb(e.imdbId);
    if (e.imdbConflict === true) out.imdbConflict = true;
    out.typeVerified = e.typeVerified === true && !!out.type;
    out.yearVerified = e.yearVerified === true && !!out.year;
    if (e.detailChecked === true) out.detailChecked = true;
    if (e.referencePageUrl && url(e.referencePageUrl))
      out.referencePageUrl = url(e.referencePageUrl);
    if (
      [
        'season-and-verified-series',
        'first-season-and-verified-series',
        'first-episode-airdate',
        'original-title-and-primary-heading',
        'series-heading-and-reference-year'
      ].indexOf(e.verificationReason) >= 0
    )
      out.verificationReason = e.verificationReason;
    if (Number(e.season) > 0 && Number(e.season) <= 100) out.season = Number(e.season);
    ['aliases', 'categories'].forEach(function (k) {
      if (Array.isArray(e[k]))
        out[k] = e[k]
          .slice(0, k === 'aliases' ? 8 : 16)
          .filter(function (v) {
            return typeof v === 'string';
          })
          .map(clean);
    });
    return out;
  }
  function buildTitle(value, y, tags) {
    var s = clean(value),
      season = null,
      f,
      m,
      changed = true,
      loops = 0,
      removed = [];
    var prefix = new RegExp(
      '^(?:' + brands + '|' + countries + ')\\s+(?:filmleri|dizileri)\\s*[:|–—-]\\s*'
    ).exec(fold(s));
    if (prefix && s.length > prefix[0].length) {
      removed.push(s.slice(0, prefix[0].length));
      s = clean(s.slice(prefix[0].length));
    }
    while (changed && loops++ < 8) {
      var prior = s;
      f = fold(s);
      var patterns = [
        /(?:\s+|\s*[-–—|:]\s*)(?:full\s+hd|full|hd|1080p|720p|2160p|4k|izle)\s*$/,
        /\s+(?:(?:turkce|ingilizce)\s+)?(?:dublaj(?:li)?|altyazi(?:li)?)(?:\s*&\s*(?:dublaj|altyazili))?\s*$/,
        /\s+turkce\s*$/,
        new RegExp(
          '(?:\\s+|\\s*[-–—|:]\\s*)(?:' +
            brands +
            '|' +
            countries +
            ')\\s+(?:film(?:i|leri|lerini)?|dizi(?:si|leri|lerini)?)\\s*$'
        ),
        /\s+(?:\d+\.?\s*(?:sezon|season)(?:\s*\d+\.?\s*(?:bolum|episode))?|(?:sezon|season)\s*\d+)\s*$/
      ];
      patterns.some(function (p, i) {
        m = p.exec(f);
        if (!m || !f.slice(0, m.index).replace(/[\s:|–—-]/g, '')) return false;
        if (i === 4) {
          var n = /\d+/.exec(m[0]);
          season = n ? Number(n[0]) : season;
        }
        removed.push(clean(s.slice(m.index)));
        s = clean(s.slice(0, m.index));
        return true;
      });
      if (y) s = s.replace(new RegExp('(?:\\s*[-–—:(]\\s*|\\s+)' + y + '\\s*\\)?$'), '');
      (tags || []).slice(0, 16).forEach(function (tag) {
        var t = normalized(tag),
          end = normalized(s);
        if (
          t &&
          /\b(?:filmleri|dizileri|filmi|dizisi)$/.test(t) &&
          end.length > t.length + 2 &&
          end.slice(-t.length - 1) === ' ' + t
        ) {
          var words = clean(tag).split(/\s+/).length,
            parts = s.split(/\s+/);
          removed.push(parts.slice(-words).join(' '));
          s = clean(parts.slice(0, -words).join(' '));
        }
      });
      changed = prior !== s;
    }
    return { title: s || clean(value), season: season, removed: removed };
  }
  function stripTitle(value, y, tags) {
    var key =
      String(value || '') + '\u001e' + String(y || '') + '\u001e' + (tags || []).join('\u001f');
    if (batchDepth && titleCache[key]) return titleCache[key];
    var result = buildTitle(value, y, tags);
    if (batchDepth && cacheEntries < 2048) {
      titleCache[key] = result;
      cacheEntries++;
    }
    return result;
  }
  function buildAnalysis(card) {
    card = card || {};
    var e = evidence(card),
      y = year(e.year) || year(card.year),
      raw = clean(card.rawTitle || card.title),
      s = stripTitle(e.title || card.title || raw, y, e.categories || card.identityCategories),
      type = card.type === 'collection' ? 'collection' : e.type || card.type || 'movie',
      names = [],
      seen = {},
      original = clean(e.originalTitle || card.originalTitle);
    if (['movie', 'series', 'episode', 'collection'].indexOf(type) < 0) type = 'movie';
    function add(value, kind, strong) {
      var title = stripTitle(value, y, e.categories || card.identityCategories).title,
        k = normalized(title);
      if (k && !seen[k]) {
        seen[k] = true;
        names.push({ key: k, title: title, kind: kind, strong: !!strong });
      }
    }
    add(s.title, 'title', true);
    if (original) add(original, 'original', true);
    (e.aliases || []).slice(0, 8).forEach(function (v) {
      add(v, 'original', true);
    });
    (card.titleAliases || []).slice(0, 8).forEach(function (v) {
      add(v, 'alias', true);
    });
    var paren = /\(([^()]+)\)/.exec(s.title);
    if (paren && !/^\d{4}$/.test(paren[1])) {
      add(paren[1], 'alias', true);
      add(s.title.replace(paren[0], ''), 'alias', true);
    }
    names.slice().forEach(function (v) {
      var brandless = v.title.replace(/^(?:Marvel[’']?s?|DC)\s+/i, '');
      if (brandless !== v.title) add(brandless, 'brand', false);
      // A checked primary title may differ only by its English article.
      // Keep sequel numbers/subtitles intact; never change the displayed title.
      if (e.detailChecked && e.typeVerified) {
        var articleless = v.title.replace(/^(?:the|an|a)\s+/i, '');
        if (articleless !== v.title) add(articleless, 'article', false);
      }
    });
    return {
      rawTitle: raw,
      title: s.title,
      names: names,
      type: type,
      typeVerified: !!e.typeVerified,
      year: y,
      yearVerified: !!e.yearVerified,
      imdbId: e.imdbConflict ? '' : imdb(e.imdbId || card.imdbId || card.imdbUrl),
      imdbType: e.imdbType || '',
      season: Number(e.season || card.sourceSeason || s.season) || null,
      seriesHint: !!s.season || /\bdizi(?:si|leri)?\b/.test(fold(raw)),
      removed: s.removed,
      evidence: e
    };
  }
  function analyze(card) {
    if (batchDepth && card && card.__workIdentityFacts) return card.__workIdentityFacts;
    var result = buildAnalysis(card);
    if (batchDepth && card) {
      try {
        Object.defineProperty(card, '__workIdentityFacts', { value: result, configurable: true });
        batchFacts.push(card);
      } catch (ignore) {}
    }
    return result;
  }
  function keys(card) {
    var a = analyze(card),
      out = [];
    if (a.imdbId && a.type !== 'collection') out.push('imdb|' + a.imdbId);
    if (a.type !== 'episode' && a.type !== 'collection')
      a.names.forEach(function (n) {
        out.push('name|' + n.key);
      });
    return out;
  }
  function decision(left, right) {
    var a = analyze(left),
      b = analyze(right),
      shared = false,
      strong = false;
    function result(state, reason) {
      return { state: state, reason: reason };
    }
    if (
      a.type === 'episode' ||
      b.type === 'episode' ||
      a.type === 'collection' ||
      b.type === 'collection'
    )
      return result('different', 'scope');
    if (a.evidence.imdbConflict || b.evidence.imdbConflict)
      return result('uncertain', 'page-imdb-conflict');
    if (a.imdbId && b.imdbId) {
      if (a.imdbId !== b.imdbId) return result('different', 'imdb-conflict');
      if (a.imdbType && b.imdbType && a.imdbType !== b.imdbType)
        return result('different', 'imdb-scope');
      if (a.typeVerified && b.typeVerified && a.type !== b.type)
        return result('uncertain', 'verified-type-conflict');
      return result('same', 'imdb');
    }
    if (a.type !== b.type)
      return result(a.typeVerified && b.typeVerified ? 'different' : 'uncertain', 'type');
    if (a.year && b.year && a.year !== b.year) return result('different', 'year');
    if (!a.year || !b.year) return result('uncertain', 'missing-year');
    a.names.forEach(function (x) {
      b.names.forEach(function (y) {
        if (x.key === y.key) {
          shared = true;
          if (x.strong && y.strong) strong = true;
        }
      });
    });
    if (!shared) return result('uncertain', 'name');
    if (!strong && !(a.typeVerified && b.typeVerified))
      return result('uncertain', 'presentation-only');
    return result('same', strong ? 'name-year-type' : 'verified-brand-alias');
  }
  function compatible(card, variants) {
    var same = false,
      conflict = false;
    (variants || []).forEach(function (v) {
      var d = decision(card, v);
      if (d.state === 'different') conflict = true;
      if (d.state === 'same') same = true;
    });
    return !conflict && same;
  }
  function select(card, groups) {
    var matching = (groups || []).filter(function (g) {
        return compatible(card, g.variants);
      }),
      ids = {};
    matching.forEach(function (g) {
      g.variants.forEach(function (v) {
        var id = analyze(v).imdbId;
        if (id) ids[id] = true;
      });
    });
    if (Object.keys(ids).length > 1 && !analyze(card).imdbId) return [];
    for (var i = 0; i < matching.length; i++)
      for (var j = i + 1; j < matching.length; j++) {
        var bad = matching[i].variants.some(function (a) {
          return matching[j].variants.some(function (b) {
            return decision(a, b).state === 'different';
          });
        });
        if (bad) return [];
      }
    return matching;
  }
  function project(variants) {
    var facts = (variants || []).map(analyze),
      best = null,
      type = '',
      types = {},
      years = {},
      id = '',
      original = '';
    facts.forEach(function (a) {
      if (a.typeVerified) types[a.type] = true;
      if (a.yearVerified && a.year) years[a.year] = true;
      if (a.imdbId) id = a.imdbId;
      var score =
        (a.yearVerified ? 8 : 0) +
        (a.typeVerified ? 4 : 0) +
        (/[çğıöşüİ]/i.test(a.title) ? 2 : 0) -
        a.removed.length * 0.01;
      if (!best || score > best.score) best = { a: a, score: score };
      if (!original)
        a.names.some(function (n) {
          if (n.kind === 'original') {
            original = n.title;
            return true;
          }
          return false;
        });
    });
    if (best) type = best.a.type;
    if (Object.keys(types).length === 1) type = Object.keys(types)[0];
    var conflict =
      Object.keys(types).length > 1 ||
      facts.some(function (a) {
        return (
          (a.type !== type && !Object.keys(types).length) ||
          (!Object.keys(types).length && a.type === 'movie' && a.seriesHint && !a.typeVerified)
        );
      });
    return {
      title: best ? best.a.title : '',
      originalTitle: original,
      type: type || 'movie',
      year: Object.keys(years).length === 1 ? Number(Object.keys(years)[0]) : best && best.a.year,
      imdbId: id,
      identityState: conflict ? 'pending' : 'ready',
      identityVersion: 2
    };
  }
  function score(card, query) {
    var q = normalized(stripTitle(query).title),
      best = 0;
    if (!q) return 0;
    analyze(card).names.forEach(function (n) {
      if (n.key === q) best = Math.max(best, 100);
      else if (n.key.indexOf(q) === 0) best = Math.max(best, 80);
      else if (n.key.indexOf(q) >= 0) best = Math.max(best, 60);
    });
    if (card.type === 'collection')
      (card.collectionTitles || []).slice(0, 200).forEach(function (title) {
        var key = normalized(title);
        if (q && key.indexOf(q) >= 0) best = Math.max(best, 40);
      });
    // URL text may help relevance, but never supplies work identity evidence.
    if (!best && q.length >= 3 && card.pageUrl) {
      try {
        if (normalized(decodeURIComponent(new root.URL(card.pageUrl).pathname)).indexOf(q) >= 0)
          best = 30;
      } catch (ignore) {}
    }
    return best;
  }
  function buildRelevant(cards, query) {
    var aliases = {},
      selected = [],
      rest = [];
    (cards || []).forEach(function (card) {
      if (score(card, query)) {
        selected.push(card);
        if (card.type !== 'collection')
          analyze(card).names.forEach(function (n) {
            if (n.strong) aliases[n.key] = true;
          });
      } else rest.push(card);
    });
    // Translation aliases come only from direct query matches, never an unbounded chain.
    rest.forEach(function (card) {
      if (
        analyze(card).names.some(function (n) {
          return n.strong && aliases[n.key];
        }) ||
        (card.type === 'collection' &&
          (card.collectionTitles || []).some(function (title) {
            return !!aliases[name(title)];
          }))
      )
        selected.push(card);
    });
    return selected;
  }
  function relevant(cards, query) {
    return withBatch(function () {
      return buildRelevant(cards, query);
    });
  }
  function name(v, y) {
    return normalized(stripTitle(v, y).title);
  }
  function mergeEvidence(card, meta) {
    var out = {},
      k;
    for (k in card) if (Object.prototype.hasOwnProperty.call(card, k)) out[k] = card[k];
    if (meta && meta.identityEvidence) {
      var merged = {},
        old = evidence(card),
        fresh = evidence({ pageUrl: card.pageUrl, identityEvidence: meta.identityEvidence });
      Object.keys(old).forEach(function (k) {
        merged[k] = old[k];
      });
      Object.keys(fresh).forEach(function (k) {
        if (fresh[k] !== false || merged[k] === undefined) merged[k] = fresh[k];
      });
      out.identityEvidence = merged;
    }
    if (meta && meta.imdbId) out.imdbId = meta.imdbId;
    if (out.identityEvidence && out.identityEvidence.imdbConflict) delete out.imdbId;
    if (meta && meta.originalTitle) out.originalTitle = meta.originalTitle;
    return out;
  }
  function attachDetail(card, meta) {
    var out = mergeEvidence(card, meta),
      old = evidence(out),
      e = {},
      k;
    for (k in old) if (Object.prototype.hasOwnProperty.call(old, k)) e[k] = old[k];
    e.version = 2;
    e.pageUrl = url(out.pageUrl);
    e.detailChecked = true;
    if (out.type === 'collection' && Array.isArray(out.collectionItems))
      out.collectionTitles = out.collectionItems.slice(0, 200).map(function (item) {
        return clean(item.title);
      });
    // Provider parsers bind their primary heading; schema names can be SEO page titles.
    if (out.title) e.title = clean(out.title);
    if (
      out.episodes &&
      out.episodes.some(function (v) {
        var ep = v.episode || v;
        return (
          ep.season > 0 &&
          ep.number > 0 &&
          url(v.pageUrl) &&
          (!v.seriesPageUrl || url(v.seriesPageUrl) === url(out.pageUrl))
        );
      })
    ) {
      if (e.imdbType === 'episode') {
        delete e.imdbId;
        delete out.imdbId;
        delete e.imdbType;
      }
      e.type = 'series';
      e.typeVerified = true;
    }
    if (out.originalTitle && !e.originalTitle) e.originalTitle = clean(out.originalTitle);
    out.identityEvidence = e;
    return out;
  }
  function prepare(card) {
    var out = mergeEvidence(card),
      a = analyze(card);
    out.rawTitle = card.rawTitle || card.title;
    out.rawType = card.rawType || card.type;
    out.rawYear = Object.prototype.hasOwnProperty.call(card, 'rawYear') ? card.rawYear : card.year;
    out.type = a.type;
    out.year = a.year;
    return out;
  }
  function confirmAgainst(card, references) {
    var prior = evidence(card);
    if (prior.verificationReason === 'original-title-and-primary-heading' || prior.verificationReason === 'series-heading-and-reference-year') {
      card = mergeEvidence(card);
      card.identityEvidence = prior;
      delete prior.year;
      delete prior.yearVerified;
      delete prior.referencePageUrl;
      if (prior.verificationReason === 'series-heading-and-reference-year') {
        prior.type = card.rawType || 'movie';
        prior.typeVerified = false;
        card.type = prior.type;
      }
      delete prior.verificationReason;
      card.year = year(card.rawYear);
    }
    var a = analyze(card),
      matches = [],
      ids = {},
      years = {},
      original = a.evidence.detailChecked && clean(a.evidence.originalTitle || card.originalTitle),
      primary = a.title.replace(/\s*\([^()]+\)\s*/g, ' '),
      originalKey = original && name(original),
      originalYear = a.type === 'movie' && a.typeVerified && !a.year && originalKey &&
        originalKey !== name(primary) &&
        name(primary).replace(/^(?:the|a|an) /, '').replace(/(?:^| )1(?= |$)/g, ' ').replace(/\s+/g, ' ').replace(/^ | $/g, '') ===
        originalKey.replace(/^(?:the|a|an) /, ''),
      verifyYear =
        a.type === 'series' && a.typeVerified && !a.year && a.season === 1 && year(card.yearHint),
      correctType = a.type === 'movie' && !a.typeVerified && a.seriesHint && (a.year || year(card.yearHint)),
      targetYear = a.year || verifyYear || correctType;
    if ((!verifyYear && !correctType && !originalYear) || !a.evidence.detailChecked) return prepare(card);
    (references || []).forEach(function (v) {
      if (v.providerId === card.providerId) return;
      var b = analyze(v),
        shared = a.names.some(function (x) {
          return (
            x.strong &&
            b.names.some(function (y) {
              return y.strong && x.key === y.key;
            })
          );
        });
      if (
        b.evidence.verificationReason !== 'original-title-and-primary-heading' &&
        b.evidence.verificationReason !== 'series-heading-and-reference-year' &&
        b.type === (originalYear ? 'movie' : 'series') &&
        b.typeVerified &&
        b.year && (!targetYear || b.year === targetYear) &&
        (originalYear ? b.names.some(function (n) { return n.strong && n.key === originalKey; }) : shared) &&
        !(a.imdbId && b.imdbId && a.imdbId !== b.imdbId)
      ) {
        matches.push(v);
        years[b.year] = true;
        if (b.imdbId) ids[b.imdbId] = true;
      }
    });
    if (!matches.length || Object.keys(ids).length > 1 || Object.keys(years).length !== 1) return prepare(card);
    var out = prepare(card),
      e = evidence(card);
    e.type = originalYear ? 'movie' : 'series';
    e.typeVerified = true;
    e.referencePageUrl = matches[0].pageUrl;
    e.verificationReason = 'season-and-verified-series';
    if (verifyYear || originalYear || !a.year) {
      e.year = Number(Object.keys(years)[0]);
      e.yearVerified = !!verifyYear;
      e.verificationReason = originalYear ? 'original-title-and-primary-heading' : verifyYear ? 'first-season-and-verified-series' : 'series-heading-and-reference-year';
      out.year = e.year;
    }
    out.identityEvidence = e;
    out.type = e.type;
    return out;
  }
  function fromPage(body, page, selectors) {
    var env = (U.currentEnvelope && U.currentEnvelope(body)) || U.envelope(body, !selectors),
      doc = env.doc || {
        querySelector: function () {
          return null;
        }
      },
      target = url(page),
      schemas = [],
      ids = [],
      heading = doc.querySelector('h1'),
      og = doc.querySelector('meta[property="og:url"]'),
      bound = og && url(U.url(og.getAttribute('content'), page)) === target;
    function add(v) {
      var id = imdb(v);
      if (id && ids.indexOf(id) < 0) ids.push(id);
    }
    env.schema.forEach(function (s) {
      if (!/^(Movie|TVSeries|TVEpisode)$/.test(s['@type'])) return;
      var explicit = s.url || s['@id'],
        valid = explicit && url(U.url(explicit, page)) === target;
      var hy = heading && /\(?((?:19|20)\d{2})\)?\s*$/.exec(clean(heading.textContent));
      if (
        !explicit &&
        bound &&
        heading &&
        name(s.name, hy && Number(hy[1])) === name(heading.textContent, hy && Number(hy[1]))
      )
        valid = true;
      if (!explicit && !valid)
        (Array.isArray(s.potentialAction) ? s.potentialAction : [s.potentialAction]).forEach(
          function (a) {
            if (!a || (a['@type'] && a['@type'] !== 'WatchAction')) return;
            (Array.isArray(a.target) ? a.target : [a.target]).forEach(function (t) {
              var v = typeof t === 'string' ? t : t && t.urlTemplate;
              if (v && url(U.url(v, page)) === target) valid = true;
            });
          }
        );
      if (valid) schemas.push(s);
    });
    var result = {},
      e = { version: 2, pageUrl: target },
      s = schemas.length === 1 ? schemas[0] : null;
    // Duplicate JSON-LD blocks may disagree. Never discard their conflicting IDs.
    schemas.forEach(function (value) {
      add(value.imdbId);
      add((value.identifier && value.identifier.value) || value.identifier);
      (Array.isArray(value.sameAs) ? value.sameAs : [value.sameAs]).forEach(add);
    });
    if (
      schemas.length > 1 &&
      schemas.every(function (x) {
        return x['@type'] === schemas[0]['@type'] && name(x.name) === name(schemas[0].name);
      })
    ) {
      s = {};
      schemas.forEach(function (x) {
        Object.keys(x).forEach(function (k) {
          if (!s[k]) s[k] = x[k];
        });
      });
    }
    if (s) {
      add(s.imdbId);
      add((s.identifier && s.identifier.value) || s.identifier);
      (Array.isArray(s.sameAs) ? s.sameAs : [s.sameAs]).forEach(add);
      e.type =
        s['@type'] === 'TVSeries' ? 'series' : s['@type'] === 'TVEpisode' ? 'episode' : 'movie';
      e.typeVerified = true;
      e.imdbType = e.type;
      e.title = clean(s.name);
      if (e.type === 'movie' && analyze({ title: e.title }).seriesHint) {
        e.typeVerified = false;
        delete e.imdbType;
      }
      if (s.alternateName) e.originalTitle = result.originalTitle = clean(s.alternateName);
      // dateCreated/datePublished are often website publication timestamps.
      var release = String(s.startDate || s.releaseDate || ''),
        m = /^(\d{4})(?:-|$)/.exec(release);
      if (m && year(m[1])) {
        e.year = Number(m[1]);
        e.yearVerified = true;
      }
    }
    if (doc.querySelectorAll) {
      var primarySelectors =
        '.post-info, .p-v12-meta-info, .db-infobox, .movie-info, .film-info, .single-info, .detail-info, #info--box, #filmbilgileri, #listelements';
      var areas = doc.querySelectorAll(primarySelectors);
      Array.prototype.forEach.call(areas, function (area) {
        Array.prototype.forEach.call(
          area.querySelectorAll('a[href*="imdb.com/title/"]'),
          function (a) {
            add(U.url(a.getAttribute('href'), page));
          }
        );
        Array.prototype.forEach.call(
          area.querySelectorAll('li, p, tr, .meta-row, .info-row'),
          function (row) {
            var text = fold(row.textContent),
              ym =
                /(?:yapim\s*yili|cikis\s*(?:yili|tarihi)|vizyon\s*tarihi|ilk\s*yayin|release\s*(?:year|date))\s*[:\-]?\s*((?:19|20)\d{2})\b/.exec(
                  text
                );
            if (ym && !e.year) {
              e.year = Number(ym[1]);
              e.yearVerified = true;
            }
          }
        );
      });
      var releaseNode = doc.querySelector(
        '.post-info-year-country a, .db-infobox [itemprop="dateCreated"], .p-v12-meta-info [itemprop="dateCreated"]'
      );
      if (releaseNode && !e.year) {
        var ry = /^((?:19|20)\d{2})(?:-|\s|$)/.exec(
          clean(releaseNode.getAttribute('content') || releaseNode.textContent)
        );
        if (ry) {
          e.year = Number(ry[1]);
          e.yearVerified = true;
        }
      }
      var categories = [];
      Array.prototype.forEach.call(
        doc.querySelectorAll(
          '.post-info-genres a, .p-v12-meta-info a[rel="category"], .db-infobox a[rel="tag"]'
        ),
        function (a) {
          var label = clean(a.textContent);
          if (label && categories.length < 16) categories.push(label);
        }
      );
      if (categories.length) e.categories = categories;
    }
    if ((s || bound) && selectors)
      Array.prototype.forEach.call(doc.querySelectorAll(selectors), function (a) {
        add(U.url(a.getAttribute('href'), page));
      });
    if (ids.length === 1) {
      e.imdbId = result.imdbId = ids[0];
    } else if (ids.length > 1) e.imdbConflict = true;
    if (Object.keys(e).length > 2) result.identityEvidence = e;
    return result;
  }
  root.ContentIdentity = {
    version: 2,
    withBatch: withBatch,
    invalidate: invalidate,
    imdb: imdb,
    year: year,
    name: name,
    seriesName: name,
    keys: keys,
    analyze: analyze,
    decide: decision,
    select: select,
    compatible: compatible,
    project: project,
    score: score,
    relevant: relevant,
    evidence: evidence,
    attach: mergeEvidence,
    prepare: prepare,
    confirmAgainst: confirmAgainst,
    attachDetail: attachDetail,
    fromPage: fromPage
  };
})(window);
