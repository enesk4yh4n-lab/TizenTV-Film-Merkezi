/* Shared catalog controls. Movement changes focus only. */
(function(root){
 'use strict';
 function tr(s){return root.FilmI18n?root.FilmI18n.text(s):s;}
 function t(a,b){return root.FilmI18n&&root.FilmI18n.language()==='en'?b:a;}
 var labels={'new':['Yeni eklenenler','Recently added'],'most-viewed':['En Çok İzlenenler','Most watched'],'genre:action':['Aksiyon','Action'],'genre:science-fiction':['Bilim Kurgu','Science fiction'],'genre:comedy':['Komedi','Comedy'],'genre:romance':['Romantik','Romance']};
 function valid(options,type){return (options&&Array.isArray(options.quickFilters)?options.quickFilters:[]).slice(0,32).filter(function(r){return r&&/^[a-z0-9:-]{1,64}$/.test(r.id)&&typeof r.label==='string'&&r.label.length<=60&&Array.isArray(r.types)&&r.types.indexOf(type)>=0&&r.query&&typeof r.query==='object'&&!Array.isArray(r.query)&&JSON.stringify(r.query).length<=4096;});}
 function load(a,s){
  if(s.kind!=='list'||s.quickLoading||s.quickLoaded)return;
  var sites=a.site.virtual?root.SiteRegistry.sites.filter(function(v){return !v.virtual&&v.supportsQuickFilters===true&&(!v.contentTypes||v.contentTypes.indexOf(s.type)>=0);}):a.site.supportsQuickFilters===true?[a.site]:[];
  s.quickLoaded=true;if(!sites.length)return;s.quickLoading=true;var token=a.generation,all={},task=Promise.resolve();
  sites.forEach(function(site){task=task.then(function(){if(token!==a.generation)return;var p=a.site.virtual?a.provider.client(site).provider:a.provider;return Promise.resolve().then(function(){return a.site.virtual?a.provider.invoke(site,'options',[],Math.max(1,Math.min(8000,a.provider.deadline-Date.now()))):p.options();}).then(function(o){if(token!==a.generation)return;valid(o,s.type).forEach(function(v){if(!all[v.id])all[v.id]={id:v.id,label:v.label,queries:{}};all[v.id].queries[site.id]=root.PlayerCore.copy(v.query);});},function(){});});});
  task.then(function(){s.quickLoading=false;if(token!==a.generation||a.screen!==s)return;s.quickFilters=Object.keys(all).map(function(k){return all[k];});a.render(true);});
 }
 function reset(a,s){s.localType='all';if(s.kind==='search')s.tab='all';s.quickFilter=null;s.filters={};s.collection='new';s.sort='source';s.startRow=0;s.scroll=0;s.episodeStart=0;s.focusKey='filters';if(s.kind==='list'){s.query={type:s.type};a.loadList(false);}else a.render(true);}
 function localFilters(a){var s=a.screen;a.save();a.panel={kind:'catalog-local-filter',returnKey:'filters'};a.renderPanel();}
 function focusControl(a,n){if(!n)return;var area=document.getElementById('catalog-scroll'),top=area&&area.scrollTop;n.focus();if(area)area.scrollTop=top;if(a.screen)a.screen.focusKey=n.getAttribute('data-focus');}
 function draw(a,parent,heading,sort){
  var s=a.screen;if(!s||['search','list','watchlist','history'].indexOf(s.kind)<0)return;
  load(a,s);heading.classList.add('fm-list-title');
  var bar=parent.querySelector('.catalog-tabs');if(!bar){bar=document.createElement('div');bar.className='catalog-tabs';heading.parentNode.insertBefore(bar,heading.nextSibling);}bar.classList.add('fm-catalog-toolbar');
  function button(text,key,fn){var b=document.createElement('button');b.type='button';b.className='quiet-button';b.textContent=text;b.setAttribute('data-focus',key);b.onclick=fn;bar.appendChild(b);return b;}
  if(s.kind==='list'&&s.quickFilters&&s.quickFilters.length){bar.textContent='';s.quickFilters.forEach(function(q){var name=labels[q.id];var b=button(name?t(name[0],name[1]):q.label,'quick-'+q.id.replace(/:/g,'-'),function(){a.save();s.quickFilter=q.id;s.collection='quick';s.sort='source';s.startRow=0;s.scroll=0;var queries=root.PlayerCore.copy(q.queries);s.query=a.site.virtual?{type:s.type,quickQueries:queries}:root.PlayerCore.copy(queries[a.site.id]);s.query.type=s.type;s.focusKey=b.getAttribute('data-focus');a.loadList(false);});if(s.quickFilter===q.id){b.classList.add('selected');b.setAttribute('aria-pressed','true');}});}
  var filters=parent.querySelector('[data-focus=filters]');
  if(!filters)filters=button(tr('Filtreler'),'filters',function(){localFilters(a);});
  filters.textContent=t('Filtrele','Filter');
  bar.appendChild(sort);bar.appendChild(filters);
  if(s.localType&&s.localType!=='all'||s.quickFilter||s.query&&typeof s.query==='object'&&s.query.filters&&Object.keys(s.query.filters).length)button(t('Filtreleri temizle','Clear filters'),'filters-clear',function(){reset(a,s);});
  if(!bar.querySelector('[data-toolbar-count]')){var count=document.createElement('span');count.className='catalog-note';count.setAttribute('data-toolbar-count','true');count.textContent=a.gridItems(s).length+t(' içerik',' items');heading.appendChild(count);}
 }
 function panel(a){var p=a.panel;if(!p||p.kind!=='catalog-local-filter')return false;var box=document.getElementById('catalog-modal-card'),host=document.getElementById('catalog-modal');host.style.display='block';box.textContent='';var h=document.createElement('h2');h.textContent=tr('Filtreler');box.appendChild(h);[['all',tr('Tümü')],['movie',tr('Filmler')],['series',tr('Diziler')]].forEach(function(v){var b=document.createElement('button');b.className='filter-field'+(((a.screen.kind==='search'?a.screen.tab:a.screen.localType)||'all')===v[0]?' selected':'');b.textContent=v[1];b.setAttribute('data-focus','local-filter-'+v[0]);b.onclick=function(){var s=a.screen;if(s.kind==='search')s.tab=v[0];else s.localType=v[0];s.startRow=0;s.scroll=0;a.closePanel(false);a.render(true);a.focus('filters');};box.appendChild(b);});var back=document.createElement('button');back.className='filter-field';back.textContent=tr('Geri');back.setAttribute('data-focus','panel-cancel');back.onclick=function(){a.closePanel(true);};box.appendChild(back);box.querySelector('button').focus();return true;}
 function move(a,code){
  if(a.panel)return false;var active=document.activeElement,key=active&&active.getAttribute('data-focus'),s=a.screen;if(!active||!s)return false;
  var header=['search-activate','search-submit','search-clear','search-recent','catalog-tools','site-change'];
  if((code===37||code===39)&&header.indexOf(key)>=0){var i=header.indexOf(key),step=code===39?1:-1,next=i+step,node;while(next>=0&&next<header.length){node=a.findFocus(header[next]);if(node&&!node.disabled&&node.offsetWidth){focusControl(a,node);break;}next+=step;}return true;}
  var bar=active.closest?active.closest('.fm-catalog-toolbar'):null;
  if(bar){s.toolbarFocus=key;var buttons=Array.prototype.filter.call(bar.querySelectorAll('button'),function(b){return !b.disabled&&b.offsetWidth;});if(code===37||code===39){var index=buttons.indexOf(active),wanted=buttons[Math.max(0,Math.min(buttons.length-1,index+(code===39?1:-1)))];if(wanted){focusControl(a,wanted);var x=wanted.getBoundingClientRect(),clip=bar.getBoundingClientRect();if(x.right>clip.right)bar.scrollLeft+=x.right-clip.right;if(x.left<clip.left)bar.scrollLeft-=clip.left-x.left;}return true;}if(code===40){var card=a.findFocus(s.lastGridFocus||'card-0')||document.querySelector('.catalog-card[data-focus]');if(card)a.focus(card.getAttribute('data-focus'),false);return true;}}
  if(active.hasAttribute('data-card-index')){s.lastGridFocus=key;if(code===38){var index=Number(active.getAttribute('data-card-index'));if(index<(s.startRow||0)*6+6){var toolbar=document.querySelector('.fm-catalog-toolbar'),target=toolbar&&(a.findFocus(s.toolbarFocus)||toolbar.querySelector('button:not([disabled])'));if(target)focusControl(a,target);return !!target;}}}
  return false;
 }
 function section(s){return !s?'':s.kind==='list'?(s.title==='Keşfet'?'discover':s.type==='series'?'series':'movies'):['watchlist','history','search'].indexOf(s.kind)>=0?s.kind:'';}
 function remember(a){var s=a.screen,k=section(s);if(k&&!s.loading&&!(s.unifiedProgress&&s.unifiedProgress.running)){a.sectionViews=a.sectionViews||{};a.sectionViews[k]=s;}}
 function restore(a,kind){var s=a.sectionViews&&a.sectionViews[kind];if(!s)return false;a.screen=s;if(s.kind==='watchlist')s.items=a.library.favorites();a.render(true);if(!a.focus(s.focusKey||'search-activate',false))focusControl(a,a.findFocus('search-activate'));return true;}
 root.CatalogToolbar={draw:draw,panel:panel,move:move,reset:reset,validQuickFilters:valid,remember:remember,restore:restore};
})(window);
