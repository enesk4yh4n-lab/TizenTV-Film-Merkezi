(function(root){
 'use strict';var P=root.DiziboxParser,BASE=P.base;
 function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads'}),{base:BASE,headers:{Accept:'text/html'}});this.links={};}
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('Dizibox dışı katalog bağlantısı reddedildi.'));return this.request(url,null,parse,force,'dizibox-'+scope);};
 Provider.prototype.home=function(force){var self=this;return this.fetch(BASE+'/',function(body){self.searchIndex=P.index(body);return P.home(body);},force,'home').then(function(v){self.links=v.links;return v;});};
 Provider.prototype.options=function(){return this.fetch(BASE+'/dizi-arsivi/',P.options,false,'options');};
 Provider.prototype.list=function(query,next,force){
  query=query||{};var f=query.filters||{},parts=[],url=next&&next.url;
  if(query.type==='movie')return Promise.resolve({cards:[],next:null});
  if(f.language)return Promise.reject(new Error('Dizibox dil filtresi sunmuyor.'));
  if(!url){url=query.url||BASE+'/dizi-arsivi/';if(f.genre)parts.push('tur%5B%5D='+encodeURIComponent(f.genre));if(f.year)parts.push('yil='+encodeURIComponent(f.year));if(f.imdb)parts.push('imdb='+encodeURIComponent(String(f.imdb).split('-')[0]));if(query.order&&query.order!=='date'){if(!/^(imdb|yorum)$/.test(query.order))return Promise.reject(new Error('Geçersiz Dizibox sıralaması.'));parts.push('orderby='+query.order);}if(parts.length)url=url.split('?')[0]+'?'+parts.join('&');}
  return this.fetch(url,function(body){return P.list(body,url);},force,'list');
 };
 /* The site's GET search times out here. Its full alphabetical menu is real site data. */
 Provider.prototype.search=function(query,force){var self=this;query=root.CatalogUtils.clean(query);if(!query||query.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));var key=query.toLocaleLowerCase().replace(/İ/g,'i').replace(/ı/g,'i').replace(/\u0307/g,''),token=this.generation;
  function select(index){if(token!==self.generation)throw new Error('İptal edildi');return {cards:index.filter(function(c){return c.title.toLocaleLowerCase().replace(/ı/g,'i').replace(/\u0307/g,'').indexOf(key)>=0;}),next:null};}
  if(this.searchIndex&&!force)return Promise.resolve(select(this.searchIndex));
  return this.fetch(BASE+'/',function(body){self.searchIndex=P.index(body);return select(self.searchIndex);},force,'search-'+query);
 };
 Provider.prototype.identity=function(card,force){return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'identity0170-detail');};
 Provider.prototype.detail=function(card,force){
  var self=this,token=this.generation;return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail').then(function(detail){
   var present={};detail.episodes.forEach(function(e){present[e.episode.season]=true;});
   return Promise.all(detail.seasonLinks.filter(function(s){return !present[s.season];}).map(function(s){return self.fetch(s.url,function(body){var episodes=P.episodes(body,detail);if(!episodes.length)throw new Error(s.season+'. sezon bölümleri alınamadı.');return {episodes:episodes};},force,'season').then(function(v){if(token!==self.generation)throw new Error('İptal edildi');return v.episodes;});})).then(function(groups){if(token!==self.generation)throw new Error('İptal edildi');var seen={};detail.episodes=[].concat.apply(detail.episodes,groups).filter(function(e){if(seen[e.contentId])return false;seen[e.contentId]=true;return true;}).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});detail.seasons=detail.episodes.map(function(e){return e.episode.season;}).filter(function(n,i,a){return a.indexOf(n)===i;});return detail;});
  });
 };
 Provider.prototype.seriesLanguage=function(){return Promise.resolve({language:''});};
 root.DiziboxProvider=Provider;
})(window);
