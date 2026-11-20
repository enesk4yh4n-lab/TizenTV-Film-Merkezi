/* Feed video to MSE and schedule the remuxed AAC on Web Audio for opted-in streams. */
(function (root) {
  'use strict';
  var Audio = root.AudioContext || root.webkitAudioContext;
  var pcmLimit = 16 * 1024 * 1024;
  var compressedLimit = 2 * 1024 * 1024;

  function supported(source) {
    return !!(Audio && source && source.type === 'hls' && source.packageKey &&
      !source.loaderId && source.hlsWebAudio === true &&
      /\bTizen 7\.0(?:[; )]|$)/i.test(root.navigator && root.navigator.userAgent || ''));
  }

  function Session(hls, events, video, onError) {
    var context = new Audio(), original = hls.trigger, queue = [], nodes = [], backlog = [];
    var initialization, timer, anchor, next, noAudioFrom = null;
    var closed = false, failed = false, decoding = false, waiting = true, wantsPlay = false;
    var pcmBytes = 0, compressedBytes = 0, decoded = 0, drift = null;

    function clearClock() {
      nodes.splice(0).forEach(function (entry) {
        try { entry.node.stop(); } catch (ignore) {}
        entry.node.disconnect();
      });
      anchor = null;
      drift = null;
    }
    function fail(error) {
      if (closed || failed) return;
      failed = true;
      clearClock();
      onError(error);
    }
    function prune(time) {
      queue = queue.filter(function (entry) {
        if (entry.end >= time - 12 && entry.start <= time + 25) return true;
        pcmBytes -= entry.bytes;
        return false;
      });
    }
    function intersects(part, time) {
      return part.end >= time - 12 && part.start <= time + 25;
    }
    function decode() {
      if (closed || failed || decoding || !backlog.length) return;
      var part = backlog.shift(), payload = part.payload;
      if (!intersects(part,video.currentTime)) {
        compressedBytes -= payload.byteLength;
        decode();
        return;
      }
      decoding = true;
      var bytes = payload.byteLength;
      part.payload = null;
      function done(error, buffer) {
        compressedBytes -= bytes;
        decoding = false;
        if (closed || failed) return;
        if (intersects(part,video.currentTime)) {
          if (error) { fail(Error('AAC ses parçası çözülemedi.')); return; }
          if (!buffer || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2 ||
            buffer.sampleRate > 48000 || Math.abs(buffer.duration - (part.end - part.start)) > 0.15) {
            fail(Error('AAC ses parçası zaman çizelgesiyle uyumlu değil.'));
            return;
          }
          var end = Math.min(part.end, part.start + buffer.duration);
          var size = buffer.length * buffer.numberOfChannels * 4;
          prune(video.currentTime);
          queue = queue.filter(function (entry) {
            if (Math.abs(entry.start - part.start) > 0.001) return true;
            pcmBytes -= entry.bytes;
            return false;
          });
          if (pcmBytes + size > pcmLimit) { fail(Error('AAC ses tamponu sınırı aşıldı.')); return; }
          pcmBytes += size;
          queue.push({start:part.start,end:end,buffer:buffer,bytes:size});
          queue.sort(function (a,b) { return a.start-b.start; });
          decoded++;
        }
        decode();
      }
      try {
        context.decodeAudioData(payload,function (buffer) { done(null, buffer); },done);
      } catch (error) { done(error); }
    }
    function enqueue(event) {
      var data = event.data;
      if (!data || data.byteLength < 8 || closed || failed) return;
      var bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
      var box = String.fromCharCode(bytes[4],bytes[5],bytes[6],bytes[7]);
      if (box === 'ftyp' || box === 'moov') {
        if (bytes.byteLength <= 32768) initialization = new Uint8Array(bytes);
        else fail(Error('AAC başlangıç verisi çok büyük.'));
        return;
      }
      var track = event.frag && event.frag.elementaryStreams && event.frag.elementaryStreams.audio;
      if (!initialization || !track || box !== 'moof' ||
          !isFinite(track.startPTS) || !isFinite(track.endPTS) ||
          track.endPTS <= track.startPTS || track.endPTS - track.startPTS > 12) {
        fail(Error('AAC parçasının zaman bilgisi okunamadı.'));
        return;
      }
      var start = track.startPTS, end = track.endPTS;
      if (!intersects({start:start,end:end},video.currentTime)) return;
      var size = initialization.byteLength + bytes.byteLength;
      if (compressedBytes + size > compressedLimit || backlog.length >= 12) {
        fail(Error('Bekleyen AAC parçaları sınırı aştı.'));
        return;
      }
      var payload = new Uint8Array(size);
      payload.set(initialization);
      payload.set(bytes,initialization.byteLength);
      compressedBytes += size;
      backlog.push({start:start,end:end,payload:payload.buffer});
      decode();
    }
    function tick() {
      if (closed || failed || !wantsPlay || waiting || video.paused || video.seeking || context.state !== 'running') return;
      var time = video.currentTime, clock = context.currentTime;
      prune(time);
      nodes = nodes.filter(function (entry) {
        if (entry.end > clock) return true;
        entry.node.disconnect();
        return false;
      });
      drift = anchor ? Math.abs(time - (anchor.position + clock - anchor.time)) : 0;
      if (drift > 0.25) {
        clearClock();
        drift = 0;
      }
      if (!anchor) {
        anchor = {position:time,time:clock+0.035};
        next = time;
      }
      if (!nodes.length && next < time) next = time;
      while (next < time+2 && nodes.length < 3) {
        var entry = null;
        for (var i=0; i<queue.length; i++) {
          if (queue[i].start <= next+0.06 && queue[i].end > next) { entry=queue[i]; break; }
        }
        if (!entry) break;
        var begin = Math.max(next,entry.start), when = anchor.time+begin-anchor.position;
        next = entry.end;
        if (when < clock) begin += clock-when;
        var offset = begin-entry.start, span = Math.min(entry.end-begin,entry.buffer.duration-offset);
        if (span <= 0) continue;
        var node = context.createBufferSource();
        node.buffer = entry.buffer;
        node.connect(context.destination);
        node.start(Math.max(when,clock),offset,span);
        nodes.push({node:node,end:Math.max(when,clock)+span});
      }
      if (nodes.length) noAudioFrom = null;
      else if (noAudioFrom === null) noAudioFrom = time;
      else if (time - noAudioFrom > 8) fail(Error('AAC sesi oynatma zamanına yetişemedi.'));
    }

    hls.trigger = function (name, data) {
      if (name === events.BUFFER_CODECS && data.audio) {
        var videoTracks = {};
        Object.keys(data).forEach(function (key) { if (key !== 'audio') videoTracks[key]=data[key]; });
        return original.call(this,name,videoTracks);
      }
      if (name === events.BUFFER_APPENDING && data.type === 'audio') {
        enqueue(data);
        return true;
      }
      if (name === events.FRAG_PARSED && data.frag.elementaryStreams.video) {
        delete data.frag.elementaryStreams.audio;
        if (data.part && data.part.elementaryStreams) delete data.part.elementaryStreams.audio;
      }
      return original.apply(this,arguments);
    };

    this.play = function () {
      wantsPlay = true;
      if (!timer) timer = setInterval(function () {
        try { tick(); } catch (error) { fail(error); }
      },75);
      if (context.state !== 'running') context.resume().catch(fail);
    };
    this.pause = function () { wantsPlay = false; noAudioFrom = null; clearClock(); };
    this.wait = function () { waiting = true; noAudioFrom = null; clearClock(); };
    this.playing = function () { waiting = false; };
    this.seek = function () { noAudioFrom = null; clearClock(); };
    this.status = function () {
      return {audioActiveNodes:nodes.length, audioDriftMs:nodes.length ? Math.round(drift*1000) : null,
        audioDecoded:decoded, audioBufferBytes:pcmBytes};
    };
    this.close = function () {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      hls.trigger = original;
      clearClock();
      backlog = queue = [];
      initialization = null;
      context.close().catch(function () {});
    };
  }

  root.HlsWebAudio = {supported:supported, Session:Session};
})(window);
