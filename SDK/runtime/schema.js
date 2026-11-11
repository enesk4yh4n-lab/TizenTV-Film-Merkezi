/* Public plugin repository contract v2. Runs on Chromium 47. */
(function (root) {
  'use strict';
  var V = root.FilmUpdateVerify;
  function id(s) { return typeof s === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(s); }
  function version(s) { return typeof s === 'string' && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(s); }
  function compare(a, b) { var x = a.split('.'), y = b.split('.'), i; for (i = 0; i < 3; i++) if (+x[i] !== +y[i]) return +x[i] > +y[i] ? 1 : -1; return 0; }
  function text(s, max) { return typeof s === 'string' && s.length > 0 && s.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s); }
  function file(s) { return typeof s === 'string' && s.length < 180 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(?:js|json|txt)$/.test(s) && s.split('/').every(function (p) { return p && p !== '.' && p !== '..'; }) && !/^(?:bootstrap|tools|vendor|ortak)\//.test(s); }
  function address(value) {
    var u;
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\%]/.test(value)) throw new Error('Geçerli bir HTTPS depo adresi girin.');
    try { u = new root.URL(value); } catch (e) { throw new Error('Geçerli bir HTTPS depo adresi girin.'); }
    if (u.hostname === 'github.com') {
      var parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 5 && (parts[2] === 'blob' || parts[2] === 'tree')) value = 'https://raw.githubusercontent.com/' + parts.slice(0, 2).concat(parts.slice(3)).join('/');
      else if (parts.length === 2) value = 'https://raw.githubusercontent.com/' + parts.join('/') + '/main/filmmerkezi-repository.json';
      u = new root.URL(value);
    }
    V.networkPolicy('FILM-MERKEZI-ORIGINS-1\nhttps://' + u.hostname + '\n');
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash || /(?:^|\/)\.\.?\//.test(value)) throw new Error('Depo adresi HTTPS olmalı; parola, port veya sorgu içermemeli.');
    if (u.pathname.slice(-1) === '/') u.pathname += 'filmmerkezi-repository.json';
    if (!/\/filmmerkezi-repository\.json$/.test(u.pathname) || !/^[a-zA-Z0-9_./-]+$/.test(u.pathname)) throw new Error('Adres filmmerkezi-repository.json dosyasını göstermeli.');
    return u.href;
  }
  function repository(raw) {
    if (typeof raw !== 'string' || V.bytes(raw).length > 65536) throw new Error('Depo listesi boyutu geçersiz.');
    var r = JSON.parse(raw), seen = {};
    if (!r || r.schemaVersion !== 2 || !id(r.id) || !text(r.name, 120) || typeof r.publicKey !== 'string' || !/^[A-Za-z0-9+/=]{300,800}$/.test(r.publicKey) || typeof r.revision !== 'number' || r.revision < 1 || r.revision % 1 || r.revision > 2147483647 || !Array.isArray(r.plugins) || r.plugins.length > 128) throw new Error('Eklenti deposunun biçimi geçersiz.');
    r.plugins.forEach(function (p) { if (!p || !id(p.id) || seen[p.id] || !version(p.version) || ['site', 'resolver'].indexOf(p.type) < 0 || !text(p.name, 120) || p.description && !text(p.description, 800) || p.manifest !== 'packages/' + p.id + '/' + p.version + '/manifest.json' || !/^[a-f0-9]{64}$/.test(p.manifestSha256)) throw new Error('Depodaki eklenti kaydı geçersiz.'); seen[p.id] = true; });
    return r;
  }
  function manifest(raw, app) {
    if (typeof raw !== 'string' || V.bytes(raw).length > 16384) throw new Error('Eklenti manifesti çok büyük.');
    var m = JSON.parse(raw), seen = {}, total = 0;
    if (!m || m.schemaVersion !== 2 || m.apiVersion !== 2) throw new Error('New plugin version required / Yeni eklenti surumu gerekiyor');
    if (!id(m.id) || ['site', 'resolver'].indexOf(m.type) < 0 || !version(m.version) || !version(m.minAppVersion) || compare(app, m.minAppVersion) < 0 || !version(m.minCoreVersion) || !text(m.name, 120) || !Array.isArray(m.dependencies) || m.dependencies.length > 16 || !Array.isArray(m.files) || !m.files.length || m.files.length > 40 || !Array.isArray(m.modules) || !m.modules.length || m.modules.length > 20) throw new Error('Invalid package API v2 manifest');
    if (m.type === 'site') {
      if (!m.site || !id(m.site.id) || m.site.prefix !== m.site.id + ':' || !text(m.site.name, 120)) throw new Error('Invalid site identity');
      V.networkPolicy('FILM-MERKEZI-ORIGINS-1\n' + new root.URL(m.site.base).origin + '\n');
      if (m.site.base !== new root.URL(m.site.base).origin) throw new Error('Invalid site origin');
    } else if (m.site !== undefined) throw new Error('Resolver packages cannot register sites');
    var dependencies = {};
    m.dependencies.forEach(function (d) {
      var key = d && d.publisher + '/' + d.id;
      if (!d || !/^[a-f0-9]{64}$/.test(d.publisher) || !id(d.id) || !version(d.minVersion) || !version(d.maxVersion) || compare(d.minVersion, d.maxVersion) >= 0 || dependencies[key]) throw new Error('Invalid dependency');
      dependencies[key] = true;
    });
    m.files.forEach(function (f) { if (!f || !file(f.path) || seen[f.path] || !/^[a-f0-9]{64}$/.test(f.sha256) || typeof f.size !== 'number' || f.size < 0 || f.size % 1 || f.size > 1048576) throw new Error('Eklenti dosyası geçersiz.'); seen[f.path] = f; total += f.size; });
    if (total > 4194304 || !m.networkPolicy || !seen[m.networkPolicy.file] || !seen[m.networkPolicy.signature] || !/\.txt$/.test(m.networkPolicy.file) || !/\.txt$/.test(m.networkPolicy.signature)) throw new Error('Eklenti boyutu veya ağ izinleri geçersiz.');
    var modules = {};
    m.modules.forEach(function (p) { if (!seen[p] || modules[p] || !/\.js$/.test(p)) throw new Error('Eklenti yükleme sırası geçersiz.'); modules[p] = true; });
    return m;
  }
  function fingerprint(publicKey) { var s = root.atob(publicKey), a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return root.crypto.subtle.digest({ name: 'SHA-256' }, a).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  root.FilmPluginSchema = { id: id, version: version, compare: compare, address: address, repository: repository, manifest: manifest, fingerprint: fingerprint, file: file };
})(window);
