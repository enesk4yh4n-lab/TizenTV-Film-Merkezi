/* TV catalog, focus and IME lifecycle. Rendering uses text nodes, never site markup. */
(function (root) {
 'use strict';
 var P = root.CatalogParser, copy = root.PlayerCore.copy, COLS = 6, ROW_HEIGHT = 430;
 function el(id) { return document.getElementById(id); }
 function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
 function button(text, key, action, cls) { var n = node('button', cls || '', text); n.type = 'button'; n.setAttribute('data-focus', key); if (action) n.addEventListener('click', action); return n; }
 function App(app, storage) {
  var self = this; this.app = app; this.library = new root.CatalogStore(storage, function (message) { app.view.toast(message); }); this.cache = new root.CatalogCache(storage);
  this.series = new root.SeriesState(storage, function (message) { app.view.toast(message); });
  this.library.playback = app.store; this.provider = new root.CatalogProvider(this.cache); this.images = new root.CatalogImages(); this.screen = null; this.history = []; this.generation = 0; this.editing = false; this.panel = null; this.suspended = false; this.searchType = 'all';
  app.store.on('checkpoint', function (event) { self.series.record(self.library.get(event.contentId), event.entry); });
  app.store.on('clear', function (ids) { self.series.clearMarks(ids); });
  Object.keys(app.contents).forEach(function (key) { var content = app.contents[key]; if (content.pageUrl && !self.library.get(content.contentId)) self.library.remember(content); });
  el('search-activate').addEventListener('click', function () { self.edit(); });
  el('catalog-search').addEventListener('input', function () { if (this.value.length > 100) this.value = this.value.slice(0, 100); });
  el('catalog-search').addEventListener('blur', function () { if (self.editing) { self.editing = false; el('search-activate').style.display = ''; el('catalog-search').tabIndex = -1; } });
  el('search-submit').addEventListener('click', function () { self.search(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (n) { n.addEventListener('click', function () { self.navigate(n.getAttribute('data-nav')); }); });
  el('catalog-tools').addEventListener('click', function () { self.openTools(); });
  document.addEventListener('keydown', function (e) { self.key(e); });
  el('catalog-scroll').addEventListener('scroll', function () {
   if (self.scrollTimer) return; self.scrollTimer = setTimeout(function () { self.scrollTimer = null; self.onScroll(); }, 60);
  });
  app.controller.on('open', function (content) { if (!self.suspended) self.save(); if (self.screen && self.screen.checking) { self.screen.checking = false; self.screen.checkNote = 'Kontrol durduruldu.'; } self.suspended = true; self.generation++; self.provider.cancel(); self.images.stop(); self.library.rememberPlayback(content); });
  app.controller.on('close', function (result) { if (!result.content || result.reason === 'replace') return; self.suspended = false; if (result.reason !== 'hidden' && result.reason !== 'unload' && self.returnMovie(result.content)) return; self.render(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (self.screen && self.screen.checking) { self.screen.checking = false; self.screen.checkNote = 'Kontrol durduruldu.'; } self.generation++; self.provider.cancel(); self.images.stop(); self.hideKeyboard(false); } });
  this.navigate('home'); el('search-activate').focus();
 }
 App.prototype.visibleButtons = function (container) { return Array.prototype.filter.call((container || el('shell')).querySelectorAll('button'), function (n) { return !n.disabled && n.offsetWidth && n.offsetHeight; }); };
 App.prototype.findFocus = function (key) { var nodes = el('shell').querySelectorAll('[data-focus]'); for (var i = 0; i < nodes.length; i++) if (nodes[i].getAttribute('data-focus') === key) return nodes[i]; return null; };
 App.prototype.focus = function (key, scroll) { var n = typeof key === 'string' ? this.findFocus(key) : key; if (!n) return false; var area = el('catalog-scroll'), top = area.scrollTop; n.focus(); if (scroll === false) area.scrollTop = top; else if (area.contains(n)) { var r = n.getBoundingClientRect(), a = area.getBoundingClientRect(), scale = a.width / area.offsetWidth; if (r.top < a.top + 12) area.scrollTop -= (a.top + 12 - r.top) / scale; else if (r.bottom > a.bottom - 12) area.scrollTop += (r.bottom - a.bottom + 12) / scale; } this.images.visible(area); this.scheduleLanguages(true); return true; };
 App.prototype.save = function () { if (!this.screen) return; this.screen.focusKey = document.activeElement && document.activeElement.getAttribute('data-focus') || this.screen.focusKey; this.screen.scroll = el('catalog-scroll').scrollTop; };
 App.prototype.begin = function () { if (this.screen && this.screen.checking) { this.screen.checking = false; this.screen.checkNote = 'Kontrol durduruldu. Yeniden kontrol edebilirsiniz.'; } this.generation++; this.languageJobs = {}; this.provider.cancel(); this.provider.deadline = Date.now() + 30000; this.images.stop(); return this.generation; };
 App.prototype.watchEntries = function () { return this.series.entries(this.app.store.list()); };
 App.prototype.navigate = function (kind) {
  this.hideKeyboard(false); this.closePanel(false); this.save(); this.begin(); this.history = [];
  if (kind === 'movies' || kind === 'series' || kind === 'discover') { this.screen = { kind: 'list', type: kind === 'series' ? 'series' : 'movie', title: kind === 'series' ? 'Diziler' : kind === 'discover' ? 'Keşfet' : 'Filmler', filters: {}, query: { type: kind === 'series' ? 'series' : 'movie', kind: kind === 'discover' ? 'discover' : '' }, items: [], startRow: 0, scroll: 0, focusKey: 'nav-' + kind }; this.loadList(false); }
  else if (kind === 'watchlist') { this.screen = { kind: 'watchlist', title: 'Listem', items: this.library.favorites(), startRow: 0, scroll: 0, focusKey: 'nav-watchlist' }; this.render(); }
  else if (kind === 'following') { this.screen = { kind: 'following', title: 'Takip ettiğim diziler', items: this.series.following(), startRow: 0, scroll: 0, focusKey: 'following-refresh' }; this.render(); this.focus('following-refresh'); }
  else { this.screen = { kind: 'home', title: 'Ana Sayfa', loading: true, scroll: 0, focusKey: 'search-activate', railOffsets: {} }; this.render(); this.loadHome(); }
 };
 App.prototype.loadHome = function (force) {
  var self = this, s = this.screen, token = this.begin(); s.loading = true; s.error = null; this.render(true);
  this.provider.home(force).then(function (data) { if (token !== self.generation || self.screen !== s) return; s.data = data; s.loading = false; self.rememberCards(data.movies.concat(data.series)); self.render(true); self.hydrateContinue(s, token); }, function (error) { self.failure(error, s, token); });
 };
 App.prototype.hydrateContinue = function (screen, token) {
  var self = this, missing = this.library.continueWatching(this.watchEntries()).filter(function (card) { return !card.poster && card.pageUrl; }).slice(0, 2);
  missing.forEach(function (card) { self.provider.detail(card).then(function (detail) { if (token !== self.generation || self.screen !== screen || self.suspended) return; self.library.remember(detail); self.save(); self.render(true); }, function () { /* A missing poster never hides the continuation card. */ }); });
 };
 App.prototype.rememberCards = function (cards) { this.library.rememberMany(cards); };
 App.prototype.loadList = function (more, force) {
  var self = this, s = this.screen, token = this.begin(), previous = more ? s.next : null;
  if (more && !previous || s.kind !== 'list') return;
  this.save(); s.loading = true; s.error = null; if (!more) { s.items = []; s.next = null; s.startRow = 0; s.scroll = 0; } this.render(true);
  this.provider.list(s.query, previous, force).then(function (result) {
   if (token !== self.generation || self.screen !== s) return;
   var seen = {}, added = []; s.items.forEach(function (c) { seen[c.contentId] = true; });
   result.cards.forEach(function (c) { if (!seen[c.contentId]) { seen[c.contentId] = true; added.push(c); } });
   var oldLength = s.items.length; s.items = s.items.concat(added); s.next = added.length ? result.next : null; s.loading = false; s.staleAt = result.staleAt; s.refreshError = result.refreshError;
   self.rememberCards(added); if (more && added.length) { s.startRow = Math.max(0, Math.floor(oldLength / COLS) - 2); s.focusKey = 'card-' + oldLength; }
   self.render(true); if (more && added.length) self.focus(s.focusKey);
  }, function (error) { self.failure(error, s, token); });
 };
 App.prototype.failure = function (error, screen, token) { if (token !== this.generation || this.screen !== screen || /ptal/.test(error.message)) return; screen.loading = false; screen.error = error.message; this.render(true); };
 App.prototype.edit = function () { if (this.app.controller.content || this.panel) return; this.editing = true; this.editBefore = el('catalog-search').value; el('search-activate').style.display = 'none'; el('catalog-search').readOnly = false; el('catalog-search').tabIndex = 0; el('catalog-search').focus(); };
 App.prototype.hideKeyboard = function (cancel) {
  if (!this.editing) return false; this.editing = false; if (cancel) el('catalog-search').value = this.editBefore || '';
  el('catalog-search').blur(); el('catalog-search').readOnly = true; el('catalog-search').tabIndex = -1; el('search-activate').style.display = ''; el('search-activate').focus(); return true;
 };
 App.prototype.search = function (force) {
  var query = P.clean(el('catalog-search').value); this.hideKeyboard(false);
  if (!query) { this.app.view.toast('Aramak için film veya dizi adını yazın.'); return; }
  if (query.length > 100) { this.app.view.toast('En fazla 100 karakter yazabilirsiniz.'); return; }
  if (this.screen && this.screen.kind === 'search' && this.screen.query === query && this.screen.loading) return;
  this.save(); this.history = []; var s = { kind: 'search', title: 'Arama: ' + query, query: query, items: [], loading: true, startRow: 0, scroll: 0, tab: 'all', focusKey: 'search-submit' }; this.screen = s;
  var self = this, token = this.begin(); this.render();
  this.provider.search(query, force).then(function (result) { if (token !== self.generation || self.screen !== s) return; s.items = result.cards; s.loading = false; s.staleAt = result.staleAt; self.rememberCards(result.cards); self.render(true); }, function (error) { self.failure(error, s, token); });
 };
 App.prototype.movieNavigation = function (card, rail) {
  if (card.type !== 'movie') return null;
  var s = this.screen, items = s.kind === 'home' ? s.rails && s.rails[rail] ? s.rails[rail].items : [card] : s.items || [card];
  items = items.filter(function (item) { return item.type === 'movie'; }).map(function (item) { return { contentId: item.contentId, pageUrl: item.pageUrl, title: item.title, poster: item.poster || '', type: 'movie', sources: [] }; });
  return { kind: 'movies', items: items, originRail: rail === undefined ? null : rail };
 };
 App.prototype.returnMovie = function (content) {
  var s = this.screen, nav = content.navigation; if (content.type !== 'movie' || !nav || !s || s.kind !== 'detail' || s.card.contentId === content.contentId) return false;
  var parent = this.history.pop(), selected = nav.items.filter(function (item) { return item.contentId === content.contentId; })[0]; if (!selected) { if (parent) this.history.push(parent); return false; }
  if (parent) { this.screen = parent; var items = parent.kind === 'home' && parent.rails && parent.rails[nav.originRail] ? parent.rails[nav.originRail].items : parent.items || [], index = -1; if (parent.kind === 'search' && parent.tab !== 'all') items = items.filter(function (item) { return item.type === parent.tab; }); items.some(function (item, i) { if (item.contentId === content.contentId) { index = i; return true; } return false; }); if (index >= 0) { if (parent.kind === 'home') { parent.focusKey = 'rail-' + nav.originRail + '-' + index; parent.railOffsets[nav.originRail] = Math.max(0, index - 2); } else { parent.focusKey = 'card-' + index; parent.startRow = Math.max(0, Math.floor(index / COLS) - 2); parent.scroll = Math.floor(index / COLS) * ROW_HEIGHT; } } }
  var wantedFocus = parent && parent.focusKey, wantedScroll = parent && parent.scroll;
  this.openDetail(selected, false, nav); if (parent) { parent.focusKey = wantedFocus; parent.scroll = wantedScroll; } return true;
 };
 App.prototype.openDetail = function (card, force, navigation) {
  if (this.suspended) return; this.save(); this.history.push(this.screen);
  var s = { kind: 'detail', title: card.title, card: card, navigation: navigation || this.movieNavigation(card), detail: null, loading: true, scroll: 0, focusKey: 'detail-back', episodeStart: 0 }, self = this, token = this.begin(); this.screen = s; this.render(); this.focus('detail-back');
  var tracked = this.series.get(card.contentId);
  this.provider.detail(card, force || tracked && tracked.follow).then(function (detail) { if (token !== self.generation || self.screen !== s) return; s.detail = detail; s.loading = false; var season = self.library.season(detail.contentId); s.season = detail.seasons.indexOf(season) >= 0 ? season : detail.seasons[0]; s.staleAt = detail.staleAt; self.library.remember(detail); if (detail.type === 'series') { self.library.linkEpisodes(detail); detail.episodes.forEach(function (e) { var entry = self.app.store.get(e.contentId); if (entry) self.series.record(e, entry); }); self.series.observe(detail); } self.render(true); if (!self.editing && !self.panel) self.focus('detail-play'); }, function (error) { self.failure(error, s, token); });
 };
 App.prototype.play = function (episode) {
  var s = this.screen, detail = s.detail; if (!detail) return; var content;
  if (detail.type === 'series') { var target = episode || this.library.resumeEpisode(detail, this.watchEntries()) || detail.episodes[0]; if (!target) return; content = copy(target); content.episodes = copy(detail.episodes); this.library.season(detail.contentId, target.episode.season); }
  else { content = copy(detail); content.type = 'movie'; content.sources = []; if (s.navigation) content.navigation = copy(s.navigation); }
  this.app.open(content);
 };
 App.prototype.back = function () {
  if (this.hideKeyboard(true)) return; if (this.panel) { this.closePanel(true); return; }
  if (this.screen && this.screen.kind === 'lab') { this.app.stopProbe(); this.navigate('home'); return; }
  if (this.history.length) { this.begin(); this.screen = this.history.pop(); this.render(true); return; }
  if (this.screen && this.screen.kind !== 'home') { this.navigate('home'); return; }
  this.panel = { kind: 'exit', returnKey: document.activeElement && document.activeElement.getAttribute('data-focus') }; this.renderPanel();
 };
 App.prototype.checkFollowing = function () {
  var self = this, s = this.screen; if (!s || s.kind !== 'following' || s.checking) return;
  var token = this.begin(), list = this.series.following(), done = 0, failed = 0; s.checking = true;
  function active() { return token === self.generation && self.screen === s && !self.suspended; }
  function finish() { if (!active()) return; s.checking = false; s.checkNote = done + '/' + list.length + ' dizi kontrol edildi' + (failed ? ' · ' + failed + ' erişim hatası' : '') + (done + failed < list.length ? ' · Süre doldu, kalanlar için yeniden kontrol edin.' : '.'); self.save(); self.render(true); }
  function next() {
   if (!active()) return; if (done + failed >= list.length || Date.now() >= self.provider.deadline) { finish(); return; }
   s.checkNote = 'Kontrol ediliyor · ' + (done + failed) + '/' + list.length; self.save(); self.render(true);
   self.provider.detail(list[done + failed], true).then(function (detail) { if (!active()) return; if (detail.staleAt || detail.type !== 'series' || !detail.episodes || !detail.episodes.length || !self.series.observe(detail)) failed++; else { self.library.linkEpisodes(detail); done++; } next(); }, function () { if (!active()) return; failed++; next(); });
  }
  next();
 };
 App.prototype.episodeOptions = function (episode, key) { this.save(); this.panel = { kind: 'episode-state', episode: episode, returnKey: key }; this.renderPanel(); };
 App.prototype.setEpisodeWatched = function (episode, watched) {
  var detail = this.screen.detail; if (!detail || !this.series.mark(detail, episode, watched)) return;
  var key = this.panel && this.panel.returnKey, content = copy(episode); content.episodes = copy(detail.episodes); this.library.rememberPlayback(content); this.app.store.markWatched(episode.contentId, watched); this.closePanel(false); this.render(true); this.focus(key || 'detail-play');
 };
 App.prototype.resetSeries = function () {
  var detail = this.screen.detail; if (!detail || !this.series.reset(detail)) return;
  var ids = detail.episodes.map(function (e) { return e.contentId; }), prefix = detail.contentId + ':s';
  this.app.store.list().forEach(function (e) { if (e.contentId.indexOf(prefix) === 0 && ids.indexOf(e.contentId) < 0) ids.push(e.contentId); });
  this.app.store.resetProgress(ids); this.closePanel(true); this.render(true); this.app.view.toast('Bu dizinin izleme kayıtları sıfırlandı.');
 };
 App.prototype.retry = function () { var s = this.screen; if (s.kind === 'home') this.loadHome(true); else if (s.kind === 'list') this.loadList(false, true); else if (s.kind === 'search') this.search(true); else if (s.kind === 'detail') { var card = s.card, parent = this.history.pop(); if (parent) this.screen = parent; this.openDetail(card, true, s.navigation); } else this.render(true); };
 App.prototype.art = function (card, cls) {
  var frame = node('span', cls || 'catalog-art'), placeholder = node('span', 'poster-fallback', card.title.slice(0, 100)), img = node('img');
  placeholder.setAttribute('aria-hidden', 'true'); img.alt = ''; if (card.poster) img.setAttribute('data-art', card.poster); frame.appendChild(placeholder); frame.appendChild(img); return frame;
 };
 App.prototype.cardBadges = function (b, card) {
  var known = card.type === 'series' && this.library.get(card.contentId); if (known && known.languageReference) card = known;
  var languages = P.languageBadges(card.language), art = b.querySelector('.catalog-art'), old = art.querySelector('.catalog-language-badges'), badges = node('span', 'catalog-language-badges'), labels = [];
  if (old) art.removeChild(old);
  var reference = card.languageReference, note = reference ? ' · Doğrulanan bölüm: ' + reference.title + '. Diğer bölümlerde seçenekler değişebilir.' + (reference.stale ? ' Önbellekteki bilgi.' : '') : '';
  badges.setAttribute('aria-hidden', 'true');
  function badge(kind, label, source) { var mark = node('span', 'catalog-language-badge'); mark.setAttribute('data-language', kind); mark.title = label + note; var img = node('img'); img.src = source; img.alt = ''; mark.appendChild(img); badges.appendChild(mark); labels.push(label); }
  if (languages.dubbed) badge('dubbed', 'Türkçe dublaj', 'badge-tr.svg');
  if (languages.subtitled) badge('subtitled', 'Türkçe altyazı', 'badge-cc.svg');
  if (labels.length) art.appendChild(badges);
  b.setAttribute('aria-label', card.title + (card.type === 'series' ? ', dizi' : ', film') + (labels.length ? ', ' + labels.join(', ') + note : ''));
 };
 App.prototype.card = function (card, index, rail) {
  var self = this, b = button('', rail === undefined ? 'card-' + index : 'rail-' + rail + '-' + index, function () { self.openDetail(card, false, self.movieNavigation(card, rail)); }, 'catalog-card');
  b.catalogCard = card; b.setAttribute('data-card-index', index); if (rail !== undefined) b.setAttribute('data-rail', rail);
  b.appendChild(this.art(card)); this.cardBadges(b, card); b.appendChild(node('strong', 'catalog-card-title', card.title));
  var meta = []; if (card.resumeLabel) meta.push(card.resumeLabel); else { if (card.year) meta.push(card.year); meta.push(card.type === 'series' ? 'Dizi' : 'Film'); if (card.imdb) meta.push('IMDb ' + card.imdb); }
  b.appendChild(node('small', 'catalog-card-meta', meta.join(' · ')));
  var seriesState = card.type === 'series' && this.series.get(card.contentId); if (seriesState && seriesState.pending.length) b.appendChild(node('span', 'new-episode-badge', seriesState.pending.length + ' yeni bölüm'));
  if (card.progress) { var bar = node('span', 'catalog-progress'), fill = node('span'); fill.style.width = Math.min(100, card.progress * 100) + '%'; bar.appendChild(fill); b.appendChild(bar); } return b;
 };
 App.prototype.scheduleLanguages = function (interaction) {
  if (interaction && this.provider.active === 0 && !this.provider.queue.length && this.provider.deadline <= Date.now()) this.provider.deadline = Date.now() + 30000;
  if (this.languageTimer) return; var self = this;
  this.languageTimer = setTimeout(function () { self.languageTimer = null; self.hydrateLanguages(); }, 80);
 };
 App.prototype.hydrateLanguages = function () {
  if (this.suspended || document.hidden || this.panel || !this.screen || this.screen.loading) return;
  var self = this, token = this.generation, screen = this.screen, area = el('catalog-scroll').getBoundingClientRect(), jobs = this.languageJobs || (this.languageJobs = {}), count = 0;
  Object.keys(jobs).forEach(function (id) { if (jobs[id].token === token && jobs[id].running) count++; });
  // Share the provider's two-request queue and the current interaction's 30-second budget.
  if (this.provider.deadline <= Date.now()) return;
  Array.prototype.forEach.call(el('catalog-content').querySelectorAll('.catalog-card'), function (b) {
   var card = b.catalogCard; if (!card || card.type !== 'series' || count >= 2) return;
   var r = b.getBoundingClientRect(); if (r.bottom <= area.top || r.top >= area.bottom || r.right <= area.left || r.left >= area.right) return;
   var known = self.library.get(card.contentId), reference = known && known.languageReference, flags = P.languageBadges(card.language), job = jobs[card.contentId];
   if (reference && Date.now() - reference.checkedAt < 600000 || !reference && (flags.dubbed || flags.subtitled) || job && job.token === token) return;
   job = { token: token, running: true }; jobs[card.contentId] = job; count++;
   self.provider.seriesLanguage(card).then(function (value) {
    if (token !== self.generation || screen !== self.screen || self.suspended) return;
    if (value.language && value.languageReference) {
     var updated = copy(self.library.get(card.contentId) || card); updated.language = value.language; updated.languageReference = value.languageReference; self.library.remember(updated);
     Array.prototype.forEach.call(el('catalog-content').querySelectorAll('.catalog-card'), function (current) { if (current.catalogCard && current.catalogCard.contentId === card.contentId) self.cardBadges(current, updated); });
    }
   }, function () { /* No guessed badge when a series or episode cannot be checked. */ }).then(function () {
    job.running = false; if (token === self.generation && screen === self.screen && !self.suspended) self.scheduleLanguages();
   });
  });
 };
 App.prototype.rail = function (title, cards, index) {
  var self = this, section = node('section', 'catalog-rail'), heading = node('div', 'rail-heading'); heading.appendChild(node('h2', '', title));
  var s = this.screen, offsets = s.railOffsets || (s.railOffsets = {}), first = offsets[index] || 0;
  if (cards.length > 6) { heading.appendChild(button('‹', 'rail-prev-' + index, function () { self.railMove(index, -5); }, 'rail-arrow')); heading.appendChild(button('›', 'rail-next-' + index, function () { self.railMove(index, 5); }, 'rail-arrow')); }
  section.appendChild(heading); var track = node('div', 'rail-track'); track.setAttribute('data-track', index);
  var pad = node('span', 'rail-pad'); pad.style.width = first * 280 + 'px'; track.appendChild(pad);
  cards.slice(first, first + 12).forEach(function (card, i) { track.appendChild(self.card(card, first + i, index)); });
  pad = node('span', 'rail-pad'); pad.style.width = Math.max(0, cards.length - first - 12) * 280 + 'px'; track.appendChild(pad); section.appendChild(track);
  this.railTracks.push({ node: track, first: first, index: index }); return section;
 };
 App.prototype.railMove = function (index, delta, exact) {
  var s = this.screen, items = s.rails[index].items, offset = s.railOffsets[index] || 0, target = exact !== undefined ? exact : Math.max(0, Math.min(items.length - 1, offset + delta));
  s.railOffsets[index] = Math.max(0, Math.min(Math.max(0, items.length - 6), target - (delta < 0 ? 0 : 4)));
  s.focusKey = 'rail-' + index + '-' + target; this.saveScroll(); this.render(true); this.focus(s.focusKey);
 };
 App.prototype.saveScroll = function () { if (this.screen) this.screen.scroll = el('catalog-scroll').scrollTop; };
 App.prototype.renderHome = function (parent, s) {
  var self = this, data = s.data; if (!data) return;
  if (data.hero) { var hero = node('section', 'catalog-hero'); hero.appendChild(this.art(data.hero, 'hero-art')); var content = node('div', 'hero-content'); content.appendChild(node('span', 'eyebrow', 'BUGÜNÜN VİTRİNİ')); content.appendChild(node('h1', '', data.hero.title)); content.appendChild(node('p', '', [data.hero.year, data.hero.language, data.hero.imdb ? 'IMDb ' + data.hero.imdb : ''].filter(Boolean).join(' · '))); content.appendChild(button('▶  İncele', 'hero-detail', function () { self.openDetail(data.hero); }, 'gold-button')); hero.appendChild(content); parent.appendChild(hero); }
  s.rails = []; var resume = this.library.continueWatching(this.watchEntries()); if (resume.length) s.rails.push({ title: 'İzlemeye devam et', items: resume });
  var followed = this.series.following(); if (followed.length) s.rails.push({ title: 'Takip ettiğim diziler', items: followed });
  s.rails.push({ title: 'Yeni eklenen filmler', items: data.movies }); s.rails.push({ title: 'Popüler diziler', items: data.series });
  s.rails.forEach(function (row, i) { if (row.items.length) parent.appendChild(self.rail(row.title, row.items, i)); else parent.appendChild(node('p', 'catalog-note', row.title + ' alınamadı. Yenile ile tekrar deneyin.')); });
  parent.appendChild(button('Kataloğu yenile', 'home-refresh', function () { self.loadHome(true); }, 'quiet-button'));
 };
 App.prototype.gridItems = function () { var s = this.screen; return s.kind === 'search' && s.tab !== 'all' ? s.items.filter(function (c) { return c.type === s.tab; }) : s.items; };
 App.prototype.renderGrid = function (parent, s) {
  var self = this, items = this.gridItems(), rows = Math.ceil(items.length / COLS), start = Math.min(s.startRow || 0, Math.max(0, rows - 1)), end = Math.min(rows, start + 10);
  var grid = node('div', 'catalog-grid'); grid.setAttribute('data-grid', '1'); var spacer = node('div', 'grid-spacer'); spacer.style.height = start * ROW_HEIGHT + 'px'; grid.appendChild(spacer);
  for (var row = start; row < end; row++) { var line = node('div', 'catalog-grid-row'); items.slice(row * COLS, (row + 1) * COLS).forEach(function (card, column) { line.appendChild(self.card(card, row * COLS + column)); }); grid.appendChild(line); }
  spacer = node('div', 'grid-spacer'); spacer.style.height = (rows - end) * ROW_HEIGHT + 'px'; grid.appendChild(spacer); parent.appendChild(grid);
  if (!items.length && !s.loading && !s.error) parent.appendChild(node('div', 'catalog-empty', s.kind === 'following' ? 'Takip ettiğiniz dizi yok. Dizi detayından Yeni bölümleri takip et’i seçin.' : s.kind === 'watchlist' ? 'Listeniz henüz boş. Film veya dizi detayından Listeme ekle’yi seçin.' : 'Sonuç bulunamadı. Aramayı veya filtreleri değiştirebilirsiniz.'));
  if (s.next) parent.appendChild(button(s.loading ? 'Yükleniyor…' : 'Daha fazla', 'load-more', function () { if (!s.loading) self.loadList(true); }, 'load-more-button'));
  else if (items.length && !s.loading) parent.appendChild(node('p', 'list-end', 'Listenin sonundasınız · ' + items.length + ' içerik'));
 };
 App.prototype.renderDetail = function (parent, s) {
  var self = this, d = s.detail; parent.appendChild(button('‹ Geri', 'detail-back', function () { self.back(); }, 'quiet-button')); if (!d) return;
  var layout = node('section', 'catalog-detail'), art = this.art(d, 'detail-art'), body = node('div', 'detail-copy'); layout.appendChild(art); body.appendChild(node('span', 'eyebrow', d.type === 'series' ? 'DİZİ' : 'FİLM')); body.appendChild(node('h1', '', d.title));
  if (d.originalTitle && d.originalTitle !== d.title) body.appendChild(node('p', 'original-title', d.originalTitle));
  var meta = [d.year, d.duration, d.imdb ? 'IMDb ' + d.imdb : '', d.language].filter(Boolean); if (meta.length) body.appendChild(node('p', 'detail-meta', meta.join(' · ')));
  if (d.genres.length) body.appendChild(node('p', 'detail-genres', d.genres.join(' / '))); if (d.description) body.appendChild(node('p', 'detail-description', d.description));
  if (d.cast.length) body.appendChild(node('p', 'detail-cast', 'Oyuncular: ' + d.cast.join(', ')));
  var entries = this.watchEntries(), states = Object.create(null); entries.forEach(function (entry) { states[entry.contentId] = entry; });
  var actions = node('div', 'detail-actions'), saved = this.app.store.get(d.contentId), resume = d.type === 'series' ? this.library.resumeEpisode(d, entries) : null;
  var play = button(d.type === 'series' ? (resume ? '▶  Devam et · ' + resume.episode.season + '×' + resume.episode.number : '↻  Baştan izle') : saved && saved.position >= 5 && !saved.completed ? '▶  Devam et' : '▶  İzle', 'detail-play', function () { self.play(); }, 'gold-button'); if (d.type === 'series' && !d.episodes.length) { play.disabled = true; play.textContent = 'Bölüm bağlantısı bulunamadı'; } actions.appendChild(play);
  actions.appendChild(button(this.library.has(d.contentId) ? '✓  Listemden çıkar' : '+  Listeme ekle', 'detail-favorite', function () { if (self.library.toggle(d)) { self.save(); self.render(true); } }, 'quiet-button'));
  if (d.type === 'series') {
   var state = this.series.get(d.contentId), following = state && state.follow;
   actions.appendChild(button(following ? '✓  Bölüm takibi açık' : '+  Yeni bölümleri takip et', 'series-follow', function () { if (self.series.follow(d, !following)) { self.save(); self.render(true); self.focus('series-follow'); } }, 'quiet-button'));
   actions.appendChild(button('Bölümleri yenile', 'series-refresh', function () { self.retry(); }, 'quiet-button'));
   actions.appendChild(button('Diziyi sıfırla', 'series-reset', function () { self.save(); self.panel = { kind: 'reset-series', returnKey: 'series-reset' }; self.renderPanel('panel-cancel'); }, 'quiet-button'));
   if (following && state.pending.length) actions.appendChild(button('Yeni işaretlerini temizle (' + state.pending.length + ')', 'series-acknowledge', function () { self.series.acknowledge(d); self.save(); self.render(true); self.focus('series-follow'); }, 'quiet-button'));
   var count = d.episodes.filter(function (e) { return states[e.contentId] && states[e.contentId].completed; }).length;
   body.appendChild(node('p', 'series-summary', count + '/' + d.episodes.length + ' bölüm izlendi' + (following ? ' · ' + state.pending.length + ' yeni bölüm' : '')));
   if (following) body.appendChild(node('p', 'catalog-note', state.checkedAt ? 'Son bölüm kontrolü: ' + new Date(state.checkedAt).toLocaleString('tr-TR') : 'Canlı bölüm kontrolü bekliyor. Bölümleri yenile ile kontrol edin.'));
  }
  body.appendChild(actions); layout.appendChild(body); parent.appendChild(layout);
  if (d.type !== 'series' || !d.episodes.length) return;
  var seasons = node('div', 'season-tabs'); seasons.appendChild(node('h2', '', 'Bölümler'));
  d.seasons.forEach(function (season) { seasons.appendChild(button(season + '. Sezon', 'season-' + season, function () { self.saveScroll(); s.season = season; s.episodeStart = 0; self.library.season(d.contentId, season); self.render(true); self.focus('season-' + season); }, season === s.season ? 'tab selected' : 'tab')); }); parent.appendChild(seasons);
  var episodes = d.episodes.filter(function (e) { return e.episode.season === s.season; }), epStart = s.episodeStart || 0, list = node('div', 'episode-list');
  if (epStart) list.appendChild(button('↑ Önceki bölümler', 'episodes-before', function () { s.episodeStart = Math.max(0, epStart - 24); self.render(true); self.focus('episode-' + s.episodeStart); }, 'quiet-button'));
  var tracking = this.series.get(d.contentId);
  episodes.slice(epStart, epStart + 48).forEach(function (episode, i) { var savedEntry = states[episode.contentId], label = episode.episodeTitle;
   if (savedEntry && savedEntry.completed) label += '  ✓ İzlendi'; else if (savedEntry && savedEntry.position >= 5) label += '  · ' + root.PlayerCore.format(savedEntry.position) + ' / ' + root.PlayerCore.format(savedEntry.duration);
   if (tracking && tracking.pending.indexOf(episode.contentId) >= 0) label += '  · YENİ';
   var group = node('div', 'episode-entry'), b = button(label, 'episode-' + (epStart + i), function () { self.play(episode); }, 'episode-button'); b.setAttribute('data-episode-index', epStart + i); group.appendChild(b);
   group.appendChild(button('⋯ Bölüm seçenekleri', 'episode-options-' + (epStart + i), function () { self.episodeOptions(episode, 'episode-options-' + (epStart + i)); }, 'episode-options')); list.appendChild(group);
  });
  if (epStart + 48 < episodes.length) list.appendChild(button('↓ Sonraki bölümler', 'episodes-after', function () { s.episodeStart = epStart + 24; self.render(true); self.focus('episode-' + s.episodeStart); }, 'quiet-button')); parent.appendChild(list);
 };
 App.prototype.render = function (restore) {
  var s = this.screen; if (!s || this.suspended) return;
  if (s.kind === 'watchlist') s.items = this.library.favorites();
  if (s.kind === 'following') s.items = this.series.following();
  var activeKey = document.activeElement && document.activeElement.getAttribute('data-focus'), scroll = restore ? s.scroll || 0 : 0, parent = el('catalog-content');
  parent.textContent = ''; this.railTracks = []; el('legacy-lab').style.display = s.kind === 'lab' ? 'block' : 'none'; el('catalog-scroll').style.display = s.kind === 'lab' ? 'none' : '';
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (n) { var kind = n.getAttribute('data-nav'), current = s.kind === 'home' ? 'home' : s.kind === 'watchlist' ? 'watchlist' : s.title === 'Keşfet' ? 'discover' : s.kind === 'list' ? s.type === 'series' ? 'series' : 'movies' : ''; n.className = kind === current ? 'nav-tab active' : 'nav-tab'; });
  if (s.kind === 'home') this.renderHome(parent, s);
  else if (s.kind === 'detail') this.renderDetail(parent, s);
  else if (s.kind !== 'lab') {
   var heading = node('div', 'catalog-list-heading'); heading.appendChild(node('h1', '', s.title));
   if (s.kind === 'list') heading.appendChild(button('☷  Filtreler', 'filters', this.openFilters.bind(this), 'quiet-button')); parent.appendChild(heading);
   if (s.kind === 'following') { var refresh = button(s.checking ? 'Kontrol ediliyor…' : 'Şimdi kontrol et', 'following-refresh', this.checkFollowing.bind(this), 'quiet-button'); refresh.setAttribute('aria-busy', s.checking ? 'true' : 'false'); heading.appendChild(refresh); parent.appendChild(node('p', 'catalog-note', s.checkNote || 'Kontrol TV’de yapılır. Uygulama kapalıyken bildirim gönderilmez.')); }
   if (s.kind === 'search') { var tabs = node('div', 'catalog-tabs'), self = this; [['all', 'Tümü'], ['movie', 'Filmler'], ['series', 'Diziler']].forEach(function (pair) { var count = s.items.filter(function (x) { return pair[0] === 'all' || x.type === pair[0]; }).length; tabs.appendChild(button(pair[1] + ' (' + count + ')', 'search-tab-' + pair[0], function () { self.save(); s.tab = pair[0]; s.startRow = 0; s.scroll = 0; s.focusKey = 'search-tab-' + pair[0]; self.render(true); }, s.tab === pair[0] ? 'tab selected' : 'tab')); }); parent.appendChild(tabs); }
   if (s.kind === 'list') this.renderCollections(parent, s);
   this.renderGrid(parent, s);
  }
  if (s.loading) parent.appendChild(node('div', 'catalog-loading', s.kind === 'detail' ? 'İçerik bilgileri alınıyor…' : 'Katalog yükleniyor…'));
  if (s.error) { var box = node('section', 'catalog-error'), blocked = /403|429|erisim engeli|erişim engeli|Dogrulama/.test(s.error); box.setAttribute('data-state', blocked ? 'blocked' : 'network-error'); box.appendChild(node('h2', '', blocked ? 'Siteye erişim engellendi' : 'Bağlantı kurulamadı')); box.appendChild(node('p', '', blocked ? 'Site isteği reddetti. Biraz sonra Yenile ile tekrar deneyin.' : 'İnternet bağlantısını kontrol edip yeniden deneyin.')); box.appendChild(button('Yenile', 'catalog-retry', this.retry.bind(this), 'gold-button')); box.appendChild(button('Geri', 'catalog-error-back', this.back.bind(this), 'quiet-button')); parent.appendChild(box); }
  var staleAt = s.staleAt || s.data && s.data.staleAt; if (staleAt) { var stale = node('div', 'catalog-stale', 'Son yenileme başarısız · Eski kayıt: ' + new Date(staleAt).toLocaleString('tr-TR') + ' '); stale.appendChild(button('Yenile', 'catalog-stale-refresh', this.retry.bind(this), 'quiet-button')); parent.insertBefore(stale, parent.firstChild); }
  el('catalog-scroll').scrollTop = scroll; this.railTracks.forEach(function (track) { track.node.scrollLeft = (s.railOffsets[track.index] || 0) * 280; });
  if (restore && !this.editing && !this.focus(activeKey, false)) this.focus(s.focusKey || 'search-activate', false); this.images.visible(el('catalog-scroll')); this.scheduleLanguages();
 };
 App.prototype.renderCollections = function (parent, s) {
  var self = this, tabs = node('div', 'catalog-tabs'), selected = s.collection || 'new';
  [['new', 'Yeni eklenenler'], ['recommended', 'Tavsiyeler'], ['rated', 'Yüksek puanlılar'], ['liked', 'Beğenilenler']].forEach(function (pair) {
   tabs.appendChild(button(pair[1], 'collection-' + pair[0], function () {
    s.collection = pair[0]; s.filters = {}; s.query = { type: s.type }; s.focusKey = 'collection-' + pair[0];
    if (s.type === 'movie' && self.provider.links[pair[0]]) s.query.url = self.provider.links[pair[0]];
    else if (pair[0] !== 'new') { s.query.kind = 'discover'; s.query.order = pair[0] === 'liked' ? 'avg desc' : 'posts.imdb desc'; if (pair[0] === 'recommended') s.query.filters = { imdb: '7-10' }; }
    self.loadList(false);
   }, selected === pair[0] && !s.query.filters ? 'tab selected' : 'tab'));
  }); parent.appendChild(tabs);
  var f = s.query.filters || {}, labels = [], options = this.provider.filterOptions || {};
  function optionLabel(key, value) { var item = (options[key] || []).filter(function (o) { return o.value === value; })[0]; return item ? item.label : value; }
  if (f.genre) labels.push(optionLabel('genres', f.genre)); if (f.year) labels.push(optionLabel('years', f.year)); if (f.language) labels.push(optionLabel('lang', f.language)); if (f.imdb) labels.push('IMDb ' + optionLabel('imdb', f.imdb));
  if (labels.length) parent.appendChild(node('p', 'filter-summary', 'Film Robotu · ' + labels.join(' / ')));
 };
 App.prototype.onScroll = function () {
  if (this.suspended) return; var s = this.screen; if (!s) return; s.scroll = el('catalog-scroll').scrollTop;
  if (s.kind === 'list' || s.kind === 'search' || s.kind === 'watchlist' || s.kind === 'following') { var row = Math.max(0, Math.floor((s.scroll - 160) / ROW_HEIGHT)); if (row < (s.startRow || 0) || row >= (s.startRow || 0) + 7) { s.startRow = Math.max(0, row - 2); this.render(true); } }
  this.images.visible(el('catalog-scroll')); this.scheduleLanguages(true);
 };
 App.prototype.openFilters = function () {
  var self = this, s = this.screen; this.save(); var token = this.begin(); this.panel = { kind: 'loading', returnKey: 'filters' }; this.renderPanel();
  this.provider.options().then(function (options) { if (token !== self.generation || self.screen !== s || !self.panel) return; options = copy(options); options.imdb = (options.imdb || []).filter(function (option) { return /^\d+-10$/.test(option.value); }); self.panel = { kind: 'filters', options: options, values: { type: s.type === 'series' ? '2' : '1', genres: (s.query.filters || {}).genre || '', years: (s.query.filters || {}).year || '', lang: (s.query.filters || {}).language || '', imdb: (s.query.filters || {}).imdb || '', order: s.query.order || '' }, returnKey: 'filters' }; self.renderPanel(); }, function (e) { if (token !== self.generation || !self.panel) return; self.panel = { kind: 'filter-error', message: e.message, returnKey: 'filters' }; self.renderPanel(); });
 };
 App.prototype.closePanel = function (restore) { if (!this.panel) return; var key = this.panel.returnKey; this.panel = null; el('catalog-modal').style.display = 'none'; if (restore) this.focus(key || 'search-activate'); };
 App.prototype.cycleFilter = function (key, delta) { var p = this.panel, options = (key === 'type' ? [] : [{ value: '', label: key === 'order' ? 'Varsayılan' : 'Tümü' }]).concat(p.options[key] || []), current = -1; options.some(function (x, i) { if (x.value === p.values[key]) { current = i; return true; } return false; }); p.values[key] = options[(current + delta + options.length) % options.length].value; this.renderPanel('filter-' + key); };
 App.prototype.renderPanel = function (focusKey) {
  var self = this, p = this.panel, host = el('catalog-modal'), box = el('catalog-modal-card'); if (!p) return; host.style.display = 'block'; box.textContent = '';
  box.appendChild(node('h2', '', p.kind === 'exit' ? 'Uygulamadan çıkılsın mı?' : p.kind === 'tools' ? 'Katalog ve tanı' : p.kind === 'about' ? 'Hakkında' : p.kind === 'reliability' ? 'Kararlılık karşılaştırması' : p.kind === 'support' ? 'Oynatma desteği' : p.kind === 'episode-state' ? 'Bölüm seçenekleri' : p.kind === 'reset-series' ? 'Dizinin izleme kayıtları sıfırlansın mı?' : 'Katalog filtreleri'));
  if (p.kind === 'filters') {
   box.appendChild(node('p', 'catalog-note', '← → veya OK ile değiştirin. Uygula ile Film Robotu’nda arayın.'));
   var fields = [['type', 'İçerik'], ['genres', 'Tür'], ['years', 'Yıl'], ['lang', 'Dil'], ['imdb', 'IMDb alt sınırı'], ['order', 'Sıralama']];
   fields.forEach(function (field) { var selected = (p.options[field[0]] || []).filter(function (o) { return o.value === p.values[field[0]]; })[0]; var b = button(field[1] + '   ‹  ' + (selected ? selected.label : field[0] === 'order' ? 'Varsayılan' : 'Tümü') + '  ›', 'filter-' + field[0], function () { self.cycleFilter(field[0], 1); }, 'filter-field'); b.setAttribute('data-filter-field', field[0]); box.appendChild(b); });
   box.appendChild(button('Uygula', 'filter-apply', function () { var values = p.values, s = self.screen; s.type = values.type === '2' ? 'series' : 'movie'; s.title = s.type === 'series' ? 'Diziler' : 'Filmler'; s.query = { kind: 'discover', type: s.type, order: values.order || 'posts.imdb desc', filters: { genre: values.genres, year: values.years, language: values.lang, imdb: values.imdb } }; s.filters = copy(s.query.filters); s.focusKey = 'filters'; self.closePanel(false); self.loadList(false); }, 'gold-button'));
   box.appendChild(button('Sıfırla', 'filter-reset', function () { Object.keys(p.values).forEach(function (key) { if (key !== 'type') p.values[key] = ''; }); self.renderPanel('filter-reset'); }, 'quiet-button'));
  } else if (p.kind === 'exit') box.appendChild(button('Çık', 'exit-confirm', function () { try { root.tizen.application.getCurrentApplication().exit(); } catch (ignore) { self.closePanel(true); self.app.view.toast('Çıkış işlemi TV uygulamasında kullanılabilir.'); } }, 'quiet-button'));
  else if (p.kind === 'loading') box.appendChild(node('p', '', 'Sitenin filtre seçenekleri alınıyor…'));
  else if (p.kind === 'filter-error') { box.appendChild(node('p', '', /403|429|erisim engeli/.test(p.message) ? 'Site filtrelere erişimi engelledi.' : 'Filtre seçenekleri alınamadı.')); box.appendChild(button('Yenile', 'filter-retry', function () { self.openFilters(); }, 'gold-button')); }
  else if (p.kind === 'tools') {
   box.appendChild(node('p', 'catalog-note', 'HDfilmCehennemi ' + root.AppInfo.version + ' · Bu TV’de ' + this.library.favorites().length + '/200 kayıt'));
   box.appendChild(button('Hakkında', 'tools-about', function () { self.panel = { kind: 'about', returnKey: p.returnKey }; self.renderPanel(); }, 'filter-field'));
   box.appendChild(button('Oynatma desteği', 'tools-support', function () { self.panel = { kind: 'support', returnKey: p.returnKey }; self.renderPanel(); }, 'filter-field'));
   box.appendChild(button('Kararlılık karşılaştırması', 'tools-reliability', function () { self.panel = { kind: 'reliability', returnKey: p.returnKey }; self.renderPanel(); }, 'filter-field'));
   box.appendChild(button('Takip ettiğim diziler', 'tools-following', function () { self.closePanel(false); self.navigate('following'); }, 'filter-field'));
   box.appendChild(button('Katalog önbelleğini temizle', 'tools-cache', function () { self.cache.clear(); self.images.clear(); self.closePanel(true); self.app.view.toast('Katalog önbelleği temizlendi. Listem ve izleme geçmişi korundu.'); self.retry(); }, 'filter-field'));
   box.appendChild(button('İzleme geçmişini temizle', 'tools-history', function () { self.panel = { kind: 'clear-history', returnKey: p.returnKey }; self.renderPanel(); }, 'filter-field'));
   box.appendChild(button('Oynatıcı / ağ tanısı', 'tools-lab', function () { self.closePanel(false); self.save(); self.history.push(self.screen); self.begin(); self.screen = { kind: 'lab', focusKey: 'lab-mayday', scroll: 0 }; self.render(); self.visibleButtons(el('legacy-lab'))[0].focus(); }, 'filter-field'));
  } else if (p.kind === 'reliability') {
   box.appendChild(node('p', 'catalog-note', 'Aynı içerikte oynat, duraklat, 30 sn sar, Durdur/Vazgeç ve Kaydet/Çık adımlarını iki cihazda da deneyin. Kayıt 5 dakikada biter; oynatmayı yönetmez, geçmişinizi değiştirmez.'));
   box.appendChild(button('Gerçek TV kaydını başlat', 'reliability-tv', function () { self.app.reliability.start('tv'); self.closePanel(true); self.app.view.toast('Gerçek TV karşılaştırması kaydediliyor · 5 dakika.'); }, 'filter-field'));
   box.appendChild(button('Emülatör kaydını başlat', 'reliability-emulator', function () { self.app.reliability.start('emulator'); self.closePanel(true); self.app.view.toast('Emülatör karşılaştırması kaydediliyor · 5 dakika.'); }, 'filter-field'));
   box.appendChild(button('Kaydı bitir / Bilgileri yenile', 'reliability-stop', function () { self.app.reliability.stop('manual'); self.renderPanel('reliability-stop'); }, 'filter-field'));
   box.appendChild(node('pre', 'catalog-note reliability-report', self.app.reliability.describe()));
  } else if (p.kind === 'episode-state') {
   var savedEpisode = this.watchEntries().filter(function (e) { return e.contentId === p.episode.contentId; })[0], watched = savedEpisode && savedEpisode.completed;
   box.appendChild(node('p', '', p.episode.title));
   box.appendChild(button('▶ Bölümü oynat', 'episode-action-play', function () { self.closePanel(false); self.play(p.episode); }, 'filter-field'));
   box.appendChild(button(watched ? 'İzlenmedi olarak işaretle' : 'İzlendi olarak işaretle', 'episode-action-mark', function () { self.setEpisodeWatched(p.episode, !watched); }, 'filter-field'));
   box.appendChild(node('p', 'catalog-note', 'İzlenmedi seçimi bu bölümün devam konumunu sıfırlar. Ses/altyazı tercihleri ve yer imleri korunur.'));
  } else if (p.kind === 'reset-series') {
   box.appendChild(node('p', '', this.screen.detail.title));
   box.appendChild(node('p', 'catalog-note', 'Yalnız bu dizinin izleme konumları, izlendi işaretleri ve yer imleri silinir. Listem, bölüm takibi, sezon ve ses/altyazı tercihleri korunur.'));
   box.appendChild(button('Diziyi sıfırla', 'series-reset-confirm', function () { self.resetSeries(); }, 'quiet-button'));
  } else if (p.kind === 'about') {
   box.appendChild(node('p', 'about-name', 'HDfilmCehennemi · ' + root.AppInfo.version));
   box.appendChild(node('p', '', 'Yapımcı: ' + root.AppInfo.producer));
   box.appendChild(node('p', 'catalog-note', 'Oynatma: hls.js · Apache-2.0. Çözümleyici uyarlamaları: enXov / Batuhan4 · MIT.'));
  } else if (p.kind === 'support') {
   root.AppInfo.support(this.app.controller).forEach(function (row, index) { var b = button(row.title, 'support-' + index, function () { self.app.view.toast(row.detail); }, 'filter-field'); b.appendChild(node('small', 'support-description', row.detail)); box.appendChild(b); });
  } else if (p.kind === 'clear-history') { box.appendChild(node('p', '', 'İzleme konumları ve yer imleri silinsin mi? Listem ve oynatıcı tercihleri korunur.')); box.appendChild(button('Geçmişi sil', 'history-confirm', function () { self.app.store.clear(); self.closePanel(true); self.render(true); self.app.view.toast('İzleme geçmişi temizlendi.'); }, 'quiet-button')); }
  box.appendChild(button(p.kind === 'exit' ? 'Kal' : ['tools', 'about', 'support'].indexOf(p.kind) >= 0 ? 'Kapat' : 'Vazgeç', 'panel-cancel', function () { self.closePanel(true); }, 'quiet-button'));
  this.focus(focusKey || (p.kind === 'exit' ? 'panel-cancel' : this.visibleButtons(box)[0]));
 };
 App.prototype.openTools = function () { this.hideKeyboard(false); this.save(); this.panel = { kind: 'tools', returnKey: 'catalog-tools' }; this.renderPanel(); };
 App.prototype.move = function (code) {
  var s = this.screen, active = document.activeElement, index = active && active.getAttribute('data-card-index'), rail = active && active.getAttribute('data-rail'), key = active && active.getAttribute('data-focus'), target;
  if (!this.panel && index !== null && index !== undefined) {
   index = Number(index);
   if (rail !== null) {
    rail = Number(rail); if (code === 37 || code === 39) { target = index + (code === 37 ? -1 : 1); if (target >= 0 && target < s.rails[rail].items.length) this.railMove(rail, code === 37 ? -1 : 1, target); return; }
    var nextRail = rail + (code === 38 ? -1 : 1); if (s.rails[nextRail]) { target = Math.min(index, s.rails[nextRail].items.length - 1); this.railMove(nextRail, 1, target); return; }
   } else {
    target = index + (code === 37 ? -1 : code === 39 ? 1 : code === 38 ? -COLS : COLS);
    if ((code === 37 && index % COLS === 0) || (code === 39 && (index % COLS === COLS - 1 || target >= this.gridItems().length))) return;
    if (target >= 0 && target < this.gridItems().length) { var row = Math.floor(target / COLS); s.focusKey = 'card-' + target; if (row < (s.startRow || 0) || row >= (s.startRow || 0) + 10) { this.saveScroll(); s.startRow = Math.max(0, row - 3); this.render(true); } this.focus(s.focusKey); return; }
    if (code === 40 && target >= this.gridItems().length && this.findFocus('load-more')) { this.focus('load-more'); return; }
   }
  }
  if (key === 'load-more' && code === 38) { this.focus('card-' + (this.gridItems().length - 1)); return; }
  var buttons = this.visibleButtons(this.panel ? el('catalog-modal-card') : null), a = active.getBoundingClientRect(), centerX = (a.left + a.right) / 2, centerY = (a.top + a.bottom) / 2, best = null, distance = Infinity;
  buttons.forEach(function (b) { if (b === active) return; var r = b.getBoundingClientRect(), x = (r.left + r.right) / 2 - centerX, y = (r.top + r.bottom) / 2 - centerY;
   if (code === 37 && x >= -2 || code === 39 && x <= 2 || code === 38 && y >= -2 || code === 40 && y <= 2) return;
   var horizontal = code === 37 || code === 39, primary = horizontal ? Math.abs(x) : Math.abs(y), secondary = horizontal ? Math.abs(y) : Math.abs(x), score = primary + secondary * 3;
   if (score < distance) { distance = score; best = b; }
  }); if (best) this.focus(best);
 };
 App.prototype.key = function (event) {
  if (event.defaultPrevented || this.app.controller.content) return; var code = event.keyCode;
  if (this.editing || document.activeElement === el('catalog-search')) {
   if (code === 65385 || code === 27 || code === 10009) { event.preventDefault(); this.hideKeyboard(true); }
   else if (code === 13 || code === 65376) { event.preventDefault(); this.search(); }
   /* Direction keys and 229 stay with Samsung IME / physical text editing. */
   return;
  }
  if (code === 65385 || code === 65376) { event.preventDefault(); return; }
  if (code === 27 || code === 10009) { event.preventDefault(); this.back(); return; }
  if ([37, 38, 39, 40].indexOf(code) >= 0) {
   event.preventDefault(); var field = document.activeElement && document.activeElement.getAttribute('data-filter-field');
   if (this.panel && this.panel.kind === 'filters' && field && (code === 37 || code === 39)) this.cycleFilter(field, code === 37 ? -1 : 1); else this.move(code); return;
  }
  if (code === 13 && document.activeElement && document.activeElement.tagName === 'BUTTON') { event.preventDefault(); document.activeElement.click(); }
 };
 root.CatalogApp = App;
})(window);
