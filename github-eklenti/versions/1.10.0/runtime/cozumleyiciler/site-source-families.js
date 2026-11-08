/* Public active-player data only. Website scripts are parsed as data, never executed. */
(function (root) {
  'use strict';
  var D = root.WebPlayerData, U = root.CatalogUtils;
  function fail(stage, message) { throw D.fail(stage, message); }
  function literal(body, pattern) { var m = pattern.exec(body); return m ? D.literal(body, m.index + m[0].length).value : ''; }
  function publicUrl(value, page) { return D.publicUrl(value, page); }
  function media(url, ref, type) { url = publicUrl(url, ref); if (!url) return fail('decode', 'Geçersiz medya adresi.'); return { url: url, referer: ref, type: type || (/\.mp4(?:[?#]|$)/i.test(url) ? 'mp4' : 'hls'), subtitles: [] }; }
  function bytes(value, hex) { var s = hex ? value : root.atob(value), out = new Uint8Array(hex ? s.length / 2 : s.length), i; if (hex && (!/^[a-f\d]+$/i.test(s) || s.length % 2)) return fail('decode', 'Bozuk oynatıcı şifreleme verisi.'); for (i = 0; i < out.length; i++) out[i] = hex ? parseInt(s.slice(i * 2, i * 2 + 2), 16) : s.charCodeAt(i); return out; }
  function roket(body) {
    var v = root.SitePayload.find(body, function (x) { return x.enc && typeof x.k === 'string' && Array.isArray(x.sources) && Object.prototype.hasOwnProperty.call(x, 'gate'); });
    if (!v) return fail('decode', 'Aktif Roket oynatıcı kaydı bulunamadı.');
    if (v.gate || v.error) return fail('unavailable', 'Kaynak giriş veya erişim izni gerektiriyor.');
    return v;
  }
  function decrypt(v) {
    var subtle = root.crypto && root.crypto.subtle, enc = v.enc;
    if (!subtle || !root.TextEncoder || !root.TextDecoder) return Promise.reject(D.fail('unsupported', 'Bu cihaz PBKDF2/AES-CBC oynatıcı verisini desteklemiyor.'));
    if (!enc || typeof enc.ciphertext !== 'string' || enc.ciphertext.length > 8192 || !/^[a-f\d]{32}$/i.test(enc.iv || '') || !/^[a-f\d]{16,1024}$/i.test(enc.salt || '') || v.k.length > 1024) return Promise.reject(D.fail('decode', 'Oynatıcı verisi sınırı aşıldı.'));
    return subtle.importKey('raw', new root.TextEncoder().encode(v.k), 'PBKDF2', false, ['deriveKey']).then(function (key) {
      return subtle.deriveKey({ name: 'PBKDF2', salt: bytes(enc.salt, true), iterations: 999, hash: 'SHA-512' }, key, { name: 'AES-CBC', length: 256 }, false, ['decrypt']);
    }).then(function (key) { return subtle.decrypt({ name: 'AES-CBC', iv: bytes(enc.iv, true) }, key, bytes(enc.ciphertext, false)); }).then(function (data) { var url = new root.TextDecoder().decode(data); if (url.length > 2048 || !publicUrl(url)) return fail('decode', 'Çözülen oynatıcı adresi geçersiz.'); return publicUrl(url); });
  }
  function pilavyer(body, page) {
    var v = D.object(body, /\bwindow\.__PLAYER__\s*=\s*/), url = publicUrl(v.stream), u = url && new root.URL(url), p = new root.URL(page);
    if (!u || u.origin !== p.origin || u.pathname !== '/api/stream.php' || root.CatalogSiteKit.param(url, 'v') !== v.v) return fail('decode', 'Pilavyer medya kimliği eşleşmiyor.');
    var result = media(url, page); result.fragmentByteLimit = 12582912;
    (Array.isArray(v.subs) ? v.subs : []).forEach(function (t, i) { var s = publicUrl(t.src), q = s && new root.URL(s); if (q && q.origin === p.origin && q.pathname === '/api/sub.php' && root.CatalogSiteKit.param(s, 'v') === v.v) result.subtitles.push({ id: 'pilav-' + i, url: s, language: t.lang || '', label: U.clean(t.label || t.lang), format: 'vtt' }); });
    return result;
  }
  function create(P) {
    var host = new root.URL(P.base).hostname;
    function allowed(url) { var u = publicUrl(url), h = u && new root.URL(u).hostname; return !!h && (h === host || /^(?:play[1-9][0-9]{0,2}\.)?pilavyerplay\.top$/.test(h) || /^(?:four\.)?pichive\.online$/.test(h) || /^(?:streamcorecdn\.com|ksdpictures\.site|ok\.ru|vidara\.to|gasobni\.com|as9u7bgh9\.com)$/.test(h)); }
    function entry(url, label, kind, index) { if (!allowed(url)) return fail('unsupported', 'Aktif oynatıcı ailesi henüz doğrulanmadı.'); return { url: url, label: label || 'Kaynak', kind: kind || 'embed', sourceId: P.config.id + '-' + (index || 0) + '-' + new root.URL(url).pathname.replace(/[^a-z\d]/gi, '-').slice(-100) }; }
    function alternatives(body, page) {
      var doc = D.doc(body), out = [], model, selector = P.config.playerFrames || '[data-player] iframe, iframe#diziyouPlayer, iframe#playerFrame, .player-container iframe, #player iframe, #videoplayer iframe, .video-player iframe';
      if (P.config.id === 'roketdizi') { model = roket(body); model.sources.forEach(function (s, i) { var url = P.safe(s.href, page); if (url) out.push(entry(url, U.clean(s.label), 'roket', i)); }); return out; }
      Array.prototype.forEach.call(doc.querySelectorAll(selector.replace(/\[src/g, '[data-frame-src')), function (f) { var url = publicUrl(f.getAttribute('data-frame-src') || f.getAttribute('data-src'), page); if (url && !out.some(function (e) { return e.url === url; })) out.push(entry(url, f.getAttribute('title') || 'Kaynak', 'embed', out.length)); });
      Array.prototype.forEach.call(doc.querySelectorAll('[data-player] [data-pv]'), function (n) { var slug = n.getAttribute('data-pv'), script = /<script\b[^>]*src=["'](https:\/\/(?:play[1-9][0-9]{0,2}\.)?pilavyerplay\.top)\/assets\/js\/core\.js["']/i.exec(body); if (/^[a-z\d_-]{8,100}$/i.test(slug || '') && script) out.push(entry(script[1] + '/assets/js/s.php?s=' + encodeURIComponent(slug), 'Pilavyer', 'embed', out.length)); });
      if (P.config.id === 'dizipal21') { var declared = literal(body, /\b(?:var|let|const)\s+embedUrl\s*=\s*/), slug = literal(body, /\b(?:var|let|const)\s+EP_SLUG\s*=\s*/); if (declared.indexOf('/api/embed.php?slug=') === 0 && slug === new root.URL(page).pathname.split('/').pop()) { var domain = /["']\s*\+\s*EP_SLUG\s*\+\s*["'](&domain=https:\/\/[^"']+)["']/.exec(body); if (domain) out.push(entry(P.base + '/api/embed.php?slug=' + encodeURIComponent(slug) + domain[1], 'Dizipal', 'embed', 0)); } }
      if (P.config.id === 'izle7' && doc.querySelector('#dailyMotionVid') && /dailymotion\.createPlayer\(\s*["']dailyMotionVid/.test(body)) { var id = literal(body, /\b(?:var|let|const)\s+play_video\s*=\s*/); if (/^[a-z\d]{6,30}$/i.test(id)) out.push({ url: 'https://www.dailymotion.com/player/metadata/video/' + id, kind: 'dailymotion', label: 'Dailymotion', sourceId: 'izle7-dm-' + id }); }
      if (!out.length) return fail('decode', 'Aktif ve desteklenen oynatıcı alanı bulunamadı.'); return out;
    }
    function resolve(e, get, request, check, enqueue) {
      function read(url, ref, depth) {
        check(); if (depth > 4 || !allowed(url)) return Promise.reject(D.fail('unsupported', 'Oynatıcı yönlendirmesi sınır dışında.'));
        return get(url, ref, 'embed').then(function (r) {
          check(); var p = new root.URL(url), doc = D.doc(r.body), v, source;
          if (p.hostname === 'ok.ru') return D.ok(r.body, url);
          if (root.VidaraDecoder.host(url)) { v = root.VidaraDecoder.settings(r.body, url); if (v.mirror && enqueue) enqueue([entry(v.mirror, new root.URL(v.mirror).hostname, 'embed', 99)]); return request(v.api, url, 'api', JSON.stringify({ filecode: v.filecode, device: 'web', codecs: [] }), { 'Content-Type': 'application/json' }).then(function (r) { var data = root.VidaraDecoder.media(r.body, v.filecode); data.referer = v.referer; return data; }); }
          if (/^(?:play[1-9][0-9]{0,2}\.)?pilavyerplay\.top$/.test(p.hostname)) return pilavyer(r.body, url);
          if (p.hostname === 'ksdpictures.site' && p.pathname === '/dzembed.php' && doc.querySelector('#player-wrapper #np')) { v = D.object(r.body, /\bwindow\.NP_CONFIG\s*=\s*/); if (v.id !== 'embed-' + root.CatalogSiteKit.param(url, 'id')) return fail('decode', 'KSD video kimliği eşleşmiyor.'); source = v.sources && v.sources[0]; if (!source || !source.master) return fail('decode', 'KSD kaynak listesi boş.'); var ksd = media(source.master, url); (Array.isArray(v.subtitles) ? v.subtitles : []).forEach(function (t, i) { var sub = publicUrl(t.url, url); if (sub) ksd.subtitles.push({ id: 'ksd-' + i, url: sub, label: U.clean(t.label), language: t.lang || '', format: 'vtt' }); }); return ksd; }
          if (p.hostname === 'streamcorecdn.com' && doc.querySelector('video') && /\.loadSource\(\s*src\s*\)/.test(r.body)) { source = literal(r.body, /\b(?:var|let|const)\s+src\s*=\s*(?=['"])/); if (!/^\/play\.m3u8\?/.test(source)) return fail('decode', 'Streamcore etkin manifesti bulunamadı.'); return media(source, url); }
          source = doc.querySelector('video source[data-frame-src], video[data-frame-src]'); if (source) { var data = media(source.getAttribute('data-frame-src'), url, /mp4/i.test(source.getAttribute('type') || '') ? 'mp4' : 'hls'); Array.prototype.forEach.call(doc.querySelectorAll('video track[data-frame-src]'), function (t, i) { var u = publicUrl(t.getAttribute('data-frame-src'), url); if (u) data.subtitles.push({ id: 'track-' + i, url: u, language: t.getAttribute('srclang') || '', label: t.getAttribute('label') || '', format: 'vtt' }); }); return data; }
          var frame = doc.querySelector('iframe[data-frame-src]'); if (frame) { var child = publicUrl(frame.getAttribute('data-frame-src'), url); if (child) return read(child, url, depth + 1); }
          return D.jw(r.body, url);
        });
      }
      if (e.kind === 'dailymotion') return get(e.url, e.pageUrl, 'api').then(function (r) { var v; try { v = JSON.parse(r.body); } catch (ignore) { return fail('api', 'Dailymotion JSON yanıtı geçersiz.'); } if (v.error) return fail('unavailable', 'Dailymotion erişim kısıtı: ' + U.clean(v.error.code || v.error.type || 'restricted')); var q = v.qualities && (v.qualities.auto || []), source = q.filter(function (x) { return /mpegurl/i.test(x.type || ''); })[0]; if (!source) return fail('unsupported', 'Dailymotion izin verilen HLS kaynağı sunmuyor.'); return media(source.url, e.pageUrl); });
      if (e.kind === 'roket') return get(e.url, e.pageUrl, 'embed').then(function (r) { return decrypt(roket(r.body)); }).then(function (url) { check(); return read(url, e.url, 0); });
      return read(e.url, e.pageUrl || P.base + '/', 0);
    }
    return { alternatives: alternatives, resolve: resolve };
  }
  root.SiteSourceFamilies = { create: create, roket: roket, decrypt: decrypt };
})(window);
