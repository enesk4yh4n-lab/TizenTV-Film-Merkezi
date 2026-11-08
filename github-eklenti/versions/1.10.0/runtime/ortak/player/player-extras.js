(function (root) {
 'use strict'; var C = root.PlayerCore;
 function Episodes(content) { this.content = content; this.list = content.episodes || []; this.index = -1; for (var i = 0; i < this.list.length; i++) if (String(this.list[i].contentId) === content.contentId) this.index = i; }
 Episodes.prototype.next = function () { return this.content.nextEpisode || (this.index >= 0 ? this.list[this.index + 1] : null) || null; };
 Episodes.prototype.previous = function () { return this.content.previousEpisode || (this.index > 0 ? this.list[this.index - 1] : null) || null; };
 Episodes.prototype.decorate = function (episode) { var c = C.copy(episode); if (!c.episodes) c.episodes = this.list; return c; };
 function Loop() { this.a = null; this.b = null; this.pending = false; }
 Loop.prototype.mark = function (time, duration) { if (!C.finite(time) || !C.finite(duration) || duration <= 0) return false; if (this.a === null) { this.a = C.clamp(time, 0, duration); return true; } if (time < this.a + 1) return false; this.b = C.clamp(time, 0, duration); return this.b > this.a; };
 Loop.prototype.target = function (time) { if (this.b !== null && time >= this.b && !this.pending) { this.pending = true; return this.a; } if (this.a !== null && time < this.b - 0.1) this.pending = false; return null; };
 function Thumbnail() { this.generation = 0; this.cues = []; this.job = null; this.url = null; this.lastKey = ''; this.imagePlayer = null; this.imageHls = null; this.lastImageTarget = null; this.failures = 0; this.failedAt = 0; }
 Thumbnail.prototype.clear = function () { this.generation++; if (this.job) this.job.cancel(); this.job = null; this.cues = [];this.grid=null; if (this.url) root.URL.revokeObjectURL(this.url); this.url = null; this.lastKey = ''; if (this.imagePlayer) { try { this.imagePlayer.destroy(); } catch (ignore) {} } this.imagePlayer = null; this.imageHls = null; this.lastImageTarget = null; this.failures = 0; this.failedAt = 0; };
 Thumbnail.prototype.load = function (metadata, source) {
  this.clear(); if(metadata&&metadata.type==='grid'){var m=metadata,keys=['count','cols','rows','width','height','interval'];if(!keys.every(function(k){return C.finite(m[k])&&m[k]>0;})||m.count%1||m.cols%1||m.rows%1||m.count>3600||m.cols*m.rows<m.count||m.width*m.cols>8192||m.height*m.rows>8192||m.width*m.cols*m.height*m.rows>16000000||!/^https?:\/\//i.test(m.url||''))return Promise.resolve(false);this.grid=C.copy(m);this.source=source;this.base=m.url;for(var i=0;i<m.count;i++)this.cues.push({start:i*m.interval,end:(i+1)*m.interval,text:m.url+'#xywh='+((i%m.cols)*m.width)+','+(Math.floor(i/m.cols)*m.height)+','+m.width+','+m.height});return Promise.resolve(true);}if (!metadata || !metadata.url || metadata.type !== 'vtt') return Promise.resolve(false);
  var self = this, token = self.generation; self.source = source; self.base = metadata.url;
  self.job = root.MediaNetwork.request(metadata.url, { kind: 'thumbnail-vtt', policy: source.policy, referer: source.referer, timeoutMs: 8000 });
  return self.job.promise.then(function (r) { if (token !== self.generation) return false; self.cues = root.SubtitleParser.parse(r.data, true); self.base = r.url; return true; }).catch(function () { return false; });
 };
 Thumbnail.prototype.imageAt = function (time, node) {
  var self = this, h = self.engine && self.engine.hls;
  if (!h || !h.createImageIFramePlayer || !h.iframeVariants || !h.iframeVariants.length || self.failures >= 2 || Date.now() - self.failedAt < 10000) return;
  if (self.imageHls !== h) {
   if (self.imagePlayer) { try { self.imagePlayer.destroy(); } catch (ignore) {} }
   self.imageHls = h; self.imagePlayer = h.createImageIFramePlayer({ iframeCacheLimit: 2 * 1024 * 1024, loader: root.NativeHlsLoader.create({ policy: self.engine.policy, referer: self.engine.source.referer, byteLimit: 2 * 1024 * 1024 }) });
   if (!self.imagePlayer) return;
   var img = document.createElement('img'); img.style.width = '320px'; img.style.height = '180px'; img.style.objectFit = 'contain'; while (node.firstChild) node.removeChild(node.firstChild); node.appendChild(img); node.style.backgroundImage = 'none';
   self.imagePlayer.attachImage(img); self.imagePlayer.on(root.Hls.Events.FRAG_BUFFERED, function () { if (self.imageHls !== h) return; node.style.display = 'block'; node.style.width = '320px'; node.style.height = '180px'; });
   self.imagePlayer.on(root.Hls.Events.ERROR, function () { self.failures++; self.failedAt = Date.now(); self.lastImageTarget = null; node.style.display = 'none'; });
  }
  if (self.imagePlayer && self.lastImageTarget !== time) { self.lastImageTarget = time; self.imagePlayer.loadMediaAt(time); }
 };
 Thumbnail.prototype.at = function (time, node) {
  var self = this, cue = self.cues.filter(function (c) { return time >= c.start && time < c.end; })[0];
  if (!cue) { if (!self.imagePlayer) node.style.display = 'none'; self.imageAt(time, node); return; }
  if (self.failures >= 2 || Date.now() - self.failedAt < 10000) return;
  var match = /^(\S+?)(?:#xywh=(\d+),(\d+),(\d+),(\d+))?$/.exec(cue.text); if (!match) return;
  var url; try { url = new root.URL(match[1], self.base).href; } catch (e) { return; } if (!/^https?:\/\//i.test(url)) return;
  self.currentMatch = match;
  function paint() { if (!self.url) return; var frame = self.currentMatch,scale=self.grid?Math.min(4,480/self.grid.width,270/self.grid.height):1;node.style.backgroundSize=self.grid?(self.grid.cols*self.grid.width*scale)+'px '+(self.grid.rows*self.grid.height*scale)+'px':'auto'; node.style.display = 'block'; node.style.backgroundImage = 'url("' + self.url + '")'; node.style.width = (frame[4] ? Math.min(480, Number(frame[4])*scale) : 320) + 'px'; node.style.height = (frame[5] ? Math.min(270, Number(frame[5])*scale) : 180) + 'px'; node.style.backgroundPosition = '-' + ((Number(frame[2]) || 0)*scale) + 'px -' + ((Number(frame[3]) || 0)*scale) + 'px'; }
  if (self.lastKey === url) { paint(); return; } if (self.job) self.job.cancel(); if (self.url) root.URL.revokeObjectURL(self.url); self.url = null; self.lastKey = url; var token = ++self.generation;
  self.job = root.MediaNetwork.request(url, { binary: true, kind: 'image', policy: self.source.policy, referer: self.source.referer, byteLimit: 2 * 1024 * 1024, timeoutMs: 5000 });
  self.job.promise.then(function (r) { if (token !== self.generation) return; var bytes = new Uint8Array(r.data), jpeg = bytes[0] === 255 && bytes[1] === 216, png = bytes[0] === 137 && bytes[1] === 80; if (!jpeg && !png) throw new Error('Önizleme görseli desteklenmiyor'); if (self.url) root.URL.revokeObjectURL(self.url); self.url = root.URL.createObjectURL(new root.Blob([r.data], { type: jpeg ? 'image/jpeg' : 'image/png' })); paint(); }).catch(function () { if (token === self.generation) { self.failures++; self.failedAt = Date.now(); self.lastKey = ''; node.style.display = 'none'; } });
 };
 root.PlayerEpisodes = Episodes; root.PlayerLoop = Loop; root.PlayerThumbnail = Thumbnail;
})(window);
