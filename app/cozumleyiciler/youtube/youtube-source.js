/* Lazy shared YouTube resolver. No account, remote resolver or executable is needed. */
(function (root) {
  'use strict';
  var base = 'cozumleyiciler/youtube/',
    loading = null;
  function error(stage, message) {
    var e = Error('YouTube · ' + message);
    e.stage = stage;
    return e;
  }
  function videoId(value) {
    var text = String(value || '');
    if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
    try {
      var u = new root.URL(text);
      if (u.protocol !== 'https:' || u.username || u.password) return '';
      var id = '';
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
      else if (/^(?:www\.)?youtube(?:-nocookie)?\.com$/.test(u.hostname)) {
        var parts = u.pathname.split('/');
        id = /^(embed|shorts|live)$/.test(parts[1])
          ? parts[2]
          : u.pathname === '/watch'
            ? u.searchParams.get('v')
            : '';
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    } catch (ignore) {
      return '';
    }
  }
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var files = [
          'youtube-polyfills.js',
          'youtube-extractor.js',
          'youtube-network.js',
          'youtube-hls.js',
        ],
        index = 0;
      function next() {
        if (index === files.length) {
          resolve();
          return;
        }
        var script = document.createElement('script');
        script.src = base + files[index++];
        script.onload = next;
        script.onerror = function () {
          loading = null;
          reject(error('runtime', 'Paket içindeki çözümleyici yüklenemedi'));
        };
        document.head.appendChild(script);
      }
      next();
    });
    return loading;
  }
  function createTask(value, deadline, log, hints) {
    var id = videoId(value),
      finished = false,
      aborted = false,
      timer = null,
      rejectTask,
      network = null;
    function check() {
      if (aborted) {
        var e = error('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (Date.now() >= deadline) throw error('timeout', 'Ortak hazırlama süresi doldu');
    }
    function fetchOwned(input, init) {
      check();
      var queue = hints && hints.requestQueue;
      if (!queue) return network.fetch(input, init);
      return queue.run(
        check,
        function () {
          return network.fetch(input, init);
        },
        function () {
          network.cancel();
        },
        deadline
      );
    }
    function finish(e, result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (network && network.dispose) network.dispose();
      if (e) rejectTask(e);
      else done(result);
    }
    var done,
      promise = new Promise(function (resolve, reject) {
        done = resolve;
        rejectTask = reject;
        timer = setTimeout(
          function () {
            if (network) network.cancel();
            finish(error('timeout', 'Ortak hazırlama süresi doldu'));
          },
          Math.max(1, deadline - Date.now())
        );
        if (!id) {
          finish(error('page', 'Geçersiz video bağlantısı'));
          return;
        }
        load()
          .then(function () {
            check();
            network = root.YoutubeNetwork.createClient
              ? root.YoutubeNetwork.createClient()
              : root.YoutubeNetwork;
            return root.YoutubeExtractorLab.Innertube.create({
              lang: 'tr',
              location: 'TR',
              timezone: 'Europe/Istanbul',
              retrieve_player: false,
              generate_session_locally: false,
              fail_fast: true,
              retrieve_innertube_config: false,
              enable_session_cache: false,
              fetch: fetchOwned,
            });
          })
          .then(function (yt) {
            check();
            return yt.session.actions.execute('/player', {
              videoId: id,
              client: 'VISIONOS',
              racyCheckOk: true,
              contentCheckOk: true,
              parse: false,
            });
          })
          .then(function (response) {
            check();
            var data = response.data,
              status = data.playabilityStatus || {};
            if (status.status !== 'OK')
              throw error(
                status.status === 'LOGIN_REQUIRED' ? 'auth' : 'unavailable',
                status.reason || 'Video bu istemcide kullanılamıyor'
              );
            return root.YoutubeHls.source(id, data, fetchOwned);
          })
          .then(function (source) {
            check();
            if (log) log('YouTube: güncel misafir oturumu / H.264-AAC HLS hazır');
            finish(null, source);
          })
          .catch(function (e) {
            finish(e);
          });
      });
    return {
      promise: promise,
      cancel: function () {
        if (finished) return;
        aborted = true;
        if (network) network.cancel();
        var e = error('cancel', 'İptal edildi');
        e.cancelled = true;
        finish(e);
      },
    };
  }
  root.YoutubeSource = { videoId: videoId, createTask: createTask };
})(window);
