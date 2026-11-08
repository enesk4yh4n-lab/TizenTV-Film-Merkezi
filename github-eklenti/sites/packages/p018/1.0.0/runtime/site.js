/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P018';site.subtitle='P018';site.mark='P018';register(site);};

/* saglayicilar/p018/site.js */
/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "izle7",
  "name": "İzle7",
  "base": "https://www.izle7.com",
  "series": /^\/kanal7\/kategori\/[^/]+\/?$/,
  "episode": /^\/kanal7\/izle-\d+-[^/]+\.html$/,
  "searchPath": "/arama?q=",
  "episodeFeed": true,
  "cards": "a.suggested-content-item, a.category-item",
  "parentLinks": "a[href*=\"/kanal7/kategori/\"]",
  "listPath": "/kanal7/diziler",
  "titleFromDocument": true,
  "paginatedSeries": true,
  "episodeLinks": "a.category-item",
  "boundEpisodeContainer": true
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:a.Provider,Resolver:root.WebPlayerData.createResolver(P,D),ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);


})(window);
