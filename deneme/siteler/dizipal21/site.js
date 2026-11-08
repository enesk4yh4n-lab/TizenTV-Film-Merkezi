/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "dizipal21",
  "name": "Dizipal Orijinal",
  "base": "https://dizipalorijinal21.vip",
  "series": /^\/dizi\/[^/]+\/?$/,
  "episode": /^\/bolum\/[^/]+\/?$/,
  "movie": /^\/film\/[^/]+\/?$/,
  "listPath": "/diziler",
  "movieList": "/filmler",
  "searchPath": "/arama?q=",
  "cards": ".ip-trend-card a, a[href^=\"/dizi/\"], a[href^=\"/film/\"]",
  "parentLinks": "a[href^=\"/dizi/\"]"
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['movie','series'],collectionKeys:['new'],Provider:a.Provider,Resolver:root.WebPlayerData.createResolver(P,D),ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);
