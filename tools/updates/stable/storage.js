/* Private, UTF-8 update objects. User viewing records are never accessed here. */
(function (root) {
  'use strict';
  function Store(directoryName) { this.directory = null; this.directoryName = directoryName || 'film-update'; if (!/^film-(?:update|plugins)$/.test(this.directoryName)) throw new Error('Invalid private storage namespace'); }
  Store.prototype.ready = function () {
    var self = this;
    return new Promise(function (resolve, reject) { root.tizen.filesystem.resolve('wgt-private', function (dir) { try { try { self.directory = dir.resolve(self.directoryName); } catch (ignore) { self.directory = dir.createDirectory(self.directoryName); } resolve(); } catch (e) { reject(e); } }, reject, 'rw'); });
  };
  function name(n) { if (!/^(?:obj-[a-f0-9]{64}\.txt|state-[ab]\.json)$/.test(n)) throw new Error('Güncelleme kayıt yolu geçersiz.'); return n; }
  Store.prototype.read = function (n) { var self = this; return new Promise(function (resolve, reject) { var f; try { f = self.directory.resolve(name(n)); } catch (ignore) { resolve(null); return; } f.readAsText(resolve, reject, 'UTF-8'); }); };
  Store.prototype.write = function (n, text) {
    var self = this;
    return new Promise(function (resolve, reject) { var f; try { n = name(n); try { f = self.directory.resolve(n); } catch (ignore) { f = self.directory.createFile(n); } f.openStream('w', function (stream) { try { stream.write(text); stream.close(); resolve(); } catch (e) { try { stream.close(); } catch (ignoreClose) {} reject(e); } }, reject, 'UTF-8'); } catch (e) { reject(e); } });
  };
  Store.prototype.remove = function (n) { var self = this; return new Promise(function (resolve, reject) { var f; try { f = self.directory.resolve(name(n)); } catch (ignore) { resolve(); return; } self.directory.deleteFile(f.fullPath, resolve, reject); }); };
  Store.prototype.list = function () { var self = this; return new Promise(function (resolve, reject) { self.directory.listFiles(function (files) { resolve(files.map(function (f) { return f.name; }).filter(function (n) { return /^obj-[a-f0-9]{64}\.txt$/.test(n); })); }, reject); }); };
  root.FilmUpdateStore = Store;
})(window);
