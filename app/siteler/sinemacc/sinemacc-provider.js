(function (root) {
 'use strict'; var P = root.SinemaccParser, BASE = P.base;
 function Provider(cache, network) { root.CatalogClient.call(this, cache, network || root.ChainNetwork.createClient({destination:'downloads',preferXHR:true}), {base:BASE,identitySelectors:'.imdb_link[href]',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'},postHeaders:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'}}); }
 Provider.prototype = Object.create(root.CatalogClient.prototype); Provider.prototype.constructor = Provider;
 Provider.prototype.fetch = function (url, parse, force, scope, body) { if (!P.safe(url)) return Promise.reject(new Error('Sinemacc dışı istek reddedildi.')); return this.request(url, body || null, parse, force, 'sinemacc0130-' + scope); };
 Provider.prototype.home = function (force) { return this.fetch(BASE+'/', P.home, force, 'home'); };
 Provider.prototype.options = function () { var self=this; return self.filterOptions ? Promise.resolve(self.filterOptions) : self.fetch(BASE+'/film-arsivi/',P.options,false,'options').then(function (o) { self.filterOptions=o;return o; }); };
 Provider.prototype.list = function (query, next, force) {
  query=query||{};var self=this,f=query.filters||{},filtered=!!(f.genre||f.year||f.language||f.imdb),url=query.url||BASE+'/';
  if(query.type==='series')return Promise.reject(new Error('Sinemacc film kataloğu sunuyor.'));
  if(filtered) return this.options().then(function (options) {
   var values={genres:f.genre||'',years:f.year||'',lang:f.language||'',imdb:f.imdb||''};
   Object.keys(values).forEach(function (key) { if(values[key]&&!options[key].some(function(o){return o.value===String(values[key]);}))throw new Error('Sinemacc filtresi geçersiz.'); });
   var signature=JSON.stringify(values),page=next&&next.page||1;
   if(next&&(next.kind!=='sinemacc-archive'||next.signature!==signature||!isFinite(page)||page%1||page<2||page>100000))throw new Error('Geçersiz Sinemacc devam isteği.');
   var fields={action:'ajax_archive',rdil:values.lang,rdate:values.years,rtip:'',rcat:values.genres,rimdb:values.imdb.split('-')[0],sayfano:page},body=Object.keys(fields).map(function(k){return k+'='+encodeURIComponent(fields[k]);}).join('&');
   return self.fetch(BASE+'/film-arsivi/',function(body){var result=P.list(body,BASE+'/film-arsivi/',page);if(result.next)result.next.signature=signature;return result;},force,'filter',body);
  });
  if(next){if(next.kind!=='url'||!P.catalogUrl(next.url))return Promise.reject(new Error('Geçersiz Sinemacc devam bağlantısı.'));var a=new root.URL(url),b=new root.URL(next.url),m=/\/page\/(\d+)\/$/.exec(b.pathname);if(!m||Number(m[1])<2||b.pathname.replace(/page\/\d+\/$/,'')!==a.pathname.replace(/page\/\d+\/$/,'')||b.search!==a.search)return Promise.reject(new Error('Sinemacc devam bağlantısı listeyle eşleşmiyor.'));url=next.url;}
  if(!P.catalogUrl(url))return Promise.reject(new Error('Geçersiz Sinemacc katalog adresi.'));
  return this.fetch(url,function(body){return P.list(body,url);},force,'list');
 };
 Provider.prototype.search = function (query,force,next) { query=root.CatalogUtils.clean(query);if(!query||query.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));var first=BASE+'/arama/?s='+encodeURIComponent(query),url=root.CatalogSearch.pageUrl(first,next);return this.fetch(url,function(body){return root.CatalogSearch.pageResult(P.list(body,url),first,url);},force,'search'); };
 Provider.prototype.detail = function (card,force) { if(!P.movieUrl(card.pageUrl))return Promise.reject(new Error('Geçersiz Sinemacc film adresi.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail'); };
 Provider.prototype.seriesLanguage = function () { return Promise.resolve({language:''}); };
 root.SinemaccProvider=Provider;
})(window);
