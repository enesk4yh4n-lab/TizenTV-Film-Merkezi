/* Session, user intent, persistence and a single bounded recovery budget. */
(function (root) {
  'use strict';
  var C = root.PlayerCore;
  function sourceCopy(source) {
    if (!source) return null;
    var copy = {};
    Object.keys(source).forEach(function (key) {
      copy[key] = source[key];
    });
    return copy;
  }
  function Controller(options) {
    C.emitter(this);
    this.engine = options.engine;
    this.resolver = options.resolver;
    this.store = options.store;
    this.now = options.now || Date.now;
    this.log = options.log || function () {};
    this.compatibility = options.compatibility || null;
    this.capStore = options.capabilities || null;
    this.engineTried = {};
    this.engineSwitched = {};
    this.forcedEngine = null;
    this.session = 0;
    this.loadToken = 0;
    this.resolutionToken = 0;
    this.discovery = null;
    this.sourcesMenuOpen = false;
    this.activeSource = null;
    this.progressSession = null;
    this.content = null;
    this.phase = 'idle';
    this.desiredPlay = false;
    this.currentSource = -1;
    this.position = 0;
    this.duration = 0;
    this.snapshot = {};
    this.tracks = { audio: [], subtitles: [], qualities: [] };
    this.settings = this.store.settings();
    this.loop = new root.PlayerLoop();
    this.sleepAt = null;
    this.sleepEnd = false;
    this.sleepMinutes = 0;
    this.countdownAt = null;
    this.pendingSeek = null;
    this.suspended = null;
    this.retryTimer = null;
    this.dialog = null;
    var self = this;
    this.timer = (options.setInterval || setInterval)(function () {
      self.tick();
    }, 250);
    this.clearInterval = options.clearInterval || clearInterval;
  }
  Controller.prototype.changed = function () {
    this.emit('change', this);
  };
  Controller.prototype.currentMedia = function () {
    return this.activeSource || (this.content && this.content.sources[this.currentSource]);
  };
  Controller.prototype.engineId = function () {
    return this.engine.id ? this.engine.id() : 'html5';
  };
  Controller.prototype.engineCaps = function () {
    return this.engine.capabilities ? this.engine.capabilities() : null;
  };
  Controller.prototype.pickEngine = function (source) {
    var id = this.engine.choose ? this.engine.choose(source) : 'html5',
      failed =
        this.compatibility && (this.compatibility.engineFailed || this.compatibility.sourceFailed);
    if (
      this.compatibility &&
      id &&
      failed.call(this.compatibility, this.content, source, id) &&
      this.engine.canUse
    ) {
      var other = id === 'html5' ? 'avplay' : 'html5';
      if (
        this.engine.canUse(other, source) &&
        !failed.call(this.compatibility, this.content, source, other)
      )
        id = other;
    }
    return id;
  };
  Controller.prototype.sourceAllowed = function (source) {
    return (
      !this.content.sourceContext ||
      !root.UnifiedPlayback ||
      root.UnifiedPlayback.allowed(source, this.currentMedia(), this.settings)
    );
  };
  Controller.prototype.pickSource = function (sources) {
    var self = this,
      pool = sources;
    if (this.content && this.content.sourceContext && root.UnifiedPlayback) {
      pool = sources.filter(function (s) {
        return self.sourceAllowed(s);
      });
      if (!pool.length) pool = sources;
      var current = this.currentMedia(),
        wanted = current && current.sourceLanguage;
      if (wanted !== 'dub' && wanted !== 'sub')
        wanted =
          C.language(
            (this.prefs && this.prefs.audio && this.prefs.audio.lang) || this.settings.audioLanguage
          ) === 'tr'
            ? 'dub'
            : 'sub';
      var preferred = pool.filter(function (s) {
        return s.sourceLanguage === wanted || s.sourceLanguage === 'dual';
      });
      if (preferred.length) pool = preferred;
    }
    var index = this.compatibility
      ? this.compatibility.choose(this.content, pool, function (source) {
          return self.pickEngine(source) || 'html5';
        })
      : 0;
    return Math.max(0, sources.indexOf(pool[index]));
  };
  Controller.prototype.usableSource = function (index) {
    var source = this.content.sources[index];
    return (
      index !== this.currentSource &&
      !this.failedSources[index] &&
      this.sourceAllowed(source) &&
      (!this.compatibility ||
        !this.compatibility.sourceFailed(this.content, source, this.pickEngine(source) || 'html5'))
    );
  };
  Controller.prototype.alternativeSource = function (preferSite) {
    var self = this,
      available = this.content.sources.filter(function (s, i) {
        return self.usableSource(i);
      }),
      current = this.currentMedia();
    if (preferSite && current && current.providerId) {
      var other = available.filter(function (s) {
        return s.providerId && s.providerId !== current.providerId;
      });
      if (other.length) available = other;
    }
    return available.length
      ? this.content.sources.indexOf(available[this.pickSource(available)])
      : -1;
  };
  Controller.prototype.keepTrackIntent = function () {
    if (!this.content || !this.content.sourceContext) return;
    var index = this.engine.tracks().audioIndex,
      selected = this.tracks.audio.filter(function (t) {
        return t.index === index;
      })[0];
    if (selected) {
      this.prefs = C.copy(this.prefs || {});
      this.prefs.audio = C.trackKey(selected);
    }
  };
  Controller.prototype.observeCompatibility = function (type, data) {
    if (type === 'buffering' || type === 'seeking' || type === 'paused') {
      this.compatLast = undefined;
      if (this.rateTrial) this.rateTrial.last = undefined;
      return;
    }
    if (
      type !== 'time' ||
      !this.ready ||
      !this.desiredPlay ||
      data.paused ||
      data.seeking ||
      this.pendingSeek ||
      this.engine.requestedSeek
    )
      return;
    var maxStep = Math.max(2.1, (data.rate || 1) * 1.5),
      delta = data.position - this.compatLast;
    this.compatLast = data.position;
    if (this.rateTrial && Math.abs((data.rate || 1) - this.rateTrial.rate) < 0.01) {
      var moved = data.position - this.rateTrial.last;
      if (C.finite(moved) && moved > 0 && moved < maxStep)
        this.rateTrial.progress += moved / (this.rateTrial.rate || 1);
      this.rateTrial.last = data.position;
    }
    if (
      !this.compatibility ||
      !C.finite(delta) ||
      delta <= 0 ||
      delta >= maxStep ||
      this.compatSaved
    )
      return;
    var height = Number(data.actualQuality) || data.videoHeight || 0,
      frame = data.videoHeight || 0,
      sig = height + '|' + (data.codecs || '');
    if (frame <= 0 || (height > 0 && frame < height * 0.7)) return;
    if (sig !== this.compatProfile) {
      this.compatProfile = sig;
      this.compatProgress = 0;
    }
    this.compatProgress = (this.compatProgress || 0) + delta / (data.rate || 1);
    if (this.compatProgress >= 30) {
      var source = this.currentMedia(),
        level = this.tracks.qualities.filter(function (q) {
          return q.height === height;
        })[0];
      this.compatibility.success(
        this.content,
        source,
        this.engineId(),
        height,
        (level && level.codec) || ''
      );
      this.compatSaved = true;
    }
  };
  Controller.prototype.rateProfile = function () {
    var source = (this.content && this.currentMedia()) || {},
      p = source.mediaProfile || {},
      s = this.snapshot || {},
      tracks = this.tracks.audio || [],
      audio =
        tracks.filter(function (t) {
          return t.index === this.engine.tracks().audioIndex;
        }, this)[0] || {},
      video = String(p.videoCodec || s.codecs || '').split(' / ')[0],
      codec = audio.codec || p.audioCodec || String(s.codecs || '').split(' / ')[1] || '',
      unknown = !video || video === 'n/a' || !codec || codec === 'mpeg';
    return [
      source.type || '',
      video,
      codec,
      audio.channels || p.audioChannels || '',
      s.videoHeight || p.height || 0,
      p.videoProfile || '',
      p.range || 'SDR',
      unknown ? (this.content && this.content.contentId) || '' : ''
    ].join('|');
  };
  Controller.prototype.verifiedRates = function () {
    return this.capStore
      ? this.capStore.ratesFor(this.engineId(), this.rateProfile())
      : this.settings.verifiedRates;
  };
  Controller.prototype.beginRateTrial = function (rate) {
    var caps = this.engineCaps();
    if (caps && caps.trialRates.indexOf(rate) < 0) return false;
    if (!this.ready || !this.engine.setRate(rate)) return false;
    this.rateTrial = {
      engine: this.engineId(),
      profile: this.rateProfile(),
      rate: rate,
      progress: 0,
      last: this.position
    };
    return true;
  };
  Controller.prototype.confirmRateTrial = function () {
    var trial = this.rateTrial;
    if (!trial || trial.engine !== this.engineId() || trial.profile !== this.rateProfile())
      return false;
    if (
      this.capStore &&
      !this.capStore.confirmRate(trial.engine, trial.rate, {
        profile: trial.profile,
        humanConfirmed: true,
        audible: true,
        progress: trial.progress,
        rate: this.snapshot.rate || 1
      })
    )
      return false;
    var rates = this.verifiedRates().slice();
    if (rates.indexOf(trial.rate) < 0) rates.push(trial.rate);
    this.store.setting('verifiedRates', rates);
    this.settings = this.store.settings();
    this.rateTrial = null;
    return true;
  };

  Controller.prototype.notice = function (message) {
    this.emit('notice', message);
    this.log(message);
  };
  Controller.prototype.failureDetail = function (error) {
    var source = this.content && this.currentMedia(),
      stage = error.stage || error.details || error.type || 'unknown';
    return C.safeMessage(
      (source ? source.label + ' / ' : '') +
        this.engineId() +
        ' / ' +
        stage +
        (error.code ? ' · kod ' + error.code : '') +
        ': ' +
        (error.message || 'Oynatma ilerlemedi.')
    );
  };
  Controller.prototype.setPhase = function (phase) {
    if (this.phase !== phase) {
      this.log('Durum: ' + phase);
      this.phase = phase;
    }
    this.changed();
  };
  Controller.prototype.resetBudget = function () {
    this.error = null;
    this.budgetEnd = this.now() + 60000;
    this.retryCount = 0;
    this.sameRetries = 0;
    this.refreshCount = 0;
    this.mediaRetries = 0;
    this.failedSources = {};
    this.healthySince = 0;
  };
  Controller.prototype.deadline = function () {
    return ['resolving', 'loading', 'recovering', 'buffering'].indexOf(this.phase) >= 0
      ? this.budgetEnd
      : null;
  };
  Controller.prototype.ask = function (kind, message, choices) {
    this.dialog = { kind: kind, message: message, choices: choices, session: this.session };
    this.emit('dialog', this.dialog);
    this.changed();
  };
  Controller.prototype.answer = function (index) {
    var d = this.dialog;
    if (!d || d.session !== this.session) return;
    this.dialog = null;
    this.emit('dialog', null);
    var choice = d.choices[index];
    if (choice && choice.action) choice.action();
    this.changed();
  };
  Controller.prototype.open = function (input, restoration) {
    var next;
    try {
      next = C.content(this.resolver.prepare ? this.resolver.prepare(input) : input);
    } catch (e) {
      this.notice(e.message);
      return;
    }
    this.stop('replace');
    this.content = next;
    this.sourcesMenuOpen = false;
    this.engineTried = {};
    this.engineSwitched = {};
    this.forcedEngine = null;
    this.rateTrial = null;
    this.qualityFailures = {};
    this.settings = this.store.settings();
    this.prefs =
      this.settings.rememberTracks && this.store.get(next.contentId)
        ? this.store.get(next.contentId).prefs
        : {};
    this.episodes = new root.PlayerEpisodes(next);
    this.position = 0;
    this.duration = 0;
    this.snapshot = {};
    this.tracks = { audio: [], subtitles: [], qualities: [] };
    this.loop = new root.PlayerLoop();
    this.resetBudget();
    this.lastCheckpoint = this.now();
    this.lastPlaybackAt = 0;
    this.watched = false;
    this.emit('open', next);
    this.progressSession = this.store.beginProgress(next.contentId);
    var saved = this.store.get(next.contentId),
      self = this;
    if (restoration && C.finite(restoration.position) && restoration.position >= 0) {
      this.start(restoration.position, restoration.duration || 0, restoration.desiredPlay);
      return;
    }
    if (saved && saved.position >= 5 && !saved.completed) {
      this.phase = 'resume';
      this.ask(
        'resume',
        'Son izleme konumu ' + C.format(saved.position) + '. Nasıl başlamak istersiniz?',
        [
          {
            label: 'Devam et · ' + C.format(Math.max(0, saved.position - 5)),
            action: function () {
              self.start(Math.max(0, saved.position - 5), saved.duration);
            }
          },
          {
            label: 'Baştan başlat',
            action: function () {
              self.start(0, 0);
            }
          },
          {
            label: 'Çıkış',
            action: function () {
              self.stop('discard');
            }
          }
        ]
      );
    } else this.start(0, 0);
  };
  Controller.prototype.start = function (position, oldDuration, desired) {
    this.resetBudget();
    this.position = position || 0;
    this.referenceDuration = oldDuration || 0;
    this.desiredPlay = desired !== false;
    this.resolveAndLoad(false);
  };
  Controller.prototype.cancelDiscovery = function () {
    this.resolutionToken++;
    this.resolver.cancel();
    if (!this.discovery) return;
    this.discovery.active = false;
    this.discovery.waiting = false;
    this.discovery.deferred = false;
    if (this.content && this.content.sourceOptions)
      this.content.sourceOptions.forEach(function (o) {
        if (o.refreshStatus === 'pending') {
          o.refreshStatus = 'cancelled';
          o.detail = 'Önceki bağlantı korunuyor · yenileme durduruldu';
        }
        if (o.status === 'pending' || o.status === 'deferred') {
          o.status = 'cancelled';
          o.detail = 'Arama durduruldu · bağlantıları yenileyerek tekrar arayabilirsiniz';
        }
      });
    this.emit('sources');
  };
  Controller.prototype.hasDeferredSources = function () {
    return !!(
      this.content &&
      ((this.discovery && this.discovery.deferred) ||
        (this.content.sourceOptions || []).some(function (o) {
          return o.status === 'deferred' || o.status === 'cancelled';
        }))
    );
  };
  Controller.prototype.hasReadyBackup = function () {
    var self = this,
      current = this.currentMedia();
    return !!(
      current &&
      this.content.sources.some(function (source, index) {
        var status = source.status || 'ready',
          engine = self.pickEngine(source);
        return (
          source.id !== current.id &&
          source.url !== current.url &&
          (status === 'ready' || status === 'candidate') &&
          self.usableSource(index) &&
          (!self.engine.canUse || (engine && self.engine.canUse(engine, source)))
        );
      })
    );
  };
  Controller.prototype.deferAutomaticDiscovery = function () {
    var discovery = this.discovery,
      options = this.content && this.content.sourceOptions,
      pending;
    if (
      !discovery ||
      !discovery.active ||
      discovery.manual ||
      discovery.expanded ||
      discovery.waiting ||
      this.phase === 'recovering' ||
      !this.hasReadyBackup()
    )
      return;
    if (
      options &&
      !options.some(function (o) {
        return o.status === 'pending';
      })
    )
      return;
    pending = (options || []).filter(function (o) {
      return o.status === 'pending';
    });
    this.cancelDiscovery();
    discovery.deferred = true;
    pending.forEach(function (o) {
      o.status = 'deferred';
      o.detail = 'Beklemede · Kaynaklar menüsü açıldığında hazırlanır';
    });
    this.log('Bir yedek kaynak hazır · kalan kaynaklar menü açılana kadar beklemede.');
    this.emit('sources');
  };
  Controller.prototype.setSourcesMenuVisible = function (visible) {
    var entering = !!visible && !this.sourcesMenuOpen;
    this.sourcesMenuOpen = !!visible;
    if (!entering || !this.content) return;
    if (this.discovery && this.discovery.active) this.discovery.expanded = true;
    else if (this.hasDeferredSources()) this.resolveAndLoad(true, true, null, true);
  };
  Controller.prototype.discoveryCanContinue = function () {
    if (!this.discovery || !this.discovery.started || this.phase === 'recovering') return true;
    if (this.phase === 'error' && this.discovery.expanded) return true;
    if (!this.ready || this.pendingSeek || this.engine.requestedSeek || this.seekHold) return false;
    if (['loading', 'buffering', 'seeking'].indexOf(this.phase) >= 0) return false;
    if (!this.desiredPlay || this.phase === 'ended') return true;
    if (this.engineId() === 'avplay') return true;
    var ranges = this.snapshot.buffered,
      position = this.position;
    if (!Array.isArray(ranges)) return true;
    return ranges.some(function (range) {
      return (
        range.start <= position + 0.1 &&
        range.end - position >= Math.min(8, Math.max(0, this.duration - position))
      );
    }, this);
  };
  Controller.prototype.mergeSources = function (sources) {
    var self = this;
    sources.forEach(function (source) {
      var index = -1;
      self.content.sources.some(function (s, i) {
        if (s.id === source.id) {
          index = i;
          return true;
        }
        return false;
      });
      if (index < 0) self.content.sources.push(sourceCopy(source));
      else if (self.discovery && self.discovery.preserve) {
        self.content.sources[index] = sourceCopy(source);
        if (!self.activeSource || self.activeSource.id !== source.id)
          delete self.failedSources[index];
      }
      if (self.discovery && self.discovery.seen) self.discovery.seen[source.id] = true;
    });
    if (sources.options) {
      if (!self.discovery || !self.discovery.preserve)
        self.content.sourceOptions = C.copy(sources.options);
      else {
        var old = self.content.sourceOptions || [],
          options = C.copy(sources.options);
        old.forEach(function (o) {
          if (
            !options.some(function (v) {
              return v.sourceId === o.sourceId;
            })
          )
            options.push(C.copy(o));
        });
        self.content.sources.forEach(function (s) {
          if (
            !options.some(function (o) {
              return o.sourceId === s.id;
            })
          )
            options.push({ sourceId: s.id, label: s.label, status: s.status || 'ready' });
        });
        if (self.discovery.resumeOnly)
          options = options.filter(function (o) {
            if (o.stage !== 'catalog' || String(o.sourceId).indexOf('multi:') !== 0) return true;
            var group = o.sourceId.slice(0, o.sourceId.lastIndexOf(':') + 1);
            return !options.some(function (v) {
              return v !== o && String(v.sourceId).indexOf(group) === 0 && v.stage !== 'catalog';
            });
          });
        options.forEach(function (o, index) {
          if (self.discovery.seen[o.sourceId]) {
            o.stale = false;
            o.refreshStatus = 'ready';
            o.detail =
              (o.detail || 'Kaynak doğrulandı') +
              (self.discovery.resumeOnly ? ' · Kaynak hazır' : ' · Bağlantı yenilendi');
            return;
          }
          var existing = self.content.sources.some(function (s) {
            return s.id === o.sourceId;
          });
          if (existing) {
            if (self.discovery.resumeOnly) {
              var known = old.filter(function (v) {
                return v.sourceId === o.sourceId;
              })[0];
              if (known) options[index] = C.copy(known);
              else o.status = 'ready';
              return;
            }
            o.refreshDetail = C.safeMessage(o.refreshDetail || o.detail || '');
            o.refreshStatus =
              o.status === 'ready' && o.stale ? o.refreshStatus || 'pending' : o.status;
            o.status = 'ready';
            o.stale = true;
            o.detail =
              'Önceki bağlantı korunuyor · ' +
              (o.refreshStatus === 'pending' || !o.refreshStatus
                ? 'yenileniyor'
                : o.refreshStatus === 'ready'
                  ? 'bu taramada henüz doğrulanmadı'
                  : 'yenileme başarısız') +
              (o.refreshDetail ? ' · ' + o.refreshDetail : '');
          }
        });
        self.content.sourceOptions = options;
      }
    }
  };
  Controller.prototype.finishDiscoveryOptions = function (error) {
    var preserve = this.discovery && this.discovery.preserve;
    if (!this.content || !this.content.sourceOptions) return;
    this.content.sourceOptions.forEach(function (o) {
      if (preserve && o.stale) {
        if (!o.refreshStatus || o.refreshStatus === 'pending' || o.refreshStatus === 'ready')
          o.refreshStatus = error && error.stage === 'timeout' ? 'timeout' : 'error';
        o.detail =
          'Önceki bağlantı korunuyor · bu taramada yenilenemedi' +
          (o.refreshDetail ? ' · ' + o.refreshDetail : '');
      } else if (o.status === 'pending') {
        o.status = error && error.stage === 'timeout' ? 'timeout' : 'error';
        o.detail = 'Kaynak araması tamamlanamadı · yeniden deneyebilirsiniz';
      }
    });
  };
  Controller.prototype.continueDiscoveryFallback = function () {
    var self = this,
      discovery = this.discovery,
      index = -1;
    if (!discovery || !discovery.waiting || !self.content) return;
    this.content.sources.some(function (s, i) {
      if (self.usableSource(i)) {
        index = i;
        return true;
      }
      return false;
    });
    if (index >= 0) {
      discovery.waiting = false;
      self.notice('Hazır olan alternatif kaynak deneniyor.');
      self.load(index, self.position);
    } else if (!discovery.active)
      self.fail(discovery.failure || 'Oynatılabilir alternatif kaynak bulunamadı.');
  };
  Controller.prototype.waitForDiscovery = function (message) {
    var resume = this.discovery && !this.discovery.active && this.hasDeferredSources();
    if (!this.discovery || (!this.discovery.active && !resume)) return false;
    this.failedSources[this.currentSource] = true;
    this.discovery.waiting = true;
    this.discovery.failure = message;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.engine.stop();
    this.ready = false;
    this.loadToken++;
    this.setPhase('recovering');
    if (resume) {
      this.resolveAndLoad(true, true, null, true);
      this.discovery.waiting = true;
      this.discovery.failure = message;
    }
    this.notice('Diğer kaynaklar hazırlanıyor.');
    this.continueDiscoveryFallback();
    return true;
  };
  Controller.prototype.resolveAndLoad = function (refresh, preserve, recoveryEngine, resumeOnly) {
    var self = this,
      session = self.session;
    if (!refresh && self.content.sources.length) {
      self.load(self.pickSource(self.content.sources), self.position);
      return;
    }
    var previous = self.currentMedia(),
      content = self.content;
    self.cancelDiscovery();
    var token = self.resolutionToken;
    self.discovery = {
      active: true,
      started: !!preserve,
      waiting: false,
      preserve: !!preserve,
      manual: !!preserve && !resumeOnly,
      resumeOnly: !!resumeOnly,
      expanded: !!self.sourcesMenuOpen || (!!preserve && !resumeOnly),
      deferred: false,
      deadline: self.now() + 180000,
      seen: {}
    };
    if (preserve && !resumeOnly) {
      var oldOptions = [];
      oldOptions.options = [];
      self.mergeSources(oldOptions);
      self.emit('sources');
    }
    if (resumeOnly && self.content.sourceOptions) {
      self.content.sourceOptions.forEach(function (o) {
        if (o.status === 'deferred' || o.status === 'cancelled') {
          o.status = 'pending';
          o.detail = 'Kalan kaynaklar hazırlanıyor…';
        }
      });
    }
    if (!preserve) {
      self.engine.stop();
      self.loadToken++;
      self.ready = false;
      self.pendingSeek = null;
      self.setPhase('resolving');
    }
    function valid() {
      return session === self.session && token === self.resolutionToken && content === self.content;
    }
    function update(sources, final) {
      if (!valid()) return;
      if (!self.discovery.started && sources.length) {
        self.content.sources = [];
        self.currentSource = -1;
        self.previousSource = null;
        self.failedSources = {};
        self.qualityFailures = {};
        delete self.content.sourceOptions;
        self.mergeSources(sources);
        self.discovery.started = true;
        var index = self.pickSource(self.content.sources);
        self.content.sources.some(function (s, i) {
          if (previous && (s.id === previous.id || s.label === previous.label)) {
            index = i;
            return true;
          }
          return false;
        });
        var fresh = self.content.sources[index];
        if (
          recoveryEngine &&
          previous &&
          fresh.id === previous.id &&
          (!self.engine.canUse || self.engine.canUse(recoveryEngine, fresh))
        )
          self.forcedEngine = recoveryEngine;
        self.log('İlk kaynak hazır · oynatma başlatılıyor; bir yedek kaynak hazırlanıyor.');
        self.load(index, self.position);
        if (!valid()) return;
      } else self.mergeSources(sources);
      self.emit('sources');
      self.continueDiscoveryFallback();
      if (!final) self.deferAutomaticDiscovery();
      if (!preserve) self.changed();
    }
    self.resolver
      .resolve(content, self.discovery.deadline, update, {
        preferredId: !resumeOnly && previous && previous.id,
        preferredLabel: !resumeOnly && previous && previous.label,
        pick: function (sources) {
          if (resumeOnly) {
            var unknown = sources.filter(function (source) {
              return !content.sources.some(function (known) {
                return known.id === source.id;
              });
            });
            if (unknown.length) return sources.indexOf(unknown[self.pickSource(unknown)]);
          }
          return self.pickSource(sources);
        },
        rankVariant: resumeOnly
          ? function (entry) {
              var key = entry.contextId || entry.contentId,
                known = content.sources.some(function (s) {
                  return s.providerVariantId === key;
                }),
                pending = (content.sourceOptions || []).some(function (o) {
                  return (
                    o.providerId === entry.providerId &&
                    (o.status === 'pending' || o.status === 'deferred' || o.status === 'cancelled')
                  );
                });
              return known && !pending ? 1 : 0;
            }
          : null,
        mediaActive: function () {
          return valid() && self.discovery.started;
        },
        canContinue: function () {
          return valid() && self.discoveryCanContinue();
        }
      })
      .then(function (sources) {
        if (!valid()) return;
        update(sources, true);
        if (!valid()) return;
        self.discovery.active = false;
        self.finishDiscoveryOptions();
        self.emit('sources');
        self.continueDiscoveryFallback();
        if (!self.discovery.started) self.fail('Oynatılabilir kaynak bulunamadı.');
      })
      .catch(function (e) {
        if (!valid() || e.cancelled) return;
        self.discovery.active = false;
        if (e.sourceOptions) {
          var failed = [];
          failed.options = e.sourceOptions;
          self.mergeSources(failed);
        }
        self.finishDiscoveryOptions(e);
        self.log('Kaynak hatası [' + (e.stage || 'unknown') + ']: ' + C.safeMessage(e.message));
        self.emit('sources');
        if (self.discovery.started) {
          self.continueDiscoveryFallback();
          return;
        }
        var stage = {
          page: 'Video sayfası alınamadı',
          embed: 'Oynatıcı sayfası alınamadı',
          decode: 'Kaynak çözümlenemedi',
          manifest: 'Yayın listesi alınamadı'
        };
        self.fail((stage[e.stage] || 'Kaynaklar alınamadı') + '. ' + C.safeMessage(e.message));
      });
  };
  Controller.prototype.load = function (index, position) {
    if (!this.content || !this.content.sources[index]) {
      this.fail('Oynatılabilir kaynak bulunamadı.');
      return;
    }
    if (this.now() >= this.budgetEnd) {
      this.fail(
        '60 saniyelik deneme süresi doldu. Tekrar deneyebilir veya başka kaynak seçebilirsiniz.'
      );
      return;
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.engine.stop();
    this.loadToken++;
    var self = this,
      session = self.session,
      token = self.loadToken;
    if (self.content.sourceContext && self.currentSource >= 0 && self.currentSource !== index) {
      self.previousSource = self.currentSource;
      self.previousPosition = position || 0;
      self.previousDesired = self.desiredPlay;
    }
    self.currentSource = index;
    self.position = position || 0;
    self.ready = false;
    self.audioApplied = false;
    self.subtitleApplied = false;
    self.audioSignature = null;
    self.subtitleSignature = null;
    self.seekHold = false;
    self.pendingSeek = null;
    self.setPhase('loading');
    var source = (self.activeSource = sourceCopy(self.content.sources[index])),
      settings = self.settings,
      prefs = self.prefs || {};
    var engineId = self.forcedEngine || self.pickEngine(source) || 'html5';
    self.forcedEngine = null;
    var tried = self.engineTried[source.id] || (self.engineTried[source.id] = {});
    tried[engineId] = true;
    self.compatProgress = 0;
    self.compatSaved = false;
    self.compatProfile = null;
    self.compatLast = undefined;
    self.log('Motor açılıyor: ' + source.label + '; deneme ' + (self.retryCount + 1));
    self.engine.open(
      source,
      {
        engineId: engineId,
        content: self.content,
        compatibility: self.compatibility,
        referenceTrial:
          !!self.content.referenceTrial &&
          !!(root.PlayerReferences && root.PlayerReferences.valid(source)),
        failedHeights: Object.keys(self.qualityFailures)
          .filter(function (k) {
            return k.indexOf(index + ':') === 0;
          })
          .map(function (k) {
            return Number(k.split(':')[1]);
          }),
        position: self.position,
        quality: prefs.quality === undefined ? settings.quality : prefs.quality,
        qualityCap: settings.qualityCap,
        style: settings.subtitleStyle,
        subtitleOffset: prefs.subtitleOffset || 0,
        aspect: settings.aspect,
        smallBuffer: self.mediaRetries > 0,
        mp4Verified:
          source.type === 'mp4' &&
          (source.mp4Verified === true ||
            !!(source.engineSupport && source.engineSupport.html5 === 'verified')),
        deadline: function () {
          return self.deadline();
        }
      },
      function (type, data) {
        if (session !== self.session || token !== self.loadToken || !self.content) return;
        self.event(type, data);
      }
    );
  };
  Controller.prototype.event = function (type, data) {
    var self = this;
    if (type === 'tracks') {
      var audioSignature = data.audio
          .map(function (t) {
            return (
              t.url +
              ':' +
              t.lang +
              ':' +
              C.role(t) +
              ':' +
              (t.codec || '') +
              ':' +
              (t.blockedReason || '')
            );
          })
          .join('|'),
        subtitleSignature = data.subtitles
          .map(function (t) {
            return t.key;
          })
          .join('|');
      if (audioSignature !== this.audioSignature) this.audioApplied = false;
      if (subtitleSignature !== this.subtitleSignature) this.subtitleApplied = false;
      this.audioSignature = audioSignature;
      this.subtitleSignature = subtitleSignature;
      this.tracks = data;
      this.applyTracks();
      this.changed();
      return;
    }
    if (type === 'ready') {
      this.ready = true;
      var newDuration = data.duration || 0;
      if (
        this.referenceDuration > 0 &&
        newDuration > 0 &&
        Math.abs(newDuration - this.referenceDuration) >
          Math.max(5, this.referenceDuration * 0.02) &&
        this.position > 0
      ) {
        this.desiredBeforeMismatch = this.desiredPlay;
        this.engine.pause();
        this.setPhase('mismatch');
        this.ask(
          'duration',
          'Bu kaynağın süresi önceki kayıttan farklı (' +
            C.format(this.referenceDuration) +
            ' → ' +
            C.format(newDuration) +
            '). Konum eşleşmeyebilir.',
          [
            {
              label: 'Kayıtlı konumu dene',
              action: function () {
                self.referenceDuration = newDuration;
                self.finishReady(data);
              }
            },
            {
              label: 'Baştan başlat',
              action: function () {
                self.position = 0;
                self.referenceDuration = newDuration;
                self.finishReady(data);
              }
            },
            {
              label:
                self.previousSource !== null && self.previousSource !== undefined
                  ? 'Önceki kaynağa dön'
                  : 'Geri',
              action: function () {
                if (self.previousSource !== null && self.previousSource !== undefined)
                  self.revertSource();
                else self.stop('exit');
              }
            }
          ]
        );
        return;
      }
      this.finishReady(data);
      return;
    }
    if (type === 'error') {
      this.recover(data);
      return;
    }
    if (type === 'notice' || type === 'subtitleerror') {
      this.notice(data.message);
      return;
    }
    if (type === 'audiochanged') {
      this.tracks = data;
      this.changed();
      return;
    }
    if (type === 'audiofailed') {
      this.savePref(
        'audio',
        data.track ? C.trackKey(data.track) : { lang: this.settings.audioLanguage, role: 'main' }
      );
      this.notice(data.message);
      this.changed();
      return;
    }
    if (type === 'qualitychanged') {
      this.snapshot = data;
      this.changed();
      return;
    }
    if (type === 'ended') {
      this.end();
      return;
    }
    if (['time', 'tick', 'playing', 'paused', 'seeked', 'seeking', 'buffering'].indexOf(type) < 0)
      return;
    this.snapshot = data;
    // Ignore load-time resets before the requested starting position has been applied.
    if (this.ready && this.phase !== 'mismatch') {
      this.position = C.finite(data.position) ? data.position : this.position;
      this.duration = data.duration || this.duration;
    }
    if (type === 'playing') {
      if (!this.desiredPlay || this.seekHold || (this.dialog && this.dialog.kind === 'duration')) {
        this.engine.pause();
        return;
      }
      if (!this.healthySince) this.healthySince = this.now();
      this.bufferingAt = null;
      this.lastPlaybackAt = this.now();
      this.setPhase('playing');
    } else if (
      type === 'paused' &&
      this.ready &&
      ['mismatch', 'ended', 'recovering', 'error'].indexOf(this.phase) < 0
    ) {
      this.setPhase('paused');
      this.checkpoint();
    } else if (type === 'buffering' && this.ready && this.desiredPlay && !this.seekHold) {
      if (this.phase !== 'buffering') {
        if (this.healthySince && this.now() - this.healthySince >= 30000) this.resetBudget();
        this.bufferingAt = this.now();
      }
      this.setPhase('buffering');
    } else if (type === 'seeking' && this.ready && this.phase !== 'mismatch')
      this.setPhase('seeking');
    else if (type === 'seeked' && this.ready) {
      this.pendingSeek = null;
      this.lastPlaybackAt = this.now();
      this.loop.pending = false;
      this.checkpoint();
      this.engine.subtitles.render(this.position);
      if (!this.desiredPlay || this.seekHold) {
        this.engine.pause();
        this.setPhase('paused');
      } else {
        var playing = this.engine.play();
        if (playing !== false && this.ready) this.setPhase('playing');
      }
    }
    if (this.qualityChange && (type === 'buffering' || type === 'seeking'))
      this.qualityChange.lastPosition = undefined;
    if (
      type === 'time' &&
      this.qualityChange &&
      this.ready &&
      this.desiredPlay &&
      !data.paused &&
      !data.seeking
    ) {
      var change = this.qualityChange;
      if (
        change.source === this.currentSource &&
        (change.target === 0 || data.actualQuality === change.target)
      ) {
        var delta = data.position - change.lastPosition;
        if (C.finite(delta) && delta > 0 && delta < Math.max(2.1, (data.rate || 1) * 1.5))
          change.progress += delta / (data.rate || 1);
        change.lastPosition = data.position;
        if (change.progress >= 10) this.qualityChange = null;
      } else change.lastPosition = undefined;
    }
    if (type === 'time' && this.ready && this.desiredPlay && !data.paused && !data.seeking) {
      if (
        this.lastTime !== undefined &&
        data.position > this.lastTime &&
        data.position - this.lastTime < Math.max(2.1, (data.rate || 1) * 1.5)
      ) {
        this.watched = true;
        this.lastPlaybackAt = this.now();
      }
      this.lastTime = data.position;
    }
    this.observeCompatibility(type, data);
    this.changed();
  };
  Controller.prototype.finishReady = function (data) {
    this.duration = data.duration || 0;
    this.referenceDuration = this.duration;
    if (this.duration && this.position >= this.duration) {
      this.position = 0;
      this.notice('Kayıt bu kaynağın süresini aşıyor; baştan başlanıyor.');
    }
    this.applyTracks();
    if (!this.ready) return;
    if (this.content && this.content.sourceContext) this.emit('source', this.currentMedia());
    this.engine.setRate(
      !this.content.referenceTrial && this.verifiedRates().indexOf(this.settings.speed) >= 0
        ? this.settings.speed
        : 1
    );
    this.engine.setAspect(this.settings.aspect);
    this.lastPlaybackAt = this.now();
    if (this.position > 0 && this.engineId() === 'avplay') {
      var requested = this.position;
      this.pendingSeek = requested;
      this.setPhase('seeking');
      if (!this.engine.seek(requested)) {
        this.pendingSeek = null;
        this.recover({
          type: 'media',
          details: 'seekTimeout',
          position: requested,
          message: 'Native motor kayıtlı konuma ulaşamadı.'
        });
      }
      return;
    }
    if (this.position > 0) this.engine.seek(this.position);
    if (this.desiredPlay && !this.seekHold) this.engine.play();
    else {
      this.engine.pause();
      this.setPhase('paused');
    }
    this.changed();
  };
  Controller.prototype.applyTracks = function () {
    var t = this.tracks,
      prefs = this.prefs || {},
      self = this;
    if (!this.audioApplied && t.audio.length) {
      var available = t.audio.filter(function (track) {
        return !track.blockedReason && !C.audioGate(track, self.engineCaps());
      });
      var index = C.matchTrack(
        available,
        prefs.audio || { lang: this.settings.audioLanguage, role: 'main' }
      );
      if (index < 0 && prefs.audio) {
        index = C.matchTrack(available, { lang: this.settings.audioLanguage, role: 'main' });
        this.notice('Kayıtlı ses kullanılamıyor; mevcut uygun ses kullanılıyor.');
      }
      var current = this.engine.tracks().audioIndex,
        blockedCurrent = t.audio.some(function (track) {
          return (
            track.index === current &&
            (track.blockedReason || C.audioGate(track, self.engineCaps()))
          );
        });
      this.audioApplied = true;
      if (!available.length) {
        var audioError =
          'Kaynağın bildirdiği ses biçimleri bu motorda doğrulanmadı. Başka kaynak seçin.';
        if (this.content.sourceContext)
          this.recover({ type: 'unsupported', details: 'audioCodec', message: audioError });
        else this.fail(audioError);
        return;
      }
      if (index < 0 && blockedCurrent) {
        index = 0;
        this.notice('Seçili ses biçimi doğrulanmadı; uygun başka ses seçildi.');
      }
      if (index >= 0) this.engine.selectAudio(available[index].index);
    }
    if (!this.subtitleApplied && (t.subtitles.length || !prefs.subtitle)) {
      var chosen = null;
      if (prefs.subtitle && prefs.subtitle !== 'off') {
        var sub = C.matchTrack(t.subtitles, prefs.subtitle);
        if (sub >= 0) chosen = t.subtitles[sub];
        else this.notice('Kayıtlı altyazı bu kaynakta bulunamadı; altyazı kapalı.');
      }
      this.engine.selectSubtitle(chosen).catch(function () {});
      this.subtitleApplied = true;
    }
  };
  Controller.prototype.savePref = function (key, value) {
    this.prefs[key] = C.copy(value);
    if (!this.content.referenceTrial && this.settings.rememberTracks)
      this.store.preference(this.content.contentId, key, value);
  };
  Controller.prototype.play = function () {
    if (!this.content) return;
    if (this.dialog && this.dialog.kind === 'exit') {
      this.answer(0);
      return;
    }
    if (this.phase === 'ended') {
      this.replay();
      return;
    }
    this.desiredPlay = true;
    if (
      this.ready &&
      (!this.dialog || ['rate-test', 'feature-test', 'clear'].indexOf(this.dialog.kind) >= 0) &&
      !this.seekHold
    )
      this.engine.play();
    this.changed();
  };
  Controller.prototype.pause = function () {
    this.desiredPlay = false;
    if (this.ready) this.engine.pause();
    this.checkpoint();
    this.changed();
  };
  Controller.prototype.toggle = function () {
    if (this.desiredPlay && this.phase !== 'ended') this.pause();
    else this.play();
  };
  Controller.prototype.seek = function (position) {
    if (!this.ready || !C.finite(position) || !this.duration) return false;
    var target = C.clamp(position, 0, Math.max(0, this.duration - 0.1));
    this.pendingSeek = target;
    this.watched = false;
    this.lastTime = undefined;
    this.lastPlaybackAt = this.now();
    this.cancelCountdown();
    var previousPhase = this.phase;
    this.setPhase('seeking');
    if (!this.engine.seek(target)) {
      this.pendingSeek = null;
      this.setPhase(previousPhase);
      this.notice('Bu yayında sarma kullanılamıyor.');
      return false;
    }
    return true;
  };
  Controller.prototype.holdSeek = function (hold) {
    this.seekHold = hold;
    if (hold && this.ready) this.engine.pause();
    else if (!hold && this.ready && this.desiredPlay) this.engine.play();
    this.changed();
  };
  Controller.prototype.checkpoint = function (ended) {
    if (
      !this.content ||
      this.content.referenceTrial ||
      !this.ready ||
      this.phase === 'mismatch' ||
      this.engine.requestedSeek
    )
      return;
    this.store.checkpoint(
      this.content.contentId,
      this.position,
      this.duration,
      ended === true || this.phase === 'ended',
      this.watched && !this.pendingSeek && !this.seekHold
    );
    this.lastCheckpoint = this.now();
  };
  Controller.prototype.selectSource = function (index) {
    if (!this.content || !this.content.sources[index]) return;
    if (index === this.currentSource) {
      if (this.phase === 'error') this.retry(false);
      return;
    }
    this.qualityChange = null;
    this.forcedEngine = null;
    var selected = this.content.sources[index];
    delete this.engineTried[selected.id];
    delete this.engineSwitched[selected.id];
    if (this.compatibility) {
      this.compatibility.retry(this.content, selected, 'html5');
      this.compatibility.retry(this.content, selected, 'avplay');
    }
    this.keepTrackIntent();
    this.checkpoint();
    this.previousSource = this.currentSource;
    this.previousPosition = this.position;
    this.previousDesired = this.desiredPlay;
    this.referenceDuration = this.duration;
    this.resetBudget();
    this.cancelDiscovery();
    this.load(index, this.position);
  };
  Controller.prototype.revertSource = function () {
    if (this.previousSource === null || this.previousSource === undefined) return;
    this.qualityChange = null;
    var i = this.previousSource;
    this.previousSource = null;
    this.desiredPlay = this.previousDesired;
    this.resetBudget();
    this.cancelDiscovery();
    this.load(i, this.previousPosition);
  };
  Controller.prototype.selectAudio = function (track) {
    if (
      !track ||
      track.blockedReason ||
      C.audioGate(track, this.engineCaps()) ||
      !this.engine.selectAudio(track.index)
    )
      return;
    this.savePref('audio', C.trackKey(track));
    if (!this.desiredPlay) this.engine.pause();
    this.changed();
  };
  Controller.prototype.selectSubtitle = function (track) {
    var self = this,
      session = this.session,
      load = this.loadToken,
      choice = (this.subtitleChoice = (this.subtitleChoice || 0) + 1);
    this.engine.selectSubtitle(track).then(
      function () {
        if (
          self.content &&
          self.session === session &&
          self.loadToken === load &&
          self.subtitleChoice === choice
        ) {
          self.savePref('subtitle', track ? C.trackKey(track) : 'off');
          self.changed();
        }
      },
      function (error) {
        if (
          self.content &&
          self.session === session &&
          self.loadToken === load &&
          self.subtitleChoice === choice
        )
          self.notice('Altyazı seçimi uygulanamadı: ' + C.safeMessage(error.message));
      }
    );
    this.changed();
  };
  Controller.prototype.setSubtitleOffset = function (value) {
    this.engine.subtitles.setOffset(value);
    this.savePref('subtitleOffset', this.engine.subtitles.offset);
    this.changed();
  };
  Controller.prototype.setSubtitleStyle = function (style) {
    this.store.setting('subtitleStyle', style);
    this.settings = this.store.settings();
    this.engine.subtitles.setStyle(this.settings.subtitleStyle);
    this.changed();
  };
  Controller.prototype.selectQuality = function (height, index) {
    var old =
      this.qualityChange && this.qualityChange.source === this.currentSource
        ? this.qualityChange.old
        : this.prefs.quality === undefined
          ? this.settings.quality
          : this.prefs.quality;
    this.resetBudget();
    this.qualityChange = {
      old: old,
      target: height,
      source: this.currentSource,
      progress: 0,
      lastPosition: this.position,
      at: this.now()
    };
    this.compatProgress = 0;
    this.compatSaved = false;
    this.compatLast = undefined;
    var selected = this.currentMedia();
    if (this.compatibility)
      this.compatibility.retry(this.content, selected, this.engineId(), height);
    if (this.engine.qualityReloadRequired && this.engine.qualityReloadRequired(height, index)) {
      this.savePref('quality', height);
      this.forcedEngine = this.engineId();
      this.load(this.currentSource, this.position);
      return;
    }
    if (index !== undefined) this.engine.selectLevel(index);
    else if (!this.engine.setQuality(height, this.settings.qualityCap))
      this.notice('İstenen kalite bu kaynakta yok; otomatik seçim kullanılıyor.');
    this.savePref('quality', height);
    if (!this.desiredPlay) this.engine.pause();
    this.changed();
  };
  Controller.prototype.setting = function (key, value) {
    this.store.setting(key, value);
    this.settings = this.store.settings();
    if (
      key === 'qualityCap' &&
      !this.engine.setQuality(this.prefs.quality || 0, this.settings.qualityCap)
    )
      this.notice(
        'Kaynakta seçilen üst sınırın altında bir kalite yok. Mevcut en düşük kalite kullanılıyor.'
      );
    if (key === 'aspect') this.engine.setAspect(this.settings.aspect);
    if (
      key === 'speed' &&
      (this.verifiedRates().indexOf(this.settings.speed) < 0 ||
        !this.engine.setRate(this.settings.speed))
    ) {
      this.store.setting('speed', 1);
      this.settings = this.store.settings();
      this.notice('Bu motor hızı uygulayamadı; 1x kullanılıyor.');
    }
    if (!this.settings.autoNext) this.cancelCountdown();
    this.changed();
  };
  Controller.prototype.bookmark = function () {
    if (!this.content || !this.ready) return;
    if (this.content.referenceTrial) {
      this.notice('Uyumluluk denemesinde yer imi kaydedilmez.');
      return;
    }
    this.notice(
      this.store.bookmark(this.content.contentId, this.position)
        ? 'Yer imi eklendi: ' + C.format(this.position)
        : 'En fazla 10 farklı yer imi saklanabilir.'
    );
    this.changed();
  };
  Controller.prototype.markLoop = function () {
    if (!this.loop.mark(this.position, this.duration))
      this.notice('B noktası A’dan en az 1 saniye sonra olmalı.');
    else
      this.notice(
        this.loop.b !== null ? 'A–B tekrarı etkin.' : 'A noktası: ' + C.format(this.loop.a)
      );
    this.cancelCountdown();
    this.changed();
  };
  Controller.prototype.clearLoop = function () {
    this.loop = new root.PlayerLoop();
    this.changed();
  };
  Controller.prototype.sleep = function (minutes) {
    this.sleepMinutes = typeof minutes === 'number' && minutes > 0 ? minutes : 0;
    this.sleepAt = this.sleepMinutes ? this.now() + this.sleepMinutes * 60000 : null;
    this.sleepEnd = minutes === 'end';
    this.cancelCountdown();
    this.changed();
  };
  Controller.prototype.cancelCountdown = function () {
    if (this.countdownAt !== null) {
      this.countdownAt = null;
      this.emit('countdown', null);
    }
  };
  Controller.prototype.next = function (episode) {
    var target = episode || (this.episodes && this.episodes.next()),
      sleepAt = this.sleepAt,
      sleepEnd = this.sleepEnd,
      sleepMinutes = this.sleepMinutes;
    this.cancelCountdown();
    if (target) {
      this.open(this.episodes.decorate(target));
      this.sleepAt = sleepAt;
      this.sleepEnd = sleepEnd;
      this.sleepMinutes = sleepMinutes;
    }
  };
  Controller.prototype.neighbor = function (direction) {
    if (!this.content) return null;
    if (this.content.type === 'episode')
      return direction < 0 ? this.episodes.previous() : this.episodes.next();
    var nav = this.content.navigation,
      list = (nav && nav.kind === 'movies' && nav.items) || [],
      index = -1;
    list.some(function (item, i) {
      if (item.contentId === this.content.contentId) {
        index = i;
        return true;
      }
      return false;
    }, this);
    return index >= 0 ? list[index + direction] || null : null;
  };
  Controller.prototype.navigate = function (direction) {
    var target = this.neighbor(direction);
    if (!target) return;
    if (this.content.type === 'episode') {
      this.next(target);
      return;
    }
    var next = C.copy(target);
    next.navigation = C.copy(this.content.navigation);
    this.open(next);
  };
  Controller.prototype.end = function () {
    if (!this.ready || this.phase === 'ended') return;
    if (this.loop.b !== null) {
      this.loop.pending = false;
      this.seek(this.loop.a);
      return;
    }
    this.position = this.duration || this.position;
    this.checkpoint(true);
    this.desiredPlay = false;
    this.setPhase('ended');
    if (this.sleepEnd) {
      this.stop('sleep');
      return;
    }
    if (this.settings.autoNext && this.episodes.next()) {
      this.countdownAt = this.now() + 15000;
      this.emit('countdown', 15);
    } else this.emit('ended', this.episodes.next());
  };
  Controller.prototype.replay = function () {
    if (!this.content) return;
    this.cancelCountdown();
    clearTimeout(this.retryTimer);
    this.cancelDiscovery();
    this.dialog = null;
    this.emit('dialog', null);
    this.desiredPlay = true;
    this.position = 0;
    this.referenceDuration = 0;
    this.watched = false;
    this.lastTime = undefined;
    this.loop = new root.PlayerLoop();
    this.resetBudget();
    if (this.content.sources.length) this.load(Math.max(0, this.currentSource), 0);
    else this.resolveAndLoad(false);
  };
  Controller.prototype.recover = function (error) {
    if (
      !this.content ||
      ['error', 'ended', 'idle', 'suspended', 'mismatch'].indexOf(this.phase) >= 0
    )
      return;
    this.keepTrackIntent();
    var requestedTarget = this.engine.requestedSeek && this.engine.requestedSeek.target;
    var restoringSeek =
      C.finite(requestedTarget) || (error.details === 'seekTimeout' && C.finite(error.position));
    if (restoringSeek)
      this.position = C.clamp(
        C.finite(requestedTarget) ? requestedTarget : error.position,
        0,
        Math.max(0, this.duration - 0.1)
      );
    this.checkpoint();
    this.log(
      'Hata: ' +
        (error.type || '') +
        '/' +
        (error.details || '') +
        '; kod ' +
        (error.code === undefined ? 'n/a' : error.code) +
        '; ' +
        C.safeMessage(error.message)
    );
    var qualityRolledBack = this.qualityChange && this.qualityChange.source === this.currentSource;
    var actualHeight =
        (error.details === 'fragmentTooLarge' && Number(error.failedHeight)) ||
        Number(this.snapshot.actualQuality) ||
        0,
      automaticFailure = !!(
        this.compatibility &&
        !qualityRolledBack &&
        /^(bufferAppendNoProgress|playbackStalled|fragmentTooLarge)$/.test(error.details || '') &&
        this.engine.tracks().autoQuality &&
        !this.qualityFailures[this.currentSource + ':' + actualHeight] &&
        this.tracks.qualities.some(function (q) {
          return q.height > 0 && q.height < actualHeight;
        })
      );
    var failedSource = this.currentMedia(),
      failedEngine = this.engineId(),
      httpFailure =
        error.type === 'network' && Number(error.code) >= 400 && Number(error.code) <= 599,
      expiredAddress =
        error.type === 'network' && [401, 403, 404, 410].indexOf(Number(error.code)) >= 0,
      mayChangeEngine =
        error.type !== 'network' ||
        (!httpFailure && /^(playbackStalled|seekTimeout)$/.test(error.details || '')),
      alternate = null;
    if (this.compatibility && failedSource) {
      var target = automaticFailure
          ? actualHeight
          : this.qualityChange && this.qualityChange.target,
        level = this.tracks.qualities.filter(function (q) {
          return q.height === target;
        })[0];
      this.compatibility.failure(
        this.content,
        failedSource,
        failedEngine,
        error,
        qualityRolledBack || automaticFailure ? target : undefined,
        (level && level.codec) || ''
      );
    }
    if (automaticFailure) {
      this.qualityFailures[this.currentSource + ':' + actualHeight] = true;
      this.notice('Otomatik kalite bu profilde ilerlemedi; daha düşük kaliteyle toparlanıyor.');
    }
    if (
      !qualityRolledBack &&
      !automaticFailure &&
      mayChangeEngine &&
      failedSource &&
      this.engine.alternate &&
      !this.engineSwitched[failedSource.id] &&
      error.code !== 403 &&
      error.code !== 404
    )
      alternate = this.engine.alternate(failedSource, this.engineTried[failedSource.id] || {});
    if (qualityRolledBack) {
      this.qualityFailures[this.currentSource + ':' + this.qualityChange.target] = true;
      this.savePref('quality', this.qualityChange.old);
      this.qualityChange = null;
      this.notice('Kalite değişimi tamamlanamadı; önceki kaliteyle toparlanıyor.');
    }
    var renewed = this.content.sources[this.currentSource];
    if (
      !qualityRolledBack &&
      !automaticFailure &&
      error.type === 'network' &&
      this.activeSource &&
      renewed &&
      renewed.url !== this.activeSource.url &&
      renewed.id === this.activeSource.id
    ) {
      if (this.healthySince && this.now() - this.healthySince >= 30000) this.resetBudget();
      if (this.now() < this.budgetEnd && this.retryCount < 5) {
        this.retryCount++;
        this.cancelDiscovery();
        this.cancelCountdown();
        this.engine.stop();
        this.ready = false;
        this.loadToken++;
        this.setPhase('recovering');
        var owner = this,
          generation = this.session;
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(function () {
          owner.retryTimer = null;
          if (generation === owner.session && owner.phase === 'recovering') {
            var replacement = owner.content.sources[owner.currentSource];
            if (!owner.engine.canUse || owner.engine.canUse(failedEngine, replacement))
              owner.forcedEngine = failedEngine;
            owner.load(owner.currentSource, owner.position);
          }
        }, 1000);
        return;
      }
    }
    if (
      !qualityRolledBack &&
      !alternate &&
      (error.type === 'unsupported' || error.type === 'play')
    ) {
      var message =
        error.type === 'play' ? 'Oynatma başlatılamadı. Tekrar deneyin.' : error.message;
      var pooled = this.content.sourceContext ? this.alternativeSource(true) : -1;
      if (pooled >= 0 && this.now() < this.budgetEnd && this.retryCount < 5) {
        this.retryCount++;
        this.failedSources[this.currentSource] = true;
        this.notice('Bu kaynak açılmadı; diğer uygun site/kaynak deneniyor.');
        this.load(pooled, this.position);
        return;
      }
      if (this.now() < this.budgetEnd && this.retryCount < 5 && this.waitForDiscovery(message)) {
        this.retryCount++;
        return;
      }
      this.fail(message);
      return;
    }
    if (this.healthySince && this.now() - this.healthySince >= 30000) this.resetBudget();
    this.healthySince = 0;
    if (this.now() >= this.budgetEnd || this.retryCount >= 5) {
      this.fail('Oynatma sürdürülemedi. ' + this.failureDetail(error));
      return;
    }
    this.retryCount++;
    this.cancelCountdown();
    this.engine.stop();
    this.ready = false;
    this.loadToken++;
    this.setPhase('recovering');
    var self = this,
      session = this.session,
      delay = Math.min(4000, 1000 * Math.pow(2, this.retryCount - 1)),
      action;
    var stalledAlternative = -1;
    if (
      restoringSeek ||
      /^(bufferAppendNoProgress|playbackStalled|seekTimeout)$/.test(error.details || '')
    )
      this.content.sources.some(function (s, i) {
        if (self.usableSource(i)) {
          stalledAlternative = i;
          return true;
        }
        return false;
      });
    if (qualityRolledBack || automaticFailure)
      action = function () {
        self.forcedEngine = failedEngine;
        self.load(self.currentSource, self.position);
      };
    else if (alternate) {
      this.engineSwitched[failedSource.id] = true;
      action = function () {
        self.forcedEngine = alternate;
        self.notice('Aynı kaynak diğer oynatma motoruyla deneniyor.');
        self.load(self.currentSource, self.position);
      };
    } else if (this.content.sourceContext && this.alternativeSource(true) >= 0) {
      var pooledIndex = this.alternativeSource(true);
      this.failedSources[this.currentSource] = true;
      action = function () {
        self.notice('Diğer uygun site/kaynak deneniyor.');
        self.load(pooledIndex, self.position);
      };
    } else if (stalledAlternative >= 0) {
      this.failedSources[this.currentSource] = true;
      action = function () {
        self.notice('Medya ilerlemiyor; alternatif kaynak deneniyor.');
        self.load(stalledAlternative, self.position);
      };
    } else if (
      /manifestIncompatibleCodecs|bufferIncompatibleCodecs|bufferAddCodec/i.test(
        error.details || ''
      )
    ) {
      this.failedSources[this.currentSource] = true;
      var compatible = -1;
      this.content.sources.some(function (s, i) {
        if (self.usableSource(i)) {
          compatible = i;
          return true;
        }
        return false;
      });
      if (compatible < 0) {
        if (
          !this.waitForDiscovery(
            'Bu kaynağın görüntü veya ses biçimi TV/motor tarafından desteklenmiyor. Başka kaynak seçin.'
          )
        )
          this.fail(
            'Bu kaynağın görüntü veya ses biçimi TV/motor tarafından desteklenmiyor. Başka kaynak seçin.'
          );
        return;
      }
      action = function () {
        self.load(compatible, self.position);
      };
    } else if (error.type === 'media' && this.mediaRetries < 1) {
      this.mediaRetries++;
      action = function () {
        self.forcedEngine = failedEngine;
        self.load(self.currentSource, self.position);
      };
    } else if (
      this.sameRetries < 1 &&
      !expiredAddress &&
      error.code !== 403 &&
      error.code !== 404
    ) {
      this.sameRetries++;
      action = function () {
        self.forcedEngine = failedEngine;
        self.load(self.currentSource, self.position);
      };
    } else if (this.discovery && (this.discovery.active || this.hasDeferredSources())) {
      this.waitForDiscovery('Uygun kaynak kalmadı. ' + this.failureDetail(error));
      return;
    } else if (this.content.pageUrl && this.refreshCount < 1) {
      this.refreshCount++;
      action = function () {
        self.resolveAndLoad(true, false, failedEngine);
      };
    } else {
      this.failedSources[this.currentSource] = true;
      var index = -1;
      this.content.sources.some(function (s, i) {
        if (self.usableSource(i)) {
          index = i;
          return true;
        }
        return false;
      });
      if (index < 0) {
        this.fail('Uygun kaynak kalmadı. ' + this.failureDetail(error));
        return;
      }
      action = function () {
        self.load(index, self.position);
      };
    }
    this.notice('Bağlantı toparlanıyor · deneme ' + this.retryCount + '/5');
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(function () {
      self.retryTimer = null;
      if (session === self.session && self.phase === 'recovering') action();
    }, delay);
  };
  Controller.prototype.fail = function (message) {
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.cancelDiscovery();
    this.engine.stop();
    this.loadToken++;
    this.ready = false;
    this.cancelCountdown();
    this.qualityChange = null;
    this.error = C.safeMessage(message);
    var failedSession = this.session;
    this.setPhase('error');
    if (this.content && this.session === failedSession && this.phase === 'error')
      this.emit('error', this.error);
  };
  Controller.prototype.retry = function (refresh) {
    if (!this.content) return;
    if (
      refresh &&
      this.ready &&
      this.activeSource &&
      ['error', 'ended', 'mismatch'].indexOf(this.phase) < 0
    ) {
      if (this.discovery && this.discovery.active && this.discovery.manual) return;
      this.resolveAndLoad(true, true);
      return;
    }
    this.keepTrackIntent();
    this.referenceDuration = this.duration || this.referenceDuration;
    this.resetBudget();
    this.forcedEngine = null;
    if (this.currentMedia()) {
      var source = this.currentMedia();
      delete this.engineTried[source.id];
      delete this.engineSwitched[source.id];
      if (this.compatibility) {
        this.compatibility.retry(this.content, source, 'html5');
        this.compatibility.retry(this.content, source, 'avplay');
      }
    }
    if (refresh) this.resolveAndLoad(true);
    else if (this.content.sources.length) this.load(Math.max(0, this.currentSource), this.position);
    else this.resolveAndLoad(true);
  };
  Controller.prototype.cancelExit = function () {
    if (!this.dialog || this.dialog.kind !== 'exit') return;
    var intent = this.exitIntent;
    this.answer(-1);
    if (intent) this.play();
    else this.pause();
  };
  Controller.prototype.requestExit = function () {
    if (!this.content || (this.dialog && this.dialog.kind === 'exit')) return;
    if (this.dialog && this.dialog.kind === 'resume') {
      this.stop('discard');
      return;
    }
    var self = this,
      ended = this.phase === 'ended';
    this.exitIntent = this.desiredPlay;
    this.cancelCountdown();
    this.desiredPlay = false;
    if (this.ready && !ended) this.engine.pause();
    this.checkpoint();
    this.ask('exit', 'Ne yapmak istersiniz? Geri: önceki duruma dön.', [
      {
        label: 'Devam et',
        action: function () {
          if (ended) self.replay();
          else if (!self.ready && self.phase === 'error') {
            self.desiredPlay = true;
            self.retry(!self.content.sources.length);
          } else self.play();
        }
      },
      {
        label: 'Baştan başlat',
        action: function () {
          self.replay();
        }
      },
      {
        label: 'Kaydet ve çık',
        action: function () {
          self.stop('exit');
        }
      },
      {
        label: 'Kaydetmeden çık',
        action: function () {
          self.stop('discard');
        }
      }
    ]);
  };
  Controller.prototype.requestStop = function () {
    this.requestExit();
  };
  Controller.prototype.stop = function (reason) {
    var progressSession = this.progressSession;
    if (reason !== 'discard') this.checkpoint();
    this.progressSession = null;
    this.session++;
    this.loadToken++;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.cancelDiscovery();
    this.discovery = null;
    this.sourcesMenuOpen = false;
    this.engine.stop();
    this.cancelCountdown();
    this.pendingSeek = null;
    this.seekHold = false;
    this.dialog = null;
    this.rateTrial = null;
    this.forcedEngine = null;
    this.desiredPlay = false;
    this.ready = false;
    this.sleepAt = null;
    this.sleepEnd = false;
    this.sleepMinutes = 0;
    this.previousSource = null;
    this.qualityChange = null;
    this.loop = new root.PlayerLoop();
    this.phase = 'idle';
    this.emit('dialog', null);
    var old = this.content;
    this.content = null;
    this.activeSource = null;
    if (reason === 'discard') this.store.discardProgress(progressSession);
    this.emit('close', { content: old, reason: reason || 'stop' });
    this.changed();
  };
  Controller.prototype.hide = function () {
    if (!this.content) return;
    this.suspended = C.copy(this.content);
    this.stop('hidden');
    this.phase = 'suspended';
    this.changed();
  };
  Controller.prototype.show = function () {
    if (!this.suspended) return;
    var content = this.suspended;
    this.suspended = null;
    this.emit('suspended', content);
  };
  Controller.prototype.tick = function () {
    if (!this.content) return;
    var time = this.now();
    if (this.discovery && this.discovery.active && time >= this.discovery.deadline) {
      var expired = new Error('Kaynak taramasının 180 saniyelik süresi doldu.');
      expired.stage = 'timeout';
      this.finishDiscoveryOptions(expired);
      this.cancelDiscovery();
      this.log(expired.message);
    }
    if (this.sleepAt && time >= this.sleepAt) {
      this.stop('sleep');
      this.notice('Uyku süresi doldu. Oynatma durduruldu.');
      return;
    }
    if (this.countdownAt !== null) {
      var remaining = Math.ceil((this.countdownAt - time) / 1000);
      if (remaining <= 0) {
        this.next();
        return;
      }
      this.emit('countdown', remaining);
    }
    if (
      this.ready &&
      this.now() - this.lastCheckpoint >= 5000 &&
      !this.pendingSeek &&
      !this.seekHold
    )
      this.checkpoint();
    if (
      this.ready &&
      this.desiredPlay &&
      this.phase === 'playing' &&
      !this.pendingSeek &&
      !this.seekHold
    ) {
      var target = this.loop.target(this.position);
      if (target !== null) this.seek(target);
    }
    if (['resolving', 'loading', 'recovering'].indexOf(this.phase) >= 0 && time >= this.budgetEnd) {
      this.fail(
        '60 saniyelik deneme süresi doldu. Tekrar deneyebilir veya başka kaynak seçebilirsiniz.'
      );
      return;
    }
    if (
      this.ready &&
      this.desiredPlay &&
      !this.seekHold &&
      !this.dialog &&
      ['playing', 'buffering', 'seeking'].indexOf(this.phase) >= 0 &&
      this.lastPlaybackAt &&
      time - this.lastPlaybackAt > 20000
    )
      this.recover({
        type: 'network',
        details: 'playbackStalled',
        message: 'Oynatma 20 saniyedir ilerlemiyor.'
      });
  };
  Controller.prototype.dispose = function () {
    this.stop('dispose');
    this.clearInterval(this.timer);
    this.timer = null;
  };
  root.PlayerController = Controller;
})(window);
