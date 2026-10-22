/* Page resolution has its own lifetime; signed CDN URLs are never storage keys. */
(function (root) {
 'use strict';
 function origin(url) { var m = /^(https?:\/\/[^/]+)/i.exec(url); return m ? m[1] + '/' : ''; }
 function Resolver(log, now) { this.log = log || function () {}; this.now = now || Date.now; this.generation = 0; }
 Resolver.prototype.cancel = function () { this.generation++; root.ChainNetwork.cancel(); };
 Resolver.prototype.resolve = function (content, deadline) {
  this.cancel(); var self = this, token = this.generation, sources = [], provisional = 0, lastError = null;
  function failure(stage, message) { var e = new Error(message); e.stage = stage; return e; }
  function check() { if (self.generation !== token) { var e = new Error('İptal edildi'); e.cancelled = true; throw e; } if (self.now() >= deadline) throw new Error('Kaynak arama süresi doldu.'); }
  function get(url, ref, stage) { check(); return root.ChainNetwork.get(url, ref).then(function (r) { check(); return r; }, function (e) { e.stage = stage; throw e; }); }
  function add(s, name, ref, subtitles) {
   if (!s.url || !/^https?:\/\//i.test(s.url)) return;
   var existing = sources.filter(function (c) { return c.url === s.url; })[0];
   var subs = (s.subtitles || []).concat(subtitles || []).filter(function (x, i, a) { return x.url && /^https?:\/\//i.test(x.url) && a.map(function (t) { return t.url; }).indexOf(x.url) === i; });
   if (existing) { existing.subtitles = existing.subtitles.concat(subs); return; }
   sources.push({ id: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + sources.length, label: name, name: name, url: s.url, type: 'hls', quality: s.quality || null, referer: ref, subtitles: subs, status: 'unchecked' });
  }
  if (!content.pageUrl) return Promise.reject(new Error('Bağlantı yenilemek için içerik sayfası gerekli.'));
  self.log('Kaynak sayfası alınıyor.');
  return get(content.pageUrl, origin(content.pageUrl), 'page').then(function (page) {
   var frames = root.ChainDecoder.catalog.players(page.body, content.pageUrl, 'https://hdfilmcehennemi.mobi');
   var direct = root.ChainDecoder.player.extractPlayer(page.body, content.pageUrl);
   direct.streams.forEach(function (s) { add(s, 'Sayfa kaynağı', origin(content.pageUrl), direct.subtitles); });
   function frame(i) {
    check(); if (i >= frames.length) return Promise.resolve(); var f = frames[i]; self.log('Kaynak çözümleniyor: ' + f.name);
    return get(f.url, content.pageUrl, 'embed').then(function (r) {
     var result = root.ChainDecoder.player.extractPlayer(r.body, f.url); provisional += (result.provisional || []).length;
     if (!result.streams.length) lastError = failure('decode', f.name + ': oynatma adresi çözümlenemedi.');
     result.streams.forEach(function (s) { add(s, f.name, /rapidrame/i.test(f.name) ? origin(content.pageUrl) : origin(f.url), result.subtitles); });
    }).catch(function (e) { check(); lastError = e; self.log(f.name + ': ' + e.message); }).then(function () { return frame(i + 1); });
   }
   return frame(0);
  }).then(function () {
   function validate(i) {
    check(); if (i >= sources.length) return Promise.resolve(); var s = sources[i];
    return get(s.url, s.referer, 'manifest').then(function (r) {
     s.playlist = /^\s*#EXTM3U/.test(r.body); s.transport = /^XHR/.test(r.method) ? 'xhr' : 'native'; s.status = s.playlist ? 'ready' : 'invalid';
     if (!s.playlist) lastError = failure('manifest', s.label + ': yanıt bir HLS yayın listesi değil.');
    }).catch(function (e) { check(); s.status = 'unverified'; self.log(s.label + ': doğrulama yapılamadı.'); }).then(function () { return validate(i + 1); });
   }
   return validate(0);
  }).then(function () { check(); if (provisional) self.log('Doğrulanmamış metadata oynatma listesine alınmadı.'); sources = sources.filter(function (s) { return s.status !== 'invalid'; }).sort(function (a, b) { return (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1); }); if (!sources.length) throw lastError || failure('decode', 'Sayfada oynatılabilir kaynak bulunamadı.'); return sources; });
 };
 root.SourceResolver = Resolver;
})(window);
