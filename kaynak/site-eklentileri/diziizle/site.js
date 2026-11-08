/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/diziizle/site.js */
/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "diziizle",
  "name": "Dizi İzle",
  "base": "https://diziizle.cloud",
  "series": /^\/dizi\/[^/]+\/?$/,
  "episode": /^\/dizi\/[^/]+\/sezon-\d+\/bolum-\d+\/?$/,
  "listPath": "/diziler",
  "searchPath": "/ara?q=",
  "cards": "a[href*=\"/dizi/\"]",
  "parentLinks": "a[href*=\"/dizi/\"]"
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:a.Provider,Resolver:root.WebPlayerData.createResolver(P,D),ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);


})(window);
