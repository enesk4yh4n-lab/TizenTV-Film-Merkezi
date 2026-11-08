(function (root) {
  'use strict';
  function Images() {
    this.limit = 8 * 1024 * 1024;
    this.countLimit = 48;
    this.bytes = 0;
    this.cache = {};
    this.queue = [];
    this.jobs = {};
    this.active = 0;
    this.generation = 0;
    this.pumpTimer = null;
    this.policy = { preferred: 'xhr' };
    this.originPolicies = {};
  }
  Images.prototype.stop = function () {
    this.generation++;
    if (this.pumpTimer !== null) clearTimeout(this.pumpTimer);
    this.pumpTimer = null;
    this.queue = [];
    var jobs = this.jobs;
    Object.keys(jobs).forEach(function (key) {
      jobs[key].listeners = [];
      if (jobs[key].request) jobs[key].request.cancel();
    });
    this.jobs = {};
  };
  Images.prototype.clear = function () {
    this.stop();
    var self = this;
    Object.keys(this.cache).forEach(function (key) {
      root.URL.revokeObjectURL(self.cache[key].url);
    });
    this.cache = {};
    this.bytes = 0;
    this.originPolicies = {};
  };
  Images.prototype.remove = function (key) {
    var item = this.cache[key];
    if (!item) return;
    this.bytes -= item.bytes;
    root.URL.revokeObjectURL(item.url);
    delete this.cache[key];
  };
  Images.prototype.prune = function (keep) {
    var self = this,
      keys = Object.keys(this.cache).sort(function (a, b) {
        return self.cache[a].at - self.cache[b].at;
      });
    while (keys.length > keep) this.remove(keys.shift());
  };
  Images.prototype.put = function (key, data) {
    var b = new Uint8Array(data),
      mime =
        b[0] === 255 && b[1] === 216
          ? 'image/jpeg'
          : b[0] === 137 && b[1] === 80
            ? 'image/png'
            : b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69
              ? 'image/webp'
              : '';
    if (!mime || data.byteLength > 2 * 1024 * 1024) throw new Error('Afiş biçimi desteklenmiyor.');
    this.remove(key);
    var self = this,
      keys = Object.keys(this.cache).sort(function (a, c) {
        return self.cache[a].at - self.cache[c].at;
      });
    while (
      (this.bytes + data.byteLength > this.limit || keys.length >= this.countLimit) &&
      keys.length
    )
      this.remove(keys.shift());
    var item = {
      url: root.URL.createObjectURL(new Blob([data], { type: mime })),
      bytes: data.byteLength,
      at: Date.now()
    };
    this.cache[key] = item;
    this.bytes += item.bytes;
    return item;
  };
  Images.prototype.bind = function (img, url, referer) {
    var self = this,
      item = this.cache[url];
    if (!url) return;
    function show(value) {
      if (!document.contains(img)) return;
      img.onload = function () {
        img.style.opacity = '1';
      };
      img.onerror = function () {
        img.style.opacity = '0';
        img.setAttribute('data-image-error', '1');
      };
      img.src = value.url;
    }
    if (item) {
      item.at = Date.now();
      show(item);
      return;
    }
    show.image = img;
    if (this.jobs[url]) {
      this.jobs[url].listeners = this.jobs[url].listeners.filter(function (listener) {
        return !listener.image || document.contains(listener.image);
      });
      this.jobs[url].listeners.push(show);
      return;
    }
    var job = {
      url: url,
      referer: referer || this.referer || '',
      listeners: [show],
      token: this.generation,
      queuedAt: Date.now()
    };
    this.jobs[url] = job;
    this.queue.push(job);
    this.schedule();
  };
  Images.prototype.schedule = function () {
    if (this.pumpTimer !== null || this.active >= 3 || !this.queue.length) return;
    var self = this;
    // Native download startup can block on old TVs. One start per task leaves
    // input/rendering a turn without reducing the three-download concurrency.
    this.pumpTimer = setTimeout(function () {
      self.pumpTimer = null;
      self.pump();
    }, 0);
  };
  Images.prototype.policyFor = function (url) {
    var origin;
    try {
      origin = new root.URL(url).origin;
    } catch (ignore) {
      return this.policy;
    }
    var now = Date.now(),
      policies = this.originPolicies,
      entry = policies[origin];
    if (entry && now - entry.created < 600000) {
      entry.used = now;
      return entry.policy;
    }
    // Poster CORS differs between CDNs. A native fallback on one origin must
    // not force every other origin through the synchronous Download bridge.
    if (!entry) {
      var keys = Object.keys(policies);
      if (keys.length >= 16) {
        keys.sort(function (a, b) {
          return policies[a].used - policies[b].used;
        });
        delete policies[keys[0]];
      }
    }
    entry = { created: now, used: now, policy: { preferred: 'xhr' } };
    policies[origin] = entry;
    return entry.policy;
  };
  Images.prototype.pump = function () {
    var self = this;
    if (this.active >= 3 || !this.queue.length) return;
    var job = this.queue.shift();
    if (job.token !== this.generation) {
      this.schedule();
      return;
    }
    this.active++;
    function finished() {
      job.listeners = [];
      self.active--;
      if (self.jobs[job.url] === job) delete self.jobs[job.url];
      self.schedule();
    }
    try {
      job.request = root.MediaNetwork.request(job.url, {
        kind: 'image',
        binary: true,
        referer: job.referer,
        byteLimit: 2 * 1024 * 1024,
        timeoutMs: 10000,
        deadline: job.queuedAt + 30000,
        policy: self.policyFor(job.url)
      });
      job.request.promise
        .then(function (response) {
          if (job.token !== self.generation) return;
          var item = self.put(job.url, response.data);
          job.listeners.forEach(function (fn) {
            fn(item);
          });
        })
        .catch(function () {})
        .then(finished);
    } catch (ignore) {
      finished();
    }
    this.schedule();
  };
  Images.prototype.visible = function (container) {
    var self = this,
      viewport = container.getBoundingClientRect();
    Array.prototype.forEach.call(container.querySelectorAll('img[data-art]'), function (img) {
      if (img.getAttribute('data-art-bound')) return;
      var r = img.getBoundingClientRect();
      if (
        r.bottom >= viewport.top - 100 &&
        r.top <= viewport.bottom + 100 &&
        r.right >= viewport.left &&
        r.left <= viewport.right
      ) {
        img.setAttribute('data-art-bound', '1');
        self.bind(img, img.getAttribute('data-art'), img.getAttribute('data-art-referer'));
      }
    });
  };
  root.CatalogImages = Images;
})(window);
