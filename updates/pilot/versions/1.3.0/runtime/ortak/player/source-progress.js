/* Incremental discovery and an owned metadata queue, independent of the media engine. */
(function (root) {
  'use strict';
  function Progress(notify, hints) {
    this.enabled = typeof notify === 'function';
    this.notify = notify;
    this.hints = hints || {};
  }
  Progress.prototype.publish = function (sources, options) {
    if (!this.enabled) return;
    var snapshot = sources.slice();
    if (options)
      snapshot.options = options.map(function (o) {
        var copy = {};
        Object.keys(o).forEach(function (key) {
          copy[key] = o[key];
        });
        return copy;
      });
    this.notify(snapshot);
  };
  Progress.prototype.wait = function (check) {
    var self = this;
    return new Promise(function (resolve, reject) {
      function poll() {
        try {
          check();
          if (!self.enabled || !self.hints.canContinue || self.hints.canContinue()) resolve();
          else setTimeout(poll, 250);
        } catch (error) {
          reject(error);
        }
      }
      poll();
    });
  };
  Progress.prototype.order = function (entries, describe) {
    if (!this.enabled) return entries.slice();
    var pending = entries.slice(),
      ordered = [],
      self = this;
    while (pending.length) {
      var candidates = pending.map(describe),
        index = -1;
      candidates.some(function (s, i) {
        if (
          (self.hints.preferredId && self.hints.preferredId === s.id) ||
          (self.hints.preferredLabel && self.hints.preferredLabel === s.label)
        ) {
          index = i;
          return true;
        }
        return false;
      });
      if (index < 0 && self.hints.pick) index = self.hints.pick(candidates);
      if (index < 0 || index >= pending.length) index = 0;
      ordered.push(pending.splice(index, 1)[0]);
    }
    return ordered;
  };
  function cancelled() {
    var e = new Error('Kaynak araması iptal edildi.');
    e.cancelled = true;
    return e;
  }
  function Queue(hints, now) {
    this.hints = hints || {};
    this.now = now || Date.now;
    this.jobs = [];
    this.active = null;
    this.timer = null;
    this.cancelled = false;
    this.nextAt = 0;
  }
  Queue.prototype.run = function (check, start, cancel, deadline) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var job = {
        check: check,
        start: start,
        cancel: cancel,
        deadline: deadline,
        resolve: resolve,
        reject: reject,
        done: false,
      };
      if (self.cancelled) {
        reject(cancelled());
        return;
      }
      self.jobs.push(job);
      self.pump();
    });
  };
  Queue.prototype.pump = function () {
    var self = this;
    if (self.active || self.cancelled || !self.jobs.length) return;
    clearTimeout(self.timer);
    self.timer = null;
    var job = self.jobs[0],
      background = !!(self.hints.mediaActive && self.hints.mediaActive());
    try {
      job.check();
      if (job.deadline && self.now() >= job.deadline) {
        var expired = new Error('Kaynak isteğinin zaman bütçesi doldu.');
        expired.stage = 'timeout';
        throw expired;
      }
      var blocked = self.hints.canContinue && !self.hints.canContinue();
      if (blocked || (background && self.now() < self.nextAt)) {
        self.timer = setTimeout(
          function () {
            self.pump();
          },
          blocked ? 250 : Math.min(250, Math.max(1, self.nextAt - self.now()))
        );
        return;
      }
    } catch (e) {
      self.jobs.shift();
      job.done = true;
      job.reject(e);
      self.pump();
      return;
    }
    self.jobs.shift();
    self.active = job;
    var end = Math.min(job.deadline || Infinity, self.now() + (background ? 30000 : 60000));
    function finish(error, value) {
      if (job.done) return;
      job.done = true;
      clearTimeout(job.timer);
      if (self.active === job) self.active = null;
      if (background) self.nextAt = self.now() + 500;
      if (error) job.reject(error);
      else job.resolve(value);
      self.pump();
    }
    job.finish = finish;
    job.timer = setTimeout(
      function () {
        var e = new Error('Kaynak isteğinin zaman bütçesi doldu.');
        e.stage = 'timeout';
        if (job.cancel) job.cancel();
        finish(e);
      },
      Math.max(1, end - self.now())
    );
    try {
      Promise.resolve(
        job.start(
          background ? { deadline: end, timeoutMs: Math.max(1, end - self.now()) } : undefined
        )
      ).then(
        function (value) {
          try {
            job.check();
            finish(null, value);
          } catch (e) {
            finish(e);
          }
        },
        function (e) {
          finish(e);
        }
      );
    } catch (e) {
      finish(e);
    }
  };
  Queue.prototype.cancel = function () {
    if (this.cancelled) return;
    this.cancelled = true;
    clearTimeout(this.timer);
    this.timer = null;
    this.jobs.splice(0).forEach(function (job) {
      job.done = true;
      job.reject(cancelled());
    });
    var job = this.active;
    if (job) {
      if (job.cancel) job.cancel();
      job.finish(cancelled());
    }
  };
  Progress.prototype.client = function (client, check, deadline) {
    var queue = this.hints.requestQueue;
    if (!queue) return client;
    var generation = 0,
      proxy = {};
    ['get', 'post'].forEach(function (method) {
      if (!client[method]) return;
      proxy[method] = function (a, b, c) {
        var token = generation;
        return queue.run(
          function () {
            if (token !== generation) throw cancelled();
            check();
          },
          function (policy) {
            return client[method](a, b, c, policy);
          },
          function () {
            client.cancel();
          },
          deadline
        );
      };
    });
    proxy.cancel = function () {
      generation++;
      client.cancel();
    };
    return proxy;
  };
  Progress.Queue = Queue;
  root.SourceProgress = Progress;
})(window);
