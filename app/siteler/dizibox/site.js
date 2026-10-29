(function(root){
 'use strict';
 root.SiteRegistry.register({id:'dizibox',name:'Dizibox',base:'https://www.dizibox.live',mark:'DBX',subtitle:'dizibox.live · Yabancı diziler',prefix:'dizibox:',storagePrefix:'site.dizibox.',contentTypes:['series'],posterBackground:'linear-gradient(145deg,#14678b,#10243c)',Provider:root.DiziboxProvider,Resolver:root.DiziboxSourceResolver,
  ui:{movieRail:'Filmler',seriesRail:'Dizibox dizileri',recommended:'Efsane diziler',liked:'En çok yorumlananlar',filterHint:'Dizibox arşivi: tür, yıl, IMDb ve sıralama. Arama sitenin alfabetik dizi dizinini kullanır.',filterSummary:'Dizi filtresi',defaultOrder:'date'},
  collectionQuery:function(type,key){return {type:'series',url:key==='recommended'?'https://www.dizibox.live/efsane-diziler/':null,order:{new:'date',recommended:'date',rated:'imdb',liked:'yorum'}[key]};},
  filterFields:function(){return ['genres','years','imdb','order'];}
 });
})(window);
