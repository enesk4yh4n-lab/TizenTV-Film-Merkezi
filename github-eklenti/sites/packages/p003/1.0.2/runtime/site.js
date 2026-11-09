/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P003';site.subtitle='P003';site.mark='P003';register(site);};

/* saglayicilar/p003/decoder.js */
(function(root){
 'use strict';var D=root.WebPlayerData;
 function allowed(u){return /^(?:closeload|rapid)\.filmmakinesi\.to$/.test(u.hostname)&&/^\/(?:video\/embed\/|embed-)/.test(u.pathname);}
 function alternatives(body,page){var d=D.doc(body),out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('#player-section .video-parts [data-video_url]'),function(n){var u=D.publicUrl(n.getAttribute('data-video_url'),page);if(!u||!allowed(new root.URL(u))||seen[u])return;seen[u]=true;out.push({sourceId:'filmmakinesi-'+(new root.URL(u).hostname.split('.')[0])+'-'+new root.URL(u).pathname.replace(/[^A-Za-z0-9_-]+/g,'-'),label:root.CatalogUtils.clean(n.textContent),url:u});});return out;}
 root.FilmMakinesiDecoder={alternatives:alternatives,resolve:function(e,get){return get(e.url,root.FilmMakinesiParser.base+'/','embed').then(function(r){var v=D.seeded(r.body,e.url);v.referer=e.url;return v;});}};
})(window);


/* saglayicilar/p003/parser.js */
(function(root){'use strict';root.FilmMakinesiParser=root.CatalogSiteKit.createParser({id:'filmmakinesi',name:'Film Makinesi',base:'https://filmmakinesi.to',movie:/^\/film\/[a-z0-9-]+\/$/,cards:'a.item[data-title]',title:'.item-title, .title',year:'.item-footer .info span:first-child',imdb:'.imdb, .imdb-score, .rating',language:'.item-info > div:nth-child(2)',genres:'#info--box .content .type a',description:'#info--box .description',originalTitle:'h2',detailYear:'.date',cast:'a[href*="/oyuncular/"]',listPath:'/filmler-1/',optionsPath:'/kesfet/',filterPath:'/kesfet/',fields:{},searchPath:'/arama/?s='});})(window);


/* saglayicilar/p003/provider.js */
(function (root) {
  'use strict';
  var Base = root.CatalogSiteKit.createProvider(root.FilmMakinesiParser);
  function Provider(cache, network) {
    Base.call(this, cache, network || root.ChainNetwork.createClient({ destination: 'downloads', platformText: true }));
  }
  Provider.prototype = Object.create(Base.prototype);
  Provider.prototype.constructor = Provider;
  root.FilmMakinesiProvider = Provider;
})(window);


/* saglayicilar/p003/resolver.js */
(function (root) {
  'use strict';
  var P = root.FilmMakinesiParser, Base = root.WebPlayerData.createResolver(P, root.FilmMakinesiDecoder);
  function Resolver(log, now) {
    Base.call(this, log, now);
    var normal = this.network, platform = root.ChainNetwork.createClient({ destination: 'downloads', platformText: true });
    function client(url) {
      var u;
      try { u = new root.URL(url); } catch (ignore) {}
      var embed = u && u.protocol === 'https:' && !u.username && !u.password && /^(closeload|rapid)\.filmmakinesi\.to$/.test(u.hostname);
      return P.safe(url) || embed ? platform : normal;
    }
    this.network = {
      get: function (url, ref, headers, policy) { return client(url).get(url, ref, headers, policy); },
      post: function (url, body, headers, policy) { return client(url).post(url, body, headers, policy); },
      cancel: function () { normal.cancel(); platform.cancel(); }
    };
  }
  Resolver.prototype = Object.create(Base.prototype);
  Resolver.prototype.constructor = Resolver;
  root.FilmMakinesiSourceResolver = Resolver;
})(window);


/* saglayicilar/p003/site.js */
(function(root){'use strict';var P=root.FilmMakinesiParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"FM",subtitle:"Film arşivi, Close ve Rapid",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#a16f32,#172135)',Provider:root.FilmMakinesiProvider,Resolver:root.FilmMakinesiSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return [];}});})(window);


})(window);
