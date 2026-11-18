/* Shared catalog controls. Movement changes focus only. */
(function(root){
 'use strict';
 function tr(s){return root.FilmI18n?root.FilmI18n.text(s):s;}
 function t(a,b){return root.FilmI18n&&root.FilmI18n.language()==='en'?b:a;}
 var labels={'new':['Yeni eklenenler','Recently added'],'most-viewed':['En Çok İzlenenler','Most watched'],'genre:action':['Aksiyon','Action'],'genre:science-fiction':['Bilim Kurgu','Science fiction'],'genre:comedy':['Komedi','Comedy'],'genre:romance':['Romantik','Romance']};
 function valid(options,type){return (options&&Array.isArray(options.quickFilters)?options.quickFilters:[]).slice(0,32).filter(function(r){return r&&/^[a-z0-9:-]{1,64}$/.test(r.id)&&typeof r.label==='string'&&r.label.length<=60&&Array.isArray(r.types)&&r.types.indexOf(type)>=0&&r.query&&typeof r.query==='object'&&!Array.isArray(r.query)&&JSON.stringify(r.query).length<=4096;});}
 function load(a,s){
  if(s.kind!=='list'||root.CatalogSections.special(s.section)||s.quickLoading||s.quickLoaded)return;
  var sites=a.site.virtual?root.SiteRegistry.sites.filter(function(v){return !v.virtual&&v.supportsQuickFilters===true&&(!v.contentTypes||v.contentTypes.indexOf(s.type)>=0);}):a.site.supportsQuickFilters===true?[a.site]:[];
  s.quickLoaded=true;if(!sites.length)return;s.quickLoading=true;var token=a.generation,all={},task=Promise.resolve();
  sites.forEach(function(site){task=task.then(function(){if(token!==a.generation)return;var p=a.site.virtual?a.provider.client(site).provider:a.provider;return Promise.resolve().then(function(){return a.site.virtual?a.provider.invoke(site,'options',[],Math.max(1,Math.min(8000,a.provider.deadline-Date.now()))):p.options();}).then(function(o){if(token!==a.generation)return;valid(o,s.type).forEach(function(v){if(!all[v.id])all[v.id]={id:v.id,label:v.label,queries:{}};all[v.id].queries[site.id]=root.PlayerCore.copy(v.query);});},function(){});});});
  task.then(function(){s.quickLoading=false;if(token!==a.generation||a.screen!==s)return;s.quickFilters=Object.keys(all).map(function(k){return all[k];});a.render(true);});
 }
 function reset(a,s){s.localType='all';if(s.kind==='search')s.tab='all';s.quickFilter=null;s.filters={};s.collection='new';s.sort='source';s.startRow=0;s.scroll=0;s.episodeStart=0;s.focusKey='filters';if(s.kind==='list'){s.query={type:root.CatalogSections.special(s.section)?null:s.type,section:root.CatalogSections.special(s.section)?s.section:''};a.loadList(false);}else a.render(true);}
 function localFilters(a){var s=a.screen;a.save();a.panel={kind:'catalog-local-filter',returnKey:'filters'};a.renderPanel();}
 function focusControl(a,n){if(!n)return;var area=document.getElementById('catalog-scroll'),top=area&&area.scrollTop;n.focus();if(area)area.scrollTop=top;if(a.screen)a.screen.focusKey=n.getAttribute('data-focus');}
 function draw(a,parent,heading,sort){
  var s=a.screen;if(!s||['search','list','watchlist','history'].indexOf(s.kind)<0)return;
  load(a,s);heading.classList.add('fm-list-title');
  var bar=parent.querySelector('.catalog-tabs');if(!bar){bar=document.createElement('div');bar.className='catalog-tabs';heading.parentNode.insertBefore(bar,heading.nextSibling);}bar.classList.add('fm-catalog-toolbar');
  function button(text,key,fn){var b=document.createElement('button');b.type='button';b.className='quiet-button';b.textContent=text;b.setAttribute('data-focus',key);b.onclick=fn;bar.appendChild(b);return b;}
  if(s.kind==='list'&&s.quickFilters&&s.quickFilters.length){bar.textContent='';s.quickFilters.forEach(function(q){var name=labels[q.id];var b=button(name?t(name[0],name[1]):q.label,'quick-'+q.id.replace(/:/g,'-'),function(){a.save();s.quickFilter=q.id;s.collection='quick';s.sort='source';s.startRow=0;s.scroll=0;var queries=root.PlayerCore.copy(q.queries);s.query=a.site.virtual?{type:s.type,quickQueries:queries}:root.PlayerCore.copy(queries[a.site.id]);s.query.type=s.type;s.query.section=root.CatalogSections.special(s.section)?s.section:'';s.focusKey=b.getAttribute('data-focus');a.loadList(false);});if(s.quickFilter===q.id){b.classList.add('selected');b.setAttribute('aria-pressed','true');}});}
  var filters=parent.querySelector('[data-focus=filters]');
  if(!filters)filters=button(tr('Filtreler'),'filters',function(){localFilters(a);});
  filters.textContent=t('Filtrele','Filter');
  bar.appendChild(sort);bar.appendChild(filters);
  if(s.localType&&s.localType!=='all'||s.quickFilter||s.query&&typeof s.query==='object'&&s.query.filters&&Object.keys(s.query.filters).length)button(t('Filtreleri temizle','Clear filters'),'filters-clear',function(){reset(a,s);});
  if(!bar.querySelector('[data-toolbar-count]')){var count=document.createElement('span');count.className='catalog-note';count.setAttribute('data-toolbar-count','true');count.textContent=a.gridItems(s).length+t(' içerik',' items');heading.appendChild(count);}
 }
 function panel(a){var p=a.panel;if(!p||p.kind!=='catalog-local-filter')return false;var box=document.getElementById('catalog-modal-card'),host=document.getElementById('catalog-modal');host.style.display='block';box.textContent='';var h=document.createElement('h2');h.textContent=tr('Filtreler');box.appendChild(h);[['all',tr('Tümü')],['movie',tr('Filmler')],['series',tr('Diziler')]].forEach(function(v){var b=document.createElement('button');b.className='filter-field'+(((a.screen.kind==='search'?a.screen.tab:a.screen.localType)||'all')===v[0]?' selected':'');b.textContent=v[1];b.setAttribute('data-focus','local-filter-'+v[0]);b.onclick=function(){var s=a.screen;if(s.kind==='search')s.tab=v[0];else s.localType=v[0];s.startRow=0;s.scroll=0;a.closePanel(false);a.render(true);a.focus('filters');};box.appendChild(b);});var back=document.createElement('button');back.className='filter-field';back.textContent=tr('Geri');back.setAttribute('data-focus','panel-cancel');back.onclick=function(){a.closePanel(true);};box.appendChild(back);box.querySelector('button').focus();return true;}
 function available(n){return n&&!n.disabled&&n.offsetWidth&&n.offsetHeight&&root.getComputedStyle(n).visibility!=='hidden';}
 function buttons(host){return Array.prototype.filter.call(host.querySelectorAll('button[data-focus]'),available);}
 function ancestor(n,cls){while(n&&n!==document.body){if(n.classList&&n.classList.contains(cls))return n;n=n.parentNode;}return null;}
 function place(a,n){
  if(!available(n))return;var bar=ancestor(n,'fm-catalog-toolbar');
  if(bar){var r=n.getBoundingClientRect(),b=bar.getBoundingClientRect(),scale=b.width/bar.offsetWidth;if(r.left<b.left+4)bar.scrollLeft-=(b.left+4-r.left)/scale;else if(r.right>b.right-4)bar.scrollLeft+=(r.right-b.right+4)/scale;}
  if(document.getElementById('catalog-content').contains(n))a.focus(n);else focusControl(a,n);
  if(a.screen)a.screen.focusKey=n.getAttribute('data-focus');
 }
 function position(n,area){var r=n.getBoundingClientRect(),shift=area.contains(n)?area.scrollTop*area.getBoundingClientRect().width/area.offsetWidth:0;return {left:r.left,right:r.right,top:r.top+shift,bottom:r.bottom+shift,x:(r.left+r.right)/2,y:(r.top+r.bottom)/2+shift};}
 function inStrip(n){var bar=ancestor(n,'fm-catalog-toolbar');if(!bar)return true;var r=n.getBoundingClientRect(),b=bar.getBoundingClientRect();return r.right>b.left+4&&r.left<b.right-4;}
 function pick(a,active,nodes,code){
  var area=document.getElementById('catalog-scroll'),r=position(active,area),horizontal=code===37||code===39,best=null,tier=Infinity,score=Infinity;
  nodes.forEach(function(n){if(n===active||!available(n)||!inStrip(n))return;var b=position(n,area),dx=b.x-r.x,dy=b.y-r.y,primary=horizontal?dx:dy;if(code===37||code===38?primary>=-2:primary<=2)return;
   var overlap=horizontal?Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top):Math.min(r.right,b.right)-Math.max(r.left,b.left),rank=overlap>2?0:1;if(horizontal&&rank)return;
   var gap=horizontal?Math.max(0,r.top-b.bottom,b.top-r.bottom):Math.max(0,r.left-b.right,b.left-r.right),value=Math.abs(primary)+gap*3+Math.abs(horizontal?dy:dx)*0.15;
   if(rank<tier||rank===tier&&value<score){tier=rank;score=value;best=n;}
  });return best;
 }
 function closestX(a,active,nodes){var r=active.getBoundingClientRect(),x=(r.left+r.right)/2,best=null,distance=Infinity;nodes.forEach(function(n){if(!available(n)||!inStrip(n))return;var b=n.getBoundingClientRect(),d=Math.abs((b.left+b.right)/2-x);if(d<distance){distance=d;best=n;}});return best;}
 function controlRow(a,active,nodes,up){var area=document.getElementById('catalog-scroll'),r=position(active,area),row=[],best=up?-Infinity:Infinity;nodes.forEach(function(n){if(!available(n)||!inStrip(n))return;var b=position(n,area);if(up?b.y>=r.top-2:b.y<=r.bottom+2)return;if(Math.abs(b.y-best)<3)row.push(n);else if(up?b.y>best:b.y<best){best=b.y;row=[n];}});return closestX(a,active,row);}
 function grid(a,index){var s=a.screen,row=Math.floor(index/6);s.focusKey='card-'+index;if(row<(s.startRow||0)||row>=(s.startRow||0)+10){a.saveScroll();s.startRow=Math.max(0,row-3);a.renderFocusIntent=s.focusKey;a.render(true);}place(a,a.findFocus(s.focusKey));}
 function move(a,code){
  if(a.panel)return false;var active=document.activeElement,key=active&&active.getAttribute('data-focus'),s=a.screen,content=document.getElementById('catalog-content'),header=document.querySelector('.catalog-header');if(!active||!s||!content)return true;
  if(active.hasAttribute('data-nav')&&code===40&&(s.startRow||0)>0){s.startRow=0;s.scroll=0;a.renderFocusIntent=key;a.render(true);}
  var controls=buttons(content).filter(function(n){return !n.hasAttribute('data-card-index');}),head=buttons(header),target=null,index,at,group=ancestor(active,'episode-entry'),bar=ancestor(active,'fm-catalog-toolbar');
  if(group){var entries=Array.prototype.slice.call(content.querySelectorAll('.episode-entry')),options=/^episode-options-/.test(key||'');at=entries.indexOf(group);
   if(code===37||code===39)target=group.querySelector(code===39?'.episode-options':'.episode-button');
   else if(code===38&&at===0)target=a.findFocus('episodes-before')||content.querySelector('.season-tabs .selected')||content.querySelector('[data-focus^="season-"]');
   else if(code===40&&at===entries.length-1)target=a.findFocus('episodes-after');
   else if(entries[at+(code===38?-1:1)])target=entries[at+(code===38?-1:1)].querySelector(options?'.episode-options':'.episode-button');
   place(a,target);return true;
  }
  if(active.hasAttribute('data-card-index')){
   index=Number(active.getAttribute('data-card-index'));var rail=active.getAttribute('data-rail');
   if(rail!==null){rail=Number(rail);if(code===37||code===39){at=index+(code===39?1:-1);if(at>=0&&at<s.rails[rail].items.length)a.railMove(rail,code===39?1:-1,at);return true;}
    var next=rail+(code===38?-1:1);if(s.rails[next]){var column=index-(s.railOffsets[rail]||0);at=Math.min(s.rails[next].items.length-1,(s.railOffsets[next]||0)+column);a.railMove(next,1,at);return true;}
    var hero=code===38&&rail===0&&buttons(content).filter(function(n){return ancestor(n,'catalog-hero');});target=hero&&hero.length?closestX(a,active,hero):controlRow(a,active,controls,code===38);place(a,target);return true;
   }
   var total=a.gridItems().length;at=index+(code===37?-1:code===39?1:code===38?-6:6);
   if(code===37||code===39){if(at>=0&&at<total&&Math.floor(at/6)===Math.floor(index/6))grid(a,at);return true;}
   if(at>=0&&at<total){grid(a,at);return true;}if(code===40&&Math.floor(index/6)<Math.floor((total-1)/6)){grid(a,total-1);return true;}
   target=code===40&&a.findFocus('load-more')||controlRow(a,active,controls,code===38);if(!target&&code===38)target=pick(a,active,head,code);place(a,target);return true;
  }
  if(key==='load-more'&&code===38){at=a.gridItems().length-1;if(at>=0)grid(a,at);return true;}
  if(bar&&(code===37||code===39)){var peers=buttons(bar);at=peers.indexOf(active);place(a,peers[Math.max(0,Math.min(peers.length-1,at+(code===39?1:-1)))]);return true;}
  if(bar&&code===40&&a.gridItems().length){var firstRow=Array.prototype.slice.call(content.querySelectorAll('.catalog-card[data-focus]')).slice(0,6),entry=closestX(a,active,firstRow);if(entry)grid(a,Number(entry.getAttribute('data-card-index'))%6);return true;}
  var cards=Array.prototype.filter.call(content.querySelectorAll('.catalog-card[data-focus]'),function(n){if(!available(n))return false;var r=n.getAttribute('data-rail'),i=Number(n.getAttribute('data-card-index'));return r!==null?i>=(s.railOffsets[r]||0)&&i<(s.railOffsets[r]||0)+6:i<6;});
  var pool=controls.concat(cards);if(header.contains(active)){if(!active.hasAttribute('data-nav')||code!==40)pool=head.concat(pool);if(code===37||code===39)pool=head;}
  else if(s.kind!=='detail'&&s.kind!=='recommendations')pool=head.concat(pool);
  target=pick(a,active,pool,code);if(!target&&code===38&&(s.kind==='detail'||s.kind==='recommendations'))target=pick(a,active,head,code);place(a,target);return true;
 }
 function section(s){return !s?'':s.kind==='list'?(s.section|| (s.type==='series'?'series':'movies')):['watchlist','history','search'].indexOf(s.kind)>=0?s.kind:'';}
 function remember(a){var s=a.screen,k=section(s);if(k&&!s.loading&&!(s.unifiedProgress&&s.unifiedProgress.running)){a.sectionViews=a.sectionViews||{};a.sectionViews[k]=s;}}
 function restore(a,kind){var s=a.sectionViews&&a.sectionViews[kind];if(!s)return false;a.screen=s;if(s.kind==='watchlist')s.items=a.library.favorites();s.scroll=0;s.startRow=0;s.railOffsets={};s.focusKey=a.findFocus('nav-'+kind)?'nav-'+kind:'search-activate';a.render(true);focusControl(a,a.findFocus(s.focusKey));return true;}
 root.CatalogToolbar={draw:draw,panel:panel,move:move,reset:reset,validQuickFilters:valid,remember:remember,restore:restore};
})(window);
