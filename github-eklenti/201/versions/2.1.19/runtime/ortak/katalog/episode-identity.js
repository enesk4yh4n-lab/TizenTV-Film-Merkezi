/* Episode numbering is separate from work identity. Source URLs/IDs never change. ES5. */
(function (root) {
  'use strict';
  function copy(v) { return root.PlayerCore.copy(v); }
  function integer(v) { v = Number(v); return v > 0 && v % 1 === 0 ? v : null; }
  function label(e) { var m = /(?:^|[\s·|])([0-9]+)\.?\s*b[oö]l[uü]m\b/i.exec(String(e.episodeTitle || e.title || '')); return m ? integer(m[1]) : null; }
  function title(value) { return String(value || '').replace(/İ/g,'i').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,' ').replace(/^ | $/g,''); }
  function coordinate(e) { var id = e && e.episodeIdentity; return id && id.version === 1 && integer(id.season) && integer(id.number) ? id : e && e.episode; }
  function normalize(details, reference) {
    var bySeason = {}, byAbsolute = {}, byId = {}, rows = [], order = [], used = {}, offsets = {}, counts = {}, offset = 0, complete = true;
    var seasons = reference && reference.seasons || [], refs = reference && reference.episodes || [];
    seasons.slice().sort(function (a, b) { return a.season - b.season; }).forEach(function (s) {
      if (!integer(s.season)) return;
      offsets[s.season] = complete ? offset : null; counts[s.season] = Number(s.count) || 0;
      if (!(s.count >= 0) || s.count % 1) complete = false; else offset += Number(s.count);
    });
    function add(season, number, absolute, id, extra) {
      var key = season + ':' + number, r = bySeason[key];
      if (!r) { r = { season: season, number: number, absolute: absolute, id: id || null, date: '', title: '' }; bySeason[key] = r; order.push(r); }
      if (id) { r.id = id; byId[id] = r; } if (absolute) byAbsolute[absolute] = r;
      if (extra) { r.date = extra.date || ''; r.title = extra.title || ''; } return r;
    }
    seasons.forEach(function (s) { for (var n = 1; n <= Math.min(5000, Number(s.count) || 0); n++) add(s.season, n, offsets[s.season] !== null ? offsets[s.season] + n : null); });
    refs.forEach(function (e) { if (integer(e.season) && integer(e.number)) add(e.season, e.number, label(e) || (offsets[e.season] !== undefined && offsets[e.season] !== null ? offsets[e.season] + e.number : null), e.id, e); });
    if (!order.length) {
      var primary = details[0] && details[0].value, local = {}, sum = 0;
      (primary && primary.episodes || []).forEach(function (e) { var ep = e.rawEpisode || e.episode; if (ep && integer(ep.season) && integer(ep.number)) (local[ep.season] || (local[ep.season] = {}))[ep.number] = true; });
      Object.keys(local).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (s) {
        var ns = Object.keys(local[s]).map(Number).sort(function (a, b) { return a - b; }); offsets[s] = sum; counts[s] = ns.length;
        ns.forEach(function (n, i) { add(Number(s), n, sum + i + 1); }); sum += ns.length;
      });
    }
    details.forEach(function (item) {
      var seen = {}, taken = {}, normalized = [], groups = {}, list = item.value.episodes || [], previous = null, extras = [];
      list.forEach(function (e) { var ep = e.rawEpisode || e.episode; if (ep) { var stats = groups[ep.season] || (groups[ep.season] = { min: Infinity, max: 0, one: false }); stats.min = Math.min(stats.min, Number(ep.number)); stats.max = Math.max(stats.max, Number(ep.number)); if (Number(ep.number) === 1) stats.one = true; } });
      list.forEach(function (source) {
        if (!source || !source.episode || seen[source.contentId]) return; seen[source.contentId] = true;
        var e = copy(source), ep = copy(e.rawEpisode || e.episode), info = e.episodeIdentity || {}, sn = integer(ep.season), en = integer(ep.number), stats = groups[sn] || { min: 0, max: 0, one: false }, absolute = info.binding ? null : integer(info.absoluteNumber), chosen, reason = 'source-number', exact = false;
        delete e.variants;
        if (info.kind === 'clip' || info.kind === 'part' || /(?:^|\s)(?:fragman|trailer|teaser|on izleme|part\s*\d+|parca\s*\d+)(?:\s|$)/.test(title(e.episodeTitle || e.title))) { extras.push(e); return; }
        if (Number(ep.season) === 0 && en) { chosen = add(0, en, null, info.tmdbEpisodeId); reason = 'special'; }
        if (info.tmdbEpisodeId && byId[info.tmdbEpisodeId]) { chosen = byId[info.tmdbEpisodeId]; reason = 'episode-id'; exact = true; }
        var scheme = info.numbering;
        if (!scheme || scheme === 'unknown') scheme = sn > 1 && stats.one ? 'season' : sn > 1 && offsets[sn] > 0 && stats.min > offsets[sn] ? 'absolute' : sn === 1 && counts[1] && stats.max > counts[1] ? 'absolute' : 'season';
        if (!chosen && info.airDate) { var dates = order.filter(function (r) { return r.date && r.date === info.airDate; }); if (dates.length === 1) { chosen = dates[0]; reason = 'air-date'; } }
        if (!chosen && e.episodeTitle && !label(e) && title(e.episodeTitle).length >= 4) { var titles = order.filter(function (r) { return title(r.title) === title(e.episodeTitle); }); if (titles.length === 1) { chosen = titles[0]; reason = 'episode-title'; } }
        if (!absolute && scheme === 'absolute') absolute = label(e) || en;
        if (!chosen && absolute && byAbsolute[absolute]) { chosen = byAbsolute[absolute]; reason = 'absolute-number'; }
        if (!chosen && scheme === 'season' && bySeason[sn + ':' + en]) { chosen = bySeason[sn + ':' + en]; reason = 'season-number'; }
        if (!chosen && label(e) && byAbsolute[label(e)]) { chosen = byAbsolute[label(e)]; reason = 'label-number'; }
        if (!chosen && previous && previous.absolute && byAbsolute[previous.absolute + (en && previous.sourceNumber ? en - previous.sourceNumber : 1)]) { chosen = byAbsolute[previous.absolute + (en && previous.sourceNumber ? en - previous.sourceNumber : 1)]; reason = 'neighbor-order'; }
        if (!chosen && sn && en) { chosen = add(sn, en, absolute); reason = 'source-fallback'; }
        if (!chosen) { normalized.push(e); return; }
        var key = chosen.season + ':' + chosen.number, prior = taken[key];
        if (prior && info.tmdbEpisodeId && prior.episodeIdentity.tmdbEpisodeId && info.tmdbEpisodeId !== prior.episodeIdentity.tmdbEpisodeId) { normalized.push(e); return; }
        e.rawEpisode = ep; e.episode.season = chosen.season; e.episode.number = chosen.number;
        e.episodeIdentity = { version: 1, season: chosen.season, number: chosen.number, absoluteNumber: chosen.absolute || absolute, tmdbSeriesId: reference && reference.id || null, tmdbEpisodeId: chosen.id || null, binding: exact ? 'confirmed' : 'estimated', reason: reason, numbering: scheme };
        if (chosen.season === 0) e.episodeIdentity.kind = 'special';
        taken[key] = e; normalized.push(e); previous = { absolute: chosen.absolute, sourceNumber: en };
        if (!used[key]) { used[key] = e; e.variants = []; rows.push(e); }
        if (!used[key].variants.some(function (v) { return v.contentId === e.contentId; })) { var v = copy(e); delete v.variants; used[key].variants.push(v); }
      });
      item.value.episodes = normalized;
      item.value.episodeExtras = extras;
      var coverage = {};
      normalized.forEach(function (e) { var ep = e.episode; if (ep) (coverage[ep.season] || (coverage[ep.season] = {}))[ep.number] = true; });
      Object.keys(coverage).forEach(function (s) { var ns = Object.keys(coverage[s]).map(Number).sort(function (a, b) { return a - b; }); if (ns[0] > 1 || ns.length < ns[ns.length - 1] - ns[0] + 1) item.value.episodePagesIncomplete = true; });
      item.value.seasons = normalized.map(function (e) { return coordinate(e).season; }).filter(function (n, i, all) { return (integer(n) || n === 0) && all.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
    });
    rows.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
    return { details: details, rows: rows };
  }
  function source(content) {
    if (!content || !content.rawEpisode || !content.episodeIdentity) return content;
    var result = copy(content); result.episode = copy(content.rawEpisode); return result;
  }
  root.EpisodeIdentity = { normalize: normalize, coordinate: coordinate, source: source };
})(window);
