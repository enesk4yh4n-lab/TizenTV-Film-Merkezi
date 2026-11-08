/* Two-column TV settings, composed by CatalogExperience. No global key listeners. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function n(tag, cls, text) { var x = document.createElement(tag); x.className = cls || ''; if (text !== undefined) x.textContent = text; return x; }
  function b(label, key, action, cls) { var x = n('button', cls, label); x.type = 'button'; x.setAttribute('data-focus', key); x.onclick = action; return x; }
  function on(value) { return value ? t('Açık', 'On') : t('Kapalı', 'Off'); }
  function UI(app, preferences) { this.a = app; this.p = preferences; this.refresh = false; this.rebuild = false; this.applyAppearance(); }
  UI.prototype.active = function () { return this.a.panel && /^(tools|application-settings)$/.test(this.a.panel.kind); };
  UI.prototype.applyAppearance = function () { document.documentElement.classList.toggle('fm-large-text', this.p.appearance().largeText); };
  UI.prototype.landing = function () { var key = this.p.appearance().startScreen, types = this.a.site.contentTypes; return types && ((key === 'movies' && types.indexOf('movie') < 0) || (key === 'series' && types.indexOf('series') < 0)) ? 'home' : key; };
  UI.prototype.filterRails = function (rows) { var shown = this.p.appearance().rows; return rows.filter(function (row) { return shown[row.kind] !== false; }); };
  UI.prototype.categories = function () { return [['general', t('Genel ve görünüm', 'General and appearance')], ['catalog', t('Katalog ve siteler', 'Catalog and sites')], ['playback', t('Oynatma ve kaynaklar', 'Playback and sources')], ['video', t('Görüntü', 'Video')], ['audio', t('Ses ve altyazı', 'Audio and subtitles')], ['updates', t('Güncelleme Merkezi', 'Update Center')], ['storage', t('Ayarları Sıfırla', 'Reset Settings')], ['about', t('Hakkında ve destek', 'About and support')]]; };
  UI.prototype.focus = function (key) { var x = this.a.findFocus(key); if (!x) return; x.focus(); if (x.scrollIntoView) x.scrollIntoView(false); };
  UI.prototype.saveAppearance = function (value, key) { this.p.appearance(value); this.applyAppearance(); this.refresh = true; this.drawOptions(key); };
  UI.prototype.setting = function (name, value, key) { this.a.app.store.setting(name, value); this.a.app.controller.settings = this.a.app.store.settings(); this.drawOptions(key); };
  UI.prototype.choose = function (title, values, selected, save, key) { this.a.panel.settingsChoice = { title: title, values: values, selected: selected, save: save, returnKey: key }; this.drawOptions('setting-choice-' + Math.max(0, values.map(function (v) { return v[0]; }).indexOf(selected))); };
  UI.prototype.openPanel = function (kind, key, extra) {
    var parent = this.a.panel, child = { kind: kind, returnKey: 'catalog-tools', settingsParent: parent, settingsReturnKey: key };
    Object.keys(extra || {}).forEach(function (k) { child[k] = extra[k]; });
    this.hide(); this.a.panel = child; this.a.renderPanel();
  };
  UI.prototype.beforeClose = function (restore) {
    var child = this.a.panel;
    if (restore && child && child.settingsParent) { this.a.panel = child.settingsParent; this.a.renderPanel(child.settingsReturnKey); return true; }
    return false;
  };
  UI.prototype.hide = function () { document.getElementById('catalog-modal').classList.remove('fm-settings'); };
  UI.prototype.afterClose = function () {
    this.hide();
    if (this.rebuild) { this.rebuild = false; this.refresh = false; this.a.history = []; this.a.navigate('home'); }
    else if (this.refresh) { this.refresh = false; if (this.a.screen) this.a.render(true); }
  };
  UI.prototype.rows = function (category) {
    var self = this, a = this.a, ui = this.p.appearance(), ps = a.app.store.settings(), result = [];
    function row(key, title, value, action, help) { result.push({ key: key, title: title, value: value || '', action: action, help: help || '' }); }
    function choice(key, title, value, options, current, save) { row(key, title, value, function () { self.choose(title, options, current, save, key); }); }
    function setting(key, title, options, name) { var v = ps[name], found = options.filter(function (x) { return x[0] === v; })[0]; choice(key, title, found ? found[1] : String(v), options, v, function (x) { self.setting(name, x, key); }); }
    function panel(key, title, kind, extra) { row(key, title, '', function () { self.openPanel(kind, key, extra); }); }
    function style(key, title, options, name) { var v = ps.subtitleStyle[name], found = options.filter(function (x) { return x[0] === v; })[0]; choice(key, title, found ? found[1] : String(v), options, v, function (x) { var s = root.PlayerCore.copy(ps.subtitleStyle); s[name] = x; self.setting('subtitleStyle', s, key); }); }
    if (category === 'general') {
      var screens = [['home', t('Ana Sayfa', 'Home')], ['movies', t('Filmler', 'Movies')], ['series', t('Diziler', 'Series')], ['discover', t('Keşfet', 'Discover')], ['watchlist', t('Listem', 'My list')], ['history', t('Geçmiş', 'History')]];
      choice('settings-start', t('Açılış ekranı', 'Start screen'), screens.filter(function (v) { return v[0] === ui.startScreen; })[0][1], screens, ui.startScreen, function (x) { ui.startScreen = x; self.saveAppearance(ui, 'settings-start'); });
      row('settings-font', t('Menü yazısı', 'Menu text'), ui.largeText ? t('Büyük', 'Large') : t('Normal', 'Normal'), function () { ui.largeText = !ui.largeText; self.saveAppearance(ui, 'settings-font'); });
      row('settings-exit', t('Uygulamadan çıkış onayı', 'Confirm application exit'), on(ui.exitConfirmation), function () { ui.exitConfirmation = !ui.exitConfirmation; self.saveAppearance(ui, 'settings-exit'); });
      row('settings-rows', t('Ana sayfa satırları', 'Home screen rows'), '', function () { a.panel.settingsRows = true; self.drawOptions('settings-row-continue'); });
      choice('settings-language', t('Arayüz dili', 'Interface language'), root.FilmI18n.language() === 'tr' ? 'Türkçe' : 'English', [['tr', 'Türkçe'], ['en', 'English']], root.FilmI18n.language(), function (x) { root.FilmI18n.set(x); self.render('settings-language'); });
    } else if (category === 'catalog') {
      row('settings-merge', t('Aynı film ve dizileri birleştir', 'Merge matching movies and series'), on(this.p.merging()), function () { a.begin(); self.p.merging(!self.p.merging()); if (a.hub) a.hub.setMerging(self.p.merging()); self.rebuild = true; self.drawOptions('settings-merge'); }, t('Katalog, ayarlardan çıkınca yenilenir.', 'The catalog refreshes when settings close.'));
      if (root.SiteAddresses) panel('tools-addresses', t('Site adresleri', 'Site addresses'), 'site-addresses');
      if (a.app.siteManagement) panel('settings-site-management', t('Aktif siteler', 'Active sites'), 'active-sites');
      row('settings-sites', t('Site seçimi', 'Select site'), a.site.name, function () { a.closePanel(false); document.getElementById('site-change').click(); });
      row('tools-following', t('Takip ettiğim diziler', 'Followed series'), '', function () { a.closePanel(false); a.navigate('following'); });
    } else if (category === 'playback') {
      row('settings-next', t('Sonraki bölümü otomatik aç', 'Automatically play the next episode'), on(ps.autoNext), function () { self.setting('autoNext', !ps.autoNext, 'settings-next'); });
      row('settings-tracks', t('Ses ve altyazı tercihlerini hatırla', 'Remember audio and subtitle choices'), on(ps.rememberTracks), function () { self.setting('rememberTracks', !ps.rememberTracks, 'settings-tracks'); });
      setting('settings-seek', t('Sarma adımı', 'Seek step'), [[5, t('5 saniye', '5 seconds')], [10, t('10 saniye', '10 seconds')], [30, t('30 saniye', '30 seconds')]], 'seekStep');
      row('settings-buffering', t('Tampon ve kaynak tarama', 'Buffering and source discovery'), '', function () { a.panel.settingsBuffering = true; self.drawOptions('settings-buffer-profile'); });
      row('settings-source-note', t('Kaynak çözümleme', 'Source resolution'), ps.sourceScanMode === 'selected' ? t('Ek kaynaklar yalnız elle yenilemeyle aranır', 'Other sources are scanned only by manual refresh') : ps.sourceScanMode === 'menu' ? t('İlk kaynak; kalanlar Kaynaklar menüsünde', 'First source; others in the Sources menu') : t('İlk kaynak ve bir yedek; kalanlar Kaynaklar menüsünde', 'First source and one backup; others in the Sources menu'));
    } else if (category === 'buffering') {
      setting('settings-buffer-profile', t('Tampon profili', 'Buffer profile'), [['auto', t('Otomatik — önerilen', 'Automatic — recommended')], ['low', t('Düşük bellek', 'Low memory')], ['resilient', t('Kesintiye dayanıklı', 'Resilient')]], 'bufferProfile');
      row('settings-buffer-help', t('Tampon davranışı', 'Buffer behavior'), t('Düşük bellek daha küçük tampon kullanır. Kesintiye dayanıklı profil daha uzun bekletebilir. Değişiklik sonraki kaynak açılışında uygulanır; kaynak ve TV korumaları geçerlidir.', 'Low memory uses a smaller buffer. Resilient may increase waiting. Changes apply the next time a source opens; source and TV safeguards still apply.'));
      setting('settings-source-scan', t('Arka plan kaynak taraması', 'Background source discovery'), [['selected', t('Yalnız seçilen kaynak', 'Selected source only')], ['backup', t('İlk kaynak + bir yedek — önerilen', 'First source + one backup — recommended')], ['menu', t('Kalanları Kaynaklar açılınca çöz', 'Resolve others when Sources opens')]], 'sourceScanMode');
      row('settings-scan-help', t('Diğer kaynaklar', 'Other sources'), t('Yalnız seçilen kaynak: ek tarama için Bağlantıları yenile kullanılır. Diğer iki seçenekte Kaynaklar menüsü kalanları hazırlar. Gerçek oynatma hatasında güvenli toparlama korunur.', 'Selected source only: use Refresh links to scan others. The other modes resolve remaining sources when Sources opens. Safe recovery remains available on playback failure.'));
    } else if (category === 'video') {
      setting('settings-quality', t('Otomatik kalite üst sınırı', 'Automatic quality limit'), [[0, t('Sınırsız', 'Unlimited')], [480, '480p'], [720, '720p'], [1080, '1080p'], [2160, '2160p']], 'qualityCap');
      setting('settings-aspect', t('Görüntü oranı', 'Aspect ratio'), [['fit', t('Ekrana sığdır', 'Fit to screen')], ['zoom', t('Ekranı doldur', 'Fill screen')]], 'aspect');
    } else if (category === 'audio') {
      setting('settings-audio', t('Tercih edilen ses dili', 'Preferred audio language'), [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español']], 'audioLanguage');
      style('settings-sub-size', t('Altyazı boyutu', 'Subtitle size'), [[24, '24'], [30, '30'], [36, '36'], [42, '42'], [48, '48'], [54, '54'], [60, '60']], 'size');
      style('settings-sub-color', t('Altyazı rengi', 'Subtitle color'), [['#ffffff', t('Beyaz', 'White')], ['#ffff00', t('Sarı', 'Yellow')], ['#00ffff', t('Camgöbeği', 'Cyan')]], 'color');
      style('settings-sub-bg', t('Altyazı zemini', 'Subtitle background'), [[0, t('Saydam', 'Transparent')], [0.65, t('Yarı saydam', 'Translucent')], [1, t('Siyah', 'Black')]], 'background');
      style('settings-sub-shadow', t('Altyazı gölgesi', 'Subtitle shadow'), [[true, on(true)], [false, on(false)]], 'shadow');
      style('settings-sub-bottom', t('Altyazı alt boşluğu', 'Subtitle bottom margin'), [[3, '%3'], [5, '%5'], [8, '%8'], [12, '%12'], [20, '%20'], [30, '%30']], 'bottom');
    } else if (category === 'updates') {
      panel('tools-updates', t('Uygulama / çekirdek', 'Application / core'), 'update-center', { scope: 'core' });
      panel('settings-site-packages', t('Kurulu site paketleri', 'Installed site packages'), 'site-management');
      if (root.FilmPlugins) panel('settings-repositories', t('Eklenti depoları ve yeni paketler', 'Plugin repositories and new packages'), 'plugins', { pluginView: 'repositories' });
    } else if (category === 'storage') {
      row('tools-cache', t('Katalog önbelleğini temizle', 'Clear catalog cache'), '', function () { self.confirm(t('Katalog önbelleğini temizle', 'Clear catalog cache'), t('Listem ve izleme kayıtları korunur.', 'My list and viewing records are preserved.'), function () { a.cache.clear(); a.images.clear(); a.app.view.toast(t('Katalog önbelleği temizlendi.', 'Catalog cache cleared.')); }, 'tools-cache'); });
      row('settings-search-clear', t('Arama geçmişini temizle', 'Clear search history'), '', function () { self.confirm(t('Arama geçmişini temizle', 'Clear search history'), t('İzleme geçmişi korunur.', 'Viewing history is preserved.'), function () { self.p.clear(); }, 'settings-search-clear'); });
      panel('tools-history', t('İzleme geçmişini temizle', 'Clear viewing history'), 'clear-history');
      row('settings-reset-all', t('Tümünü sıfırla', 'Reset everything'), t('İlk kurulum hâline dön', 'Return to first installation'), function () { self.choose(t('Tüm kayıtlar, ayarlar, depolar ve indirilen bileşenler silinecek. WGT içindeki başlangıç sürümüyle yeniden açılacak.', 'All records, settings, repositories and downloaded components will be deleted. The bundled WGT version will restart.'), [[false, t('Vazgeç', 'Cancel')], [true, t('Tümünü sıfırla ve yeniden aç', 'Reset everything and restart')]], false, function (yes) { if (yes) self.resetAll(); }, 'settings-reset-all'); });
    } else if (category === 'about') {
      panel('tools-about', t('Hakkında, lisanslar ve teşekkürler', 'About, licenses and credits'), 'about');
      panel('settings-playback-support', t('Oynatma ve motor desteği', 'Playback and engine support'), 'support');
      row('settings-remote-help', t('Kumanda tuşları', 'Remote buttons'), '', function () { self.info(t('Kumanda tuşları', 'Remote buttons'), t('Yön tuşları: gezinme ve sarma. OK: seçme / oynat-duraklat. Geri: menüyü kapatma / çıkış. Fiziksel Durdur: Çıkış menüsü.', 'Arrows: navigation and seeking. OK: select / play-pause. Back: close menu / exit. Physical Stop: exit menu.')); });
      row('settings-budget', t('Önbellek sınırları', 'Cache limits'), t('Katalog 1 MiB · Görseller 8 MiB / 48 görsel', 'Catalog 1 MiB · Images 8 MiB / 48 images'));
      row('settings-version', t('Uygulama ve bileşen', 'Application and component'), 'v' + root.AppInfo.version + (root.FilmUpdate ? ' · ' + root.FilmUpdate.status().current : ''));
    }
    return result;
  };
  UI.prototype.resetAll = function () {
    var self = this, a = this.a;
    if (this.resetting) return;
    this.resetting = true;
    Array.prototype.forEach.call(document.querySelectorAll('.settings-categories button, .settings-back'), function (x) { x.disabled = true; });
    this.info(t('Sıfırlanıyor', 'Resetting'), t('İşlem tamamlanana kadar uygulamayı kapatmayın.', 'Keep the application open until reset finishes.'));
    if (!this.resetService) this.resetService = new root.SettingsResetService(a.app);
    this.resetService.resetAll().then(function () { root.location.reload(); }, function (e) {
      self.resetting = false;
      self.resetFailed = true;
      document.querySelector('.settings-back').disabled = false;
      self.choose(t('Sıfırlama tamamlanamadı: ', 'Reset could not finish: ') + e.message, [[false, t('Uygulamayı yeniden aç', 'Restart application')], [true, t('Yeniden dene', 'Retry')]], false, function (retry) { if (retry) self.resetAll(); else root.location.reload(); }, 'settings-reset-all');
    });
  };
  UI.prototype.info = function (title, text) { var active = document.activeElement, key = active && active.getAttribute('data-focus'); this.choose(title, [[0, text]], 0, function () {}, key); this.a.panel.settingsChoice.info = true; this.drawOptions('setting-choice-0'); };
  UI.prototype.confirm = function (title, text, action, key) { this.choose(title + ' · ' + text, [[false, t('Vazgeç', 'Cancel')], [true, t('Temizle', 'Clear')]], false, function (x) { if (x) action(); }, key); };
  UI.prototype.drawOptions = function (key) {
    var self = this, panel = this.a.panel, host = document.getElementById('settings-options'); if (!host || !panel) return;
    host.textContent = '';
    function append(row) { var x = row.action ? b('', row.key, row.action, 'settings-row') : n('div', 'settings-row settings-info'); x.appendChild(n('strong', '', row.title)); if (row.value) x.appendChild(n('span', 'settings-value', row.value)); if (row.help) x.appendChild(n('small', '', row.help)); host.appendChild(x); }
    var choice = panel.settingsChoice;
    if (choice) { host.appendChild(n('h2', 'settings-options-title', choice.title)); choice.values.forEach(function (v, i) { append({key:'setting-choice-'+i,title:(choice.selected === v[0] && !choice.info ? '✓ ' : '') + v[1],action:function(){delete panel.settingsChoice;choice.save(v[0]);self.drawOptions(choice.returnKey || 'settings-category-'+panel.settingsCategory);}}); }); }
    else if (panel.settingsRows) {
      [['continue',t('İzlemeye devam et','Continue watching')],['following',t('Takip ettiğim diziler','Followed series')],['movies',t('Filmler','Movies')],['series',t('Diziler','Series')],['collections',t('Koleksiyonlar','Collections')]].forEach(function(v){var value=self.p.appearance();append({key:'settings-row-'+v[0],title:v[1],value:on(value.rows[v[0]]),action:function(){value.rows[v[0]]=!value.rows[v[0]];self.saveAppearance(value,'settings-row-'+v[0]);}});});
    } else this.rows(panel.settingsBuffering ? 'buffering' : panel.settingsCategory).forEach(append);
    if (key) {
      var target = this.a.findFocus(key);
      if (!target || target.disabled) target = host.querySelector('button:not([disabled])') || this.a.findFocus('settings-category-' + panel.settingsCategory);
      if (target && !target.disabled) this.focus(target.getAttribute('data-focus'));
    }
  };
  UI.prototype.render = function (key) {
    if (!this.active()) { this.hide(); return false; }
    var self = this, p = this.a.panel, host = document.getElementById('catalog-modal'), box = document.getElementById('catalog-modal-card');
    p.settingsCategory = p.settingsCategory || 'general'; host.style.display = 'block'; host.classList.add('fm-settings'); box.textContent = '';
    var header = n('header','settings-header'), logo = document.querySelector('.catalog-brand img'); if (logo) header.appendChild(logo.cloneNode(false));
    var title = n('h1','','Film Merkezi  v'+root.AppInfo.version+'  ·  '+t('Ayarlar','Settings'));title.id='settings-title';header.appendChild(title);header.appendChild(b(t('Geri','Back'),'settings-back',function(){self.back();},'settings-back'));box.appendChild(header);
    var body=n('div','settings-layout'),left=n('nav','settings-categories'),right=n('section','settings-options');left.setAttribute('aria-label',t('Ayar kategorileri','Settings categories'));right.id='settings-options';right.setAttribute('aria-labelledby','settings-title');
    this.categories().forEach(function(v){var x=b(v[1],'settings-category-'+v[0],function(){self.focusFirstOption();},'settings-category');x.setAttribute('aria-pressed',p.settingsCategory===v[0]?'true':'false');x.onfocus=function(){if(p.settingsCategory===v[0])return;p.settingsCategory=v[0];delete p.settingsChoice;delete p.settingsRows;delete p.settingsBuffering;Array.prototype.forEach.call(left.querySelectorAll('button'),function(k){k.setAttribute('aria-pressed',k===x?'true':'false');});self.drawOptions();};left.appendChild(x);});body.appendChild(left);body.appendChild(right);box.appendChild(body);box.appendChild(n('p','settings-help',t('↑ ↓ Gezin · → Seçenekler · ← Kategoriler · OK Değiştir · Geri Dön','↑ ↓ Navigate · → Options · ← Categories · OK Change · Back Return')));
    this.drawOptions();this.focus(key || 'settings-category-'+p.settingsCategory);return true;
  };
  UI.prototype.focusFirstOption = function () { var x = document.querySelector('#settings-options button'); if(x)this.focus(x.getAttribute('data-focus')); };
  UI.prototype.back = function () { if(this.resetting)return;if(this.resetFailed){root.location.reload();return;}var p=this.a.panel;if(p.settingsChoice){var key=p.settingsChoice.returnKey;delete p.settingsChoice;this.drawOptions(key || 'settings-category-'+p.settingsCategory);}else if(p.settingsRows){delete p.settingsRows;this.drawOptions('settings-rows');}else if(p.settingsBuffering){delete p.settingsBuffering;this.drawOptions('settings-buffering');}else this.a.closePanel(true); };
  UI.prototype.key = function (event) {
    if(!this.active())return false;var code=event.keyCode,active=document.activeElement,key=active&&active.getAttribute('data-focus'),category=key&&key.indexOf('settings-category-')===0,items,index,next;
    if(this.resetting){event.preventDefault();return true;}
    if([9,13,27,37,38,39,40,10009].indexOf(code)<0)return false;event.preventDefault();
    if(code===27||code===10009){this.back();return true;}if(code===13){if(active&&active.tagName==='BUTTON')active.click();return true;}
    if(code===37){if(this.a.panel.settingsChoice||this.a.panel.settingsRows||this.a.panel.settingsBuffering)this.back();else this.focus('settings-category-'+this.a.panel.settingsCategory);return true;}
    if(code===39){if(category||key==='settings-back')this.focusFirstOption();return true;}
    items=Array.prototype.slice.call(document.querySelectorAll(code===9?'#catalog-modal-card button:not([disabled])':category?'.settings-categories button:not([disabled])':'#settings-options button:not([disabled])'));index=items.indexOf(active);
    if(key==='settings-back'){this.focus('settings-category-'+this.a.panel.settingsCategory);return true;}
    next=index+(code===38||event.shiftKey?-1:1);if(next<0){this.focus('settings-back');return true;}if(next>=items.length)next=code===9?0:items.length-1;if(items[next])this.focus(items[next].getAttribute('data-focus'));return true;
  };
  root.CatalogSettingsUI=UI;
})(window);
