/* Bundled UI messages only. No network, DOM observer, prototype patch or content translation. */
(function (root) {
  'use strict';
  var language = 'tr',
    preferences = null,
    messages = Object.create(null),
    patterns = Object.create(null),
    general = [],
    cache = Object.create(null),
    cacheKeys = [],
    cacheBytes = 0,
    listeners = [],
    staticNodes = null;
  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function escape(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function resetCache() {
    cache = Object.create(null);
    cacheKeys = [];
    cacheBytes = 0;
  }
  function remember(source, result) {
    var bytes = (source.length + result.length) * 2;
    if (bytes > 16384) return result;
    while (cacheKeys.length >= 256 || cacheBytes + bytes > 65536) {
      var key = cacheKeys.shift();
      cacheBytes -= (key.length + cache[key].length) * 2;
      delete cache[key];
    }
    cache[source] = result;
    cacheKeys.push(source);
    cacheBytes += bytes;
    return result;
  }
  function translate(value, depth) {
    if (language === 'tr' || typeof value !== 'string' || !value) return value;
    if (own(messages, value)) return messages[value];
    if (own(cache, value)) return cache[value];
    if (value.length > 4096 || !/[A-Za-z\u00C0-\u024F]/.test(value)) return value;
    var trimmed = value.replace(/^\s+|\s+$/g, '');
    if (trimmed !== value && own(messages, trimmed))
      return remember(value, value.replace(trimmed, messages[trimmed]));
    var candidates = (patterns[value.slice(0, 2)] || []).concat(general),
      result = value,
      match,
      i;
    for (i = 0; i < candidates.length; i++) {
      match = candidates[i].regex.exec(value);
      if (match) {
        var candidate = candidates[i];
        result = candidate.target.replace(/\{(\d+)\}/g, function (all, number) {
          var captured = match[Number(number) + 1] || '';
          return candidate.ui.indexOf(Number(number)) >= 0 && (depth || 0) < 3
            ? translate(captured, (depth || 0) + 1)
            : captured;
        });
        return remember(value, result);
      }
    }
    if (!depth) {
      // These separators belong to UI labels; metadata nodes bypass this service entirely.
      var parts = value.split(/( · |\n)/);
      if (parts.length > 1)
        result = parts
          .map(function (part) {
            return translate(part, 1);
          })
          .join('');
      else {
        if (trimmed !== value && own(messages, trimmed))
          result = value.replace(trimmed, messages[trimmed]);
      }
    }
    return remember(value, result);
  }
  function register(pack) {
    (pack.messages || []).forEach(function (row) {
      if (own(messages, row[0]) && messages[row[0]] !== row[1])
        throw Error('Duplicate UI translation: ' + row[0]);
      messages[row[0]] = row[1];
    });
    (pack.patterns || []).forEach(function (row) {
      var source = row[0],
        regex = '',
        offset = 0,
        count = 0,
        token = /\{(\d+)\}/g,
        m,
        prefix;
      while ((m = token.exec(source))) {
        if (Number(m[1]) !== count) throw Error('Invalid UI template: ' + source);
        regex +=
          escape(source.slice(offset, m.index)) +
          ((row[3] || []).indexOf(count) >= 0 ? '([0-9.,:+\\-]+)' : '(.*?)');
        count++;
        offset = m.index + m[0].length;
      }
      regex += escape(source.slice(offset));
      if (!count || count > 8) throw Error('Invalid UI template: ' + source);
      prefix = source.indexOf('{0}') >= 2 ? source.slice(0, 2) : '';
      var bucket = prefix ? patterns[prefix] || (patterns[prefix] = []) : general;
      bucket.push({
        source: source,
        regex: new RegExp('^' + regex + '$'),
        target: row[1],
        ui: row[2] || []
      });
    });
    resetCache();
  }
  function applyStatic() {
    if (!root.document) return;
    root.document.documentElement.setAttribute('lang', language);
    if (!staticNodes)
      staticNodes = root.document.querySelectorAll(
        '[data-ui-text],[data-ui-title],[data-ui-aria-label],[data-ui-placeholder]'
      );
    Array.prototype.forEach.call(staticNodes, function (node) {
      ['text', 'title', 'aria-label', 'placeholder'].forEach(function (key) {
        var source = node.getAttribute('data-ui-' + key);
        if (source === null) return;
        var translated = translate(source);
        if (key === 'text') node.textContent = translated;
        else node.setAttribute(key, translated);
      });
    });
  }
  root.FilmI18n = {
    register: register,
    text: function (value) {
      return translate(value);
    },
    init: function (store) {
      preferences = store;
      language = store.language ? store.language() : 'tr';
      resetCache();
      applyStatic();
    },
    language: function () {
      return language;
    },
    set: function (code) {
      if (code !== 'tr' && code !== 'en') return false;
      if (code === language) return true;
      language = code;
      resetCache();
      if (preferences && preferences.language) preferences.language(code);
      applyStatic();
      listeners.slice().forEach(function (listener) {
        listener(code);
      });
      return true;
    },
    onChange: function (listener) {
      listeners.push(listener);
      return function () {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    stats: function () {
      return {
        language: language,
        cacheEntries: cacheKeys.length,
        cacheBytes: cacheBytes,
        listeners: listeners.length,
        messages: Object.keys(messages).length
      };
    }
  };
})(window);
