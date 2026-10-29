/* Local, versioned usage acknowledgement and bundled third-party credits. ES5 only. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.usage-consent.v1',
    REVISION = '2026-10-29.1';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  var paragraphs = [
    'Film Merkezi, üçüncü taraf internet sitelerindeki içeriklere erişim sağlayan bağımsız bir uygulamadır. Bu sitelerle resmî bağlantısı bulunmaz.',
    'İçeriklerin erişilebilirliği, güvenliği, doğruluğu ve kesintisiz oynatılması garanti edilmez. Kullanıcı, yalnızca erişim hakkına sahip olduğu içerikleri kullanmak ve geçerli mevzuata uymakla yükümlüdür.',
    'Uygulama herhangi bir içerik için telif veya kullanım izni sağlamaz. Yürürlükteki hukukun izin verdiği ölçüde, uygulama herhangi bir garanti sunulmaksızın sağlanır. Bu bilgilendirme, kanunen kaldırılamayan sorumlulukları ve üçüncü taraf lisanslarının sağladığı hakları ortadan kaldırmaz.'
  ];
  var youtube = 'cozumleyiciler/youtube/YOUTUBE_THIRD_PARTY_NOTICES.md',
    native = 'ortak/ag/native/notices/';
  var credits = [
    {
      name: 'hls.js 1.7.3',
      by: 'video-dev, Dailymotion, Brightcove ve katkıda bulunanlar',
      license: 'Apache-2.0',
      files: ['vendor/HLS_LICENSE.txt', 'vendor/HLS_APACHE_2_LICENSE.txt'],
      url: 'https://github.com/video-dev/hls.js'
    },
    {
      name: 'HDFilmCehennemi Stremio uyarlamaları',
      by: 'enXov / Batuhan4',
      license: 'MIT',
      files: ['THIRD_PARTY_NOTICES.md'],
      url: 'https://github.com/enXov/hdfilmcehennemi-stremio · https://github.com/Batuhan4/hdfilmcehennemi-stremio'
    },
    {
      name: 'HDFilmCehennemi Nuvio kaynak uyarlamaları',
      by: 'HDFilmCehennemi Nuvio provider contributors',
      license: 'MIT',
      files: ['LICENSE']
    },
    {
      name: 'CryptoJS 4.2.0',
      by: 'Jeff Mott / Evan Vosberg ve katkıda bulunanlar',
      license: 'MIT',
      files: ['vendor/CRYPTO_JS_LICENSE.txt'],
      url: 'https://github.com/brix/crypto-js'
    },
    {
      name: 'YouTube.js 18.3.0 / jintr 3.3.1',
      by: 'LuanRT ve katkıda bulunanlar',
      license: 'MIT',
      files: [youtube],
      url: 'https://github.com/LuanRT/YouTube.js'
    },
    {
      name: 'core-js 3.51.0 / whatwg-fetch 3.6.20',
      by: 'Denis Pushkarev, CoreJS Company / GitHub ve katkıda bulunanlar',
      license: 'MIT',
      files: [youtube]
    },
    {
      name: 'fast-text-encoding 1.0.6 / @bufbuild/protobuf 2.16.0',
      by: 'Google / Buf Technologies ve katkıda bulunanlar',
      license: 'Apache-2.0; protobuf varint: BSD-3-Clause',
      files: [youtube]
    },
    {
      name: 'fflate 0.8.3 / acorn 8.19.0',
      by: 'Arjun Barrett / Acorn contributors',
      license: 'MIT',
      files: [youtube]
    },
    { name: 'meriyah 7.4.0', by: 'KFlash ve katkıda bulunanlar', license: 'ISC', files: [youtube] },
    {
      name: '@babel/helpers 7.29.10 / esbuild 0.25.12',
      by: 'Sebastian McKenzie, Facebook / Evan Wallace ve katkıda bulunanlar',
      license: 'MIT',
      files: [youtube]
    },
    {
      name: 'Samsung Pepper / Chromium Native Client',
      by: 'Samsung, The Chromium Authors ve SDK katkıcıları',
      license: 'BSD-3-Clause; SDK ek bileşen bildirimleri',
      files: [native + 'Chromium-LICENSE.txt', native + 'NaCl-SDK-NOTICE.txt'],
      url: 'https://developer.samsung.com/smarttv/develop/extension-libraries/nacl/download.html'
    },
    {
      name: 'Mbed TLS 3.6.7 / Project Everest / p256-m',
      by: 'Mbed TLS Contributors, INRIA, Microsoft / Manuel Pégourié-Gonnard',
      license: 'Apache-2.0 (çift lisansın seçilen dalı)',
      files: [native + 'MbedTLS-LICENSE.txt', native + 'MbedTLS-COMPONENT-NOTICES.txt'],
      url: 'https://github.com/Mbed-TLS/mbedtls'
    },
    {
      name: 'Mozilla CA / curl sertifika verisi',
      by: 'Mozilla ve curl katkıcıları',
      license: 'MPL-2.0',
      files: [native + 'Mozilla-MPL-2.0.txt'],
      url: 'https://curl.se/docs/caextract.html',
      source:
        'MPL kapsamındaki sertifika kaynağı, WGT ile birlikte dağıtılan Film-Merkezi-Kaynak-{version}.zip içindeki kaynak/ortak/ag/native/ca-bundle.pem dosyasındadır.'
    },
    {
      name: 'Geliştirme ve kurulum araçlarına teşekkürler',
      by: 'Apps2Samsung, Samsung Tizen SDK, Playwright, FFmpeg/ffprobe ve açık kaynak toplulukları',
      license: 'Bu araçlar WGT içinde dağıtılmaz; kendi lisans ve koşulları geçerlidir.',
      files: []
    }
  ];
  function Consent(storage) {
    this.storage = storage;
    this.blocked = false;
    this.accepted = false;
    this.persisted = false;
    try {
      var raw = storage && storage.getItem(KEY);
      if (!raw) return;
      if (raw.length > 2048) throw Error('Invalid consent');
      var row = JSON.parse(raw);
      if (
        !row ||
        row.version !== 1 ||
        typeof row.documentVersion !== 'string' ||
        row.accepted !== true ||
        typeof row.acceptedAt !== 'number' ||
        !isFinite(row.acceptedAt) ||
        row.acceptedAt <= 0
      )
        throw Error('Unknown consent');
      this.accepted = row.documentVersion === REVISION;
      this.persisted = this.accepted;
    } catch (ignore) {
      this.blocked = true;
    }
  }
  Consent.prototype.accept = function () {
    this.accepted = true;
    if (!this.storage || this.blocked) return false;
    try {
      this.storage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          documentVersion: REVISION,
          accepted: true,
          acceptedAt: Date.now()
        })
      );
      this.persisted = true;
    } catch (ignore) {}
    return this.persisted;
  };
  var host,
    card,
    active = false,
    listening = false,
    held = {},
    done = null,
    back = null,
    returnFocus = null,
    request = null,
    generation = 0;
  function node(tag, cls, value) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined) n.textContent = tr(value);
    return n;
  }
  function button(label, id, action) {
    var n = node('button', '', label);
    n.type = 'button';
    n.setAttribute('data-legal', id);
    n.onclick = action;
    card.appendChild(n);
    return n;
  }
  function consume(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  function unlisten() {
    if (active || Object.keys(held).length || !listening) return;
    root.removeEventListener('keydown', key, true);
    root.removeEventListener('keyup', release, true);
    root.removeEventListener('click', click, true);
    root.removeEventListener('focusin', focus, true);
    root.removeEventListener('blur', blur);
    listening = false;
  }
  function release(e) {
    var code = e.keyCode || e.which;
    if (held[code]) {
      delete held[code];
      consume(e);
    }
    unlisten();
  }
  function blur() {
    held = {};
    unlisten();
  }
  function click(e) {
    if (active && !host.contains(e.target)) consume(e);
  }
  function focus(e) {
    if (active && !host.contains(e.target)) {
      var first = card.querySelector('button');
      if (first) first.focus();
    }
  }
  function key(e) {
    var code = e.keyCode || e.which;
    if (!active) {
      if (held[code]) consume(e);
      return;
    }
    consume(e);
    var repeated = held[code];
    held[code] = true;
    var buttons = Array.prototype.slice.call(card.querySelectorAll('button, pre[tabindex]')),
      index = buttons.indexOf(document.activeElement);
    if (document.activeElement.tagName === 'PRE' && (code === 38 || code === 40)) {
      var pre = document.activeElement,
        before = pre.scrollTop;
      pre.scrollTop += code === 38 ? -110 : 110;
      if (pre.scrollTop !== before) return;
    }
    if (code === 13 && !repeated && index >= 0 && buttons[index].tagName === 'BUTTON')
      buttons[index].click();
    else if ((code === 27 || code === 10009) && !repeated && back) back();
    else if (code === 9 || [37, 38, 39, 40].indexOf(code) >= 0) {
      var delta = code === 37 || code === 38 || (code === 9 && e.shiftKey) ? -1 : 1;
      if (buttons.length)
        buttons[(Math.max(0, index) + delta + buttons.length) % buttons.length].focus();
    }
  }
  function cancelRead() {
    generation++;
    if (request) {
      request.onreadystatechange = null;
      request.onerror = null;
      request.ontimeout = null;
      request.abort();
      request = null;
    }
  }
  function open(title, onBack) {
    cancelRead();
    if (!active) returnFocus = document.activeElement;
    active = true;
    back = onBack;
    host = document.getElementById('legal-overlay');
    card = document.getElementById('legal-card');
    host.style.display = 'block';
    host.setAttribute('aria-hidden', 'false');
    card.textContent = '';
    card.appendChild(node('h1', '', title)).id = 'legal-title';
    if (!listening) {
      root.addEventListener('keydown', key, true);
      root.addEventListener('keyup', release, true);
      root.addEventListener('click', click, true);
      root.addEventListener('focusin', focus, true);
      root.addEventListener('blur', blur);
      listening = true;
    }
  }
  function close() {
    cancelRead();
    active = false;
    host.style.display = 'none';
    host.setAttribute('aria-hidden', 'true');
    card.textContent = '';
    back = null;
    var previous = returnFocus;
    returnFocus = null;
    if (previous && document.documentElement.contains(previous)) previous.focus();
    unlisten();
  }
  function exit() {
    try {
      root.tizen.application.getCurrentApplication().exit();
    } catch (ignore) {
      var status = document.getElementById('legal-status');
      if (status) status.textContent = tr('Çıkış işlemi TV üzerinde kullanılabilir.');
    }
  }
  function usage(review, returnTo) {
    open('Kullanım bilgilendirmesi', review ? returnTo : exit);
    paragraphs.forEach(function (text) {
      card.appendChild(node('p', 'legal-paragraph', text));
    });
    card.appendChild(node('p', 'legal-revision', tr('Metin sürümü: ') + REVISION));
    if (!review) {
      card.appendChild(
        node('p', 'legal-status', 'Onay bu cihazda saklanır. Metin değişirse yeniden gösterilir.')
      ).id = 'legal-status';
      button('Okudum, anladım ve devam et', 'accept', function () {
        if (!active || !done) return;
        if (!api.consent.accept())
          api.notice =
            'Kullanım onayı kalıcı kaydedilemedi; bu oturum için geçerli. Sonraki açılışta yeniden sorulacak.';
        var ready = done;
        done = null;
        close();
        ready();
      }).focus();
      button('Çıkış', 'exit', exit);
    } else button('Geri', 'back', returnTo).focus();
  }
  function showCredits(page, returnTo, focusIndex) {
    page = page || 0;
    open('Teşekkürler ve lisanslar', returnTo);
    card.appendChild(
      node(
        'p',
        'legal-intro',
        'Bu uygulamaya katkı sağlayan açık kaynak geliştiricilerine ve topluluklara teşekkür ederiz.'
      )
    );
    credits.slice(page * 5, page * 5 + 5).forEach(function (row, offset) {
      var index = page * 5 + offset;
      var b = button(row.name, 'credit-' + index, function () {
        creditDetail(index, page, returnTo);
      });
      b.className = 'legal-credit';
      b.appendChild(node('small', '', row.license));
    });
    if (page > 0)
      button('Önceki sayfa', 'previous', function () {
        showCredits(page - 1, returnTo);
      });
    if ((page + 1) * 5 < credits.length)
      button('Sonraki sayfa', 'next', function () {
        showCredits(page + 1, returnTo);
      });
    button('Geri', 'back', returnTo);
    (
      card.querySelector('[data-legal="credit-' + focusIndex + '"]') || card.querySelector('button')
    ).focus();
  }
  function creditDetail(index, page, returnTo) {
    var row = credits[index],
      previous = function () {
        showCredits(page, returnTo, index);
      };
    open(row.name, previous);
    card.appendChild(node('p', '', row.by));
    card.appendChild(node('p', '', row.license));
    if (row.url) card.appendChild(node('p', 'legal-url', row.url));
    if (row.source)
      card.appendChild(node('p', '', tr(row.source).replace('{version}', root.AppInfo.version)));
    row.files.forEach(function (file, i) {
      button(tr('Lisans / bildirim: ') + file.split('/').pop(), 'file-' + i, function () {
        read(file, function () {
          creditDetail(index, page, returnTo);
        });
      });
    });
    button('Geri', 'back', previous);
    card.querySelector('button').focus();
  }
  function read(file, previous) {
    open('Lisans ve telif bildirimi', previous);
    card.appendChild(node('p', 'legal-url', file));
    var pre = node('pre', 'legal-document', 'Yükleniyor…');
    card.appendChild(pre);
    button('Geri', 'back', previous).focus();
    var token = generation,
      xhr = (request = new root.XMLHttpRequest());
    xhr.open('GET', file, true);
    xhr.timeout = 5000;
    function failed() {
      if (token !== generation) return;
      request = null;
      pre.textContent = tr('Bildirim açılamadı. Dosyanın tam metni uygulama paketinde korunur.');
    }
    function pages(text, offset) {
      var chunk = text.slice(offset, offset + 1800);
      card.textContent = '';
      card.appendChild(node('h1', '', 'Lisans ve telif bildirimi')).id = 'legal-title';
      card.appendChild(
        node(
          'p',
          'legal-url',
          file + ' · ' + (Math.floor(offset / 1800) + 1) + '/' + Math.ceil(text.length / 1800)
        )
      );
      // License text is kept verbatim, including its original language.
      var content = node('pre', 'legal-document');
      content.textContent = chunk;
      content.tabIndex = 0;
      content.setAttribute('aria-label', tr('Lisans metni; yukarı ve aşağı ile kaydırın.'));
      card.appendChild(content);
      if (offset > 0)
        button('Önceki sayfa', 'previous', function () {
          pages(text, offset - 1800);
        });
      if (offset + 1800 < text.length)
        button('Sonraki sayfa', 'next', function () {
          pages(text, offset + 1800);
        });
      button('Geri', 'back', previous);
      content.focus();
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || token !== generation) return;
      if (
        (xhr.status === 0 || xhr.status === 200) &&
        xhr.responseText &&
        xhr.responseText.length <= 512000
      ) {
        request = null;
        pages(xhr.responseText, 0);
      } else failed();
    };
    xhr.onerror = xhr.ontimeout = failed;
    try {
      xhr.send();
    } catch (ignore) {
      failed();
    }
  }
  var api = (root.FilmLegal = {
    key: KEY,
    revision: REVISION,
    Consent: Consent,
    paragraphs: paragraphs,
    credits: credits,
    notice: '',
    start: function (ready) {
      var storage = null;
      try {
        storage = root.localStorage;
      } catch (ignore) {}
      if (root.FilmI18n && root.CatalogPreferences)
        root.FilmI18n.init(new root.CatalogPreferences(storage));
      api.consent = new Consent(storage);
      if (api.consent.accepted) {
        ready();
        return;
      }
      done = ready;
      usage(false);
      if (api.consent.blocked)
        document.getElementById('legal-status').textContent = tr(
          'Önceki onay kaydı okunamadı; değiştirilmeden korunacak. Onayınız yalnız bu oturum için geçerli olacak.'
        );
    },
    review: function () {
      usage(true, close);
    },
    showCredits: function () {
      showCredits(0, close);
    }
  });
})(window);
