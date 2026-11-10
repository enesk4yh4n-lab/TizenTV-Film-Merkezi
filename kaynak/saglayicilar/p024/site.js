/* Private ES5 site package. */
(function(shared){'use strict';var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.11.1');
/* Inert public-page adapter. No website script is executed. */
(function (root) {
  'use strict';
  var c = {"id":"p024","name":"P024","base":"https://www.avsarfilm.com.tr","family":"avsar","home":"/","movies":"/film","series":"/dizi","search":"/ara?search=","cards":"a[href*=\"/watch/\"]","origins":["https://www.avsarfilm.com.tr","https://www.youtube.com","https://youtubei.googleapis.com","https://*.googlevideo.com"]}, U = root.CatalogUtils, D = root.WebPlayerData, base = c.base;
  function fail(stage, message) { return D.fail(stage, c.name + ' · ' + message); }
  function safe(value, page) { var u = D.publicUrl(value, page || base + '/'); return u && new root.URL(u).origin === base ? u : ''; }
  function text(n, selector) { n = selector ? n.querySelector(selector) : n; return U.clean(n && n.textContent); }
  function env(body) { if (typeof body !== 'string' || body.length > 2097152) throw fail('decode', 'Yanıt boyut sınırı aşıldı.'); if (/cf-chl-|challenge-platform|<title>Just a moment/i.test(body)) throw fail('access', 'Site insan doğrulaması istiyor.'); return U.envelope(body); }
  function path(url) { return new root.URL(url).pathname; }
  function kind(url, node) {
    url = safe(url); if (!url) return '';
    var p = path(url), im = node && node.querySelector('img'), image = im && (im.getAttribute('data-catalog-src') || im.getAttribute('data-src') || '');
    if (c.family === 'now') return /^\/[^/]+\/bolum\/\d+\/?$/.test(p) ? 'episode' : /^\/[^/]+\/izle\/?$/.test(p) ? 'series' : '';
    if (c.family === 'avsar') return /^\/watch\/[^/]+\/s\d+e\d+\/?$/.test(p) ? 'episode' : /^\/watch\/[^/]+\/?$/.test(p) ? (/\/series\//.test(image) || !/film/i.test(p) ? 'series' : 'movie') : '';
    if (/^\/dizi\/[^/]+\/(?:sezon-\d+\/bolum-\d+|\d+-sezon-\d+-bolum)\/?$/.test(p) || /\d+-sezon-\d+-bolum/.test(p)) return 'episode';
    if (/^\/dizi\/[^/]+\/?$/.test(p)) return 'series';
    if (/^\/film\/[^/]+\/?$/.test(p)) return 'movie';
    if ((c.family === 'wp' || c.family === 'nadir' || c.family === 'sinek' || c.family === 'lider') && /^\/[^/.]+\/?$/.test(p) && !/^\/(?:filmler|diziler|film|dizi|ara|arama|iletisim|hakkimizda|giris|kayit|seri-filmler|film-istekleri|en-cok-begenilen-filmler|en-cok-izlenen-filmler|turkce-dublaj-filmler)\/?$/.test(p)) return 'movie';
    return '';
  }
  function contentId(url, type) { return c.id + ':' + type + ':' + path(url).replace(/^\/+|\/+$/g, ''); }
  function image(box, page) { var n = box && box.querySelector('img'); return D.publicUrl(n && (n.getAttribute('data-src') || n.getAttribute('data-original') || n.getAttribute('data-catalog-src')), page) || ''; }
  function list(body, page) {
    var d = env(body).doc, cards = [], seen = {}, scope = d.querySelector('main') || d;
    var queryUrl=new root.URL(page),search=queryUrl.searchParams.get('s')||queryUrl.searchParams.get('search')||queryUrl.searchParams.get('q')||'';
    if(search){var selector=c.family==='nadir'?'.nf-discovery-results':c.family==='wp'?'.search-results':c.family==='ink'?'#results':c.family==='best'?'.hdf-film-list':null;if(selector){scope=d.querySelector(selector);if(!scope)return {cards:[],next:null};}}
    Array.prototype.forEach.call(scope.querySelectorAll(c.cards), function (box) {
      var a = box.tagName === 'A' ? box : box.querySelector('a[href]'), u = safe(a && a.getAttribute('href'), page), type = kind(u, box), im = box.querySelector('img');
      if (!u || !type || type === 'episode' || !im || seen[u]) return;
      // Only broadcaster series poster URLs belong to the NOW catalog. No programs/trailers.
      if (c.family === 'now' && !box.querySelector('.program-name')) return;
      var title = U.clean(im.getAttribute('alt') || text(box, c.family === 'now' ? '.program-name' : 'h2, h3') || a.getAttribute('title')).replace(/\s+Poster$/i, ''), year = /\b((?:19|20)\d{2})\b/.exec(text(box));
      if (!title || /logo|Filmi Başlat/i.test(title)) return;
      var original=text(box,'.original-title, .original-name, .movie-original-title');
      function words(value){return U.clean(value).toLocaleLowerCase('tr').replace(/[\u0131\u0130]/g,'i').replace(/[^a-z0-9\u00c0-\u024f]+/g,' ').split(' ').filter(function(v){return !!v;});}
      if(search){var names=words(title+' '+original).join(' ');if(!words(search).every(function(token){return names.indexOf(token)>=0;}))return;}
      seen[u] = true; cards.push({ contentId: contentId(u, type), providerId: c.id, type: type, pageUrl: u, title: title, rawTitle: title, originalTitle:original, poster: image(box, page), year: year ? Number(year[1]) : null, imdb: null, language: '' });
    });
    var n = d.querySelector('a[rel="next"], .nav-links a.next, .pagination a.next, a.next.page-numbers'), next = safe(n && n.getAttribute('href'), page);
    return { cards: cards, next: next && next !== page ? { url: next, from: page } : null };
  }
  function episodeInfo(url) {
    var p = path(url), m = /\/s(\d+)e(\d+)/i.exec(p) || /\/sezon-(\d+)\/bolum-(\d+)/.exec(p) || /(\d+)-sezon-(\d+)-bolum/.exec(p);
    if (m) return { season: Number(m[1]), number: Number(m[2]) };
    m = /\/bolum\/(\d+)/.exec(p); return m ? { season: 1, number: Number(m[1]) } : null;
  }
  function parent(url) { var p = path(url); if (/^\/bolum\//.test(p)) return base + '/dizi/' + p.split('/')[2].replace(/-\d+-sezon-\d+-bolum.*$/, '') + '/'; if (c.family === 'now') return base + '/' + p.split('/')[1] + '/izle'; return base + p.replace(/\/s\d+e\d+\/?$|\/sezon-\d+\/bolum-\d+\/?$|\/\d+-sezon-\d+-bolum\/?$/i, '/'); }
  function detail(body, card) {
    var e = env(body), d = e.doc, url = safe(card.pageUrl), type = kind(url), own = e.schema.filter(function (s) { return /^(Movie|TVSeries|TVEpisode)$/.test(s['@type']) && (!s.url || safe(s.url) === url); })[0] || {}, title = U.clean(own.name) || text(d, c.family === 'avsar' ? 'h2.title' : 'h1') || card.title;
    if(c.family==='now')title=title.replace(/\s*[-\u2013]\s*B\u00d6L\u00dcMLER$/i,'');
    if (!url || !type || !title) throw fail('detail', 'İçerik bilgisi bulunamadı.');
    // Site category labels do not override structured content evidence.
    if (own['@type'] === 'TVSeries') type = 'series';
    if(c.family==='avsar'&&card.type==='movie')type='movie';
    var og = d.querySelector('meta[property="og:image"]'), r = {contentId: contentId(url, type), providerId: c.id, type: type, pageUrl: url, title: title, rawTitle: title, originalTitle: U.clean(own.alternateName), poster: D.publicUrl(typeof own.image === 'string' ? own.image : og && og.content, url) || card.poster || '', description: U.clean(own.description) || text(d, '[itemprop="description"], .summary, .description, .nf3-synopsis'), genres: typeof own.genre === 'string' ? own.genre.split(',') : own.genre || [], year: card.year || null, imdb: Number(own.aggregateRating && own.aggregateRating.ratingValue) || null, cast: [], sources: [], subtitles: [], seasons: [], episodes: []}, y = /\b((?:19|20)\d{2})\b/.exec(String(own.dateCreated || own.releaseDate || own.startDate || ''));
    if (y) r.year = Number(y[1]);
    if (c.family === 'now') { var btn=d.querySelector('.ajax-load-more-video[data-program-id][data-type="2"]'); if(btn){r.episodeQuery={program_id:btn.getAttribute('data-program-id'),count:Number(btn.getAttribute('data-count'))||5};r.knownSeasons=[];Array.prototype.forEach.call(d.querySelectorAll('#video-filter-changer > option'),function(n){var value=Number(n.value);if(value>0&&r.knownSeasons.indexOf(value)<0)r.knownSeasons.push(value);});} }
    if (type === 'episode') {
      r.episode = episodeInfo(url);r.seriesPageUrl=safe(card.seriesPageUrl)||parent(url);
      var parents=[];Array.prototype.forEach.call(d.querySelectorAll('.hdf-bolum-nav a[href], .sidebar-ep a[href], .breadcrumb a[href], .breadcrumbs a[href]'),function(a){var value=safe(a.getAttribute('href'),url);if(value&&kind(value)==='series'&&parents.indexOf(value)<0)parents.push(value);});
      if(parents.length===1)r.seriesPageUrl=parents[0];
    }
    var seriesUrl = type === 'episode' ? parent(url) : url, seen = {};
    Array.prototype.forEach.call(d.querySelectorAll(c.family === 'best' ? '.hdf-bolum-listesi a[href]' : c.family === 'ink' ? '#seasons a[href]' : 'a[href]'), function (a) {
      var u = safe(a.getAttribute('href'), url), k = u && kind(u), info = k === 'episode' && episodeInfo(u);
      if (!info || (!/^\/bolum\//.test(path(u)) && parent(u).replace(/\/$/, '') !== seriesUrl.replace(/\/$/, '')) || seen[u]) return;
      seen[u] = true; var ep = { contentId: contentId(u, 'episode'), providerId: c.id, type: 'episode', pageUrl: u, seriesPageUrl:seriesUrl, title: U.clean(a.getAttribute('title') || text(a)) || info.number + '. Bölüm', poster: image(a, url) || r.poster, episode: { season: info.season, number: info.number, seriesId: contentId(seriesUrl, 'series'), seriesTitle: title } };
      r.episodes.push(ep); if (r.seasons.indexOf(info.season) < 0) r.seasons.push(info.season);
    });
    r.episodes.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; }); r.seasons.sort(function (a, b) { return a - b; });
    return r;
  }
  function Provider(cache, network) { root.CatalogClient.call(this, cache, network || root.ChainNetwork.createClient({destination:'downloads'}), {base:base,postHeaders:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'}}); }
  Provider.prototype = Object.create(root.CatalogClient.prototype); Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url, parse, force, scope) { url = safe(url); return url ? this.request(url, null, parse, force, c.id + '-1-' + scope) : Promise.reject(fail('page', 'Site dışı katalog isteği reddedildi.')); };
  Provider.prototype.home = function (force) { var url = base + c.home; return this.fetch(url, function (body) { var v = list(body, url); return {hero:v.cards[0] || null, movies:v.cards.filter(function(x){return x.type==='movie';}), series:v.cards.filter(function(x){return x.type==='series';})}; }, force, 'home'); };
  Provider.prototype.nowArchive = function (next, force) {
    var self=this,page=next&&next.page||0,count=10;
    if(page<0||page%1||page>200)return Promise.reject(fail('page','Arşiv sayfası geçersiz.'));
    if(!page)return this.fetch(base+'/dizi-arsivi',function(body){var v=list(body,base+'/dizi-arsivi'),d=env(body).doc,n=d.querySelector('.ajax-load-more-archive[data-type="series"]');v.next=n&&Number(n.getAttribute('data-rows'))>v.cards.length?{page:Number(n.getAttribute('data-page')),count:Number(n.getAttribute('data-count'))}:null;return v;},force,'archive');
    var body='page='+page+'&type=series&count='+count+'&orderBy=id&sorting=desc';
    return this.request(base+'/ajax/archive',body,function(body){var v=json(body);if(typeof v.data!=='string'||!isFinite(Number(v.count)))throw fail('api','Arşiv yanıtı geçersiz.');var result=list('<main><section class="videos">'+v.data+'</section></main>',base+'/dizi-arsivi');result.next=(page+1)*count<Number(v.count)?{page:page+1,count:count}:null;return result;},force,c.id+'-archive');
  };
  Provider.prototype.list = function (q, next, force) { q=q||{};if(c.family==='now')return this.nowArchive(next,force); var first = base + (q.type === 'series' ? c.series || c.home : c.movies || c.home), url = next && next.url || first; return this.fetch(url, function(body){var v=list(body,url); if(q.type)v.cards=v.cards.filter(function(x){return x.type===q.type;}); return v;}, force, 'list'); };
  Provider.prototype.search = function (query, force, next) {
    query=U.clean(query);if(!query||query.length>100)return Promise.reject(fail('search','Arama 1–100 karakter olmalı.'));
    if(c.family==='now'){var self=this,token=this.generation,began=Date.now(),cards=[],seen={},pages=0;
      function add(values){values.forEach(function(x){if(!seen[x.contentId]){seen[x.contentId]=true;cards.push(x);}});}
      function more(next){if(token!==self.generation)throw fail('cancel','İptal edildi.');if(Date.now()-began>=25000||pages++>=20)return Promise.reject(fail('timeout','Dizi arşivi arama bütçesi doldu.'));return self.nowArchive(next,force).then(function(v){add(v.cards);return v.next?more(v.next):null;});}
      return this.home(force).then(function(v){add(v.series);return more(null);}).then(function(){var term=query.toLocaleLowerCase('tr');return {cards:cards.filter(function(x){return x.title.toLocaleLowerCase('tr').indexOf(term)>=0;}),next:null};});
    }
    var url=c.search?base+c.search+encodeURIComponent(query):base+c.home;
    if(next)url=next.url;
    return this.fetch(url,function(body){var v=list(body,url);if(c.family==='now'){var term=query.toLocaleLowerCase('tr');v.cards=v.cards.filter(function(x){return x.title.toLocaleLowerCase('tr').indexOf(term)>=0;});}return v;},force,'search');
  };
  Provider.prototype.detail = function (card, force) { var self=this,token=self.generation,began=Date.now();return self.fetch(card.pageUrl,function(body){return detail(body,card);},force,'detail').then(function(d){if(d.type!=='episode'||!d.seriesPageUrl)return d;return self.fetch(d.seriesPageUrl,function(body){var v=detail(body,{pageUrl:d.seriesPageUrl,title:d.title,poster:d.poster});v.selectedEpisodePageUrl=d.pageUrl;return v;},force,'series');}).then(function(d){
    if(c.family!=='now'||d.type!=='series')return d;
    return self.fetch(base+'/'+path(d.pageUrl).split('/')[1]+'/bolumler',function(body){var v=detail(body,d);v.selectedEpisodePageUrl=d.selectedEpisodePageUrl;return v;},force,'series-index').then(function(d){
      if(!d.episodeQuery||!d.knownSeasons.length){d.episodePagesIncomplete=true;return d;}
      var seasons=d.knownSeasons.slice(0,40),all={},pages=0;
      function load(season,page){if(token!==self.generation)throw fail('cancel','İptal edildi.');if(Date.now()-began>=25000||pages++>=40){d.episodePagesIncomplete=true;return Promise.resolve();}
        var q=d.episodeQuery,body='filter=season&program_id='+encodeURIComponent(q.program_id)+'&season='+season+'&page='+page+'&type=2&count='+q.count+'&orderBy=id&sorting=DESC';
        return self.request(base+'/ajax/videos',body,function(body){var v=json(body);if(v.code!==200||typeof v.data!=='string'||!isFinite(Number(v.count)))throw fail('api','Bölüm listesi yanıtı geçersiz.');var parsed=detail('<h1>'+d.title.replace(/[<>&]/g,'')+'</h1>'+v.data,d);return {episodes:parsed.episodes,count:Number(v.count)};},force,c.id+'-episodes').then(function(v){v.episodes.forEach(function(ep){ep.episode.season=season;all[ep.pageUrl]=ep;});if((page+1)*q.count<v.count)return load(season,page+1);});
      }
      function next(){var season=seasons.shift();return season?load(season,0).then(next):Promise.resolve();}
      return next().then(function(){if(Object.keys(all).length){d.episodes=Object.keys(all).map(function(k){return all[k];}).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});d.seasons=d.knownSeasons.slice().sort(function(a,b){return a-b;});}return d;});
    });
  }); };
  Provider.prototype.options = function(){return Promise.resolve({genres:[],years:[],lang:[],imdb:[]});};
  function json(body) { try { return JSON.parse(body); } catch(ignore){throw fail('api','API yanıtı JSON değil.');} }
  function literal(body, re) { var m=re.exec(body); return m?D.literal(body,m.index+m[0].length).value:''; }
  function permitted(url) { var u=D.publicUrl(url);if(!u)return '';var origin=new root.URL(u).origin;return c.origins.some(function(o){if(o.indexOf('https://*.')!==0)return origin===o;var h=new root.URL(u).hostname,suffix=o.slice(10);return h.length>suffix.length&&h.slice(-suffix.length-1)==='.'+suffix;})?u:''; }
  function entry(url, label, mode, data) { return {url:url,label:label||'Kaynak',mode:mode||'embed',data:data||null}; }
  function sourceId(e) {
    var u=new root.URL(e.url),parts=[e.mode,u.origin,u.pathname,u.hash],data=e.data||{},h=2166136261,i;
    ['tmdb','id','v'].forEach(function(k){var v=u.searchParams.get(k);if(v)parts.push(k+'='+v);});
    ['video_id','post_id','player_name','i'].forEach(function(k){if(data[k]!==undefined)parts.push(k+'='+data[k]);});
    var value=parts.join('|');for(i=0;i<value.length;i++){h^=value.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}
    return c.id+'-'+(h>>>0).toString(16);
  }
  function alternatives(body, page) {
    var doc=D.doc(body),out=[],m;
    function add(url,label,mode,data){url=D.publicUrl(url,page);if(url&&!out.some(function(x){return x.url===url&&x.label===label;}))out.push(entry(url,label,mode,data));}
    if(c.family==='now') { var n=doc.querySelector('.vod-player[data-video-id][data-program-id]');if(n && /^\d+$/.test(n.getAttribute('data-video-id')) && kind(page)==='episode')add(base+'/ajax/stream','NOW tam bölüm','now',{video_id:n.getAttribute('data-video-id')}); }
    else if(c.family==='best'){var p=doc.querySelector('.hdf-player--area .hdf-pjs[data-post]'),nonce=literal(body,/\b_hdfNonce_\s*=\s*/);if(p&&/^\d+$/.test(p.getAttribute('data-post'))&&nonce)add(base+'/ajax/videosrc/?id='+encodeURIComponent(p.getAttribute('data-post'))+'&lang=0&mr=0','Tam video','best',{nonce:nonce});}
    else if(c.family==='ink') { var nonceMatch=/\bvideo:\s*["']([a-f0-9]+)["']/.exec(body);Array.prototype.forEach.call(doc.querySelectorAll('.sourceslist [data-post-id][data-player-name]'),function(n){if(nonceMatch)add(base+'/wp-admin/admin-ajax.php',text(n)||n.getAttribute('data-player-name'),'ink',{nonce:nonceMatch[1],post_id:n.getAttribute('data-post-id'),player_name:n.getAttribute('data-player-name')});}); }
    else if(c.family==='lider') { var b=literal(body,/\bwindow\._vs\s*=\s*/);if(b){var values=json(D.b64(b));if(!Array.isArray(values)||values.length>16)throw fail('decode','Kaynak listesi bozuk.');values.forEach(function(x){if(x.id!=='trailer')add(x.url,x.id);});} }
    else if(c.family==='sinema') { var csrf=doc.querySelector('meta[name="csrf-token"]');Array.prototype.forEach.call(doc.querySelectorAll('[x-data]'),function(n){var raw=n.getAttribute('x-data')||'',head=/^bx\(JSON\.parse\(\s*/.exec(raw);if(!head||!csrf)return;var values=json(D.literal(raw,head[0].length).value);if(!Array.isArray(values)||values.length>16)throw fail('decode','Kaynak listesi geçersiz.');values.forEach(function(v,i){if(typeof v.i==='number'&&/^[a-f0-9.]+$/.test(v.s||''))add(base+'/px','Kaynak '+(i+1),'sinema',{i:v.i,s:v.s,csrf:csrf.content});});}); }
    else if(c.family==='sinek') { var re=/\bloadFilmPlayer\(\s*this\s*,\s*(["'])(https:\/\/[^"']+)\1\s*\)/g;while((m=re.exec(body)))add(m[2],'PlayTurka'); }
    else { var selector=c.family==='nadir'?'[data-nfp-embed] iframe[data-nfp-src]':c.family==='avsar'?'.video-player iframe, iframe[data-frame-src*="youtube.com/embed/"]':'#player iframe, .player iframe, .film-player iframe, .video-player iframe, iframe[data-frame-src*="ok.ru/videoembed/"]';
      Array.prototype.forEach.call(doc.querySelectorAll(selector),function(n){var u=n.getAttribute('data-nfp-src')||n.getAttribute('data-frame-src')||n.getAttribute('data-src');if(!/fragman|trailer/i.test(n.getAttribute('title')||''))add(u,n.getAttribute('title')||'Kaynak');}); }
    if(!out.length)throw fail('unavailable','Tam video kaynağı bulunamadı. Fragmanlar oynatma kaynağı olarak kullanılmaz.');
    return out.slice(0,16);
  }
  function media(url,ref,extra) {url=D.publicUrl(url,ref);if(!url)throw fail('decode','Geçersiz medya adresi.');var result={url:url,referer:ref,type:/\.mp4(?:[?#]|$)/i.test(url)?'mp4':'hls',subtitles:[]};Object.keys(extra||{}).forEach(function(k){result[k]=extra[k];});return result;}
  function resolveEntry(e,get,request,check,depth) {
    depth=depth||0;if(depth>4)return Promise.reject(fail('decode','Oynatıcı yönlendirme sınırı aşıldı.'));
    var url=permitted(e.url);if(!url)return Promise.reject(fail('permission','Kaynak kökeni bu paketin doğrulanmış izinlerinde yok.'));
    if(e.mode==='now')return request(url,base+'/','api','video_id='+encodeURIComponent(e.data.video_id),{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'}).then(function(r){var v=json(r.body);if(v.code!==200||!v.video_url)throw fail('unavailable','NOW bu bölüm için medya vermedi.');return media(v.video_url,base+'/');});
    if(e.mode==='best')return request(url,base+'/','api','',{'X-HDF-Nonce':e.data.nonce}).then(function(r){var v=json(r.body);if(v.sonuc!=='ok'||!v.src)throw fail('unavailable','Site oynatma izni veya kaynak vermedi.');return media(v.src,base+'/',{subtitles:(v.tracks||[]).map(function(t,i){return {id:'sub-'+i,url:D.publicUrl(t.src),language:t.srclang||'',label:t.label||t.srclang||'',format:'vtt'};})});});
    if(e.mode==='sinema')return request(url,base+'/','api','i='+encodeURIComponent(e.data.i)+'&s='+encodeURIComponent(e.data.s),{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-TOKEN':e.data.csrf,'X-Requested-With':'XMLHttpRequest','Accept':'application/json'}).then(function(r){var v=json(r.body);if(!v.u)throw fail('unavailable','Site oynatıcı adresi vermedi.');return resolveEntry(entry(v.u,e.label),get,request,check,depth+1);});
    if(e.mode==='ink')return request(url,base+'/','api','action=get_video_url&nonce='+encodeURIComponent(e.data.nonce)+'&post_id='+encodeURIComponent(e.data.post_id)+'&player_name='+encodeURIComponent(e.data.player_name)+'&part_key=0',{'Content-Type':'application/x-www-form-urlencoded'}).then(function(r){var v=json(r.body);if(!v.success||!v.data||!v.data.url)throw fail('unavailable','Site kaynak vermedi; giriş veya erişim izni gerekebilir.');return resolveEntry(entry(v.data.url,e.label),get,request,check,depth+1);});
    if(new root.URL(url).hostname==='p.playturka.space' && /^#[a-z0-9_-]+$/i.test(new root.URL(url).hash)){var key=new root.URL(url).hash.slice(1);return get('https://p.playturka.space/api/video-url?id='+encodeURIComponent(key),base+'/','api').then(function(r){return root.FilmizleHellDecoder.settings(r.body,key);});}
    return get(url,base+'/','embed').then(function(r){check();var doc=D.doc(r.body),p=new root.URL(url),v,n;
      if(p.hostname==='ok.ru')return D.ok(r.body,url);
      if(p.hostname==='setplay.sbs') {
        var frame=doc.querySelector('iframe#b2'), call=/\bSPG\.cerceve\(\s*["']b2["']\s*,\s*/.exec(r.body);
        if(frame&&call){var first=D.literal(r.body,call.index+call[0].length),comma=/^\s*,\s*/.exec(r.body.slice(first.end)),second=comma&&D.literal(r.body,first.end+comma[0].length);
          if(!second||first.value.length>16384||second.value.length>1024)throw fail('decode','SetPlay veri kaydı geçersiz.');
          var a=root.CryptoJS.enc.Base64.parse(first.value).toString(root.CryptoJS.enc.Latin1),b=root.CryptoJS.enc.Base64.parse(second.value).toString(root.CryptoJS.enc.Latin1),decoded='',i;
          if(!a||!b)throw fail('decode','SetPlay kaynak verisi boş.');for(i=0;i<a.length;i++)decoded+=String.fromCharCode(a.charCodeAt(i)^b.charCodeAt(i%b.length));
          return resolveEntry(entry(D.publicUrl(decoded.split('|')[0],url),e.label),get,request,check,depth+1);
        }
      }
      if(p.hostname==='fastplay.mom'&&/\bwindow\.FSP\s*=\s*\{/.test(r.body)) {
        var config=r.body.slice(r.body.search(/\bwindow\.FSP\s*=\s*\{/),r.body.search(/\bwindow\.FSP\s*=\s*\{/)+100000),stream=literal(config,/\bstream\s*:\s*/),tracks=/\btracks\s*:\s*(\[[^\r\n]*\])/.exec(config),subs=[];
        if(tracks){var parsed=json(tracks[1]);if(Array.isArray(parsed))parsed.slice(0,32).forEach(function(t,i){if(t.kind!=='thumbnails'&&permitted(t.file))subs.push({id:'fsp-'+i,url:t.file,language:t.lang||'',label:t.label||t.lang||'',format:'vtt'});});}
        if(!stream)throw fail('decode','FastPlay etkin medya adresi yok.');return media(stream,url,{subtitles:subs});
      }
      if(p.hostname==='dzen.ru') {
        var metadata=doc.querySelector('meta[property="og:vh-uuid"]'), key=/^\/embed\/([A-Za-z0-9_-]+)$/.exec(p.pathname), re=/\bvar\s+_params\s*=\s*\(/g, match, data=null;
        if(!key||!metadata||metadata.content!==key[1])throw fail('decode','Dzen video kimliği eşleşmedi.');
        while((match=re.exec(r.body))) { var value=D.object(r.body.slice(match.index),/^var\s+_params\s*=\s*\(/);value=value.ssrData&&value.ssrData.exportResponse&&value.ssrData.exportResponse.content;if(value&&value.content_id===key[1]){data=value;break;} }
        var stream=data&&Array.isArray(data.streams)&&data.streams.filter(function(s){return s.type==='hls'&&permitted(s.url);})[0];
        if(!stream)throw fail('decode','Dzen aktif HLS kaynağı bulunamadı.');return media(stream.url,url);
      }
      if(root.VidaraDecoder&&root.VidaraDecoder.host(url)){v=root.VidaraDecoder.settings(r.body,url);return request(v.api,url,'api',JSON.stringify({filecode:v.filecode,device:'web',codecs:[]}),{'Content-Type':'application/json'}).then(function(x){return root.VidaraDecoder.media(x.body,v.filecode);});}
      n=doc.querySelector('#player_iframe[data-api]');if(p.hostname==='player.nadirfilm.com'&&n){var api=D.publicUrl(n.getAttribute('data-api'),url);if(!api||new root.URL(api).origin!==p.origin)throw fail('api','Kaynak API kökeni eşleşmedi.');return get(api,url,'api').then(function(x){return resolveEntry(entry(json(x.body).src,e.label),get,request,check,depth+1);});}
      n=doc.querySelector('video source[data-frame-src], video[data-frame-src]');if(n)return media(n.getAttribute('data-frame-src'),url);
      try{return D.jw(r.body,url);}catch(ignore){}
      n=doc.querySelector('#player iframe[data-frame-src], #player_iframe[data-frame-src], iframe#player[data-frame-src]');if(n)return resolveEntry(entry(D.publicUrl(n.getAttribute('data-frame-src'),url),e.label),get,request,check,depth+1);
      throw fail('decode','Aktif oynatıcı verisi çözümlenemedi.');
    });
  }
  function Resolver(log,now){this.log=log||function(){};this.now=now||Date.now;this.generation=0;this.clients=[];}
  Resolver.prototype.cancel=function(){this.generation++;this.clients.splice(0).forEach(function(n){n.cancel();});};
  Resolver.prototype.resolve=function(content,deadline,notify,hints){
    this.cancel();var self=this,token=this.generation,sources=[],options=[],last,owned=[],progress=new root.SourceProgress(notify,hints),network=root.ChainNetwork.createClient({destination:'downloads'});self.clients.push(network);owned.push(network);
    // Native TLS intentionally permits a narrow header set. Keep custom nonce/CSRF
    // requests on platform XHR rather than silently losing their required headers.
    var apiNetwork=null,apiClient=null;
    if(c.family==='best'||c.family==='sinema'){apiNetwork=root.ChainNetwork.createClient({destination:'downloads',preferXHR:true,platformText:true});self.clients.push(apiNetwork);owned.push(apiNetwork);apiClient=progress.client(apiNetwork,check,deadline);}
    function check(){if(token!==self.generation){var e=fail('cancel','İptal edildi.');e.cancelled=true;throw e;}if(self.now()>=deadline)throw fail('timeout','Kaynak hazırlama süresi doldu.');}
    var client=progress.client(network,check,deadline);
    function request(url,ref,stage,body,headers){check();if(!permitted(url))return Promise.reject(fail('permission','İstek kökeni pakette izinli değil.'));var transport=apiClient&&headers&&(headers['X-HDF-Nonce']||headers['X-CSRF-TOKEN'])?apiClient:client;return (body===undefined?transport.get(url,ref,headers):transport.post(url,body,headers)).then(function(r){check();return r;},function(e){check();if(/HTTP\s*419\b/.test(e.message||''))throw fail('access','Site oturum doğrulaması istiyor (HTTP 419).');e.stage=e.stage||stage;throw e;});}
    function get(url,ref,stage){return request(url,ref,stage);}
    function publish(){progress.publish(sources,options);}
    function release(task){var i=self.clients.indexOf(task);if(i>=0)self.clients.splice(i,1);i=owned.indexOf(task);if(i>=0)owned.splice(i,1);}
    function finish(){owned.slice().forEach(function(n){release(n);n.cancel();});}
    var work=Promise.resolve().then(function(){check();if(!safe(content.pageUrl)||!kind(content.pageUrl))throw fail('page','Geçersiz içerik adresi.');return get(content.pageUrl,base+'/','page');}).then(function(r){detail(r.body,content);var jobs=alternatives(r.body,content.pageUrl).map(function(e){e.sourceId=sourceId(e);options.push({sourceId:e.sourceId,label:e.label,status:'pending',pageUrl:content.pageUrl});return e;});jobs=progress.order(jobs,function(e){return {id:e.sourceId,label:e.label};});publish();
      function next(){check();var e=jobs.shift();if(!e)return;var o=options.filter(function(x){return x.sourceId===e.sourceId;})[0];return progress.wait(check).then(function(){check();o.status='resolving';publish();var u=new root.URL(e.url),yt=/^\/embed\/([a-zA-Z0-9_-]{11})/.exec(u.pathname);
        if(c.family==='avsar'&&u.hostname==='www.youtube.com'&&yt){if(!root.YoutubeSource)throw fail('unsupported','YouTube çözümleyicisi yok.');var task=root.YoutubeSource.createTask(yt[1],deadline,self.log,hints);self.clients.push(task);owned.push(task);return task.promise.then(function(s){release(task);check();s.id=e.sourceId;s.label=e.label;sources.push(s);o.status='ready';},function(e){release(task);throw e;});}
        return resolveEntry(e,get,request,check).then(function(data){check();return (data.type==='mp4'?Promise.resolve(null):request(data.url,data.referer||e.url,'manifest')).then(function(r){if(r&&!/^\s*#EXTM3U/.test(r.body))throw fail('manifest','HLS yerine farklı yanıt alındı.');var source={id:e.sourceId,label:e.label,url:data.url,type:data.type,status:data.type==='mp4'?'candidate':'ready',referer:data.referer||e.url,transport:r&&/^XHR/.test(r.method)?'xhr':'native',destination:'downloads',subtitles:data.subtitles||[]};sources.push(source);o.status=source.status;});});
      }).catch(function(err){check();last=err;o.status='error';o.stage=err.stage||'decode';o.detail=root.PlayerCore.safeMessage(err.message);}).then(function(){check();publish();return next();});}
      return next();
    }).then(function(){check();sources.options=options;if(!sources.length){var e=last||fail('decode','Oynatılabilir kaynak bulunamadı.');e.sourceOptions=options;throw e;}return sources;});
    return work.then(function(v){finish();return v;},function(e){finish();throw e;});
  };
  root.SiteRegistry.register({id:c.id,name:c.name,base:base,prefix:c.id+':',storagePrefix:'site.'+c.id+'.',mark:c.name,subtitle:c.name,contentTypes:c.family==='now'?['series']:c.series?['movie','series']:['movie'],collectionKeys:['new'],Provider:Provider,Resolver:Resolver,ui:{movieRail:'Filmler',seriesRail:'Diziler',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:base+(type==='series'?c.series||c.home:c.movies||c.home)};},filterFields:function(){return [];}});
})(window);

})(window);
