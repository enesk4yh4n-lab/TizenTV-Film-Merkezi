/* A channel can move only through a bounded, dual-signed chain rooted in the WGT. */
(function (root) {
  'use strict';
  var V = root.FilmUpdateVerify;
  function address(value) {
    if (typeof value !== 'string' || value.length > 1800 || !/^https:\/\/[a-z0-9.-]+\/[A-Za-z0-9_/-]+$/.test(value) || /\.\.|\/\//.test(value.slice(8)) || /\/$/.test(value)) throw new Error('Geçiş adresi güvenli bir HTTPS dizini olmalı.');
    var u = new root.URL(value);
    if (u.href !== value || !V.policyMatch(u.hostname, u.hostname)) throw new Error('Geçiş adresi geçersiz.');
    return value;
  }
  function Channel(config) { this.anchor = { channel: config.channel, publicKey: config.publicKey, sequence: 0 }; this.current = this.anchor; this.keys = [config.publicKey]; this.chain = []; this.appVersion = config.appVersion; }
  Channel.prototype.next = function (record) {
    var self = this, p;
    if (this.chain.length >= 8 || !record || typeof record.text !== 'string' || record.text.length > 8192) return Promise.reject(new Error('Geçiş zinciri sınırı veya kaydı geçersiz.'));
    return new V.Trust(this.current.publicKey).verify(record.text, record.signature).then(function () {
      p = JSON.parse(record.text);
      if (!p || p.schemaVersion !== 1 || p.kind !== 'film-core-channel' || p.sequence !== self.current.sequence + 1 || p.fromChannel !== self.current.channel || p.fromKey !== self.current.publicKey || !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(p.minAppVersion || '') || !V.compatible(p.minAppVersion, self.appVersion) || typeof p.publicKey !== 'string' || p.publicKey.length > 800 || !/^[A-Za-z0-9+/=]+$/.test(p.publicKey) || typeof p.minRevision !== 'number' || p.minRevision < 1 || p.minRevision % 1 || p.minRevision > 2147483647) throw new Error('Geçiş kaydı bu kanal veya uygulamayla eşleşmiyor.');
      address(p.channel);
      var trust = new V.Trust(p.publicKey);
      return trust.key.then(function (key) { if (key.algorithm.modulusLength !== 2048) throw new Error('Geçiş RSA-2048 anahtarı gerektirir.'); return trust.verify(record.text, record.newSignature); });
    }).then(function () { return p; });
  };
  Channel.prototype.restore = function (records) {
    var self = this, task = Promise.resolve();
    if (!Array.isArray(records) || records.length > 8) return Promise.reject(new Error('Geçiş zinciri okunamadı.'));
    records.forEach(function (record) { task = task.then(function () { return self.next(record); }).then(function (p) { self.current = p; self.chain.push(record); if (self.keys.indexOf(p.publicKey) < 0) self.keys.push(p.publicKey); }); });
    return task;
  };
  Channel.prototype.verifyRecord = function (record) {
    var self = this, i = this.keys.length - 1;
    function attempt() { if (i < 0) return Promise.reject(new Error('Bileşen imzası güvenilen yayıncılarla eşleşmiyor.')); var key = self.keys[i--]; return new V.Trust(key).verify(record.text, record.signature).then(function () { return key; }, attempt); }
    return attempt();
  };
  root.FilmCoreChannel = Channel;
})(window);
