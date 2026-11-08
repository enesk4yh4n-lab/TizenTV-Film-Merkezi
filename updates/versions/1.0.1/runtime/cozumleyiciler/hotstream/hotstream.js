(function(root){'use strict';function fail(stage,message){var e=new Error(message);e.stage=stage;return e;}
 function settings(body) {
  var m = /\bbePlayer\s*\(\s*'([^']{1,512})'\s*,\s*'([^']{1,1048576})'/.exec(body);
  if (!m) throw fail('decode', 'Hotstream ayar biçimi tanınamadı.');
  try {
   var C = root.CryptoJS, value = JSON.parse(m[2]);
   if (!/^[0-9a-f]{16}$/i.test(value.s) || !/^[0-9a-f]{32}$/i.test(value.iv) || typeof value.ct !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(value.ct)) throw new Error();
   var format = { parse: function () { return C.lib.CipherParams.create({ ciphertext: C.enc.Base64.parse(value.ct), iv: C.enc.Hex.parse(value.iv), salt: C.enc.Hex.parse(value.s) }); } };
   var data = JSON.parse(C.AES.decrypt(m[2], m[1], { format: format }).toString(C.enc.Utf8));
   if (!data || typeof data.video_location !== 'string' || !/^https:\/\/hotstream\.club\/list\//.test(data.video_location)) throw new Error();
   return { url: data.video_location, title: typeof data.title === 'string' ? data.title : '' };
  } catch (e) { throw fail('decode', 'Hotstream ayar verisi çözülemedi.'); }
 }
 function documentData(body) {
  var html = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/\ssrc\s*=/gi, ' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return new DOMParser().parseFromString(html, 'text/html');
 }
 function frames(body, page) {
  var d = documentData(body), result = [];
  Array.prototype.forEach.call(d.querySelectorAll('iframe'), function (frame) { var url = root.CatalogUtils.url(frame.getAttribute('data-litespeed-src') || frame.getAttribute('data-frame-src'), page); if (/^https:\/\/hotstream\.club\/embed\/[A-Za-z0-9]+\/?$/.test(url) && result.indexOf(url) < 0) result.push(url); }); return result;
 }
 function moviePages(body, page) {
  if (root.SiteAddresses) page = root.SiteAddresses.resolve(page);
  var current = new root.URL(page), match = /^(\/[^/]+\/)(?:([1-9]\d*)\/)?$/.exec(current.pathname), number = match && Number(match[2]) || 1;
  var result = [{ url: page, number: number }], d = documentData(body), seen = {};
  if (!match || current.origin !== (root.SiteAddresses ? root.SiteAddresses.base('filmizle', 'https://filmizle.ink') : 'https://filmizle.ink') || d.querySelector('.p-v12-meta-info a[href*="/dizi-izle/"]') || /\b[1-9]\d*\s*\.?\s*Sezon\b/i.test((d.querySelector('.p-v12-main-title') || {}).textContent || '')) return result;
  seen[number] = true;
  Array.prototype.forEach.call(d.querySelectorAll('.p-v12-ep-list a.post-page-numbers'), function (a) {
   var value = root.CatalogUtils.url(a.getAttribute('href'), page), u, n = Number(root.CatalogUtils.clean(a.textContent));
   try { u = new root.URL(value); } catch (ignore) { return; }
   if (u.origin !== current.origin || u.username || u.password || u.search || u.hash || n < 1 || n > 12 || n % 1 || u.pathname !== match[1] + (n === 1 ? '' : n + '/') || seen[n]) return;
   seen[n] = true; result.push({ url: u.href, number: n });
  });
  return result;
 }
root.Hotstream={settings:settings,frames:frames,moviePages:moviePages};})(window);
