/* Fixed update trust boundary; downloaded modules are always verified before use. */
(function (root) {
  'use strict';
  function bytes(text) {
    var value = unescape(encodeURIComponent(text)), out = new Uint8Array(value.length), i;
    for (i = 0; i < value.length; i++) out[i] = value.charCodeAt(i);
    return out;
  }
  function binary(value) { var s = root.atob(value), a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function hex(buffer) { return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function sha(text) { return root.crypto.subtle.digest({ name: 'SHA-256' }, bytes(text)).then(hex); }
  function Trust(publicKey) { this.key = root.crypto.subtle.importKey('spki', binary(publicKey), { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } }, false, ['verify']); }
  Trust.prototype.verify = function (text, signature) {
    if (typeof text !== 'string' || typeof signature !== 'string' || !/^[A-Za-z0-9+/=\r\n]+$/.test(signature)) return Promise.reject(new Error('Güncelleme imzası geçersiz.'));
    return this.key.then(function (key) { return root.crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, binary(signature.replace(/\s/g, '')), bytes(text)); }).then(function (valid) { if (!valid) throw new Error('Güncelleme imzası doğrulanamadı.'); return text; });
  };
  function version(v) { return typeof v === 'string' && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(v); }
  function compatible(min, actual) { var a = min.split('.'), b = actual.split('.'), i; for (i = 0; i < 3; i++) { if (+b[i] > +a[i]) return true; if (+b[i] < +a[i]) return false; } return true; }
  function path(value) { return typeof value === 'string' && value.length < 220 && /^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(value) && value.split('/').every(function (s) { return s && s !== '.' && s !== '..'; }) && (value === 'LICENSE' || /\.(?:js|css|html|json|md|txt)$/.test(value)) && !/^(?:config\.xml|update-|bootstrap\/|ortak\/ag\/native\/|tools\/)/.test(value); }
  function pointer(text, app) {
    var p = JSON.parse(text);
    if (!p || p.schemaVersion !== 1 || p.channel !== 'stable' || !version(p.updateVersion) || !version(p.minAppVersion) || !compatible(p.minAppVersion, app) || typeof p.revision !== 'number' || p.revision < 1 || p.revision % 1 || p.revision > 2147483647 || p.manifest !== 'versions/' + p.updateVersion + '/manifest.json' || !/^[a-f0-9]{64}$/.test(p.manifestSha256)) throw new Error('Güncelleme bu uygulamayla uyumlu değil.');
    return p;
  }
  function manifest(text, app) {
    var m = JSON.parse(text), seen = {}, total = 0;
    if (!m || m.schemaVersion !== 1 || m.loaderVersion !== 1 || !version(m.version) || !version(m.minAppVersion) || !compatible(m.minAppVersion, app) || !Array.isArray(m.files) || !m.files.length || m.files.length > 256 || !Array.isArray(m.scripts) || !Array.isArray(m.styles)) throw new Error('Bileşen manifesti geçersiz.');
    m.files.forEach(function (f) { if (!f || !path(f.path) || seen[f.path] || !/^[a-f0-9]{64}$/.test(f.sha256) || typeof f.size !== 'number' || f.size < 0 || f.size % 1 || f.size > 2097152) throw new Error('Bileşen dosyası geçersiz.'); seen[f.path] = f; total += f.size; });
    if (total > 8388608 || !seen[m.shell] || !/\.html$/.test(m.shell) || !seen[m.sites]) throw new Error('Bileşen boyutu veya girişleri geçersiz.');
    if (m.legacyTextOrigins !== undefined) {
      if (!Array.isArray(m.legacyTextOrigins) || m.legacyTextOrigins.length > 128) throw new Error('Metin taşıma tercihi geçersiz.');
      m.legacyTextOrigins.forEach(function (origin) { var u = new root.URL(origin); if (u.origin !== origin || !policyHost(u.hostname) || origin.indexOf('{n}') >= 0) throw new Error('Metin taşıma kökeni geçersiz.'); networkPolicy('FILM-MERKEZI-ORIGINS-1\n' + origin + '\n'); });
    }
    if (m.nativeTransport !== undefined && m.nativeTransport !== 1) throw new Error('Native TLS sürümü uyumsuz.');
    if (m.nativeTransport === 1 && (!m.networkPolicy || !seen[m.networkPolicy.file] || !seen[m.networkPolicy.signature] || !/\.txt$/.test(m.networkPolicy.file) || !/\.txt$/.test(m.networkPolicy.signature))) throw new Error('İmzalı TLS izin dosyaları eksik.');
    var entries = {};
    m.scripts.concat(m.styles).forEach(function (p) { if (!seen[p] || entries[p]) throw new Error('Bileşen yükleme sırası geçersiz.'); entries[p] = true; });
    if (m.scripts.some(function (p) { return !/\.js$/.test(p); }) || m.styles.some(function (p) { return !/\.css$/.test(p); })) throw new Error('Bileşen dosya türü geçersiz.');
    return m;
  }
  function sites(text, m) {
    var value = JSON.parse(text), seen = {}, known = {};
    m.files.forEach(function (f) { known[f.path] = true; });
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.sites) || value.sites.length > 128) throw new Error('Site listesi geçersiz.');
    return value.sites.map(function (s) { if (!s || !/^[a-z][a-z0-9-]{0,63}$/.test(s.id) || seen[s.id] || !Array.isArray(s.modules) || !s.modules.length || s.modules.length > 20) throw new Error('Site kaydı geçersiz.'); seen[s.id] = true; s.modules.forEach(function (p) { if (!known[p] || !/\.js$/.test(p)) throw new Error('Site modülü eksik.'); }); return s.modules; });
  }
  function policyHost(host) {
    if (typeof host !== 'string') return '';
    var marker = host.indexOf('{n}');
    if (marker >= 0 && (host.lastIndexOf('{n}') !== marker || marker >= host.lastIndexOf('.'))) return '';
    var sample = marker < 0 ? host : host.replace('{n}', '000000');
    if (sample.length > 253 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(sample) || /^[0-9.]+$/.test(sample) || /(?:^|\.)(?:localhost|local)$/.test(sample) || sample.split('.').some(function (s) { return s.length > 63; })) return '';
    return sample;
  }
  function policyMatch(host, pattern) {
    if (!policyHost(host) || host.indexOf('{n}') >= 0) return false;
    var wildcard = pattern.slice(0, 2) === '*.';
    pattern = wildcard ? pattern.slice(2) : pattern;
    if (!policyHost(pattern)) return false;
    function exact(value) {
      var marker = pattern.indexOf('{n}');
      if (marker < 0) return value === pattern;
      var prefix = pattern.slice(0, marker), suffix = pattern.slice(marker + 3), count = value.length - prefix.length - suffix.length;
      return count >= 1 && count <= 6 && value.slice(0, prefix.length) === prefix && value.slice(value.length - suffix.length) === suffix && /^[0-9]+$/.test(value.substr(prefix.length, count));
    }
    if (!wildcard) return exact(host);
    for (var i = host.indexOf('.'); i >= 0; i = host.indexOf('.', i + 1)) if (exact(host.slice(i + 1))) return true;
    return false;
  }
  function networkPolicy(text) {
    if (typeof text !== 'string' || bytes(text).length > 16384 || text.indexOf('FILM-MERKEZI-ORIGINS-1\n') !== 0 || /\r|\uFEFF/.test(text) || text.slice(-1) !== '\n') throw new Error('TLS izin belgesi geçersiz.');
    var rows = text.split('\n').slice(1, -1), seen = {};
    if (!rows.length || rows.length > 128) throw new Error('TLS izin sayısı geçersiz.');
    rows.forEach(function (origin) { var host = origin.replace(/^https:\/\/(?:\*\.)?/, ''); if (origin.indexOf('https://') !== 0 || !policyHost(host) || seen[origin]) throw new Error('TLS origin izni geçersiz.'); seen[origin] = true; });
    return rows;
  }
  root.FilmUpdateVerify = { Trust: Trust, bytes: bytes, sha: sha, pointer: pointer, manifest: manifest, sites: sites, networkPolicy: networkPolicy, policyMatch: policyMatch };
})(window);
