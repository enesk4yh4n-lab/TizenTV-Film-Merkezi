/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "diziyou",
  "name": "Diziyou",
  "base": "https://www.diziyou.one",
  "series": /^\/(?!wp-|tag|category|page|player|iletisim|diziler|yabanci-dizi)[^/]+\/$/,
  "episode": /^\/[^/]+-\d+-sezon-\d+-bolum\/?$/,
  "cards": ".listepisodes a, .single-item",
  "searchRoot": "#content",
  "searchCards": "#list-series, .single-item",
  "title": ".cat-title a",
  "listPath": "/dizi-arsivi/",
  "searchPath": "/?s=",
  "episodeFeed": true,
  "playerFrames": "iframe#diziyouPlayer",
  "parentLinks": "a[rel=\"category tag\"]"
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:a.Provider,Resolver:root.WebPlayerData.createResolver(P,D),ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);
