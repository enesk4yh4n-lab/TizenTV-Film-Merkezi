/* Worker protocol wrapper. No site code, no eval, no redirect following. ES5. */
var Module = {
  noInitialRun: true,
  onRuntimeInitialized: function () {
    postMessage({ kind: 'ready', protocol: 1, policy: 1, binary: true, tls: true,
      repositoryTrust: 1, originPatterns: 1, maxOrigins: Module.ccall('fm_max_origins', 'number', [], []), engine: 'wasm',
      tlsEngine: 'MbedTLS 3.6.7' });
  },
  onAbort: function () { postMessage({ kind: 'fatal', stage: 'unavailable' }); },
  print: function () {},
  printErr: function () {},
  fmReply: function (id, stage, code, status, pointer, size, location, mime, range, binary, limit) {
    var result = { kind: 'result', id: id, stage: stage, code: code, status: status,
      location: location, mimeType: mime, contentRange: range, engine: 'wasm' }, data;
    if (stage === 'size') { result.byteLimitExceeded = true; result.byteLimit = limit; }
    if (code === 0) {
      data = Module.HEAPU8.subarray(pointer, pointer + size);
      if (binary) {
        result.data = new Uint8Array(data).buffer;
        postMessage(result, [result.data]); return;
      }
      result.body = new TextDecoder('utf-8').decode(data);
    }
    postMessage(result);
  }
};
