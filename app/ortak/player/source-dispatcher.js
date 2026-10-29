/* Owns discovery cancellation without touching the media engine. */
(function (root) {
  'use strict';
  function Resolver(log, now) {
    this.log = log;
    this.now = now || Date.now;
    this.instances = {};
    this.generation = 0;
    this.multi = null;
    this.requestQueue = null;
    this.finish = null;
  }
  Resolver.prototype.prepare = function (content) {
    return root.UnifiedPlayback
      ? root.UnifiedPlayback.prepare(content, root.ChainApp && root.ChainApp.hub)
      : content;
  };
  Resolver.prototype.cancel = function () {
    this.generation++;
    if (this.finish) {
      var finish = this.finish;
      this.finish = null;
      var error = new Error('Discovery cancelled');
      error.cancelled = true;
      finish(error);
    }
    if (this.requestQueue) {
      this.requestQueue.cancel();
      this.requestQueue = null;
    }
    if (this.multi) {
      this.multi.cancel();
      this.multi = null;
    }
    var self = this;
    Object.keys(this.instances).forEach(function (id) {
      self.instances[id].cancel();
    });
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      site = root.SiteRegistry.forContent(content),
      policy = {},
      resolver,
      pooled = !!(content.sourceContext && root.MultiSiteSourceResolver);
    if (!site) return Promise.reject(new Error('Unknown content provider'));
    Object.keys(hints || {}).forEach(function (k) {
      policy[k] = hints[k];
    });
    if (root.SourceProgress && root.SourceProgress.Queue)
      policy.requestQueue = this.requestQueue = new root.SourceProgress.Queue(policy, this.now);
    if (pooled) {
      var app = root.ChainApp || {};
      resolver = this.multi = new root.MultiSiteSourceResolver(this.log, this.now, {
        hub: app.hub,
        cache: app.catalog && app.catalog.cache,
      });
    } else
      resolver =
        this.instances[site.id] ||
        (this.instances[site.id] = new site.Resolver(this.log, this.now));
    return new Promise(function (resolve, reject) {
      var done = false,
        timer = null,
        latest = [],
        warmed = false;
      function finish(error, value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (self.finish === finish) self.finish = null;
        if (error) reject(error);
        else resolve(value);
      }
      function warm() {
        if (done || pooled || warmed || !policy.mediaActive || !policy.mediaActive()) return;
        warmed = true;
        timer = setTimeout(
          function () {
            if (done) return;
            var error = new Error('Background site discovery timed out');
            error.stage = 'timeout';
            var partial = latest.slice();
            partial.options = (latest.options || []).map(function (o) {
              var copy = {};
              Object.keys(o).forEach(function (k) {
                copy[k] = o[k];
              });
              if (copy.status === 'pending') {
                copy.status = 'timeout';
                copy.stage = 'timeout';
                copy.detail = error.message;
              }
              return copy;
            });
            error.sourceOptions = partial.options;
            finish(partial.length ? null : error, partial);
            if (self.requestQueue) self.requestQueue.cancel();
            resolver.cancel();
          },
          Math.max(1, Math.min(45000, deadline - self.now()))
        );
      }
      self.finish = finish;
      warm();
      try {
        resolver
          .resolve(
            content,
            deadline,
            typeof onProgress === 'function'
              ? function (sources) {
                  if (done || token !== self.generation) return;
                  latest = sources;
                  onProgress(sources);
                  warm();
                }
              : undefined,
            policy
          )
          .then(
            function (sources) {
              if (token === self.generation) finish(null, sources);
            },
            function (error) {
              finish(error);
            }
          );
      } catch (error) {
        finish(error);
      }
    });
  };
  root.SourceResolver = Resolver;
})(window);
