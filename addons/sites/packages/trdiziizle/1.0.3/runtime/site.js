/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/trdiziizle/site.js */
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
    var data=root.WebPlayerData.jw(response.body,url);data.referer=url;
    if(data.type!=='hls')return data;
    return request(data.url,url,'manifest').then(function(manifest){
      check();
      if(!/^\s*#EXTM3U/.test(manifest.body))throw root.WebPlayerData.fail('manifest','TRDizi HLS yerine farklı yanıt verdi.');
      var lines=manifest.body.split(/\r?\n/),variants=[];
      lines.forEach(function(line,i){if(/^#EXT-X-STREAM-INF:/.test(line)){for(var n=i+1;n<lines.length;n++){if(lines[n].replace(/\s/g,'')&&lines[n].charAt(0)!=='#'){variants.push(lines[n].replace(/^\s+|\s+$/g,''));break;}}}});
      // Single-variant masters can contain incorrect dimensions. Use their real
      // child URI rather than inventing codec/resolution metadata. Preserve
      // multi-quality and separate audio/subtitle renditions in the master.
      if(variants.length===1&&!/^#EXT-X-MEDIA:/m.test(manifest.body)){
        var child=root.WebPlayerData.publicUrl(variants[0],data.url);
        if(!child)throw root.WebPlayerData.fail('manifest','TRDizi alt playlist adresi geçersiz.');
        data.url=child;
      }
      return data;
    });
  });
};
var BaseResolver=root.WebPlayerData.createResolver(P,D);
function Resolver(log,now){
  BaseResolver.call(this,log,now);
  var active=[],generation=0;
  this.network.cancel();
  // The page and wrapper need different fallback paths on Tizen 3. Do not inherit
  // the page request's transport preference when fetching the next URL.
  this.network={get:function(url,ref,headers,policy){
    var token=generation,client=root.ChainNetwork.createClient({destination:'downloads',preferXHR:true});active.push(client);
    function release(){var i=active.indexOf(client);if(i>=0)active.splice(i,1);client.cancel();}
    return client.get(url,ref,headers,policy).then(function(value){release();if(token!==generation)throw root.WebPlayerData.fail('cancel','İptal edildi');return value;},function(error){release();throw error;});
  },cancel:function(){generation++;var clients=active.slice();active=[];clients.forEach(function(client){client.cancel();});}};
}
Resolver.prototype=Object.create(BaseResolver.prototype);Resolver.prototype.constructor=Resolver;
root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:a.Provider,Resolver:Resolver,ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);


})(window);
