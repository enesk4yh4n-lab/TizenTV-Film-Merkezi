(function (root) {
 'use strict';
 function Images() { this.limit = 8 * 1024 * 1024; this.bytes = 0; this.cache = {}; this.queue = []; this.jobs = {}; this.active = 0; this.generation = 0; this.policy = { preferred: root.tizen ? 'native' : 'xhr' }; }
 Images.prototype.stop = function () { this.generation++; this.queue = []; var jobs = this.jobs; Object.keys(jobs).forEach(function (key) { if (jobs[key].request) jobs[key].request.cancel(); }); this.jobs = {}; };
 Images.prototype.clear = function () { this.stop(); var self = this; Object.keys(this.cache).forEach(function (key) { root.URL.revokeObjectURL(self.cache[key].url); }); this.cache = {}; this.bytes = 0; };
 Images.prototype.put = function (key, data) {
  var b = new Uint8Array(data), mime = b[0] === 255 && b[1] === 216 ? 'image/jpeg' : b[0] === 137 && b[1] === 80 ? 'image/png' : b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69 ? 'image/webp' : '';
  if (!mime || data.byteLength > 2 * 1024 * 1024) throw new Error('Afiş biçimi desteklenmiyor.');
  var self = this, keys = Object.keys(this.cache).sort(function (a, c) { return self.cache[a].at - self.cache[c].at; });
  while (this.bytes + data.byteLength > this.limit && keys.length) { var old = keys.shift(); this.bytes -= this.cache[old].bytes; root.URL.revokeObjectURL(this.cache[old].url); delete this.cache[old]; }
  var item = { url: root.URL.createObjectURL(new Blob([data], { type: mime })), bytes: data.byteLength, at: Date.now() }; this.cache[key] = item; this.bytes += item.bytes; return item;
 };
 Images.prototype.bind = function (img, url) {
  var self = this, item = this.cache[url]; if (!url) return;
  function show(value) { if (!document.contains(img)) return; img.onload = function () { img.style.opacity = '1'; }; img.onerror = function () { img.style.opacity = '0'; img.setAttribute('data-image-error', '1'); }; img.src = value.url; }
  if (item) { item.at = Date.now(); show(item); return; }
  if (this.jobs[url]) { this.jobs[url].listeners.push(show); return; }
  var job = { url: url, listeners: [show], token: this.generation, queuedAt: Date.now() }; this.jobs[url] = job; this.queue.push(job); this.pump();
 };
 Images.prototype.pump = function () {
  var self = this;
  while (this.active < 3 && this.queue.length) (function (job) {
   if (job.token !== self.generation) return; self.active++;
   job.request = root.MediaNetwork.request(job.url, { kind: 'image', binary: true, referer: root.CatalogParser.base + '/', byteLimit: 2 * 1024 * 1024, timeoutMs: 10000, deadline: job.queuedAt + 30000, policy: self.policy });
   job.request.promise.then(function (response) { if (job.token !== self.generation) return; var item = self.put(job.url, response.data); job.listeners.forEach(function (fn) { fn(item); }); }).catch(function () {}).then(function () { self.active--; if (self.jobs[job.url] === job) delete self.jobs[job.url]; self.pump(); });
  })(this.queue.shift());
 };
 Images.prototype.visible = function (container) {
  var self = this, viewport = container.getBoundingClientRect();
  Array.prototype.forEach.call(container.querySelectorAll('img[data-art]'), function (img) {
   if (img.getAttribute('data-art-bound')) return; var r = img.getBoundingClientRect();
   if (r.bottom >= viewport.top - 100 && r.top <= viewport.bottom + 100 && r.right >= viewport.left && r.left <= viewport.right) { img.setAttribute('data-art-bound', '1'); self.bind(img, img.getAttribute('data-art')); }
  });
 };
 root.CatalogImages = Images;
})(window);
