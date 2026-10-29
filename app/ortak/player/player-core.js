/* ES5 shared player contracts. No platform API is required by the model. */
(function (root) {
 'use strict';
 function finite(n) { return typeof n === 'number' && isFinite(n); }
 function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
 function copy(value) { return JSON.parse(JSON.stringify(value)); }
 function format(n) {
  if (!finite(n) || n < 0) return '--:--';
  n = Math.floor(n); var h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, s = n % 60;
  return (h ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
 }
 function language(value) {
  var s = String(value || '').toLowerCase().replace(/_/g, '-').split('-')[0];
  var aliases = { tur: 'tr', eng: 'en', deu: 'de', ger: 'de', fra: 'fr', fre: 'fr', spa: 'es', ara: 'ar' };
  return Object.prototype.hasOwnProperty.call(aliases, s) ? aliases[s] : s;
 }
 function role(t) {
  var s = String(t.characteristics || t.role || '').toLowerCase();
  if (/describes-video|description|audio.description/.test(s)) return 'description';
  if (/commentary/.test(s)) return 'commentary';
  if (/transcribes-spoken|describes-music|sdh|hearing/.test(s)) return 'sdh';
  return t.forced || /forced/.test(s) ? 'forced' : 'main';
 }
 function trackLanguage(t) {
  if (t.lang || t.language) return language(t.lang || t.language);
  // Some real manifests supply NAME="Turkish" without LANGUAGE. Accept only
  // unambiguous labels; "Original Audio" does not identify a language.
  var name = String(t.name || t.label || '').toLowerCase().replace(/^\s+|\s+$/g, '');
  var labels = { turkish: 'tr', 'türkçe': 'tr', turkce: 'tr', english: 'en', deutsch: 'de', 'français': 'fr', french: 'fr' };
  return Object.prototype.hasOwnProperty.call(labels, name) ? labels[name] : '';
 }
 function trackKey(t) { return { lang: trackLanguage(t), role: role(t), name: String(t.name || t.label || '') }; }
 function matchTrack(tracks, pref) {
  if (!pref) return -1;
  var lang = language(pref.lang), desiredRole = pref.role || 'main', fallback = -1;
  for (var i = 0; i < tracks.length; i++) {
   if (trackLanguage(tracks[i]) !== lang || role(tracks[i]) !== desiredRole) continue;
   if (fallback < 0) fallback = i;
   if (pref.name && (tracks[i].name || tracks[i].label) === pref.name) return i;
  }
  return fallback;
 }
 function pageId(url) {
  return String(url || '').replace(/#.*$/, '').replace(/\?.*$/, '').replace(/\/+$/, '').replace(/^https?:\/\//i, '').toLowerCase();
 }
 function content(input) {
  if (!input || (!input.contentId && !input.pageUrl)) throw new Error('Sabit içerik kimliği veya sayfa adresi gerekli.');
  var c = copy(input); c.contentId = String(c.contentId || pageId(c.pageUrl)); c.title = String(c.title || 'Video');
  c.type = c.type === 'episode' ? 'episode' : 'movie'; c.sources = c.sources || []; c.subtitles = c.subtitles || [];
  if (c.navigation && (c.type !== 'movie' || c.navigation.kind !== 'movies' || !Array.isArray(c.navigation.items))) delete c.navigation;
  c.sources.forEach(function (s, i) { s.id = String(s.sourceId || s.id || 'source-' + i); s.label = String(s.label || s.name || 'Kaynak ' + (i + 1)); s.subtitles = (s.subtitles || []).concat(c.subtitles).filter(function (t, index, all) { return t && t.url && all.map(function (x) { return x && x.url; }).indexOf(t.url) === index; }); });
  c.chapters = (c.chapters || []).filter(function (x) { return finite(x.start) && x.start >= 0 && (!x.end || x.end > x.start); }).sort(function (a, b) { return a.start - b.start; });
  return c;
 }
 function emitter(target) {
  var listeners = {};
  target.on = function (name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); return function () { var a = listeners[name] || [], i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }; };
  target.emit = function (name, data) { (listeners[name] || []).slice().forEach(function (fn) { fn(data); }); };
 }
 function safeMessage(value) { return String(value || '').replace(/https?:\/\/[^\s<>"']+/g, '[medya adresi]').replace(/(token|signature|auth|cookie)\s*[:=]\s*[^\s,;]+/ig, '$1=[gizli]').slice(0, 400); }
 function audioGate(track, capabilities) {
  var codec = String(track.audioCodec || track.codec || track.attrs && track.attrs.CODECS || '').toLowerCase();
  var feature=/(^|[\s,])(ec-3|eac-3|eac3|ec3)([\s,.]|$)/.test(codec)?'eac3':/(^|[\s,])(ac-3|ac3)([\s,.]|$)/.test(codec)?'ac3':/(^|[\s,])dts[a-z0-9.-]*([\s,.]|$)/.test(codec)?'dts':'';
  if(feature&&(!capabilities||!capabilities[feature]))return 'Dolby / DTS ses bu motorda doğrulanmadı';
  if(feature&&capabilities.audioProfiles){var channels=String(track.channels||track.audioChannels||track.attrs&&track.attrs.CHANNELS||'').split('/')[0],count=/^\d+$/.test(channels)?Number(channels):/^\d+\.1$/.test(channels)?Number(channels.split('.')[0])+1:0;if((capabilities.audioProfiles[feature]||[]).indexOf(count)<0)return 'Bu ses kanal profili bu motorda doğrulanmadı';if(feature==='dts'&&!/^(dts|dtsc)$/.test(codec)||/joc|atmos/i.test(codec+' '+(track.profile||'')+' '+(track.channels||track.attrs&&track.attrs.CHANNELS||'')))return 'DTS-HD / Atmos profili bu motorda doğrulanmadı';}
  return '';
 }
 function mediaGate(level, capabilities) {
  var caps=capabilities||{};
  if (level.height > (caps.maxHeight||1080)) return '1080p üstü bu TV’de doğrulanmadı';
  if (/^(dvh|dvhe)/i.test(level.videoCodec || '')) return 'Dolby Vision bu TV ve motorda doğrulanmadı';
  if (/^(hvc|hev)/i.test(level.videoCodec || '')&&!caps.hevc) return 'HEVC / Dolby Vision bu TV ve motorda doğrulanmadı';
  if(/^(hvc|hev)/i.test(level.videoCodec||'')&&caps.hevcProfiles){var profile=level.videoProfile||/^h(?:vc|ev)1\.1(?:\.|$)/i.test(level.videoCodec)&&'main'||/^h(?:vc|ev)1\.2(?:\.|$)/i.test(level.videoCodec)&&'main10';if(!profile||caps.hevcProfiles.indexOf(profile)<0)return 'Bu HEVC profili bu motorda doğrulanmadı';}
  if (level.attrs && level.attrs['VIDEO-RANGE'] && level.attrs['VIDEO-RANGE'] !== 'SDR'&&(!caps.hdr||caps.hdrRanges&&caps.hdrRanges.indexOf(level.attrs['VIDEO-RANGE'])<0)) return 'HDR bu TV ve motorda doğrulanmadı';
  if (audioGate(level,caps)) return audioGate(level,caps);
  return '';
 }
 var defaults = { audioLanguage: 'tr', quality: 0, qualityCap: 0, speed: 1, aspect: 'fit', seekStep: 10, autoNext: false, rememberTracks: true,
  subtitleStyle: { size: 36, color: '#ffffff', background: 0.65, shadow: true, bottom: 8 }, verifiedRates: [1] };
 root.PlayerCore = { finite: finite, clamp: clamp, copy: copy, format: format, language: language, role: role, trackKey: trackKey, matchTrack: matchTrack, pageId: pageId, content: content, emitter: emitter, safeMessage: safeMessage, mediaGate: mediaGate, audioGate: audioGate, defaults: defaults };
})(window);
