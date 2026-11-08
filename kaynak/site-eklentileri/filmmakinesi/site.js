/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/filmmakinesi/filmmakinesi-parser.js */
(function(root){'use strict';root.FilmMakinesiParser=root.CatalogSiteKit.createParser({id:'filmmakinesi',name:'Film Makinesi',base:'https://filmmakinesi.to',movie:/^\/film\/[a-z0-9-]+\/$/,cards:'a.item[data-title]',title:'.item-title, .title',year:'.item-footer .info span:first-child',imdb:'.imdb, .imdb-score, .rating',language:'.item-info > div:nth-child(2)',genres:'#info--box .content .type a',description:'#info--box .description',originalTitle:'h2',detailYear:'.date',cast:'a[href*="/oyuncular/"]',listPath:'/filmler-1/',optionsPath:'/kesfet/',filterPath:'/kesfet/',fields:{},searchPath:'/arama/?s='});})(window);


/* siteler/filmmakinesi/filmmakinesi-provider.js */
(function(root){'use strict';root.FilmMakinesiProvider=root.CatalogSiteKit.createProvider(root.FilmMakinesiParser);})(window);


/* siteler/filmmakinesi/filmmakinesi-decoder.js */
(function(root){
 'use strict';var D=root.WebPlayerData;
 function allowed(u){return /^(?:closeload|rapid)\.filmmakinesi\.to$/.test(u.hostname)&&/^\/(?:video\/embed\/|embed-)/.test(u.pathname);}
 function alternatives(body,page){var d=D.doc(body),out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('#player-section .video-parts [data-video_url]'),function(n){var u=D.publicUrl(n.getAttribute('data-video_url'),page);if(!u||!allowed(new root.URL(u))||seen[u])return;seen[u]=true;out.push({sourceId:'filmmakinesi-'+(new root.URL(u).hostname.split('.')[0])+'-'+new root.URL(u).pathname.replace(/[^A-Za-z0-9_-]+/g,'-'),label:root.CatalogUtils.clean(n.textContent),url:u});});return out;}
 root.FilmMakinesiDecoder={alternatives:alternatives,resolve:function(e,get){return get(e.url,root.FilmMakinesiParser.base+'/','embed').then(function(r){var v=D.seeded(r.body,e.url);v.referer=e.url;return v;});}};
})(window);


/* siteler/filmmakinesi/filmmakinesi-resolver.js */
(function(root){'use strict';root.FilmMakinesiSourceResolver=root.WebPlayerData.createResolver(root.FilmMakinesiParser,root.FilmMakinesiDecoder);})(window);


/* siteler/filmmakinesi/site.js */
(function(root){'use strict';var P=root.FilmMakinesiParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"FM",subtitle:"Film arşivi, Close ve Rapid",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#a16f32,#172135)',Provider:root.FilmMakinesiProvider,Resolver:root.FilmMakinesiSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return [];}});})(window);


})(window);
