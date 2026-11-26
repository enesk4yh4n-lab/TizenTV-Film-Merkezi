/* Keep the TV canvas stable while Samsung IME reduces the layout viewport. ES5. */
(function (root) {
  'use strict';
  function editable(node) {
    if (!node) return false;
    var tag = String(node.tagName || '').toLowerCase(), type = String(node.type || 'text').toLowerCase();
    return !node.disabled && !node.readOnly &&
      (tag === 'textarea' || node.isContentEditable || tag === 'input' && /^(text|search|url|email|password|number|tel)$/.test(type));
  }
  function Viewport() {
    this.width = root.innerWidth; this.height = root.innerHeight; this.armed = false; this.locked = false;
    var self = this;
    this.focus = function (event) {
      if (editable(event.target)) self.armed = true;
    };
    this.keyboard = function (event) {
      if (event.state === 'on' || event.detail && event.detail.state === 'on') self.armed = true;
    };
    document.addEventListener('focusin', this.focus);
    document.addEventListener('keyboardstatechange', this.keyboard);
  }
  Viewport.prototype.measure = function () {
    var width = root.innerWidth, height = root.innerHeight,
      catalog = root.ChainApp && root.ChainApp.catalog,
      input = editable(document.activeElement), editing = input || catalog && (catalog.editing || catalog.panel && catalog.panel.inputEditing),
      sameWidth = Math.abs(width - this.width) <= 2, reduced = height < this.height - 32;
    if (editing) this.armed = true;
    if (sameWidth && reduced && (this.armed || this.locked)) this.locked = true;
    else {
      if (!sameWidth || height >= this.height - 2) { this.locked = false; this.armed = !!editing; }
      if (!this.locked) { this.width = width; this.height = height; }
    }
    var scale = Math.min(this.width / 1920, this.height / 1080);
    return { scale: scale, keyboard: this.locked, visibleHeight: height, width: width, height: this.height };
  };
  Viewport.prototype.fitInput = function (metrics) {
    var box = document.getElementById('catalog-modal-card'), input = document.activeElement;
    if (this.panelBox && (!metrics.keyboard || box !== this.panelBox)) {
      this.panelBox.style.maxHeight = this.panelMaxHeight; this.panelBox = null;
    }
    if (!box || !metrics.keyboard) return;
    if (!this.panelBox) { this.panelBox = box; this.panelMaxHeight = box.style.maxHeight; }
    // Only the open panel scrolls; the surrounding catalog keeps its scale.
    box.style.maxHeight = Math.max(120, metrics.visibleHeight / metrics.scale - box.offsetTop - 24) + 'px';
    if (editable(input) && box.contains(input)) {
      var bottom = input.getBoundingClientRect().bottom, limit = metrics.visibleHeight - 16;
      if (bottom > limit) box.scrollTop += (bottom - limit) / metrics.scale;
    }
  };
  Viewport.prototype.destroy = function () {
    document.removeEventListener('focusin', this.focus);
    document.removeEventListener('keyboardstatechange', this.keyboard);
  };
  root.CatalogViewport = Viewport;
})(window);
