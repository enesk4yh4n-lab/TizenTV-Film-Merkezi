/* HTML5/MSE engine. Transport selection remains identical to the TV-proven v0.2 path. */
(function (root) {
  'use strict';
  var C = root.PlayerCore;
  function Engine(video, subtitles, log) {
    this.video = video;
    this.subtitles = subtitles;
    this.log = log || function () {};
    this.generation = 0;
    this.playGeneration = 0;
    this.hls = null;
    this.listeners = [];
    this.callback = function () {};
    this.active = false;
    this.timer = null;
    this.audioTimer = null;
  }
  Engine.prototype.emit = function (type, data) {
    if (this.active) this.callback(type, data || {});
  };
  Engine.prototype.listen = function (name, fn) {
    this.video.addEventListener(name, fn);
    this.listeners.push([name, fn]);
  };
  Engine.prototype.stop = function () {
    this.active = false;
    this.generation++;
    this.playGeneration++;
    clearTimeout(this.rateTimer);
    this.rateTimer = null;
    this.rateSwitch = null;
    clearInterval(this.timer);
    clearTimeout(this.audioTimer);
    this.timer = this.audioTimer = null;
    this.audioTransaction = null;
    this.requestedSeek = null;
    var v = this.video;
    this.listeners.forEach(function (p) {
      v.removeEventListener(p[0], p[1]);
    });
    this.listeners = [];
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (ignore) {}
      this.hls = null;
    }
    this.subtitles.clear();
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
    } catch (ignore2) {}
    v.style.display = 'none';
    this.callback = function () {};
    this.source = null;
    this.options = {};
    this.lastStats = {};
    this.blockedQualities = [];
    this.selectedSubtitle = null;
  };
  Engine.prototype.open = function (source, options, callback) {
    this.stop();
    var self = this,
      v = self.video,
      token = self.generation;
    self.active = true;
    self.callback = callback;
    self.source = source;
    self.options = options || {};
    self.ready = false;
    self.fatalReported = false;
    self.lastStats = {};
    self.selectedSubtitle = null;
    self.initialBuffer = Math.min(
      12,
      Math.max(0, Number(source.stability && source.stability.initialBufferSeconds) || 0)
    );
    self.initialFrameAt = null;
    self.policy = {
      preferred: source.transport || 'native',
      userAgent: source.userAgent || '',
      destination: source.destination || 'documents'
    };
    self.position = Math.max(0, options.position || 0);
    self.openingMediaReady = self.position <= 0 || source.type === 'mp4';
    self.initialSeekPending = self.position > 0;
    self.blockedQualities = [];
    self.engineId = 'html5';
    self.failedHeights = (options.failedHeights || []).slice();
    self.subtitles.setStyle(options.style || C.defaults.subtitleStyle);
    self.subtitles.setOffset(options.subtitleOffset || 0);
    v.style.display = 'block';
    v.controls = false;
    v.autoplay = false;
    v.playbackRate = 1;
    v.style.objectFit = options.aspect === 'zoom' ? 'cover' : 'contain';
    function alive() {
      return self.active && token === self.generation;
    }
    function ready() {
      if (
        !alive() ||
        self.ready ||
        !self.openingMediaReady ||
        (self.position > 0 && typeof v.readyState === 'number' && v.readyState < 3)
      )
        return;
      if (self.initialBuffer) {
        if (v.readyState < 2) return;
        if (self.initialFrameAt === null) self.initialFrameAt = Date.now();
        var buffered = 0;
        try {
          for (var r = 0; r < v.buffered.length; r++)
            if (v.buffered.start(r) <= v.currentTime + 0.1)
              buffered = Math.max(buffered, v.buffered.end(r) - v.currentTime);
        } catch (ignore) {}
        var wanted = Math.min(
          self.initialBuffer,
          C.finite(v.duration) ? Math.max(0, v.duration - v.currentTime - 0.5) : self.initialBuffer
        );
        if (buffered < wanted && Date.now() - self.initialFrameAt < 12000) return;
      }
      self.ready = true;
      self.emit('ready', self.snapshot());
    }
    function event(type) {
      return function () {
        if (alive()) self.emit(type, self.snapshot());
      };
    }
    self.listen('loadedmetadata', ready);
    self.listen('loadeddata', ready);
    self.listen('canplay', ready);
    self.listen('durationchange', function () {
      if (alive() && self.ready) self.emit('time', self.snapshot());
    });
    self.listen('playing', event('playing'));
    self.listen('pause', event('paused'));
    self.listen('waiting', event('buffering'));
    self.listen('seeking', event('seeking'));
    self.listen('seeked', function () {
      if (!alive()) return;
      if (self.requestedSeek) {
        self.finishSeek();
        return;
      }
      self.emit('seeked', self.snapshot());
    });
    self.listen('ended', event('ended'));
    self.listen('timeupdate', function () {
      if (alive()) {
        self.subtitles.render(v.currentTime);
        self.emit('time', self.snapshot());
      }
    });
    self.listen('error', function () {
      if (!alive()) return;
      var e = v.error;
      self.emit('error', {
        type: 'media',
        fatal: true,
        code: e ? e.code : 0,
        message: 'Video motoru oynatmayı sürdüremedi.'
      });
    });
    self.timer = setInterval(function () {
      if (!alive()) return;
      if (!self.ready) ready();
      self.finishSeek();
      self.subtitles.render(v.currentTime);
      self.emit('tick', self.snapshot());
    }, 100);
    try {
      if (source.type === 'mp4') {
        if (!options.mp4Verified) throw new Error('Bu TV’de MP4 yolu henüz doğrulanmadı.');
        v.src = source.url;
        v.load();
        return;
      }
      if (!root.Hls || !root.Hls.isSupported())
        throw new Error('Bu TV’de MSE / HLS motoru kullanılamıyor.');
      var retry = { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 2000 };
      var loadPolicy = {
        default: {
          maxTimeToFirstByteMs: 12000,
          maxLoadTimeMs: 22000,
          timeoutRetry: retry,
          errorRetry: retry
        }
      };
      var h = (self.hls = new root.Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: options.smallBuffer
          ? 10
          : Math.min(25, Number(source.stability && source.stability.maxBufferSeconds) || 15),
        maxMaxBufferLength: options.smallBuffer ? 20 : 30,
        backBufferLength: 10,
        maxBufferSize: 30 * 1024 * 1024,
        // Initialize the legacy TV decoder with the opening GOP before the controller
        // applies the saved position. Starting demux and seeking to it concurrently
        // can leave the native pipeline without a decodable first frame.
        autoStartLoad: false,
        startPosition: 0,
        startLevel: -1,
        capLevelToPlayerSize: false,
        renderTextTracksNatively: false,
        subtitleDisplay: false,
        enableCEA708Captions: false,
        manifestLoadPolicy: loadPolicy,
        playlistLoadPolicy: loadPolicy,
        fragLoadPolicy: loadPolicy,
        keyLoadPolicy: loadPolicy,
        loader: root.NativeHlsLoader.create({
          policy: self.policy,
          referer: source.referer,
          byteLimit: Math.min(
            12 * 1024 * 1024,
            Math.max(8 * 1024 * 1024, Number(source.fragmentByteLimit) || 0)
          ),
          deadline: function () {
            return self.options.deadline ? self.options.deadline() : null;
          },
          onstatus: self.log
        })
      }));
      function on(name, fn) {
        h.on(root.Hls.Events[name], function (eventName, data) {
          if (alive()) fn(data);
        });
      }
      function tracks() {
        self.emit('tracks', self.tracks());
      }
      on('MANIFEST_PARSED', function () {
        source.renditions = h.levels.map(function (l, i) {
          return {
            index: i,
            height: l.height || 0,
            width: l.width || 0,
            bitrate: l.bitrate || 0,
            codec: l.videoCodec || '',
            videoCodec: l.videoCodec || '',
            audioCodec: l.audioCodec || '',
            range: (l.attrs && l.attrs['VIDEO-RANGE']) || 'SDR'
          };
        });
        if (options.compatibility)
          self.failedHeights = self.failedHeights.concat(
            options.compatibility.failedHeights(options.content, source, 'html5', source.renditions)
          );
        var safe = h.levels.filter(function (l) {
          return !C.mediaGate(l);
        });
        if (!safe.length) {
          self.emit('error', {
            type: 'unsupported',
            message:
              'Bu kaynak yalnızca bu TV/motorda doğrulanmamış görüntü veya ses biçimleri sunuyor. Başka kaynak seçin.'
          });
          return;
        }
        for (var i = h.levels.length - 1; i >= 0; i--) {
          var level = h.levels[i],
            reason = C.mediaGate(level);
          if (reason) {
            self.blockedQualities.push({
              index: -1,
              height: level.height,
              bitrate: level.bitrate,
              codec: level.videoCodec,
              reason: reason
            });
            h.removeLevel(i);
          }
        }
        h.subtitleTrack =
          self.selectedSubtitle && self.selectedSubtitle.kind === 'hls'
            ? self.selectedSubtitle.index
            : -1;
        h.subtitleDisplay = false;
        if (!self.setQuality(options.quality || 0, options.qualityCap || 0))
          self.emit('notice', {
            message:
              'Kayıtlı kalite veya üst sınır bu kaynakta yok; mevcut otomatik kalite kullanılıyor.'
          });
        if (!options.quality && options.compatibility) {
          var preferred = options.compatibility.preferred(options.content, source, 'html5');
          if (preferred) {
            var start = h.levels
              .map(function (l) {
                return l.height;
              })
              .indexOf(preferred.height);
            if (start >= 0 && (h.autoLevelCapping < 0 || start <= h.autoLevelCapping))
              h.startLevel = start;
          }
        }
        if (options.quality) {
          var initial = h.levels
            .map(function (l) {
              return l.height;
            })
            .indexOf(options.quality);
          if (initial >= 0) h.startLevel = initial;
        }
        h.startLoad(0);
        tracks();
      });
      on('AUDIO_TRACKS_UPDATED', tracks);
      on('SUBTITLE_TRACKS_UPDATED', function () {
        if (!self.selectedSubtitle) {
          h.subtitleTrack = -1;
          h.subtitleDisplay = false;
        }
        tracks();
      });
      on('AUDIO_TRACK_SWITCHED', function () {
        if (self.audioTransaction && h.audioTrack === self.audioTransaction.next)
          self.audioTransaction.confirmed = true;
        self.emit('audiochanged', self.tracks());
      });
      on('LEVEL_SWITCHED', function () {
        self.emit('qualitychanged', self.snapshot());
        tracks();
      });
      on('CUES_PARSED', function (d) {
        if (d.type === 'subtitles')
          self.subtitles.ingest(
            (d.subtitleTrack && d.subtitleTrack.groupId ? d.subtitleTrack.groupId + ':' : '') +
              d.track,
            d.cues,
            v.currentTime
          );
      });
      on('FRAG_BUFFERED', function (d) {
        if (d.frag && d.frag.type === 'main' && typeof d.frag.sn === 'number') {
          self.openingMediaReady = true;
          ready();
        }
        if (d.stats)
          self.lastStats = {
            bytes: d.stats.total,
            loadMs: d.stats.loading.end - d.stats.loading.start,
            parseMs: (d.stats.parsing && d.stats.parsing.end - d.stats.parsing.start) || 0,
            bufferMs: (d.stats.buffering && d.stats.buffering.end - d.stats.buffering.start) || 0,
            transport: d.stats.transportTimings || null
          };
      });
      on('ERROR', function (d) {
        self.log('hls.js ' + d.type + '/' + d.details + (d.fatal ? ' kalıcı' : ''));
        var limitMessage = String(
            (d.response && d.response.text) || (d.error && d.error.message) || ''
          ),
          oversized = /\[media-size-limit\]/.test(limitMessage),
          failedLevel = d.frag && h.levels[d.frag.level];
        if (
          oversized &&
          d.details === 'fragLoadError' &&
          failedLevel &&
          (!d.frag.type || d.frag.type === 'main')
        ) {
          self.emit('error', {
            type: 'media',
            details: 'fragmentTooLarge',
            failedHeight: failedLevel.height || 0,
            message: 'Bu kalitenin medya parçası izin verilen boyutu aşıyor.',
            fatal: true
          });
          return;
        }
        if (/subtitle/i.test(d.details)) {
          self.emit('subtitleerror', {
            message: 'Altyazı indirilemedi. Menüden yeniden deneyebilirsiniz.'
          });
          return;
        }
        if (/audioTrack/i.test(d.details) && self.audioTransaction) {
          var oldAudio = self.audioTransaction.old;
          self.rollbackAudio();
          self.emit('audiofailed', {
            track: self.tracks().audio.filter(function (t) {
              return t.index === oldAudio;
            })[0],
            message: 'Ses değiştirilemedi; önceki ses geri alındı.'
          });
          return;
        }
        if (/bufferFull/i.test(d.details)) {
          h.config.maxBufferLength = 10;
          h.config.maxMaxBufferLength = 20;
        }
        if (d.fatal)
          self.emit('error', {
            type: d.type === root.Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'media',
            details: d.details,
            code: d.response && d.response.code,
            message: (d.error && d.error.message) || d.details,
            fatal: true
          });
      });
      h.attachMedia(v);
      h.loadSource(source.url);
    } catch (e) {
      self.emit('error', { type: 'unsupported', fatal: true, message: e.message });
    }
  };
  Engine.prototype.snapshot = function () {
    var v = this.video,
      h = this.hls,
      ranges = [],
      seekable = [],
      i;
    try {
      for (i = 0; i < Math.min(v.buffered.length, 12); i++)
        ranges.push({ start: v.buffered.start(i), end: v.buffered.end(i) });
      for (i = 0; i < v.seekable.length; i++)
        seekable.push({ start: v.seekable.start(i), end: v.seekable.end(i) });
    } catch (ignore) {}
    var quality = h && h.levels[h.currentLevel],
      frames = null;
    try {
      if (v.getVideoPlaybackQuality) {
        var q = v.getVideoPlaybackQuality();
        frames = { totalVideoFrames: q.totalVideoFrames, droppedVideoFrames: q.droppedVideoFrames };
      } else if (typeof v.webkitDecodedFrameCount === 'number')
        frames = {
          totalVideoFrames: v.webkitDecodedFrameCount,
          droppedVideoFrames: v.webkitDroppedFrameCount
        };
    } catch (ignore2) {}
    // Some legacy TV engines expose the counters but permanently return zero.
    if (frames && v.currentTime > 1 && frames.totalVideoFrames === 0) frames = null;
    return {
      position: this.rateSwitch ? this.rateSwitch.target : v.currentTime || 0,
      duration: C.finite(v.duration) ? v.duration : 0,
      live: v.duration === Infinity,
      paused: v.paused,
      seeking: v.seeking || !!this.rateSwitch,
      buffered: ranges,
      seekable: seekable,
      rate: v.playbackRate,
      actualQuality: quality ? quality.height || quality.name || 'n/a' : 'n/a',
      videoWidth: v.videoWidth || 0,
      videoHeight: v.videoHeight || 0,
      engineId: 'html5',
      bitrate: quality ? quality.bitrate : 0,
      codecs: quality
        ? [quality.videoCodec, quality.audioCodec].filter(Boolean).join(' / ')
        : 'n/a',
      bandwidth: h && C.finite(h.bandwidthEstimate) ? h.bandwidthEstimate : null,
      frames: frames,
      transport: this.policy ? this.policy.preferred : 'n/a',
      engine: h ? 'hls.js ' + root.Hls.version + ' / MSE' : 'HTML5',
      stats: this.lastStats
    };
  };
  Engine.prototype.tracks = function () {
    var h = this.hls,
      v = this.video,
      seen = {},
      external = ((this.source && this.source.subtitles) || []).map(function (t, i) {
        var x = C.copy(t);
        x.kind = 'external';
        x.key = 'external-' + i;
        x.name = x.name || x.label || x.lang || 'Altyazı';
        return x;
      });
    var subs = h
      ? h.subtitleTracks.map(function (t, i) {
          return {
            kind: 'hls',
            key: (t.groupId ? t.groupId + ':' : '') + (t.default ? 'default' : 'subtitles' + i),
            index: i,
            name: t.name || t.lang || 'Altyazı',
            lang: t.lang || '',
            characteristics: t.characteristics,
            forced: t.forced,
            url: t.url
          };
        })
      : [];
    subs = subs.concat(external).filter(function (t) {
      if (!t.url) return true;
      if (seen[t.url]) return false;
      seen[t.url] = true;
      return true;
    });
    var seenAudio = {};
    return {
      qualities: h
        ? h.levels.map(function (l, i) {
            return {
              index: i,
              height: l.height || 0,
              width: l.width || 0,
              bitrate: l.bitrate || 0,
              codec: l.videoCodec || '',
              name: l.name || ''
            };
          })
        : [],
      audio: h
        ? h.audioTracks
            .map(function (t, i) {
              return {
                index: i,
                lang: t.lang || '',
                name: t.name || 'Dil bilgisi yok',
                characteristics: t.characteristics,
                default: t.default,
                url: t.url,
                codec: t.audioCodec || t.codec || (t.attrs && t.attrs.CODECS) || '',
                channels: t.channels || (t.attrs && t.attrs.CHANNELS) || '',
                blockedReason: C.audioGate(t)
              };
            })
            .filter(function (t) {
              if (!t.url) return true;
              if (seenAudio[t.url]) return false;
              seenAudio[t.url] = true;
              return true;
            })
        : [],
      subtitles: subs,
      blockedQualities: this.blockedQualities || [],
      qualityIndex: h ? h.loadLevel : -1,
      autoQuality: h ? h.autoLevelEnabled : true,
      audioIndex: h ? h.audioTrack : -1,
      subtitleKey: this.selectedSubtitle ? this.selectedSubtitle.key : null,
      live: v.duration === Infinity
    };
  };
  Engine.prototype.play = function () {
    if (this.rateSwitch) {
      this.rateSwitch.wantsPlay = true;
      return true;
    }
    var self = this,
      token = self.generation,
      request = ++self.playGeneration;
    try {
      var p = self.video.play();
      if (p && p.catch)
        p.catch(function (e) {
          if (self.active && token === self.generation && request === self.playGeneration)
            self.emit('error', { type: 'play', message: e.message });
        });
    } catch (e) {
      if (request === self.playGeneration) self.emit('error', { type: 'play', message: e.message });
    }
  };
  Engine.prototype.pause = function () {
    if (this.rateSwitch) this.rateSwitch.wantsPlay = false;
    this.playGeneration++;
    this.video.pause();
  };
  Engine.prototype.seek = function (position) {
    var s = this.snapshot(),
      max = s.duration > 0 ? Math.max(0, s.duration - 0.1) : 0;
    if (s.live && s.seekable.length) {
      var r = s.seekable[s.seekable.length - 1];
      position = C.clamp(position, r.start, r.end - 0.1);
    } else if (max) position = C.clamp(position, 0, max);
    else return false;
    if (this.rateSwitch) {
      this.rateSwitch.target = position;
      this.requestedSeek = { target: position, ratePending: true };
      this.emit('seeking', this.snapshot());
      return true;
    }
    try {
      this.requestedSeek = {
        target: position,
        started: Date.now(),
        last: Date.now(),
        attempts: 0,
        stableSince: 0
      };
      var covered = s.buffered.some(function (r) {
        return position >= r.start - 0.1 && position < r.end;
      });
      // On a newly opened paused legacy decoder, media seeking alone may not
      // make hls.js fetch the saved-position fragment. Prime this first seek
      // explicitly; subsequent DDizi seeks keep their media-event transport.
      if (
        this.hls &&
        (this.initialSeekPending || (!covered && this.source.seekMode !== 'media-event'))
      )
        this.hls.startLoad(position, true);
      this.initialSeekPending = false;
      // MPEG-TS PTS commonly begins ~21 ms after the playlist boundary. The old
      // Tizen backend otherwise lands on the preceding GOP when seeking exactly
      // to a segment's integer boundary. Use a small PTS boundary tolerance.
      this.video.currentTime = Math.min(max || position + 0.05, position > 0 ? position + 0.05 : 0);
      this.subtitles.render(position);
      return true;
    } catch (e) {
      this.requestedSeek = null;
      return false;
    }
  };
  // Legacy paused decoders may stop at the beginning of the actual HLS fragment.
  // Accept only a bounded, declared fragment containing both times, never an
  // unbuffered target or the opening GOP of an unrelated requested position.
  Engine.prototype.pausedFragmentMatch = function (target, snapshot) {
    var h = this.hls,
      v = this.video;
    if (!h || !v.paused || v.seeking) return false;
    var level = h.levels && h.levels[h.currentLevel],
      details = (level && level.details) || h.latestLevelDetails,
      fragments = details && details.fragments;
    if (!Array.isArray(fragments) || !fragments.length) return false;
    var low = 0,
      high = fragments.length - 1,
      found = -1;
    while (low <= high) {
      var middle = Math.floor((low + high) / 2),
        start = fragments[middle] && fragments[middle].start;
      if (!C.finite(start)) return false;
      if (start <= target) {
        found = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    if (found < 0) return false;
    var fragment = fragments[found],
      duration = fragment.duration,
      time = v.currentTime;
    if (
      !C.finite(duration) ||
      duration <= 0 ||
      duration > 10 ||
      target >= fragment.start + duration ||
      time < fragment.start - 0.1 ||
      time > target + 0.1
    )
      return false;
    return snapshot.buffered.some(function (range) {
      return (
        time >= range.start - 0.1 &&
        time < range.end &&
        target >= range.start - 0.1 &&
        target < range.end
      );
    });
  };
  Engine.prototype.finishSeek = function () {
    var pending = this.requestedSeek,
      v = this.video;
    if (!pending || this.rateSwitch) return;
    var snapshot = this.snapshot(),
      covered = snapshot.buffered.some(function (r) {
        return pending.target >= r.start - 0.1 && pending.target < r.end;
      });
    var reached = v.paused
      ? Math.abs(v.currentTime - pending.target) <= 1.2
      : v.currentTime >= pending.target - 0.1 && v.currentTime <= pending.target + 2;
    if (!reached && covered && v.paused)
      reached = this.pausedFragmentMatch(pending.target, snapshot);
    if (!v.seeking && covered && reached) {
      if (!pending.stableSince) pending.stableSince = Date.now();
      if (!v.paused || Date.now() - pending.stableSince >= 800) {
        this.requestedSeek = null;
        if (v.paused && Math.abs(v.currentTime - pending.target) > 0.3)
          this.emit('notice', { message: 'TV bu yayında en yakın erişilebilir karede durakladı.' });
        this.emit('seeked', this.snapshot());
        return;
      }
    } else pending.stableSince = 0;
    if (
      covered &&
      v.paused &&
      !v.seeking &&
      Math.abs(v.currentTime - pending.target) > 1.2 &&
      Date.now() - pending.last >= 500 &&
      pending.attempts < 3
    ) {
      pending.attempts++;
      pending.last = Date.now();
      try {
        v.currentTime = Math.min(v.duration - 0.1, pending.target > 0 ? pending.target + 0.05 : 0);
      } catch (ignore) {}
    }
    if (Date.now() - pending.started > 20000) {
      this.requestedSeek = null;
      if (!covered || Math.abs(v.currentTime - pending.target) > 2) {
        this.emit('error', {
          type: 'network',
          details: 'seekTimeout',
          position: pending.target,
          message: 'İstenen konumun medya verisi zamanında hazırlanamadı.'
        });
        return;
      }
      this.emit('notice', { message: 'TV bu yayında en yakın erişilebilir konuma gitti.' });
      this.emit('seeked', this.snapshot());
    }
  };
  Engine.prototype.setQuality = function (height, cap) {
    if (!this.hls) return false;
    if (!height && this.source.stability && this.source.stability.autoMaxHeight)
      cap = cap
        ? Math.min(cap, this.source.stability.autoMaxHeight)
        : this.source.stability.autoMaxHeight;
    var h = this.hls,
      capIndex = -1,
      chosen = -1;
    h.levels.forEach(function (l, i) {
      if ((!cap || l.height <= cap) && (capIndex < 0 || l.bitrate >= h.levels[capIndex].bitrate))
        capIndex = i;
      if (
        height &&
        l.height === height &&
        (!cap || height <= cap) &&
        (chosen < 0 || l.bitrate > h.levels[chosen].bitrate)
      )
        chosen = i;
    });
    // A cap below every level cannot manufacture a lower rendition.
    // Preserve decoded frames on legacy Tizen. currentLevel flushes immediately
    // and can block its native pipeline; loadLevel switches after buffered data.
    if (cap && capIndex < 0) {
      h.autoLevelCapping = 0;
      h.loadLevel = -1;
      return false;
    }
    var ceiling = this.failedHeights.length ? Math.min.apply(Math, this.failedHeights) : Infinity,
      knownCap = -1;
    h.levels.forEach(function (l, i) {
      if (
        l.height < ceiling &&
        (!cap || l.height <= cap) &&
        (knownCap < 0 || l.height > h.levels[knownCap].height)
      )
        knownCap = i;
    });
    h.autoLevelCapping = this.failedHeights.length ? Math.max(0, knownCap) : cap ? capIndex : -1;
    h.loadLevel = chosen;
    return !height || chosen >= 0;
  };
  Engine.prototype.qualityReloadRequired = function (height, index) {
    var h = this.hls;
    if (!h || !height) return false;
    var current = h.levels[h.currentLevel],
      target =
        index !== undefined
          ? h.levels[index]
          : h.levels.filter(function (q) {
              return q.height === height;
            })[0];
    if (!current || !target) return false;
    function profile(q) {
      var m = /^avc[13]\.([0-9a-f]{2})/i.exec(q.videoCodec || '');
      return m ? m[1].toLowerCase() : String(q.videoCodec || '');
    }
    return profile(current) !== profile(target);
  };
  Engine.prototype.selectLevel = function (index) {
    if (this.hls && this.hls.levels[index]) {
      this.hls.loadLevel = index;
      return true;
    }
    return false;
  };
  Engine.prototype.selectAudio = function (index) {
    if (!this.hls || !this.hls.audioTracks[index] || C.audioGate(this.hls.audioTracks[index]))
      return false;
    if (this.hls.audioTrack === index) return true;
    var self = this;
    clearTimeout(self.audioTimer);
    self.audioTransaction = { old: self.hls.audioTrack, next: index, confirmed: false };
    self.hls.audioTrack = index;
    self.audioTimer = setTimeout(function () {
      if (!self.active || !self.audioTransaction) return;
      if (self.audioTransaction.confirmed) {
        self.audioTransaction = null;
        return;
      }
      var oldAudio = self.audioTransaction.old;
      self.rollbackAudio();
      self.emit('audiofailed', {
        track: self.tracks().audio.filter(function (t) {
          return t.index === oldAudio;
        })[0],
        message: 'Ses değişimi zaman aşımına uğradı; önceki ses geri alındı.'
      });
    }, 10000);
    return true;
  };
  Engine.prototype.rollbackAudio = function () {
    clearTimeout(this.audioTimer);
    if (this.hls && this.audioTransaction) this.hls.audioTrack = this.audioTransaction.old;
    this.audioTransaction = null;
  };
  Engine.prototype.selectSubtitle = function (track) {
    this.selectedSubtitle = track || null;
    if (this.hls) {
      this.hls.subtitleDisplay = false;
      this.hls.subtitleTrack = track && track.kind === 'hls' ? track.index : -1;
    }
    return this.subtitles.select(track, { policy: this.policy, referer: this.source.referer });
  };
  Engine.prototype.setRate = function (rate) {
    try {
      var v = this.video,
        position = this.rateSwitch ? this.rateSwitch.target : v.currentTime || 0,
        self = this,
        token = this.generation,
        wasPaused = v.paused;
      if (Math.abs(v.playbackRate - rate) < 0.01) return true;
      if (v.pause) v.pause();
      v.playbackRate = rate;
      ['preservesPitch', 'webkitPreservesPitch', 'mozPreservesPitch'].forEach(function (p) {
        if (p in v) v[p] = true;
      });
      if (Math.abs(v.playbackRate - rate) >= 0.01) {
        if (!wasPaused) this.play();
        return false;
      }
      clearTimeout(this.rateTimer);
      this.rateSwitch = { target: position, wantsPlay: !wasPaused };
      this.requestedSeek = { target: position, ratePending: true };
      this.emit('seeking', this.snapshot());
      this.rateTimer = setTimeout(function () {
        self.rateTimer = null;
        if (!self.active || self.generation !== token || !self.rateSwitch) return;
        var target = self.rateSwitch.target,
          wantsPlay = self.rateSwitch.wantsPlay;
        self.rateSwitch = null;
        self.requestedSeek = null;
        if (!self.seek(target))
          self.emit('error', {
            type: 'media',
            details: 'seekTimeout',
            position: target,
            message: 'Hız değişiminden sonra konum korunamadı.'
          });
        else if (wantsPlay) self.play();
      }, 500);
      return true;
    } catch (error) {
      return false;
    }
  };
  Engine.prototype.setAspect = function (aspect) {
    this.video.style.objectFit = aspect === 'zoom' ? 'cover' : 'contain';
  };
  Engine.prototype.recoverMedia = function () {
    if (this.hls) {
      this.hls.recoverMediaError();
      return true;
    }
    return false;
  };
  root.PlayerEngine = Engine;
})(window);
