/* One playback session, independent site clients, unchanged provider resolvers. */
(function (root) {
  'use strict';
  var C = root.PlayerCore,
    U = root.CatalogUtils;
  function cancelled() {
    var e = new Error('Kaynak araması iptal edildi.');
    e.cancelled = true;
    return e;
  }
  function copy(value) {
    return C.copy(value);
  }
  function fields(value) {
    var out = {};
    [
      'providerId',
      'contentId',
      'type',
      'pageUrl',
      'title',
      'year',
      'imdbId',
      'originalTitle',
      'titleAliases',
      'language',
      'selectedEpisodePageUrl'
    ].forEach(function (k) {
      if (value[k] !== undefined) out[k] = copy(value[k]);
    });
    return out;
  }
  function publicPage(value) {
    try {
      var u = new root.URL(value);
      return /^https?:$/.test(u.protocol) && !u.username && !u.password;
    } catch (ignore) {
      return false;
    }
  }
  function scope(entry) {
    return 'multi:' + encodeURIComponent(entry.contextId || entry.contentId) + ':';
  }
  function id(entry, local) {
    return scope(entry) + encodeURIComponent(String(local));
  }
  function language(source, entry) {
    function flags(value) {
      var s = String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ü/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/ş/g, 's')
        .replace(/\u0307/g, '');
      return {
        dub: /dublaj|turkish|turkce ses/.test(s),
        sub: /altyazi|subtitled/.test(s),
        dual: /\bdual\b/.test(s)
      };
    }
    var f = flags(source.language || source.originalLabel || source.label || '');
    if (!f.dub && !f.sub && !f.dual) f = flags(entry.language);
    return f.dual || (f.dub && f.sub) ? 'dual' : f.dub ? 'dub' : f.sub ? 'sub' : 'unknown';
  }
  function allowed(source, current, settings) {
    var target = current && current.sourceLanguage,
      actual = source.sourceLanguage || 'unknown';
    if (target === 'dub') return actual !== 'sub';
    if (target === 'sub') return actual !== 'dub';
    return true;
  }
  function prepare(content, hub) {
    if (!content || !hub || content.referenceTrial) return content;
    var site = root.SiteRegistry.forContent(content),
      episode = content.type === 'episode' && content.episode,
      group = hub.group(content.canonicalId || content.contentId),
      parent = episode && hub.group(content.episode.seriesId || (group && group.parent)),
      base = episode ? parent : group;
    if (!site || !base || base.type !== (episode ? 'series' : 'movie')) return content;
    var seen = {},
      providers = {},
      variants = [];
    base.variants.forEach(function (raw) {
      var s = root.SiteRegistry.get(raw.providerId);
      if (
        !s ||
        s.virtual ||
        !publicPage(raw.pageUrl) ||
        raw.type !== base.type ||
        seen[raw.contentId]
      )
        return;
      seen[raw.contentId] = true;
      providers[s.id] = true;
      var entry = fields(raw);
      entry.preferred = raw.contentId === base.preferred;
      entry.contextId = raw.contentId;
      entry.lookup = episode ? 'series' : 'movie';
      entry.primary =
        s.id === site.id &&
        (!episode ? raw.contentId === content.contentId : raw.contentId === episode.seriesId);
      if (episode && group && group.type === 'episode') {
        var exact = group.variants.filter(function (v) {
          return (
            v.providerId === s.id &&
            v.episode &&
            v.episode.season === episode.season &&
            v.episode.number === episode.number &&
            v.episode.seriesId === raw.contentId
          );
        })[0];
        if (exact) {
          entry = fields(exact);
          entry.preferred = raw.contentId === base.preferred;
          entry.contextId = raw.contentId;
          entry.lookup = 'episode';
          entry.primary = s.id === site.id;
        }
      }
      entry.order = variants.length;
      variants.push(entry);
    });
    if (Object.keys(providers).length < 2) return content;
    variants.sort(function (a, b) {
      return (
        (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0) ||
        (b.primary ? 1 : 0) - (a.primary ? 1 : 0) ||
        a.order - b.order
      );
    });
    var next = copy(content);
    next.sourceContext = {
      version: 1,
      contentId: content.contentId,
      canonicalId: hub.resolveId(content.canonicalId || content.contentId) || content.contentId,
      seriesCanonicalId: episode ? base.id : null,
      type: episode ? 'episode' : 'movie',
      year: base.year || null,
      imdbId: base.imdbId || '',
      season: episode ? episode.season : null,
      number: episode ? episode.number : null,
      variants: variants.slice(0, 48)
    };
    return next;
  }
  function Resolver(log, now, options) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.options = options || {};
    this.generation = 0;
    this.abort = null;
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    if (this.abort) {
      var abort = this.abort;
      this.abort = null;
      abort();
    }
  };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      ctx = content.sourceContext,
      hub = this.options.hub,
      cache = this.options.cache,
      entries =
        (ctx && ctx.version === 1 && ctx.contentId === content.contentId && ctx.variants) || [],
      all = [],
      sourceMap = {},
      states = [],
      active = null,
      globalTimer = null,
      done = false,
      abortWaiting = [],
      last = null;
    hints = hints || {};
    if (!entries.length) return Promise.reject(new Error('Ortak kaynak bağlamı bulunamadı.'));
    entries = entries
      .filter(function (e) {
        var s = root.SiteRegistry.get(e.providerId);
        return (
          s &&
          !s.virtual &&
          s.Resolver &&
          s.Provider &&
          publicPage(e.pageUrl) &&
          String(e.contentId).indexOf(s.prefix) === 0
        );
      })
      .map(function (e, i) {
        var v = copy(e);
        v.sequence = i;
        return v;
      });
    entries.sort(function (a, b) {
      var p = hints.preferredId || '',
        ap = p.indexOf(scope(a)) === 0,
        bp = p.indexOf(scope(b)) === 0;
      return (
        (hints.rankVariant ? hints.rankVariant(a) - hints.rankVariant(b) : 0) ||
        (bp ? 1 : 0) - (ap ? 1 : 0) ||
        a.sequence - b.sequence
      );
    });
    entries.forEach(function (e) {
      var s = root.SiteRegistry.get(e.providerId);
      states.push({
        entry: e,
        site: s,
        options: [
          {
            sourceId: id(e, 'site'),
            providerId: s.id,
            providerName: s.name,
            label: s.name + ' · Kaynaklar',
            status: 'pending',
            stage: 'catalog',
            detail: 'Sırada · bu sitenin kaynakları aranacak'
          }
        ]
      });
    });
    function valid() {
      return !done && token === self.generation;
    }
    function check() {
      if (!valid()) throw cancelled();
      if (self.now() >= deadline) {
        var e = new Error('Ortak kaynak arama süresi doldu.');
        e.stage = 'timeout';
        throw e;
      }
    }
    function snapshot() {
      var result = all.slice();
      result.options = [];
      states.forEach(function (s) {
        result.options = result.options.concat(copy(s.options));
      });
      return result;
    }
    function publish() {
      if (valid() && typeof notify === 'function') notify(snapshot());
    }
    function gate() {
      return new Promise(function (resolve, reject) {
        var timer = null,
          settled = false;
        function end(error) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          var i = abortWaiting.indexOf(abort);
          if (i >= 0) abortWaiting.splice(i, 1);
          if (error) reject(error);
          else resolve();
        }
        function abort() {
          end(cancelled());
        }
        function poll() {
          timer = null;
          try {
            check();
            if (!hints.canContinue || hints.canContinue()) end();
            else timer = setTimeout(poll, 250);
          } catch (e) {
            end(e);
          }
        }
        abortWaiting.push(abort);
        poll();
      });
    }
    function mark(state, error) {
      var pending = state.options.filter(function (o) {
        return o.status === 'pending';
      });
      if (
        !pending.length &&
        !state.options.some(function (o) {
          return o.status === 'ready' || o.status === 'candidate';
        })
      )
        pending = state.options;
      pending.forEach(function (o) {
        o.status = error.cancelled ? 'cancelled' : error.stage === 'timeout' ? 'timeout' : 'error';
        o.stage = error.stage || 'catalog';
        o.detail = C.safeMessage(error.message || 'Bu site kaynağı alınamadı.');
      });
    }
    function enrichSource(value, entry, site, media, index) {
      var source = {};
      Object.keys(value).forEach(function (k) {
        source[k] = value[k];
      });
      var local = String(value.sourceId || value.id || 'source-' + index),
        original = value.label || value.name || 'Kaynak ' + (index + 1);
      source.id = source.sourceId = id(entry, local);
      source.originalSourceId = local;
      source.originalLabel = original;
      source.providerId = site.id;
      source.providerName = site.name;
      source.providerContentId = media.contentId;
      source.providerVariantId = entry.contextId || entry.contentId;
      source.providerPageUrl = media.pageUrl;
      source.sourceLanguage = language(source, media);
      source.label = site.name + ' · ' + original;
      source.name = source.label;
      source.subtitles = (value.subtitles || [])
        .concat(media.subtitles || [])
        .filter(function (t, i, a) {
          return (
            t &&
            t.url &&
            a
              .map(function (v) {
                return v && v.url;
              })
              .indexOf(t.url) === i
          );
        });
      if (!source.thumbnails && media.thumbnails) source.thumbnails = copy(media.thumbnails);
      return source;
    }
    function accept(state, media, sources) {
      if (!valid() || !active || active.state !== state || active.expired) return;
      var entry = state.entry,
        site = state.site,
        converted = [];
      (sources || []).forEach(function (value, index) {
        if (!value || !publicPage(value.url)) return;
        var s = enrichSource(value, entry, site, media, index);
        converted.push(s);
        if (!sourceMap[s.id]) {
          sourceMap[s.id] = s;
          all.push(s);
        } else
          Object.keys(s).forEach(function (k) {
            sourceMap[s.id][k] = s[k];
          });
      });
      if (sources && sources.options && sources.options.length)
        state.options = sources.options.map(function (o, index) {
          var v = copy(o);
          v.sourceId = id(entry, o.sourceId || o.id || 'source-' + index);
          v.providerId = site.id;
          v.providerName = site.name;
          v.label = site.name + ' · ' + (o.label || 'Kaynak ' + (index + 1));
          return v;
        });
      converted.forEach(function (s) {
        if (
          !state.options.some(function (o) {
            return o.sourceId === s.id;
          })
        )
          state.options.push({
            sourceId: s.id,
            providerId: site.id,
            providerName: site.name,
            label: s.label,
            status: s.status === 'candidate' ? 'candidate' : 'ready',
            detail: s.status === 'candidate' ? 'Medya motorunda sınanacak' : 'Yayın adresi alındı'
          });
      });
      if (converted.length) {
        state.options = state.options.filter(function (o) {
          return o.sourceId !== id(entry, 'site');
        });
        if (!active.warm && active.timeout) {
          active.warm = true;
          clearTimeout(active.timer);
          active.timer = setTimeout(
            active.timeout,
            Math.max(1, Math.min(self.options.siteTimeoutMs || 45000, deadline - self.now()))
          );
        }
      }
      publish();
    }
    function validateDetail(detail, entry) {
      if (detail && detail.playbackUnavailableReason)
        throw new Error(detail.playbackUnavailableReason);
      if (!detail || detail.type !== (ctx.type === 'episode' ? 'series' : 'movie'))
        throw new Error('Sitenin içerik türü ortak kayıttan farklı.');
      if (ctx.imdbId && detail.imdbId && ctx.imdbId !== detail.imdbId)
        throw new Error('Bu site kaydının IMDb kimliği farklı.');
      if (
        ctx.year &&
        detail.year &&
        ctx.year !== detail.year &&
        !(ctx.imdbId && ctx.imdbId === detail.imdbId)
      )
        throw new Error('Bu site kaydının yapım yılı farklı.');
      if (hub) {
        var g = hub.observeDetail(detail, entry.providerId);
        if (
          !g ||
          hub.resolveId(g.id) !==
            hub.resolveId(ctx.type === 'episode' ? ctx.seriesCanonicalId : ctx.canonicalId)
        )
          throw new Error('Bu site kaydı aynı yapıma bağlanamadı.');
      }
      return detail;
    }
    function mediaFor(state, job) {
      var entry = state.entry;
      if (entry.primary) {
        var primary = copy(content);
        delete primary.sourceContext;
        delete primary.episodes;
        delete primary.navigation;
        if (primary.playbackUnavailableReason)
          return Promise.reject(new Error(primary.playbackUnavailableReason));
        return Promise.resolve(primary);
      }
      if (ctx.type === 'episode' && entry.lookup === 'episode') return Promise.resolve(copy(entry));
      var provider = (job.provider = new state.site.Provider(cache));
      provider.deadline = deadline;
      if (provider.network && root.SourceProgress)
        provider.network = new root.SourceProgress(null, hints).client(
          provider.network,
          check,
          deadline
        );
      return provider.detail(copy(entry), true).then(function (detail) {
        check();
        if (job.expired) throw cancelled();
        detail = validateDetail(copy(detail), entry);
        if (ctx.type !== 'episode') return detail;
        var matches = (detail.episodes || []).filter(function (e) {
          return (
            e.episode &&
            e.episode.season === ctx.season &&
            e.episode.number === ctx.number &&
            (e.providerId === state.site.id ||
              (!e.providerId && root.SiteRegistry.forContent(e) === state.site)) &&
            publicPage(e.pageUrl)
          );
        });
        if (matches.length !== 1)
          throw new Error(
            ctx.season + '. sezon ' + ctx.number + '. bölüm bu sitede doğrulanamadı.'
          );
        return copy(matches[0]);
      });
    }
    return new Promise(function (resolve, reject) {
      function finish(error) {
        if (done) return;
        done = true;
        clearTimeout(globalTimer);
        abortWaiting.splice(0).forEach(function (end) {
          end();
        });
        if (active) {
          active.expired = true;
          clearTimeout(active.timer);
          if (active.provider) active.provider.cancel();
          if (active.resolver) active.resolver.cancel();
          active = null;
        }
        self.abort = null;
        if (error)
          states.forEach(function (s) {
            mark(s, error);
          });
        var result = snapshot();
        if (error && error.cancelled) {
          reject(error);
          return;
        }
        if (result.length) resolve(result);
        else {
          var failure = error || last || new Error('Sitelerde oynatılabilir kaynak bulunamadı.');
          failure.sourceOptions = result.options;
          reject(failure);
        }
      }
      self.abort = function () {
        finish(cancelled());
      };
      globalTimer = setTimeout(
        function () {
          var e = new Error(
            'Ortak kaynak arama süresi doldu · bağlantıları yenileyerek tekrar deneyebilirsiniz.'
          );
          e.stage = 'timeout';
          finish(e);
        },
        Math.max(1, deadline - self.now())
      );
      function next(index) {
        if (!valid()) return;
        try {
          check();
        } catch (e) {
          finish(e);
          return;
        }
        if (index >= states.length) {
          finish();
          return;
        }
        gate()
          .then(function () {
            check();
            var state = states[index],
              job = (active = {
                state: state,
                expired: false,
                provider: null,
                resolver: null,
                timer: null
              });
            state.options[0].detail = 'Bu sitede içerik ve kaynaklar çözümleniyor';
            publish();
            self.log('Ortak kaynak · ' + state.site.name + ' aranıyor.');
            return new Promise(function (end) {
              var ended = false;
              function complete(error, sources, media) {
                if (ended) return;
                ended = true;
                clearTimeout(job.timer);
                if (!valid()) {
                  end();
                  return;
                }
                if (error) {
                  last = error;
                  if (error.sourceOptions && media) {
                    var failed = [];
                    failed.options = error.sourceOptions;
                    accept(state, media, failed);
                  }
                  mark(state, error);
                } else {
                  accept(state, media, sources || []);
                  state.options.forEach(function (o) {
                    if (o.status === 'pending') {
                      o.status = 'error';
                      o.detail = 'Bu seçenek çözümlemede tamamlanamadı.';
                    }
                  });
                }
                job.expired = true;
                if (error) {
                  if (job.provider) job.provider.cancel();
                  if (job.resolver) job.resolver.cancel();
                }
                active = null;
                publish();
                end();
              }
              job.warm = all.length > 0 || !!(hints.mediaActive && hints.mediaActive());
              job.timeout = function () {
                var e = new Error('Bu site zamanında yanıt vermedi · diğer sitelere geçiliyor.');
                e.stage = 'timeout';
                complete(e);
              };
              job.timer = setTimeout(
                job.timeout,
                Math.max(
                  1,
                  Math.min(
                    job.warm
                      ? self.options.siteTimeoutMs || 45000
                      : self.options.startupTimeoutMs || self.options.siteTimeoutMs || 30000,
                    deadline - self.now()
                  )
                )
              );
              mediaFor(state, job)
                .then(function (media) {
                  check();
                  if (job.expired) return;
                  job.media = media;
                  var resolver = (job.resolver = new state.site.Resolver(self.log, self.now)),
                    localHints = {};
                  Object.keys(hints).forEach(function (k) {
                    localHints[k] = hints[k];
                  });
                  localHints.preferredId =
                    hints.preferredId && hints.preferredId.indexOf(scope(state.entry)) === 0
                      ? decodeURIComponent(hints.preferredId.slice(scope(state.entry).length))
                      : null;
                  localHints.preferredLabel = null;
                  localHints.pick = function (sources) {
                    return hints.pick
                      ? hints.pick(
                          sources.map(function (s, i) {
                            return enrichSource(s, state.entry, state.site, media, i);
                          })
                        )
                      : 0;
                  };
                  return resolver
                    .resolve(
                      media,
                      deadline,
                      function (sources) {
                        accept(state, media, sources);
                      },
                      localHints
                    )
                    .then(
                      function (sources) {
                        complete(null, sources, media);
                      },
                      function (e) {
                        complete(e, null, media);
                      }
                    );
                })
                .catch(function (e) {
                  complete(e);
                });
            });
          })
          .then(
            function () {
              if (valid()) next(index + 1);
            },
            function (e) {
              finish(e);
            }
          );
      }
      publish();
      next(0);
    });
  };
  root.UnifiedPlayback = { prepare: prepare, language: language, allowed: allowed };
  root.MultiSiteSourceResolver = Resolver;
})(window);
