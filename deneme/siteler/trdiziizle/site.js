/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "trdiziizle",
  "name": "TR Dizi İzle",
  "base": "https://www.trdiziizle.tv",
  "series": /^\/diziler\/[^/]+\/?$/,
  "episode": /^\/[^/]+-bolum[^/]*\/?$/,
  "searchPath": "/?s=",
  "playerFrames": "iframe[src*=\"/player/oynat/\"]",
  "episodeFeed": true,
  "parentLinks": ".breadcrumb a, .breadcrumbs a, a[rel=\"category tag\"]"
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);
// Only the active same-site wrapper is a player. Its hidden challenge iframe is not.
D.resolve=function(entry,get,request,check){
  var url=root.WebPlayerData.publicUrl(entry.url,P.base),u=url&&new root.URL(url);
  if(!u||u.origin!==new root.URL(P.base).origin||!/^\/player\/oynat\//.test(u.pathname))return Promise.reject(root.WebPlayerData.fail('unsupported','TRDizi oynatıcı adresi doğrulanamadı.'));
  return get(url,entry.pageUrl||P.base+'/','embed').then(function(response){
    check();
    if(!root.WebPlayerData.doc(response.body).querySelector('#player'))throw root.WebPlayerData.fail('decode','TRDizi etkin oynatıcı alanı bulunamadı.');
    var data=root.WebPlayerData.jw(response.body,url);data.referer=url;return data;
  });
};
root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:a.Provider,Resolver:root.WebPlayerData.createResolver(P,D),ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);
