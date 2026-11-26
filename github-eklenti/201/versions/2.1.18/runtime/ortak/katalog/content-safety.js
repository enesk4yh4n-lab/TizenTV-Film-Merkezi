(function (root) {
  'use strict';
  var key = 'filmmerkezi.content-safety.v1', evidenceKey = 'filmmerkezi.content-safety.evidence.v1';
  var label = /^(?:erotik(?: film(?:ler)?| dizi(?:ler)?| icerik)?|yetiskin(?: filmi| filmleri| dizileri| icerik(?:leri)?)?|adult(?: only| content| entertainment)?|porn(?:o|ografi|ography)?|sexually explicit|explicit sexual content|cinsel icerik)$/;
  var marked = Object.create(null), added = [], state, invalid = false, busy = false, resetPermit = null, revision = 0;
  function text(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function message() { return text('Bu içerik yetişkin filtresiyle gizlendi.', 'This content is hidden by the adult filter.'); }
  function normal(s) {
    return String(s || '').toLowerCase().replace(/[\u0131\u0130]/g,'i').replace(/\u015f/g,'s').replace(/\u011f/g,'g')
      .replace(/\u00e7/g,'c').replace(/\u00fc/g,'u').replace(/\u00f6/g,'o').replace(/[\u0300-\u036f]/g,'')
      .replace(/^\s+|\s+$/g,'').replace(/[\s_-]+/g,' ');
  }
  function direct(card) {
    var safety = card && card.contentSafety;
    if (!card) return false;
    if (safety && safety.adult === true || card.adult === true) return true;
    return [].concat(card.genres || [], card.categories || [], card.tags || []).some(function (x) {
      return typeof x === 'string' && label.test(normal(x));
    });
  }
  function keys(card) {
    var out = [], e = card.identityEvidence || {}, ref = root.ContentIdentity && root.ContentIdentity.reference && root.ContentIdentity.reference(card);
    if (typeof card.contentId === 'string' && card.contentId.length <= 800) out.push('id:' + card.contentId);
    if (card.type !== 'episode' && !e.imdbConflict && /^tt\d{5,12}$/.test(e.imdbId || '')) out.push('imdb:' + e.imdbId);
    if (card.type !== 'episode' && ref && (ref.binding === 'direct' || ref.binding === 'confirmed') && /^(movie|tv|series)$/.test(ref.type) && Number(ref.id) > 0)
      out.push('tmdb:' + ref.type + ':' + ref.id);
    return out;
  }
  function validEvidence(item) { return typeof item === 'string' && item.length <= 804 && /^(?:id:|imdb:tt\d|tmdb:)/.test(item); }
  try {
    var saved = JSON.parse(root.localStorage.getItem(evidenceKey) || '[]');
    if (Array.isArray(saved) && saved.length <= 500 && saved.every(validEvidence)) {
      added = saved;
      added.forEach(function (item) { marked[item] = true; });
    }
  } catch (ignore) {}
  function learn(card) {
    if (!card || !direct(card)) return;
    var dirty = false;
    keys(card).forEach(function (item) {
      if (!marked[item]) { marked[item] = true; added.push(item); dirty = true; }
    });
    if (!dirty) return;
    revision++;
    while (added.length > 500) delete marked[added.shift()];
    try { root.localStorage.setItem(evidenceKey, JSON.stringify(added)); } catch (ignore) {}
  }
  function restricted(card) {
    if (!card) return false;
    return direct(card) || keys(card).some(function (item) { return marked[item]; }) ||
      !!(card.episode && marked['id:' + card.episode.seriesId]) ||
      (Array.isArray(card.variants) ? card.variants : []).some(function (v) { return v !== card && (direct(v) || keys(v).some(function (item) { return marked[item]; })); });
  }
  function defaults() { return {version:1, enabled:true, salt:'', hash:'', failures:0, lockedUntil:0}; }
  state = defaults();
  try {
    var raw = root.localStorage.getItem(key), candidate = raw && JSON.parse(raw);
    if (candidate) {
      if (candidate.version !== 1 || typeof candidate.enabled !== 'boolean' ||
          !((candidate.salt === '' && candidate.hash === '') || (/^[0-9a-f]{32}$/.test(candidate.salt) && /^[0-9a-f]{64}$/.test(candidate.hash))) ||
          !/^\d$/.test(String(candidate.failures)) || typeof candidate.lockedUntil !== 'number' || !isFinite(candidate.lockedUntil))
        throw Error('Invalid settings');
      state = candidate;
    } else if (raw) throw Error('Invalid settings');
  } catch (ignore) { invalid = true; }
  function enabled() { return invalid || state.enabled; }
  function allow(card) { return !enabled() || !restricted(card); }
  function filter(cards) {
    cards = cards || [];
    cards.forEach(learn);
    return enabled() ? cards.filter(allow) : cards;
  }
  function error(tr, en) { return Error(text(tr,en)); }
  function save(next) {
    var value = JSON.stringify(next);
    try {
      root.localStorage.setItem(key, value);
      if (root.localStorage.getItem(key) !== value) throw Error('Verification');
    } catch (ignore) {
      invalid = true; revision++;
      throw error('Ayar kaydedilemedi. Filtre açık kaldı.', 'Could not save the setting. The filter remains on.');
    }
    if (state.enabled !== next.enabled) revision++;
    state = next;
  }
  function modify(fields) {
    var next = defaults();
    Object.keys(next).forEach(function (name) { next[name] = Object.prototype.hasOwnProperty.call(fields,name) ? fields[name] : state[name]; });
    save(next);
  }
  function hex(bytes) {
    return Array.prototype.map.call(bytes,function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
  }
  function hash(salt, pin) {
    var value = salt + ':' + pin, bytes = new Uint8Array(value.length);
    for (var i=0;i<value.length;i++) bytes[i] = value.charCodeAt(i);
    return root.crypto.subtle.digest({name:'SHA-256'}, bytes).then(function (digest) { return hex(new Uint8Array(digest)); });
  }
  function verify(pin) {
    if (invalid) throw error('PIN kaydı okunamadı. Filtre açık kaldı.', 'The PIN record could not be read. The filter remains on.');
    if (state.lockedUntil > Date.now())
      throw error('PIN için kalan saniye: ' + Math.ceil((state.lockedUntil-Date.now())/1000), 'Try the PIN again in seconds: ' + Math.ceil((state.lockedUntil-Date.now())/1000));
    var result = state.hash ? hash(state.salt,pin).then(function (value) { return value === state.hash; }) : Promise.resolve(pin === '0000');
    return result.then(function (ok) {
      if (!ok) {
        var count = state.failures + 1;
        modify({failures:count >= 5 ? 0 : count, lockedUntil:count >= 5 ? Date.now()+60000 : 0});
        throw count >= 5 ? error('Beş yanlış deneme. 60 saniye bekleyin.', 'Five incorrect attempts. Wait 60 seconds.') : error('PIN yanlış.', 'Incorrect PIN.');
      }
      if (state.failures || state.lockedUntil) modify({failures:0,lockedUntil:0});
    });
  }
  function action(kind, pin, next, confirm) {
    if (busy) return Promise.reject(error('Bir PIN işlemi sürüyor.', 'A PIN operation is in progress.'));
    if (!/^\d{4}$/.test(pin || '') || kind === 'change' && (!/^\d{4}$/.test(next || '') || next !== confirm))
      return Promise.reject(error('Dört rakam girin ve yeni PIN’i doğrulayın.', 'Enter four digits and confirm the new PIN.'));
    busy = true;
    var work = Promise.resolve().then(function () { return verify(pin); }).then(function () {
      if (kind === 'off') modify({enabled:false});
      if (kind === 'reset') { resetPermit = {}; return resetPermit; }
      if (kind === 'change') {
        var salt = hex(root.crypto.getRandomValues(new Uint8Array(16)));
        return hash(salt,next).then(function (digest) { modify({salt:salt,hash:digest}); });
      }
    });
    return work.then(function (value) { busy = false; return value; }, function (e) { busy = false; throw e; });
  }
  root.ContentSafety = {
    enabled:enabled, allow:allow, direct:direct, restricted:restricted, learn:learn, filter:filter, message:message,
    mark:function (card) { return direct(card) ? {adult:true} : undefined; },
    enable:function () { if (busy) throw Error('PIN operation in progress'); if (!invalid) modify({enabled:true}); },
    action:action,
    beginReset:function (keepPin, permit) {
      if (!keepPin) {
        if (!permit || permit !== resetPermit) throw error('PIN gerekli.', 'PIN required.');
        resetPermit = null;
      }
      if (!invalid) modify({enabled:true});
      return function () {
        if (!keepPin) { save(defaults()); invalid = false; }
        added = []; marked = Object.create(null);
      };
    },
    settingsKey:key, revision:function () { return revision; }
  };
})(window);
