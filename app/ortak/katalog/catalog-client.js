(function(root){'use strict';
 function Provider(cache, network, config) { this.cache=cache;this.network=network||root.ChainNetwork.createClient();this.config=config||{};this.generation=0;this.queue=[];this.active=0;this.timers=[]; }
 Provider.prototype.cancel = function () { this.generation++; this.network.cancel(); this.timers.forEach(clearTimeout); this.timers = []; this.queue.splice(0).forEach(function (job) { job.reject(new Error('İptal edildi')); }); };
 Provider.prototype.pump = function () { while (this.active < 2 && this.queue.length) this.queue.shift().run(); };
 Provider.prototype.request = function (url, body, parse, force, scope) {
  var self = this, token = this.generation, key = (scope || 'list') + '|' + url + (body ? '|' + JSON.stringify(body) : ''), cached = this.cache.get(key), started = Date.now();
  if (cached && !cached.stale && !force) { cached.value.fetchedAt = cached.at; return Promise.resolve(cached.value); }
  return new Promise(function (resolve, reject) {
   var done = false, timer, job = { reject: function (error) { finish(error); }, run: function () {
    if (done) return; if (token !== self.generation) return finish(new Error('İptal edildi'));
    self.active++; job.running = true;
    var headers = {};Object.keys(self.config.headers||{}).forEach(function(key){headers[key]=self.config.headers[key];});
    if(body)Object.keys(self.config.postHeaders||{}).forEach(function(key){headers[key]=self.config.postHeaders[key];});
    (body ? self.network.post(url, body, headers) : self.network.get(url, (self.config.base || "") + '/', headers)).then(function (response) {
     if (token !== self.generation) return finish(new Error('İptal edildi')); if (done) return;
     try { var value = parse(response.body);
      if (root.ContentIdentity && /(?:^|[-])detail$/.test(scope || '') && value.pageUrl === url) { var identity = root.ContentIdentity.fromPage(response.body, url, self.config.identitySelectors); if (identity.imdbId) value.imdbId = identity.imdbId; }
      value.fetchedAt = Date.now(); self.cache.put(key, value); finish(null, value); } catch (e) { finish(e); }
    }, function (e) { finish(e); });
   } };
   function finish(error, value) {
    if (done) return; done = true; clearTimeout(timer); var i = self.timers.indexOf(timer); if (i >= 0) self.timers.splice(i, 1);
    if (job.running) self.active--; else { i = self.queue.indexOf(job); if (i >= 0) self.queue.splice(i, 1); }
    if (error && cached && token === self.generation && !/ptal/.test(error.message)) { value = cached.value; value.staleAt = cached.at; value.refreshError = error.message; error = null; }
    if (error) reject(error); else resolve(value); self.pump();
   }
   /* Includes queueing and both transport attempts; one interaction cannot hang indefinitely. */
   timer = setTimeout(function () { if (token === self.generation) self.network.cancel(); finish(new Error('Katalog isteği 30 saniyede tamamlanamadı.')); }, Math.max(1, Math.min(started + 30000, self.deadline || Infinity) - Date.now()));
   self.timers.push(timer); self.queue.push(job); self.pump();
  });
 };
root.CatalogClient=Provider;})(window);

/* Search cursors belong to one exact query and a page actually advertised by that provider. */
(function(root){
 'use strict';
 function query(url){var u=new root.URL(url);return u.search.slice(1).split('&').filter(function(p){return p&&!/^(?:page|paged|sayfa)=/.test(p);}).sort().join('&');}
 function allowed(first,url){var a,b;try{a=new root.URL(first);b=new root.URL(url);}catch(ignore){return false;}if(a.origin!==b.origin||b.username||b.password||query(first)!==query(url))return false;var base=a.pathname.replace(/(?:page|sayfa)\/\d+\/?$/,'');return b.pathname===a.pathname||b.pathname.replace(/(?:page|sayfa)\/\d+\/?$/,'')===base;}
 function page(first,next){if(!next)return first;if(next.searchKey!==first||!allowed(first,next.url))throw new Error('Arama devam bağlantısı bu sorguyla eşleşmiyor.');return next.url;}
 function result(value,first,current){if(value.next){if(value.next.url===current||!allowed(first,value.next.url))value.next=null;else value.next.searchKey=first;}return value;}
 root.CatalogSearch={pageUrl:page,pageResult:result};
})(window);
