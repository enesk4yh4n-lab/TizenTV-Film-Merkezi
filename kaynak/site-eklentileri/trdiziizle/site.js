/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.9.2 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.9.2');

/* siteler/trdiziizle/site.js */
/* Independent site adapter; canonical source for the signed plugin. */
(function(root){'use strict';var c={
  "id": "trdiziizle",
  "name": "TR Dizi İzle",
  "base": "https://www.trdiziizle.tv",
  "series": /^\/diziler\/[^/]+\/?$/,
  "episode": /^\/[^/]+-bolum[^/]*\/?$/,
  "searchPath": "/?s=",
  "cards": ".listepisodes",
  "title": ".bolum-alt",
  "image": "a > img",
  "boundEpisodeContainer": true,
  "episodeLinks": ".custom-scrollbar .bolumust a[href]",
  "playerFrames": "iframe[src*=\"/player/oynat/\"]",
  "episodeFeed": true,
  "parentLinks": ".breadcrumb a, .breadcrumbs a, a[rel=\"category tag\"]"
},a=root.SitePayload.adapter(c),P=a.parser,D=root.SiteSourceFamilies.create(P);
// Lists contain episode releases. Link them to the actual series directory
// already present in the same response, without requesting every episode.
function seriesName(value){return root.CatalogUtils.clean(value).replace(/(?:\s+(?:izle|hd))+$/i,'');}
function nameKey(value){return seriesName(value).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase();}
function seriesList(body,page){
  return root.CatalogUtils.withEnvelope(body,function(){
    var result=P.list(body,page),doc=root.CatalogUtils.envelope(body).doc,
      names={},titles={},seen={},cards=[];
    Array.prototype.forEach.call(doc.querySelectorAll('a[href*="/diziler/"]'),function(link){
      var url=P.safe(link.getAttribute('href'),page),key='$'+nameKey(link.textContent||link.getAttribute('title'));
      if(!url||!c.series.test(new root.URL(url).pathname)||key==='$')return;
      if(!names[key])names[key]={url:url,ambiguous:false};
      else if(names[key].url!==url)names[key].ambiguous=true;
    });
    Array.prototype.forEach.call(doc.querySelectorAll(c.cards),function(box){
      var link=box.querySelector('a[href]'),name=box.querySelector('[id="dizi-ismi"]'),
        url=P.safe(link&&link.getAttribute('href'),page);
      if(url&&name)titles['$'+url]=seriesName(name.textContent);
    });
    result.cards.forEach(function(row){
      var title=titles['$'+row.pageUrl],entry=title&&names['$'+nameKey(title)],key=row.contentId;
      if(row.type==='episode'&&title){
        var episodeUrl=row.pageUrl,stem=/^\/(.+?)-(?:\d+-sezon-)?\d+-bolum(?:-|\/|$)/.exec(new root.URL(episodeUrl).pathname);
        if(entry&&!entry.ambiguous){
          row.pageUrl=entry.url;row.seriesPageUrl=entry.url;key=P.id(entry.url);
        }else if(stem){
          // A directory-less response still has an explicit series label and
          // episode slug. Keep the real episode URL for detail-time lookup;
          // never manufacture a series URL or merge merely similar titles.
          key=c.id+':series-feed:'+stem[1];
        }else title='';
        if(title){row.type='series';row.title=title;row.contentId=key;row.aggregateSeries=true;row.latestEpisodePageUrl=episodeUrl;}
      }
      if(!seen['$'+key]){seen['$'+key]=true;cards.push(row);}
    });
    result.cards=cards;return result;
  });
}
P.seriesList=seriesList;
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
function Provider(cache,network){a.Provider.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads',preferXHR:false,platformText:true}));}
Provider.prototype=Object.create(a.Provider.prototype);Provider.prototype.constructor=Provider;
Provider.prototype.fetch=function(url,parse,force,scope){url=P.safe(url);if(!url)return Promise.reject(new Error('Site dışı katalog isteği reddedildi.'));return this.request(url,null,parse,force,'trdizi107-'+scope);};
Provider.prototype.home=function(force){return this.fetch(P.base+'/',function(body){var cards=seriesList(body,P.base+'/').cards;return {hero:cards.filter(function(row){return row.type==='series';})[0]||null,movies:[],series:cards};},force,'home');};
Provider.prototype.list=function(query,next,force){
  if(query&&query.type==='movie')return Promise.resolve({cards:[],next:null});
  var url=next&&next.url||query&&query.url||P.base+'/';
  return this.fetch(url,function(body){return seriesList(body,url);},force,'list');
};
Provider.prototype.search=function(query,force,next){
  query=root.CatalogUtils.clean(query);
  if(!query||query.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
  var url=next&&next.url||P.base+c.searchPath+encodeURIComponent(query);
  return this.fetch(url,function(body){return seriesList(body,url);},force,'search');
};
Provider.prototype.detail=function(card,force){return a.Provider.prototype.detail.call(this,card,force).then(function(detail){if(card.aggregateSeries&&detail.type==='series')delete detail.selectedEpisodePageUrl;return detail;});};
function Resolver(log,now){
  BaseResolver.call(this,log,now);
  var active=[],generation=0;
  this.network.cancel();
  // TV Download accepts the real page/wrapper where the separate TLS client is
  // challenged. Keep request ownership separate; TLS verification stays enabled.
  this.network={get:function(url,ref,headers,policy){
    var token=generation,client=root.ChainNetwork.createClient({destination:'downloads',preferXHR:new root.URL(url).origin!==P.base,platformText:true});active.push(client);
    function release(){var i=active.indexOf(client);if(i>=0)active.splice(i,1);client.cancel();}
    return client.get(url,ref,headers,policy).then(function(value){release();if(token!==generation)throw root.WebPlayerData.fail('cancel','İptal edildi');return value;},function(error){release();throw error;});
  },cancel:function(){generation++;var clients=active.slice();active=[];clients.forEach(function(client){client.cancel();});}};
}
Resolver.prototype=Object.create(BaseResolver.prototype);Resolver.prototype.constructor=Resolver;
root.SiteRegistry.register({id:c.id,name:c.name,base:P.base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name.slice(0,2),subtitle:c.name,contentTypes:['series'],collectionKeys:['new'],Provider:Provider,Resolver:Resolver,ui:{movieRail:'Filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu katalog',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='movie'?c.movieList||c.listPath||'/':c.listPath||'/')};},filterFields:function(){return [];}});})(window);


})(window);
