(function(root){
 'use strict';var P=root.HdfilmDelisiParser,BASE=P.base;
 function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads'}),{base:BASE,headers:{Accept:'text/html,application/json','User-Agent':'Mozilla/5.0'}});}
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('HDFilmDelisi dışı katalog bağlantısı reddedildi.'));return this.request(url,null,parse,force,'hdfilmdelisi0160-'+scope);};
 Provider.prototype.home=function(force){var self=this;return this.fetch(BASE+'/',function(body){self.genres=P.options(body);return P.home(body);},force,'home');};
 Provider.prototype.options=function(){var self=this;return (this.genres?Promise.resolve():this.fetch(BASE+'/',function(body){self.genres=P.options(body);return {};},false,'options')).then(function(){return {genres:self.genres,order:[{value:'date',label:'Yeni eklenenler'},{value:'views',label:'Çok izlenenler'},{value:'imdb',label:'IMDb puanı'},{value:'year_desc',label:'Yayın yılı'}]};});};
 Provider.prototype.list=function(query,next,force){
  query=query||{};var f=query.filters||{},type=query.type==='series'?'series':'movie',url,sort={date:'newest',views:'views',imdb:'imdb',year_desc:'year_desc'}[query.order||'date'];
  if(f.year||f.language||f.imdb||type==='series'&&f.genre||f.genre&&!P.genre(f.genre)||!sort)return Promise.reject(new Error('Bu katalog filtresi desteklenmiyor.'));
  if(type==='series')url=BASE+'/api/series/new?page=1';
  else if(f.genre)url=BASE+'/api/films/category/'+new root.URL(f.genre).pathname.split('/')[2]+'?page=1&sort='+sort+'&limit=20';
  else{if(query.order&&query.order!=='date')return Promise.reject(new Error('Sıralama için önce bir film türü seçin.'));url=BASE+'/';}
  if(next){var expected=new root.URL(url),actual;try{actual=new root.URL(next.url);}catch(ignore){return Promise.reject(new Error('Geçersiz devam bağlantısı.'));}if(!P.safe(next.url)||actual.pathname!==expected.pathname||!/^\d+$/.test(P.param(next.url,'page')||'')||Number(P.param(next.url,'page'))<2||P.param(next.url,'sort')!==P.param(url,'sort')||P.param(next.url,'limit')!==P.param(url,'limit'))return Promise.reject(new Error('Geçersiz devam bağlantısı.'));url=actual.href;}
  return this.fetch(url,function(body){return P.list(body,url,type);},force,'list');
 };
 Provider.prototype.search=function(query,force){query=root.CatalogUtils.clean(query);if(query.length<2||query.length>100)return Promise.reject(new Error('Arama en az 2, en fazla 100 karakter olmalı.'));return this.fetch(BASE+'/api/search?q='+encodeURIComponent(query),P.search,force,'search');};
 Provider.prototype.detail=function(card,force){if(!P.contentUrl(card.pageUrl)||/\/sezon-/.test(card.pageUrl))return Promise.reject(new Error('Geçersiz detay bağlantısı.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail');};
 Provider.prototype.seriesLanguage=function(card){return Promise.resolve({language:card.language||''});};root.HdfilmDelisiProvider=Provider;
})(window);
