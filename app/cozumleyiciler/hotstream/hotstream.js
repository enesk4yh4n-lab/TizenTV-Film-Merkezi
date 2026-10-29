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
 function frames(body, page) {
  var html = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/\ssrc\s*=/gi, ' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  var d = new DOMParser().parseFromString(html, 'text/html'), result = [];
  Array.prototype.forEach.call(d.querySelectorAll('iframe'), function (frame) { var url = root.CatalogUtils.url(frame.getAttribute('data-litespeed-src') || frame.getAttribute('data-frame-src'), page); if (/^https:\/\/hotstream\.club\/embed\/[A-Za-z0-9]+\/?$/.test(url) && result.indexOf(url) < 0) result.push(url); }); return result;
 }
root.Hotstream={settings:settings,frames:frames};})(window);