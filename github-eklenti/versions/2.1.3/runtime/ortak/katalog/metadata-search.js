/* Text-only suggestions. IME owns arrows until it has closed. ES5. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function Suggestions(options) {
    this.input = options.input; this.host = options.host; this.service = options.service;
    this.select = options.select; this.focusInput = options.focusInput;
    this.onCancel = options.cancel;
    this.context = options.context;
    this.active = options.active || function () { return true; };
    this.type = options.type || function () { return 'all'; };
    this.timer = null; this.generation = 0; this.composing = false;
    var self = this;
    this.inputHandler = function () { self.changed(); };
    this.compositionStart = function () { self.composing = true; self.cancel(); };
    this.compositionEnd = function () { self.composing = false; self.changed(); };
    this.input.addEventListener('input', this.inputHandler);
    this.input.addEventListener('compositionstart', this.compositionStart);
    this.input.addEventListener('compositionend', this.compositionEnd);
    this.host.setAttribute('aria-label', t('Arama önerileri', 'Search suggestions'));
    this.host.style.display = 'none';
  }
  Suggestions.prototype.cancel = function () {
    this.generation++; clearTimeout(this.timer); this.timer = null;
    if (this.onCancel) this.onCancel(); else this.service.cancel();
    this.host.textContent = ''; this.host.style.display = 'none';
  };
  Suggestions.prototype.changed = function () {
    this.cancel();
    this.host.setAttribute('aria-label', t('Arama önerileri', 'Search suggestions'));
    var self = this, query = this.input.value.replace(/\s+/g, ' ').replace(/^ | $/g, ''), token = this.generation;
    if (query.length < 3 || this.composing || !this.active() || !this.service.enabled) return;
    this.timer = setTimeout(function () {
      self.timer = null;
      self.service.search(query, self.type(), self.context ? self.context() : undefined).then(function (rows) {
        if (token !== self.generation || !self.active() || !self.service.enabled) return;
        self.host.textContent = '';
        rows.slice(0, 6).forEach(function (row, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'metadata-suggestion';
          b.setAttribute('data-focus', 'metadata-suggestion-' + i);
          b.textContent = row.title + (row.year ? ' · ' + row.year : '') + ' · ' +
            (row.type === 'series' ? t('Dizi', 'Series') : t('Film', 'Movie'));
          b.onclick = function () { self.cancel(); self.select(row); };
          self.host.appendChild(b);
        });
        self.host.style.display = rows.length ? 'block' : 'none';
      }, function (error) {
        if (token !== self.generation || !self.active() || error.code === 'metadata-cancelled' || error.code === 'metadata-disabled') return;
        if (error.code === 'suggestion-site-unavailable' || error.code === 'suggestion-site-update') {
          self.host.textContent = error.code === 'suggestion-site-unavailable' ?
            t('Öneri eklentisi kurulu veya aktif değil. Başka kaynak seçebilirsiniz.', 'The suggestion addon is not installed or active. You can select another source.') :
            t('Site önerileri için seçilen eklentiyi güncelleyin.', 'Update the selected addon for site suggestions.');
          self.host.style.display = 'block'; return;
        }
        self.host.textContent = t('Arama önerileri kullanılamıyor. Ara ile devam edebilirsiniz.', 'Suggestions are unavailable. You can still use Search.');
        self.host.style.display = 'block';
      });
    }, 1000);
  };
  Suggestions.prototype.key = function (event, editing) {
    if (editing || this.host.style.display === 'none') return false;
    var buttons = this.host.querySelectorAll('button'), index = Array.prototype.indexOf.call(buttons, document.activeElement), code = event.keyCode;
    if (index < 0) {
      if (code === 40 && document.activeElement && document.activeElement.getAttribute('data-focus') === 'search-activate' && buttons.length) {
        event.preventDefault(); buttons[0].focus(); return true;
      }
      return false;
    }
    if (code === 27 || code === 10009 || code === 38 && index === 0) {
      event.preventDefault(); if (code !== 38) this.cancel(); this.focusInput(); return true;
    }
    if (code === 38 || code === 40) { event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, index + (code === 38 ? -1 : 1)))].focus(); return true; }
    return false;
  };
  Suggestions.prototype.destroy = function () {
    this.cancel();
    this.input.removeEventListener('input', this.inputHandler);
    this.input.removeEventListener('compositionstart', this.compositionStart);
    this.input.removeEventListener('compositionend', this.compositionEnd);
  };
  root.MetadataSuggestions = Suggestions;
})(window);
