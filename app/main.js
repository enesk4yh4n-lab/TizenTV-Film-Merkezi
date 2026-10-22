(function (root) {
 'use strict';
 var d = new root.PlayerDiagnostics(), c, probe = null, probeGeneration = 0, av = root.webapis && root.webapis.avplay, avTimer = null, suspendedContent = null;
 function log(message) { d.log(message); }
 var storage = null; try { storage = root.localStorage; } catch (ignore) {}
 var store = new root.PlaybackStore(storage, function (message) { if (c) c.notice(message); else log(message); });
 var subtitles = new root.SubtitleManager(document.getElementById('subtitle-layer'), function (message) { if (c) c.notice(message); });
 var engine = new root.PlayerEngine(document.getElementById('browser-video'), subtitles, log), resolver = new root.SourceResolver(log);
 c = new root.PlayerController({ engine: engine, resolver: resolver, store: store, log: log });
 var view = new root.PlayerView(c, d), input = new root.PlayerInput(c, view, document), lifecycle = new root.PlayerLifecycle(c, input);
 var sampleUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
 var contents = {
  mayday: { contentId: 'hdf:mayday-hdf-2026', pageUrl: 'https://www.hdfilmcehennemi.nl/mayday-hdf-2026/', title: 'Mayday', type: 'movie', sources: [] },
  spider: { contentId: 'hdf:spider-man-brand-new-day-1', pageUrl: 'https://www.hdfilmcehennemi.nl/spider-man-brand-new-day-1/', title: 'Spider-Man', type: 'movie', sources: [] },
  sample: { contentId: 'sample:mux-x36xhzz', title: 'Açık HLS · Kontrol akışı', type: 'movie', sources: [{ id: 'mux', label: 'Mux · açık HLS', url: sampleUrl, type: 'hls', transport: 'xhr', status: 'ready', subtitles: [] }] }
 };
 function status(message) { document.getElementById('current-session').textContent = message; }
 function stopProbe() { probeGeneration++; if (probe) probe.cancel(); probe = null; clearTimeout(avTimer); avTimer = null; if (av) { try { av.stop(); } catch (ignore) {} try { av.close(); } catch (ignore2) {} } document.getElementById('av-player').style.display = 'none'; document.documentElement.className = ''; }
 function open(content) { stopProbe(); suspendedContent = null; document.getElementById('sources').textContent = ''; c.open(content); }
 c.on('close', function (result) { if (result.content) status(result.content.title + (result.reason === 'hidden' ? ' · uygulama gizlendi' : ' · konum kaydedildi')); });
 c.on('suspended', function (content) { suspendedContent = content; status(content.title + ' · oynatma durduruldu'); var button = document.createElement('button'); button.setAttribute('data-action', 'resume-hidden'); button.textContent = 'Son izleneni aç · ' + content.title; document.getElementById('sources').textContent = ''; document.getElementById('sources').appendChild(button); button.focus(); view.toast('Devam etmek için son izleneni açın.'); });
 function networkProbe() {
  c.stop('probe'); stopProbe(); var token = probeGeneration, results = [], cases = [{ name: 'HTTPS / XHR', url: sampleUrl, only: 'xhr' }, { name: 'HTTPS / Native', url: sampleUrl, only: 'native' }, { name: 'HTTP / XHR', url: sampleUrl.replace('https:', 'http:'), only: 'xhr' }, { name: 'HTTP / Native', url: sampleUrl.replace('https:', 'http:'), only: 'native' }];
  function next(i) { if (token !== probeGeneration) return; if (i >= cases.length) { probe = null; status('Ağ denetimi tamamlandı'); return; } var test = cases[i]; status(test.name + ' deneniyor · Durdur ile iptal'); probe = root.MediaNetwork.request(test.url, { only: test.only, kind: 'playlist', timeoutMs: 10000 });
   probe.promise.then(function () { if (token === probeGeneration) results.push(test.name + ': playlist alındı'); }).catch(function (e) { if (token === probeGeneration) results.push(test.name + ': ' + root.PlayerCore.safeMessage(e.message)); }).then(function () { if (token !== probeGeneration) return; document.getElementById('log').textContent = results.join('\n'); next(i + 1); });
  } next(0);
 }
 function avplayProbe() {
  c.stop('probe'); stopProbe(); if (!av) { status('AVPlay yalnızca Samsung TV / emülatörde kullanılabilir.'); return; } var token = probeGeneration;
  status('AVPlay karşılaştırma testi · Geri veya Durdur ile kapat');
  try {
   av.open(sampleUrl); av.setDisplayRect(0, 0, 1920, 1080); av.setListener({ onerror: function (e) { if (token === probeGeneration) { status('AVPlay: ' + e); stopProbe(); } }, onstreamcompleted: stopProbe });
   avTimer = setTimeout(function () { if (token === probeGeneration) { stopProbe(); status('AVPlay testi zaman aşımı. Ana oynatıcı hls.js / MSE kullanır.'); } }, 25000);
   av.prepareAsync(function () { if (token !== probeGeneration) return; clearTimeout(avTimer); document.getElementById('av-player').style.display = 'block'; document.documentElement.className = 'av-probe'; av.play(); }, function (e) { if (token === probeGeneration) { stopProbe(); status('AVPlay hazırlanamadı: ' + (e.name || e)); } });
  } catch (e) { stopProbe(); status('AVPlay: ' + e.message); }
 }
 function seriesFixture() {
  var list = [1, 2, 3].map(function (number) { return { contentId: 'fixture:series:1:' + number, title: 'Kontrollü dizi örneği · Bölüm ' + number, type: 'episode', episode: { seriesId: 'fixture:series', season: number < 3 ? 1 : 2, number: number < 3 ? number : 1 }, sources: root.PlayerCore.copy(contents.sample.sources), chapters: [{ start: 0, end: 10, title: 'Örnek giriş (0–10 sn)', kind: 'intro' }, { start: 30, title: 'Örnek sahne' }] }; });
  var first = root.PlayerCore.copy(list[0]); first.episodes = list; open(first); view.toast('Örnek bölüm sırası ve giriş zamanları kullanılıyor. Gerçek katalog verisi değildir.');
 }
 document.getElementById('shell').addEventListener('click', function (event) {
  var node = event.target; while (node && node !== document.body && !node.getAttribute('data-action')) node = node.parentNode; if (!node) return;
  var action = node.getAttribute('data-action'); if (contents[action]) open(contents[action]); else if (action === 'resume-hidden' && suspendedContent) open(suspendedContent); else if (action === 'network') networkProbe(); else if (action === 'avplay') avplayProbe(); else if (action === 'series') seriesFixture(); else if (action === 'stop') { input.cancel(); c.stop('stop'); stopProbe(); status('Durduruldu.'); }
 });
 document.addEventListener('visibilitychange', function () { if (document.hidden) stopProbe(); });
 root.addEventListener('error', function (e) { log('JS hata: ' + e.message + '; satır ' + e.lineno); status('Uygulama hatası kaydedildi.'); });
 root.ChainApp = { open: open, controller: c, engine: engine, view: view, input: input, store: store, diagnostics: d, contents: contents, seriesFixture: seriesFixture, stopProbe: stopProbe, version: '0.4.6' };
 root.ChainApp.reliability = root.PlayerReliability; root.PlayerReliability.attach(c, storage, document);
 root.ChainApp.catalog = new root.CatalogApp(root.ChainApp, storage);
 log('0.4.6 hazır. Gerçek katalog / native-XHR / hls.js.');
})(window);
