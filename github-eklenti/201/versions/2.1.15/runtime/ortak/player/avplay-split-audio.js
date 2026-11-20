/* Opt-in, signed separate VOD audio on Tizen 7. */
(function (root) {
  'use strict';
  var Audio = root.AudioContext || root.webkitAudioContext;
  var fragmentLimit = 2 * 1024 * 1024;
  var driftLimit = 0.25;

  function supportedOnDevice(source) {
    return !!(source && source.packageKey &&
      source.type === 'hls' && Audio &&
      root.PackageMediaLoader &&
      /\bTizen 7\.0(?:[; )]|$)/i.test(root.navigator && root.navigator.userAgent || ''));
  }
  function supported(source) {
    return supportedOnDevice(source) && !source.loaderId && source.avplaySplitAudio === true &&
      !!(root.crypto && root.crypto.subtle);
  }
  function supportedInBrowser(source) {
    return supportedOnDevice(source) && source.browserSplitAudio === true;
  }

  function attributes(line) {
    var result = Object.create(null), pattern = /(?:[:,])([A-Z0-9-]+)=(?:"([^"]*)"|([^,]+))/g, match;
    while ((match = pattern.exec(line))) result[match[1]] = match[2] === undefined ? match[3] : match[2];
    return result;
  }

  function master(text, absolute, height) {
    var lines = text.split(/\r?\n/), video = null, audio = [];
    if (lines[0] !== '#EXTM3U') throw Error('Invalid HLS master');
    lines.forEach(function (line, i) {
      if (/^#EXT-X-STREAM-INF:/.test(line)) {
        var next = lines[i + 1], info = attributes(line);
        if (height && (info.RESOLUTION || '').split('x')[1] !== String(height)) return;
        if (height && video) return;
        if (video || !info.AUDIO || !next || !/^[^#\s]/.test(next)) throw Error('Unsupported HLS video variants');
        video = {url:absolute(next.trim()), group:info.AUDIO};
      } else if (/^#EXT-X-MEDIA:/.test(line)) {
        var media = attributes(line);
        if (media.TYPE === 'AUDIO') audio.push(media);
      }
    });
    if (!video) throw Error('HLS video variant missing');
    audio = audio.filter(function (track) { return track['GROUP-ID'] === video.group; });
    if (audio.length < 1 || audio.length > 2) throw Error('Unsupported HLS audio group');
    var primary = 0;
    var tracks = audio.map(function (track, index) {
      if (!track.URI) throw Error('HLS audio playlist missing');
      if (track.DEFAULT === 'YES') primary = index;
      return {index:index, type:'AUDIO', kind:'split-hls', key:'split-audio-' + index,
        name:root.PlayerCore.safeMessage(track.NAME || track.LANGUAGE || 'Ses ' + (index + 1)),
        lang:track.LANGUAGE || '', codec:'mp4a.40.2', url:absolute(track.URI)};
    });
    return {video:video.url, tracks:tracks, primary:primary};
  }

  function timeline(text, absolute, allowClear) {
    var lines = text.split(/\r?\n/), parts = [], position = 0, span = 0, key = null, sequence = 0;
    if (lines[0] !== '#EXTM3U' || lines.indexOf('#EXT-X-ENDLIST') < 0 ||
        /^#EXT-X-(?:MAP|BYTERANGE|DISCONTINUITY|GAP)\b/m.test(text)) throw Error('Unsupported HLS audio timeline');
    lines.forEach(function (line) {
      if (/^#EXT-X-MEDIA-SEQUENCE:/.test(line)) {
        if (parts.length || !/^#EXT-X-MEDIA-SEQUENCE:\d+$/.test(line)) throw Error('Invalid HLS media sequence');
        sequence = Number(line.slice(22));
        if (sequence > 9007199254736895) throw Error('Invalid HLS media sequence');
      } else if (/^#EXT-X-KEY:/.test(line)) {
        var info = attributes(line);
        if (allowClear && info.METHOD === 'NONE' && !info.URI && !info.KEYFORMAT) { key = null; return; }
        if (info.METHOD !== 'AES-128' || !info.URI || info.KEYFORMAT || (info.IV && !/^0x[0-9a-f]{32}$/i.test(info.IV))) {
          throw Error('Unsupported HLS audio encryption');
        }
        key = {url:absolute(info.URI), iv:info.IV};
      } else if (/^#EXTINF:/.test(line)) {
        if (span) throw Error('Missing HLS audio segment');
        span = Number(line.slice(8).split(',')[0]);
        if (!(span > 0 && span <= 8)) throw Error('Unsupported HLS audio segment length');
      } else if (line && line.charAt(0) !== '#') {
        if ((!key && !allowClear) || !span || parts.length >= 4096) throw Error('Invalid HLS audio segment');
        parts.push({url:absolute(line.trim()), key:key, sequence:sequence++, start:position, end:position+span});
        position += span;
        span = 0;
      }
    });
    if (!parts.length || span) throw Error('Incomplete HLS audio timeline');
    return {parts:parts, duration:position};
  }

  function ivFor(part) {
    var iv = new Uint8Array(16), sequence = part.sequence, i;
    if (part.key.iv) {
      for (i = 0; i < 16; i++) iv[i] = parseInt(part.key.iv.slice(2+i*2,4+i*2),16);
    } else {
      for (i = 15; i >= 0 && sequence; i--) { iv[i] = sequence % 256; sequence = Math.floor(sequence / 256); }
    }
    return iv;
  }

  function Session(source, av, deadline, notify, allowClear, sharedTransport) {
    var context = new Audio(), transport = null, encodedKey = null, keyUrl = null, requests = [];
    var closed = false, wantsPlay = false, buffering = false, seeking = false, loadingTrack = false;
    var state = 'idle', generation = 0, desiredIndex = -1, audioIndex = -1, pending = -1, timer;
    var catalog, audio, pcm = {}, nodes = [], anchor, next, avDuration = 0, driving = false, drift = 0, decoded = 0;

    function current(token) {
      if (closed || token !== generation) throw Error('Split audio cancelled');
    }
    function absolute(uri, base) {
      var url = new root.URL(uri, base);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error('Invalid HLS media address');
      root.PackageNetwork.assert(source.packageKey, url.href);
      return url.href;
    }
    function load(url, kind, initial) {
      var limit = kind === 'playlist' ? 2097152 : kind === 'key' ? 65536 : fragmentLimit;
      var limitAt = Math.min(Date.now()+10000, initial ? deadline : Infinity);
      var task = transport.request(url, {kind:kind, binary:kind!=='playlist', byteLimit:limit,
        timeoutMs:10000, deadline:limitAt, referer:source.referer, userAgent:source.userAgent, transport:source.transport});
      if (!sharedTransport) return task.promise;
      requests.push(task);
      function remove() {
        var index = requests.indexOf(task);
        if (index >= 0) requests.splice(index, 1);
      }
      return task.promise.then(function (response) {
        remove();
        return response;
      }, function (error) {
        remove();
        throw error;
      });
    }
    function partAt(time) {
      var low = 0, high = audio.parts.length;
      while (low < high) {
        var mid = Math.floor((low + high) / 2);
        if (audio.parts[mid].end <= time) low = mid + 1; else high = mid;
      }
      return low;
    }
    function cancelRequests() {
      generation++;
      pending = -1;
      if (sharedTransport) {
        requests.splice(0).forEach(function (task) {
          try { task.cancel(); } catch (ignore) {}
        });
      } else if (transport) transport.destroy();
      transport = closed ? null : sharedTransport || root.PackageMediaLoader.open(source);
    }
    function read(index, initial, token) {
      var part = audio.parts[index];
      if (!part) return Promise.reject(Error('Audio segment missing'));
      return load(part.url, 'fragment', initial).then(function (r) {
        current(token);
        if (!part.key) return r.data;
        var crypto = root.crypto && root.crypto.subtle;
        if (!crypto) throw Error('HLS audio encryption is unavailable');
        var key = part.key.url === keyUrl ? Promise.resolve(encodedKey) : load(part.key.url, 'key', initial).then(function (response) {
          current(token);
          if (response.data.byteLength !== 16) throw Error('Invalid HLS audio key');
          return crypto.importKey('raw', response.data, {name:'AES-CBC'}, false, ['decrypt']);
        });
        return key.then(function (value) {
          current(token);
          encodedKey = value;
          keyUrl = part.key.url;
          return crypto.decrypt({name:'AES-CBC', iv:ivFor(part)}, value, r.data);
        });
      }).then(function (bytes) {
        current(token);
        return new Promise(function (resolve, reject) { context.decodeAudioData(bytes,resolve,reject); });
      }).then(function (buffer) {
        current(token);
        if (!(buffer.numberOfChannels > 0 && buffer.numberOfChannels <= 2 &&
              buffer.sampleRate <= 48000 && Math.abs(buffer.duration - (part.end-part.start)) <= 0.15)) {
          throw Error('Unsupported HLS audio track');
        }
        decoded++;
        return buffer;
      });
    }
    function loadTrack(index, time, initial) {
      var token = generation, url = catalog.tracks[index].url;
      return load(url, 'playlist', initial).then(function (r) {
        current(token);
        audio = timeline(r.data, function (part) { return absolute(part,r.url || url); }, allowClear);
        if (avDuration && Math.abs(audio.duration-avDuration)>5) throw Error('HLS picture and audio durations differ');
        var indexAtTime = partAt(time);
        return read(indexAtTime, initial, token).then(function (buffer) {
          current(token);
          pcm[indexAtTime] = buffer;
        });
      });
    }
    function resetClock() {
      nodes.splice(0).forEach(function (entry) {
        try { entry.node.stop(); } catch (ignore) {}
        entry.node.disconnect();
      });
      anchor = null;
    }
    function publish(event) {
      if (state !== event) { state = event; notify(event); }
    }
    function fail(error) {
      if (closed || state === 'error') return;
      wantsPlay = false;
      resetClock();
      try { if (av.getState() === 'PLAYING') av.pause(); } catch (ignore) {}
      state = 'error';
      notify('error', error);
    }
    function fetch(index) {
      if (pending >= 0 || pcm[index] || !audio.parts[index]) return;
      var token = generation;
      pending = index;
      read(index,false,token).then(function (buffer) {
        if (closed || token !== generation) return;
        pending = -1;
        pcm[index] = buffer;
      }, function (error) {
        if (closed || token !== generation) return;
        pending = -1;
        fail(error);
      });
    }
    function tick() {
      if (closed || !wantsPlay || (!allowClear && buffering) || seeking || context.state !== 'running') return;
      var avState = av.getState();
      if (avState !== 'PLAYING' && avState !== 'PAUSED' && avState !== 'READY') return;
      var position = avState === 'READY' ? 0 : av.getCurrentTime()/1000;
      if (loadingTrack) return;
      var index = partAt(position);
      if (!audio.parts[index]) return;
      Object.keys(pcm).forEach(function (key) { if (+key < index || +key > index + 1) delete pcm[key]; });
      if (!pcm[index]) {
        fetch(index);
        if (avState === 'PLAYING') av.pause();
        resetClock();
        publish('buffering');
        return;
      }
      fetch(index + 1);
      if (avState !== 'PLAYING') {
        av.play();
        if (allowClear) return;
      }
      var now = context.currentTime;
      drift = anchor ? Math.abs(position - (anchor.position + now - anchor.time)) : 0;
      if (anchor && drift > driftLimit) resetClock();
      if (!anchor) {
        anchor = {position:position, time:now+0.035};
        next = position;
      }
      nodes = nodes.filter(function (entry) {
        if (entry.end > now) return true;
        entry.node.disconnect();
        return false;
      });
      while (next < position+2.25 && nodes.length < 3) {
        var i = partAt(next), part = audio.parts[i], buffer = pcm[i];
        if (!part || !buffer) break;
        var offset = next - part.start;
        var span = Math.min(part.end-next, buffer.duration-offset);
        var when = anchor.time + next - anchor.position;
        next = part.end;
        if (span <= 0 || when + span <= now) continue;
        if (when < now) { offset += now-when; span -= now-when; when = now; }
        var node = context.createBufferSource();
        node.buffer = buffer;
        node.connect(context.destination);
        node.start(when,offset,span);
        nodes.push({node:node,end:when+span});
      }
      if (!allowClear || nodes.length) publish('playing');
    }
    function drive() {
      if (driving) return;
      driving = true;
      try { tick(); } catch (error) { fail(error); } finally { driving = false; }
    }
    function resetRequests() {
      resetClock();
      cancelRequests();
      pcm = {};
    }
    function switchTrack(index, position) {
      loadingTrack = true;
      if (wantsPlay) publish('buffering');
      var token = generation;
      loadTrack(index,position,false).then(function () {
        if (closed || token !== generation) return;
        loadingTrack = false;
        audioIndex = index;
        notify('audiochanged', index);
        drive();
      }, function (error) {
        if (closed || token !== generation) return;
        loadingTrack = false;
        fail(error);
      });
    }

    this.prepare = function () {
      cancelRequests();
      var token = generation;
      return load(source.url,'playlist',true).then(function (r) {
        current(token);
        catalog = master(r.data,function (uri) { return absolute(uri,r.url || source.url); },
          allowClear ? source.browserSplitAudioHeight : 0);
        desiredIndex = catalog.primary;
        return loadTrack(desiredIndex,0,true);
      }).then(function () {
        current(token);
        audioIndex = desiredIndex;
        return catalog.video;
      });
    };
    this.ready = function (duration) {
      if (!(duration > 0) || Math.abs(audio.duration-duration)>5) throw Error('HLS picture and audio durations differ');
      avDuration = duration;
    };
    this.play = function () {
      wantsPlay = true;
      if (!timer) timer = setInterval(drive,75);
      if (context.state === 'running') drive();
      else context.resume().then(drive,fail);
    };
    this.pause = function () {
      wantsPlay = false;
      state = 'idle';
      resetClock();
    };
    this.buffering = function (value) {
      buffering = value;
      if (value) { resetClock(); if (wantsPlay) publish('buffering'); }
      else drive();
    };
    this.seek = function (time) {
      seeking = true;
      if (allowClear) state = 'idle';
      resetRequests();
      // The HTML5 decoder lands on the preceding keyframe after a paused seek.
      // Keep an already playing video running while its audio clock is reset.
      if (!allowClear && av.getState() === 'PLAYING') av.pause();
      if (loadingTrack) switchTrack(desiredIndex,time);
      else fetch(partAt(time));
    };
    this.seeked = function () {
      seeking = false;
      drive();
    };
    this.tracks = function () {
      return catalog ? catalog.tracks.map(function (track) {
        var copy = root.PlayerCore.copy(track);
        delete copy.url;
        return copy;
      }) : [];
    };
    this.index = function () { return audioIndex; };
    this.status = function () {
      return {activeNodes:nodes.length, driftMs:anchor ? Math.round(drift*1000) : null, decoded:decoded};
    };
    this.select = function (index, position) {
      if (!catalog || !catalog.tracks[index]) return false;
      if (desiredIndex === index) return true;
      desiredIndex = index;
      resetRequests();
      if (av.getState() === 'PLAYING') av.pause();
      switchTrack(index,position);
      return true;
    };
    this.close = function () {
      if (closed) return;
      closed = true;
      wantsPlay = false;
      clearInterval(timer);
      resetRequests();
      encodedKey = keyUrl = catalog = audio = null;
      context.close().catch(function () {});
    };
  }

  root.AvPlaySplitAudio = {supported:supported, supportedInBrowser:supportedInBrowser, Session:Session};
})(window);
