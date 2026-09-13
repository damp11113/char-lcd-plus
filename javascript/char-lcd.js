(function(global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
    module.exports.CharLCD = module.exports;
  }
  else if (typeof define === 'function' && define.amd) {
    define('CharLCD', [], factory);
  }
  else {
    if (!global) global = window;
    global.CharLCD = factory();
    global.GraphicLCD = global.CharLCD.GraphicLCD;
  }
})(this, function() {
////////////////////////////

var CW = 5;
var CH = 8;
var CL = 10;
var Q = 255; // color steps, one per pixel level
var BLACK = [0, 0, 0, 1];

function CharLCD(obj) {
  var _ = init({ rows: 2, cols: 16 }, obj);
  charLayout(_);
  create(_);

  this.set = function(r, c, data) { set(_, r, c, data); };
  this.char = function(r, c, ch) { char(_, r, c, ch); };
  this.text = function(r, c, str) { text(_, r, c, str); };
  this.font = function(n, data) { font(_, n, data); };
  this.clear = function() { fill(_, 0); };
  common(this, _);
}

function GraphicLCD(obj) {
  var _ = init({ width: 128, height: 64, grayscale: false }, obj);
  _.arg.grayscale = !!_.arg.grayscale;
  graphicLayout(_);
  create(_);

  this.pixel = function(x, y, v) { plot(_, Math.round(x), Math.round(y), level(_, v)); };
  this.get = function(x, y) { return get(_, x, y); };
  this.fill = function(v) { fill(_, level(_, v)); };
  this.clear = function() { fill(_, 0); };
  this.line = function(x0, y0, x1, y1, v) { drawLine(_, x0, y0, x1, y1, level(_, v)); };
  this.rect = function(x, y, w, h, v) { drawRect(_, x, y, w, h, level(_, v), false); };
  this.fillRect = function(x, y, w, h, v) { drawRect(_, x, y, w, h, level(_, v), true); };
  this.circle = function(x, y, r, v) { drawCircle(_, x, y, r, level(_, v), false); };
  this.fillCircle = function(x, y, r, v) { drawCircle(_, x, y, r, level(_, v), true); };
  this.text = function(x, y, str, v, bg) { drawText(_, x, y, str, level(_, v), bg == null ? -1 : level(_, bg)); };
  this.bitmap = function(x, y, w, h, data) { drawBitmap(_, x, y, w, h, data); };
  this.font = function(n, data) { font(_, n, data); };
  common(this, _);
}

// options shared by both displays, plus the display specific defaults
function init(defaults, obj) {
  var key;
  var _ = {
    font: {},
    rom: _jp,
    arg: {
      pix: 3,
      brk: 1,
      off: '#cd2',
      on: '#143',
      transitionDuration: '100ms',
      backlight: true,
      contrast: 0.5,
      dim: 0.4
    }
  };
  for (key in defaults) _.arg[key] = defaults[key];
  if (obj) {
    for (key in obj) {
      if (typeof _.arg[key] != 'undefined' && _.arg[key] == parseInt(_.arg[key])) {
        if (obj[key] == parseInt(obj[key]) && obj[key] > 0) _.arg[key] = parseInt(obj[key]);
      }
      else _.arg[key] = obj[key];
    }
    if (obj.rom && obj.rom.toString().toLowerCase() == 'eu') _.rom = _eu;
  }
  _.arg.backlight = !!_.arg.backlight;
  _.arg.contrast = unit(_.arg.contrast, 0.5);
  _.arg.dim = unit(_.arg.dim, 0.4);
  // not in the defaults above: 1 would make it an integer-only option
  _.arg.bright = unit(_.arg.bright, 1);
  _.dur = ms(_.arg.transitionDuration);
  palette(_);
  return _;
}

// methods shared by both displays
function common(self, _) {
  self.backlight = function(on) {
    if (typeof on == 'undefined') return _.arg.backlight;
    _.arg.backlight = !!on;
    repaint(_);
  };
  self.contrast = function(k) {
    if (typeof k == 'undefined') return _.arg.contrast;
    _.arg.contrast = unit(k, _.arg.contrast);
    repaint(_);
  };
  self.bright = function(k) {
    if (typeof k == 'undefined') return _.arg.bright;
    _.arg.bright = unit(k, _.arg.bright);
    repaint(_);
  };
  self.dim = function(k) {
    if (typeof k == 'undefined') return _.arg.dim;
    _.arg.dim = unit(k, _.arg.dim);
    repaint(_);
  };
  self.colors = function(c) {
    if (!c) return { off: _.arg.off, on: _.arg.on, block: _.arg.block };
    ['off', 'on', 'block'].forEach(function(key) {
      if (typeof c[key] != 'undefined') _.arg[key] = c[key];
    });
    palette(_);
    repaint(_);
  };
}

function create(_) {
  var at = typeof _.arg.at == 'string' ? document.getElementById(_.arg.at) : _.arg.at;
  try {
    at.appendChild(_.lcd);
  }
  catch(e) {
    at = document.createElement('div');
    document.body.appendChild(at);
    at.appendChild(_.lcd);
  }
  _.arg.at = at;
  ramp(_);
  draw(_, null);
}

// a single canvas instead of a DOM element per pixel
function panel(_, w, h, n) {
  var dpr = (typeof window != 'undefined' && window.devicePixelRatio) || 1;
  var lcd = document.createElement('div');
  var cv = document.createElement('canvas');
  lcd.style.position = 'relative';
  lcd.style.display = 'inline-block';
  lcd.style.width = w + 'px';
  lcd.style.height = h + 'px';
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.display = 'block';
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  lcd.appendChild(cv);
  _.lcd = lcd;
  _.cv = cv;
  _.cx = cv.getContext ? cv.getContext('2d') : null;
  _.dpr = dpr;
  _.val = new Uint8Array(n); // target level, 0-255
  _.lvl = new Float32Array(n); // displayed level, 0-1, fades toward the target
  _.inq = new Uint8Array(n);
  _.act = [];
  _.rect = new Int32Array(4 * n); // x, y, w, h in device pixels
  _.bkt = [];
  for (var q = 0; q <= Q; q++) _.bkt.push([]);
}

// position of the k-th pixel, in CSS pixels
function place(_, k, x, y) {
  var i = 4 * k;
  _.rect[i] = Math.round(x * _.dpr);
  _.rect[i + 1] = Math.round(y * _.dpr);
  _.rect[i + 2] = Math.round((x + _.arg.pix) * _.dpr) - _.rect[i];
  _.rect[i + 3] = Math.round((y + _.arg.pix) * _.dpr) - _.rect[i + 1];
}

function charLayout(_) {
  var r, c, rr, cc;
  var k = 0;
  var cell = _.arg.pix + _.arg.brk;
  var HH = _.arg.large ? CL : CH;
  panel(_, cell * ((1 + CW) * _.arg.cols + 1) + _.arg.brk, cell * ((1 + HH) * _.arg.rows + 1) + _.arg.brk, _.arg.rows * _.arg.cols * CH * CW);
  for (r = 0; r < _.arg.rows; r++) {
    for (c = 0; c < _.arg.cols; c++) {
      for (rr = 0; rr < CH; rr++) {
        for (cc = 0; cc < CW; cc++) {
          place(_, k++, cell * ((1 + CW) * c + 1 + cc) + _.arg.brk, cell * ((1 + HH) * r + 1 + rr) + _.arg.brk);
        }
      }
    }
  }
}

function graphicLayout(_) {
  var x, y;
  var cell = _.arg.pix + _.arg.brk;
  var W = _.arg.width;
  var H = _.arg.height;
  // one cell of margin around the matrix
  panel(_, cell * (W + 2) + _.arg.brk, cell * (H + 2) + _.arg.brk, W * H);
  for (y = 0; y < H; y++) {
    for (x = 0; x < W; x++) place(_, y * W + x, cell * (1 + x) + _.arg.brk, cell * (1 + y) + _.arg.brk);
  }
}

// unlit pixels fade toward the block color as the contrast goes up
function palette(_) {
  _.rgb = { off: rgba(_.arg.off), on: rgba(_.arg.on) };
  if (_.arg.block != null) _.rgb.block = rgba(_.arg.block);
  else _.rgb.block = luma(_.rgb.on) > luma(_.rgb.off) ? BLACK : _.rgb.on;
}

// contrast 0.5 shows the plain on/off colors;
// lower fades the lit pixels out, higher makes the unlit pixels show up
function ramp(_) {
  var k = _.arg.contrast;
  var b = _.arg.backlight ? _.arg.bright : _.arg.dim;
  var bg = mix(BLACK, _.rgb.off, b);
  var on = mix(BLACK, mix(_.rgb.off, _.rgb.on, 2 * k), b);
  var off = mix(BLACK, mix(_.rgb.off, _.rgb.block, 2 * k - 1), b);
  _.bg = css(bg);
  _.ramp = [];
  for (var q = 0; q <= Q; q++) _.ramp.push(css(mix(off, on, q / Q)));
  _.opaque = on[3] == 1 && off[3] == 1;
}

// redraw the listed pixels, or everything if list is null
function draw(_, list) {
  var cx = _.cx;
  if (!cx) return;
  var rect = _.rect;
  var bkt = _.bkt;
  var n = list ? list.length : _.lvl.length;
  var i, k, q;
  if (!list) {
    cx.clearRect(0, 0, _.cv.width, _.cv.height);
    cx.fillStyle = _.bg;
    cx.fillRect(0, 0, _.cv.width, _.cv.height);
  }
  else if (!_.opaque) {
    cx.fillStyle = _.bg;
    for (k = 0; k < n; k++) {
      i = 4 * list[k];
      cx.clearRect(rect[i], rect[i + 1], rect[i + 2], rect[i + 3]);
      cx.fillRect(rect[i], rect[i + 1], rect[i + 2], rect[i + 3]);
    }
  }
  for (q = 0; q <= Q; q++) bkt[q].length = 0;
  for (k = 0; k < n; k++) {
    i = list ? list[k] : k;
    bkt[Math.round(_.lvl[i] * Q)].push(i);
  }
  for (q = 0; q <= Q; q++) {
    if (!bkt[q].length) continue;
    cx.fillStyle = _.ramp[q];
    cx.beginPath();
    for (k = 0; k < bkt[q].length; k++) {
      i = 4 * bkt[q][k];
      cx.rect(rect[i], rect[i + 1], rect[i + 2], rect[i + 3]);
    }
    cx.fill();
  }
}

var raf = typeof requestAnimationFrame == 'function' ?
  function(f) { return requestAnimationFrame(f); } :
  function(f) { return setTimeout(function() { f(Date.now()); }, 16); };

function wake(_) {
  if (!_.raf) _.raf = raf(function(now) { tick(_, now); });
}

// new colors for every pixel on the next frame, no fade
function repaint(_) {
  _.full = true;
  wake(_);
}

function tick(_, now) {
  var i, k, t, v;
  var dt = _.last ? Math.max(now - _.last, 0) : 16;
  var step = _.dur > 0 ? dt / _.dur : 1;
  var full = _.full;
  var act = _.act;
  var keep = [];
  _.raf = 0;
  _.last = now;
  _.full = false;
  if (full) ramp(_);
  for (k = 0; k < act.length; k++) {
    i = act[k];
    t = _.val[i] / 255;
    v = toward(_.lvl[i], t, step);
    _.lvl[i] = v;
    if (v == t) _.inq[i] = 0;
    else keep.push(i);
  }
  _.act = keep;
  draw(_, full ? null : act);
  if (keep.length) wake(_);
  else _.last = 0;
}

function toward(v, t, s) {
  return v < t ? Math.min(v + s, t) : Math.max(v - s, t);
}

// set the target level of the k-th pixel; the next frame starts fading it
function put(_, k, v) {
  if (_.val[k] == v) return;
  _.val[k] = v;
  if (_.inq[k]) return;
  _.inq[k] = 1;
  _.act.push(k);
  wake(_);
}

function fill(_, v) {
  for (var k = 0; k < _.val.length; k++) put(_, k, v);
}

function ms(d) {
  var m = String(d).match(/^\s*([\d.]+)\s*(ms|s)?\s*$/i);
  if (!m) return 0;
  return parseFloat(m[1]) * (m[2] && m[2].toLowerCase() == 's' ? 1000 : 1);
}

function unit(x, def) {
  x = parseFloat(x);
  if (isNaN(x)) return def;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

var probe;
// any CSS color to [r, g, b, a]; invalid colors come out transparent, like in CSS
function rgba(c) {
  if (typeof probe == 'undefined') {
    try { probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); }
    catch(e) { probe = null; }
  }
  if (!probe) return [0, 0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'transparent';
  probe.fillStyle = String(c);
  probe.fillRect(0, 0, 1, 1);
  var d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3] / 255];
}

function mix(a, b, t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  var z = [];
  for (var i = 0; i < 4; i++) z.push(a[i] + (b[i] - a[i]) * t);
  return z;
}

function css(x) {
  return 'rgba(' + Math.round(x[0]) + ',' + Math.round(x[1]) + ',' + Math.round(x[2]) + ',' + Math.round(x[3] * 1000) / 1000 + ')';
}

function luma(x) {
  return 0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2];
}

////////////////////////////
// CharLCD

function set(_, r, c, data) {
  if (r != parseInt(r) || r < 0 || r >= _.arg.rows || c != parseInt(c) || c < 0 || c >= _.arg.cols) return;
  if (!data) data = [];
  var offset = (r * _.arg.cols + c) * CW * CH - 1;
  for (var i = 0; i < CH; i++) {
    var mask = (data[i] == parseInt(data[i])) ? parseInt(data[i]) : 0;
    for (var j = 0; j < CW; j++) {
      put(_, offset + CW - j, ((1 << j) & mask) ? 255 : 0);
    }
    offset += CW;
  }
}

function glyph(_, x) {
  return _.font[x] ? _.font[x] : _.rom.font[x];
}

function char(_, r, c, ch) {
  set(_, r, c, glyph(_, ch.charCodeAt(0)));
}

// string to ROM character codes; -1 is a line break
function bytes(_, str) {
  var out = [];
  var i, k, x;
  str = String(str);
  for (i = 0; i < str.length; i++) {
    if (str[i] == '\n') {
      out.push(-1);
      continue;
    }
    x = str.charCodeAt(i);
    if (x >= 0xd800 && x <= 0xdbff) {
      i++;
      k = str[i] ? str.charCodeAt(i) : 0;
      x = 0x10000 + (x - 0xd800) * 0x400 + (k - 0xdc00);
    }
    if (_.rom.cmap[x]) x = _.rom.cmap[x];
    if (x instanceof Array) {
      for (k = 0; k < x.length; k++) out.push(x[k]);
    }
    else out.push(x > 255 ? 0x3f : x);
  }
  return out;
}

function text(_, r, c, str) {
  if (r != parseInt(r) || r < 0 || r >= _.arg.rows || c != parseInt(c) || c < 0 || c >= _.arg.cols) return;
  var b = bytes(_, str);
  for (var i = 0; i < b.length; i++) {
    if (b[i] < 0) {
      c = 0;
      r++;
      if (r >= _.arg.rows) return;
    }
    else set(_, r, c++, glyph(_, b[i]));
  }
}

function font(_, n, data) {
  _.font[n] = data;
}

////////////////////////////
// GraphicLCD

// drawing value to pixel level: any non-zero is on, or 0-255 in grayscale mode
function level(_, v) {
  if (typeof v == 'undefined' || v === true) return 255;
  if (!_.arg.grayscale) return v ? 255 : 0;
  v = Math.round(v);
  return v > 255 ? 255 : v > 0 ? v : 0;
}

function get(_, x, y) {
  var v;
  x = Math.round(x);
  y = Math.round(y);
  if (!(x >= 0 && x < _.arg.width && y >= 0 && y < _.arg.height)) return 0;
  v = _.val[y * _.arg.width + x];
  return _.arg.grayscale ? v : v ? 1 : 0;
}

// x and y must be integers
function plot(_, x, y, v) {
  if (x >= 0 && x < _.arg.width && y >= 0 && y < _.arg.height) put(_, y * _.arg.width + x, v);
}

function hline(_, x0, x1, y, v) {
  if (!(y >= 0 && y < _.arg.height)) return;
  var a = Math.max(x0, 0);
  var b = Math.min(x1, _.arg.width - 1);
  for (var x = a; x <= b; x++) put(_, y * _.arg.width + x, v);
}

// Liang-Barsky: the part of the line inside the box, or undefined if none
function clip(x0, y0, x1, y1, xmin, ymin, xmax, ymax) {
  var i, t;
  var t0 = 0;
  var t1 = 1;
  var dx = x1 - x0;
  var dy = y1 - y0;
  var p = [-dx, dx, -dy, dy];
  var q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0];
  for (i = 0; i < 4; i++) {
    if (p[i] == 0) {
      if (q[i] < 0) return;
      continue;
    }
    t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > t1) return;
      if (t > t0) t0 = t;
    }
    else {
      if (t < t0) return;
      if (t < t1) t1 = t;
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

function drawLine(_, x0, y0, x1, y1, v) {
  var dx, dy, sx, sy, err, e2, c;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  if (!isFinite(x0 + y0 + x1 + y1)) return;
  // cut very long lines to the display, stepping through huge coordinates would freeze the page
  if (Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) > 2 * (_.arg.width + _.arg.height)) {
    c = clip(x0, y0, x1, y1, -1, -1, _.arg.width, _.arg.height);
    if (!c) return;
    x0 = Math.round(c[0]);
    y0 = Math.round(c[1]);
    x1 = Math.round(c[2]);
    y1 = Math.round(c[3]);
  }
  dx = Math.abs(x1 - x0);
  dy = -Math.abs(y1 - y0);
  sx = x0 < x1 ? 1 : -1;
  sy = y0 < y1 ? 1 : -1;
  err = dx + dy;
  for (;;) {
    plot(_, x0, y0, v);
    if (x0 == x1 && y0 == y1) return;
    e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawRect(_, x, y, w, h, v, filled) {
  var j, j0, j1;
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  if (!isFinite(x + y) || !(w > 0 && h > 0)) return;
  j0 = Math.max(y, 0);
  j1 = Math.min(y + h - 1, _.arg.height - 1);
  if (filled) {
    for (j = j0; j <= j1; j++) hline(_, x, x + w - 1, j, v);
    return;
  }
  hline(_, x, x + w - 1, y, v);
  hline(_, x, x + w - 1, y + h - 1, v);
  for (j = j0; j <= j1; j++) {
    plot(_, x, j, v);
    plot(_, x + w - 1, j, v);
  }
}

function drawCircle(_, x0, y0, r, v, filled) {
  var x, y, err;
  var W = _.arg.width;
  var H = _.arg.height;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  r = Math.round(r);
  if (!isFinite(x0 + y0 + r) || r < 0) return;
  if (r > 2 * (W + H)) {
    // much bigger than the display: only visit the visible rows and columns
    for (y = Math.max(y0 - r, 0); y <= Math.min(y0 + r, H - 1); y++) {
      x = Math.round(Math.sqrt(r * r - (y - y0) * (y - y0)));
      if (filled) hline(_, x0 - x, x0 + x, y, v);
      else {
        plot(_, x0 - x, y, v);
        plot(_, x0 + x, y, v);
      }
    }
    if (filled) return;
    for (x = Math.max(x0 - r, 0); x <= Math.min(x0 + r, W - 1); x++) {
      y = Math.round(Math.sqrt(r * r - (x - x0) * (x - x0)));
      plot(_, x, y0 - y, v);
      plot(_, x, y0 + y, v);
    }
    return;
  }
  x = r;
  y = 0;
  err = 1 - r;
  while (x >= y) {
    if (filled) {
      hline(_, x0 - x, x0 + x, y0 + y, v);
      hline(_, x0 - x, x0 + x, y0 - y, v);
      hline(_, x0 - y, x0 + y, y0 + x, v);
      hline(_, x0 - y, x0 + y, y0 - x, v);
    }
    else {
      plot(_, x0 + x, y0 + y, v);
      plot(_, x0 - x, y0 + y, v);
      plot(_, x0 + x, y0 - y, v);
      plot(_, x0 - x, y0 - y, v);
      plot(_, x0 + y, y0 + x, v);
      plot(_, x0 - y, y0 + x, v);
      plot(_, x0 + y, y0 - x, v);
      plot(_, x0 - y, y0 - x, v);
    }
    y++;
    if (err < 0) err += 2 * y + 1;
    else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}

// ROM font text, 6x9 pixels per character; bg < 0 leaves the background as is
function drawText(_, x, y, str, v, bg) {
  var b = bytes(_, str);
  var i, rr, cc, data, mask, x0;
  x = Math.round(x);
  y = Math.round(y);
  if (!isFinite(x + y)) return;
  x0 = x;
  for (i = 0; i < b.length; i++) {
    if (b[i] < 0) {
      x = x0;
      y += CH + 1;
      continue;
    }
    if (bg >= 0) drawRect(_, x, y, CW + 1, CH + 1, bg, true);
    data = glyph(_, b[i]) || [];
    for (rr = 0; rr < CH; rr++) {
      mask = (data[rr] == parseInt(data[rr])) ? parseInt(data[rr]) : 0;
      for (cc = 0; cc < CW; cc++) {
        if (mask & (1 << (CW - 1 - cc))) plot(_, x + cc, y + rr, v);
      }
    }
    x += CW + 1;
  }
}

// data: w * h values, row by row; null or undefined values are skipped
function drawBitmap(_, x, y, w, h, data) {
  var i, j, d;
  x = Math.round(x);
  y = Math.round(y);
  if (!isFinite(x + y) || !data) return;
  for (j = Math.max(0, -y); j < Math.min(h, _.arg.height - y); j++) {
    for (i = Math.max(0, -x); i < Math.min(w, _.arg.width - x); i++) {
      d = data[j * w + i];
      if (d != null) plot(_, x + i, y + j, level(_, d));
    }
  }
}

////////////////////////////
var _jp = {
  font: [
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [],
    [4, 4, 4, 4, 0, 0, 4], // !
    [10, 10, 10], // "
    [10, 10, 31, 10, 31, 10, 10], // #
    [4, 15, 20, 14, 5, 30, 4], // $
    [24, 25, 2, 4, 8, 19, 3], // %
    [12, 18, 20, 8, 21, 18, 13], // &
    [12, 4, 8], // '
    [2, 4, 8, 8, 8, 4, 2], // (
    [8, 4, 2, 2, 2, 4, 8], // )
    [0, 4, 21, 14, 21, 4], // *
    [0, 4, 4, 31, 4, 4], // +
    [0, 0, 0, 0, 12, 4, 8], // ,
    [0, 0, 0, 31], // -
    [0, 0, 0, 0, 0, 12, 12], // .
    [0, 1, 2, 4, 8, 16], // /
    [14, 17, 19, 21, 25, 17, 14], // 0
    [4, 12, 4, 4, 4, 4, 14], // 1
    [14, 17, 1, 2, 4, 8, 31], // 2
    [31, 2, 4, 2, 1, 17, 14], // 3
    [2, 6, 10, 18, 31, 2, 2], // 4
    [31, 16, 30, 1, 1, 17, 14], // 5
    [6, 8, 16, 30, 17, 17, 14], // 6
    [31, 1, 2, 4, 8, 8, 8], // 7
    [14, 17, 17, 14, 17, 17, 14], // 8
    [14, 17, 17, 15, 1, 2, 12], // 9
    [0, 12, 12, 0, 12, 12], // :
    [0, 12, 12, 0, 12, 4, 8], // ;
    [2, 4, 8, 16, 8, 4, 2], // <
    [0, 0, 31, 0, 31], // =
    [8, 4, 2, 1, 2, 4, 8], // >
    [14, 17, 1, 2, 4, 0, 4], // ?
    [14, 17, 1, 13, 21, 21, 14], // @
    [14, 17, 17, 31, 17, 17, 17], // A
    [30, 17, 17, 30, 17, 17, 30], // B
    [14, 17, 16, 16, 16, 17, 14], // C
    [28, 18, 17, 17, 17, 18, 28], // D
    [31, 16, 16, 30, 16, 16, 31], // E
    [31, 16, 16, 30, 16, 16, 16], // F
    [14, 17, 16, 23, 17, 17, 15], // G
    [17, 17, 17, 31, 17, 17, 17], // H
    [14, 4, 4, 4, 4, 4, 14], // I
    [14, 2, 2, 2, 2, 18, 12], // J
    [17, 18, 20, 24, 20, 18, 17], // K
    [16, 16, 16, 16, 16, 16, 31], // L
    [17, 27, 21, 21, 17, 17, 17], // M
    [17, 17, 25, 21, 19, 17, 17], // N
    [14, 17, 17, 17, 17, 17, 14], // O
    [30, 17, 17, 30, 16, 16, 16], // P
    [14, 17, 17, 17, 21, 18, 13], // Q
    [30, 17, 17, 30, 20, 18, 17], // R
    [15, 16, 16, 14, 1, 1, 30], // S
    [31, 4, 4, 4, 4, 4, 4], // T
    [17, 17, 17, 17, 17, 17, 14], // U
    [17, 17, 17, 17, 17, 10, 4], // V
    [17, 17, 17, 21, 21, 21, 10], // W
    [17, 17, 10, 4, 10, 17, 17], // X
    [17, 17, 17, 10, 4, 4, 4], // Y
    [31, 1, 2, 4, 8, 16, 31], // Z
    [14, 8, 8, 8, 8, 8, 14], // [
    [17, 10, 31, 4, 31, 4, 4], // Yen
    [14, 2, 2, 2, 2, 2, 14], // ]
    [4, 10, 17], // ^
    [0, 0, 0, 0, 0, 0, 31], // _
    [8, 4, 2], // `
    [0, 0, 14, 1, 15, 17, 15], // a
    [16, 16, 22, 25, 17, 17, 30], // b
    [0, 0, 14, 16, 16, 17, 14], // c
    [1, 1, 13, 19, 17, 17, 15], // d
    [0, 0, 14, 17, 31, 16, 14], // e
    [6, 9, 8, 28, 8, 8, 8], // f
    [0, 15, 17, 17, 15, 1, 14], // g
    [16, 16, 22, 25, 17, 17, 17], // h
    [4, 0, 12, 4, 4, 4, 14], // i
    [2, 0, 6, 2, 2, 18, 12], // j
    [16, 16, 18, 20, 24, 20, 18], // k
    [12, 4, 4, 4, 4, 4, 31], // l
    [0, 0, 26, 21, 21, 17, 17], // m
    [0, 0, 22, 25, 17, 17, 17], // n
    [0, 0, 14, 17, 17, 17, 14], // o
    [0, 0, 30, 17, 30, 16, 16], // p
    [0, 0, 13, 19, 15, 1, 1], // q
    [0, 0, 22, 25, 16, 16, 16], // r
    [0, 0, 14, 16, 14, 1, 30], // s
    [8, 8, 28, 8, 8, 9, 6], // t
    [0, 0, 17, 17, 17, 19, 13], // u
    [0, 0, 17, 17, 17, 10, 4], // v
    [0, 0, 17, 17, 21, 21, 10], // w
    [0, 0, 17, 10, 4, 10, 17], // x
    [0, 0, 17, 17, 15, 1, 14], // y
    [0, 0, 31, 2, 4, 8, 31], // z
    [2, 4, 4, 8, 4, 4, 2], // {
    [4, 4, 4, 4, 4, 4, 4], // |
    [8, 4, 4, 2, 4, 4, 8], // }
    [0, 4, 2, 31, 2, 4], // ->
    [0, 4, 8, 31, 8, 4], // <-
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [],
    [0, 0, 0, 0, 28, 20, 28],
    [7, 4, 4, 4],
    [0, 0, 0, 4, 4, 4, 28],
    [0, 0, 0, 0, 16, 8, 4],
    [0, 0, 0, 12, 12],
    [0, 31, 1, 31, 1, 2, 4],
    [0, 0, 31, 1, 6, 4, 8],
    [0, 0, 2, 4, 12, 20, 4],
    [0, 0, 4, 31, 17, 1, 14],
    [0, 0, 0, 31, 4, 4, 31],
    [0, 0, 2, 31, 6, 10, 18],
    [0, 0, 8, 31, 9, 10, 8],
    [0, 0, 0, 14, 2, 2, 31],
    [0, 0, 30, 2, 30, 2, 30],
    [0, 0, 0, 21, 21, 1, 6],

    [0, 0, 0, 31],
    [31, 1, 5, 6, 4, 4, 8],
    [1, 2, 4, 12, 20, 4, 4],
    [4, 31, 17, 17, 1, 2, 4],
    [0, 31, 4, 4, 4, 4, 31],
    [2, 31, 2, 6, 10, 18, 2],
    [8, 31, 9, 9, 9, 9, 18],
    [4, 31, 4, 31, 4, 4, 4],
    [0, 15, 9, 17, 1, 2, 12],
    [8, 15, 18, 2, 2, 2, 4],
    [0, 31, 1, 1, 1, 1, 31],
    [10, 31, 10, 10, 2, 4, 8],
    [0, 24, 1, 25, 1, 2, 28],
    [0, 31, 1, 2, 4, 10, 17],
    [8, 31, 9, 10, 8, 8, 7],
    [0, 17, 17, 9, 1, 2, 12],

    [0, 15, 9, 21, 3, 2, 12],
    [2, 28, 4, 31, 4, 4, 8],
    [0, 21, 21, 21, 1, 2, 4],
    [14, 0, 31, 4, 4, 4, 8],
    [8, 8, 8, 12, 10, 8, 8],
    [4, 4, 31, 4, 4, 8, 16],
    [0, 14, 0, 0, 0, 0, 31],
    [0, 31, 1, 10, 4, 10, 16],
    [4, 31, 2, 4, 14, 21, 4],
    [2, 2, 2, 2, 2, 4, 8],
    [0, 4, 2, 17, 17, 17, 17],
    [16, 16, 31, 16, 16, 16, 15],
    [0, 31, 1, 1, 1, 2, 12],
    [0, 8, 20, 2, 1, 1],
    [4, 31, 4, 4, 21, 21, 4],
    [0, 31, 1, 1, 10, 4, 2],

    [0, 14, 0, 14, 0, 14, 1],
    [0, 4, 8, 16, 17, 31, 1],
    [0, 1, 1, 10, 4, 10, 16],
    [0, 31, 8, 31, 8, 8, 7],
    [8, 8, 31, 9, 10, 8, 8],
    [0, 14, 2, 2, 2, 2, 31],
    [0, 31, 1, 31, 1, 1, 31],
    [14, 0, 31, 1, 1, 2, 4],
    [18, 18, 18, 18, 2, 4, 8],
    [0, 4, 20, 20, 21, 21, 22],
    [0, 16, 16, 17, 18, 20, 24],
    [0, 31, 17, 17, 17, 17, 31],
    [0, 31, 17, 17, 1, 2, 4],
    [0, 24, 0, 1, 1, 2, 28],
    [4, 18, 8],
    [28, 20, 28],

    [0, 0, 9, 21, 18, 18, 13], // alpha
    [10, 0, 14, 1, 15, 17, 15], // a:
    [0, 0, 14, 17, 30, 17, 30, 16, 16, 16], // beta
    [0, 0, 14, 16, 12, 17, 14], // epsilon
    [0,0, 17, 17, 17, 19, 29, 16, 16, 16], // mu
    [0, 0, 15, 20, 18, 17, 14], // sigma
    [0, 0, 6, 9, 17, 17, 30, 16, 16, 16], // ro
    [0, 0, 15, 17, 17, 17, 15, 1, 1, 14], // g
    [0, 0, 7, 4, 4, 20, 8], // sq root
    [0, 2, 26, 2], // -1
    [2, 0, 6, 2, 2, 2, 2, 2, 18, 12], // j
    [0, 20, 8, 20], // x
    [0, 4, 14, 20, 21, 14, 4], // cent
    [8, 8, 28, 8, 28, 8, 15], // poud
    [14, 0, 22, 25, 17, 17, 17], // n~
    [10, 0, 14, 17, 17, 17, 14], // o:
    [0, 0, 22, 25, 17, 17, 30, 16, 16, 16], // p
    [0, 0, 13, 19, 17, 17, 15, 1, 1, 1], // q
    [0, 14, 17, 31, 17, 17, 14], // theta
    [0, 0, 0, 11, 21, 26], // inf
    [0, 0, 14, 17, 17, 10, 27], // Omega
    [10, 0, 17, 17, 17, 19, 13], // u:
    [31, 16, 8, 4, 8, 16, 31], // Sigma
    [0, 0, 31, 10, 10, 10, 19], // pi
    [31, 0, 17, 10, 4, 10, 17], // x-
    [0, 0, 17, 17, 17, 17, 15, 1, 1, 14], // y
    [0, 1, 30, 4, 31, 4, 4],
    [0, 0, 31, 8, 15, 9, 17],
    [0, 0, 31, 21, 31, 17, 17], // yen
    [0, 0, 4, 0, 31, 0, 4], // :-
    [],
    [31, 31, 31, 31, 31, 31, 31, 31, 31, 31]
  ],
  cmap: {
    0x5c: 0xa4, // backslash
    0xa5: 0x5c, 0xffe5: 0x5c, 0x5186: 0xfc, // Yen characters
    // Latin
    0xa2: 0xec, 0xa3: 0xed, 0xb5: 0xe4, 0xb7: 0xa5, 0xe4: 0xe1, 0xdf: 0xe2, 0xf1: 0xee, 0xf6: 0xef, 0xf7: 0xfd,
    // Greek
    0x391: 0x41, 0x392: 0x42, 0x395: 0x45, 0x396: 0x5a, 0x397: 0x48, 0x398: 0xf2, 0x399: 0x49, 0x39a: 0x4b,
    0x39c: 0x4d, 0x39d: 0x4e, 0x39f: 0x4f, 0x3a1: 0x50, 0x3a3: 0xf6, 0x3a4: 0x54, 0x3a5: 0x59, 0x3a7: 0x58, 0x3a9: 0xf4,
    0x3b1: 0xe0, 0x3b2: 0xe2, 0x3b5: 0xe3, 0x3b8: 0xf2, 0x3bc: 0xe4, 0x3bf: 0x6f, 0x3c0: 0xf7, 0x3c1: 0xe6, 0x3c3: 0xe5,
    // Misc
    0x2190: 0x7f, 0x2192: 0x7e, 0x221e: 0xf3, 0x221a: 0xe8, 0x237a: 0xe0,
    // Japanese
    0x3001: 0xa4, 0x3002: 0xa1, 0x300c: 0xa2, 0x300d: 0xa3, 0x3099: 0xde, 0x309a: 0xdf, 0x309b: 0xde, 0x309c: 0xdf,
    // Full Size Katakana
    0x30a0: 0x3d, 0x30a1: 0xa7, 0x30a2: 0xb1, 0x30a3: 0xa8,
    0x30a4: 0xb2, 0x30a5: 0xa9, 0x30a6: 0xb3, 0x30a7: 0xaa,
    0x30a8: 0xb4, 0x30a9: 0xab, 0x30aa: 0xb5, 0x30ab: 0xb6,
    0x30ac: [0xb6, 0xde], 0x30ad: 0xb7, 0x30ae: [0xb7, 0xde], 0x30af: 0xb8,
    0x30b0: [0xb8, 0xde], 0x30b1: 0xb9, 0x30b2: [0xb9, 0xde], 0x30b3: 0xba,
    0x30b4: [0xba, 0xde], 0x30b5: 0xbb, 0x30b6: [0xbb, 0xde], 0x30b7: 0xbc,
    0x30b8: [0xbc, 0xde], 0x30b9: 0xbd, 0x30ba: [0xbd, 0xde], 0x30bb: 0xbe,
    0x30bc: [0xbe, 0xde], 0x30bd: 0xbf, 0x30be: [0xbf, 0xde], 0x30bf: 0xc0,
    0x30c0: [0xc0, 0xde], 0x30c1: 0xc1, 0x30c2: [0xc1, 0xde], 0x30c3: 0xaf,
    0x30c4: 0xc2, 0x30c5: [0xc2, 0xde], 0x30c6: 0xc3, 0x30c7: [0xc3, 0xde],
    0x30c8: 0xc4, 0x30c9: [0xc4, 0xde], 0x30ca: 0xc5, 0x30cb: 0xc6,
    0x30cc: 0xc7, 0x30cd: 0xc8, 0x30ce: 0xc9, 0x30cf: 0xca,
    0x30d0: [0xca, 0xde], 0x30d1: [0xca, 0xdf], 0x30d2: 0xcb, 0x30d3: [0xcb, 0xde],
    0x30d4: [0xcb, 0xdf], 0x30d5: 0xcc, 0x30d6: [0xcc, 0xde], 0x30d7: [0xcc, 0xdf],
    0x30d8: 0xcd, 0x30d9: [0xcd, 0xde], 0x30da: [0xcd, 0xdf], 0x30db: 0xce,
    0x30dc: [0xce, 0xde], 0x30dd: [0xce, 0xdf], 0x30de: 0xcf, 0x30df: 0xd0,
    0x30e0: 0xd1, 0x30e1: 0xd2, 0x30e2: 0xd3, 0x30e3: 0xac,
    0x30e4: 0xd4, 0x30e5: 0xad, 0x30e6: 0xd5, 0x30e7: 0xae,
    0x30e8: 0xd6, 0x30e9: 0xd7, 0x30ea: 0xd8, 0x30eb: 0xd9,
    0x30ec: 0xda, 0x30ed: 0xdb, 0x30ee: 0xdc, 0x30ef: 0xdc,
    0x30f0: 0xb2, 0x30f1: 0xb4, 0x30f2: 0xa6, 0x30f3: 0xdd,
    0x30f4: [0xb3, 0xde], 0x30f5: 0xb6, 0x30f6: 0xb9, 0x30f7: [0xdc, 0xde],
    0x30f8: [0xb2, 0xde], 0x30f9: [0xb4, 0xde], 0x30fa: [0xa6, 0xde], 0x30fb: 0xa5,
    0x30fc: 0xb0, 0x30fd: 0xa4, 0x30fe: [0xa4, 0xde], 0x30ff: [0xba, 0xc4],
    // Half Size Katakana
    0xff61: 0xa1, 0xff62: 0xa2, 0xff63: 0xa3, 0xff64: 0xa4, 0xff65: 0xa5, 0xff66: 0xa6, 0xff67: 0xa7,
    0xff68: 0xa8, 0xff69: 0xa9, 0xff6a: 0xaa, 0xff6b: 0xab, 0xff6c: 0xac, 0xff6d: 0xad, 0xff6e: 0xae, 0xff6f: 0xaf,
    0xff70: 0xb0, 0xff71: 0xb1, 0xff72: 0xb2, 0xff73: 0xb3, 0xff74: 0xb4, 0xff75: 0xb5, 0xff76: 0xb6, 0xff77: 0xb7,
    0xff78: 0xb8, 0xff79: 0xb9, 0xff7a: 0xba, 0xff7b: 0xbb, 0xff7c: 0xbc, 0xff7d: 0xbd, 0xff7e: 0xbe, 0xff7f: 0xbf,
    0xff80: 0xc0, 0xff81: 0xc1, 0xff82: 0xc2, 0xff83: 0xc3, 0xff84: 0xc4, 0xff85: 0xc5, 0xff86: 0xc6, 0xff87: 0xc7,
    0xff88: 0xc8, 0xff89: 0xc9, 0xff8a: 0xca, 0xff8b: 0xcb, 0xff8c: 0xcc, 0xff8d: 0xcd, 0xff8e: 0xce, 0xff8f: 0xcf,
    0xff90: 0xd0, 0xff91: 0xd1, 0xff92: 0xd2, 0xff93: 0xd3, 0xff94: 0xd4, 0xff95: 0xd5, 0xff96: 0xd6, 0xff97: 0xd7,
    0xff98: 0xd8, 0xff99: 0xd9, 0xff9a: 0xda, 0xff9b: 0xdb, 0xff9c: 0xdc, 0xff9d: 0xdd, 0xff9e: 0xde, 0xff9f: 0xdf
  }
};

////////////////////////////

var _eu = {
  font: [
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [0, 8, 12, 14, 15, 14, 12, 8], // |>
    [0, 2, 6, 14, 30, 14, 6, 2], // <|
    [0, 9, 18, 27], // ``
    [0, 27, 9, 18], // ''
    [0, 4, 14, 31, 0, 4, 14, 31],
    [0, 31, 14, 4, 0, 31, 14, 4],
    [0, 0, 14, 31, 31, 31, 14],
    [0, 1, 1, 5, 9, 31, 8, 4], // return
    [0, 4, 14, 21, 4, 4, 4, 4], // up
    [0, 4, 4, 4, 4, 21, 14, 4], // down
    [0, 0, 4, 2, 31, 2, 4], // ->
    [0, 0, 4, 8, 31, 8, 4], // <-
    [0, 2, 4, 8, 4, 2, 0, 31], // <=
    [0, 8, 4, 2, 4, 8, 0, 31], // >=
    [0, 0, 4, 4, 14, 14, 31],
    [0, 0, 31, 14, 14, 4, 4],
    [],
    [0, 4, 4, 4, 4, 0, 0, 4], // !
    [0, 10, 10, 10], // "
    [0, 10, 10, 31, 10, 31, 10, 10], // #
    [0, 4, 15, 20, 14, 5, 30, 4], // $
    [0, 24, 25, 2, 4, 8, 19, 3], // %
    [0, 12, 18, 20, 8, 21, 18, 13], // &
    [0, 12, 4, 8], // '
    [0, 2, 4, 8, 8, 8, 4, 2], // (
    [0, 8, 4, 2, 2, 2, 4, 8], // )
    [0, 0, 4, 21, 14, 21, 4], // *
    [0, 0, 4, 4, 31, 4, 4], // +
    [0, 0, 0, 0, 0, 12, 4, 8], // ,
    [0, 0, 0, 0, 31], // -
    [0, 0, 0, 0, 0, 0, 12, 12], // .
    [0, 0, 1, 2, 4, 8, 16], // /
    [0, 14, 17, 19, 21, 25, 17, 14], // 0
    [0, 4, 12, 4, 4, 4, 4, 14], // 1
    [0, 14, 17, 1, 2, 4, 8, 31], // 2
    [0, 31, 2, 4, 2, 1, 17, 14], // 3
    [0, 2, 6, 10, 18, 31, 2, 2], // 4
    [0, 31, 16, 30, 1, 1, 17, 14], // 5
    [0, 6, 8, 16, 30, 17, 17, 14], // 6
    [0, 31, 1, 2, 4, 8, 8, 8], // 7
    [0, 14, 17, 17, 14, 17, 17, 14], // 8
    [0, 14, 17, 17, 15, 1, 2, 12], // 9
    [0, 0, 12, 12, 0, 12, 12], // :
    [0, 0, 12, 12, 0, 12, 4, 8], // ;
    [0, 2, 4, 8, 16, 8, 4, 2], // <
    [0, 0, 0, 31, 0, 31], // =
    [0, 8, 4, 2, 1, 2, 4, 8], // >
    [0, 14, 17, 1, 2, 4, 0, 4], // ?
    [0, 14, 17, 1, 13, 21, 21, 14], // @
    [0, 4, 10, 17, 17, 31, 17, 17], // A
    [0, 30, 17, 17, 30, 17, 17, 30], // B
    [0, 14, 17, 16, 16, 16, 17, 14], // C
    [0, 28, 18, 17, 17, 17, 18, 28], // D
    [0, 31, 16, 16, 30, 16, 16, 31], // E
    [0, 31, 16, 16, 30, 16, 16, 16], // F
    [0, 14, 17, 16, 23, 17, 17, 15], // G
    [0, 17, 17, 17, 31, 17, 17, 17], // H
    [0, 14, 4, 4, 4, 4, 4, 14], // I
    [0, 14, 2, 2, 2, 2, 18, 12], // J
    [0, 17, 18, 20, 24, 20, 18, 17], // K
    [0, 16, 16, 16, 16, 16, 16, 31], // L
    [0, 17, 27, 21, 21, 17, 17, 17], // M
    [0, 17, 17, 25, 21, 19, 17, 17], // N
    [0, 14, 17, 17, 17, 17, 17, 14], // O
    [0, 30, 17, 17, 30, 16, 16, 16], // P
    [0, 14, 17, 17, 17, 21, 18, 13], // Q
    [0, 30, 17, 17, 30, 20, 18, 17], // R
    [0, 15, 16, 16, 14, 1, 1, 30], // S
    [0, 31, 4, 4, 4, 4, 4, 4], // T
    [0, 17, 17, 17, 17, 17, 17, 14], // U
    [0, 17, 17, 17, 17, 17, 10, 4], // V
    [0, 17, 17, 17, 21, 21, 21, 10], // W
    [0, 17, 17, 10, 4, 10, 17, 17], // X
    [0, 17, 17, 17, 10, 4, 4, 4], // Y
    [0, 31, 1, 2, 4, 8, 16, 31], // Z
    [0, 14, 8, 8, 8, 8, 8, 14], // [
    [0, 0, 16, 8, 4, 2, 1], // \
    [0, 14, 2, 2, 2, 2, 2, 14], // ]
    [0, 4, 10, 17], // ^
    [0, 0, 0, 0, 0, 0, 0, 31], // _
    [0, 8, 4, 2], // `
    [0, 0, 0, 14, 1, 15, 17, 15], // a
    [0, 16, 16, 22, 25, 17, 17, 30], // b
    [0, 0, 0, 14, 16, 16, 17, 14], // c
    [0, 1, 1, 13, 19, 17, 17, 15], // d
    [0, 0, 0, 14, 17, 31, 16, 14], // e
    [0, 6, 9, 8, 28, 8, 8, 8], // f
    [0, 0, 15, 17, 17, 15, 1, 14], // g
    [0, 16, 16, 22, 25, 17, 17, 17], // h
    [0, 4, 0, 4, 12, 4, 4, 14], // i
    [0, 2, 0, 6, 2, 2, 18, 12], // j
    [0, 16, 16, 18, 20, 24, 20, 18], // k
    [0, 12, 4, 4, 4, 4, 4, 31], // l
    [0, 0, 0, 26, 21, 21, 17, 17], // m
    [0, 0, 0, 22, 25, 17, 17, 17], // n
    [0, 0, 0, 14, 17, 17, 17, 14], // o
    [0, 0, 0, 30, 17, 30, 16, 16], // p
    [0, 0, 0, 13, 19, 15, 1, 1], // q
    [0, 0, 0, 22, 25, 16, 16, 16], // r
    [0, 0, 0, 14, 16, 14, 1, 30], // s
    [0, 8, 8, 28, 8, 8, 9, 6], // t
    [0, 0, 0, 17, 17, 17, 19, 13], // u
    [0, 0, 0, 17, 17, 17, 10, 4], // v
    [0, 0, 0, 17, 17, 21, 21, 10], // w
    [0, 0, 0, 17, 10, 4, 10, 17], // x
    [0, 0, 0, 17, 17, 15, 1, 14], // y
    [0, 0, 0, 31, 2, 4, 8, 31], // z
    [0, 2, 4, 4, 8, 4, 4, 2], // {
    [0, 4, 4, 4, 4, 4, 4, 4], // |
    [0, 8, 4, 4, 2, 4, 4, 8], // }
    [0, 0, 0, 0, 13, 18], // ~
    [0, 4, 10, 17, 17, 17, 31], // del

    [0, 31, 17, 16, 30, 17, 17, 30], // .B
    [15, 5, 5, 9, 17, 31, 17, 17], // .D
    [0, 21, 21, 21, 14, 21, 21, 21], // .Zh
    [0, 30, 1, 1, 6, 1, 1, 30], // .Z
    [0, 17, 17, 19, 21, 25, 17, 17], // .I
    [10, 4, 17, 19, 21, 25, 17, 17], // .J
    [0, 15, 5, 5, 5, 5, 21, 9], // .L
    [0, 31, 17, 17, 17, 17, 17, 17], // .P
    [0, 17, 17, 17, 10, 4, 8, 16], // .U
    [0, 17, 17, 17, 17, 17, 31, 1], // .Ts
    [0, 17, 17, 17, 15, 1, 1, 1], // .Ch
    [0, 0, 21, 21, 21, 21, 21, 31], // .Sh
    [0, 21, 21, 21, 21, 21, 31, 1], // .Sch
    [0, 24, 8, 8, 14, 9, 9, 14], // .'
    [0, 17, 17, 17, 25, 21, 21, 25], // .Y
    [0, 14, 17, 5, 11, 1, 17, 14], // .E
    [0, 0, 0, 9, 21, 18, 18, 13], // alpha
    [0, 4, 6, 5, 5, 4, 28, 28], // note
    [0, 31, 17, 16, 16, 16, 16, 16], // .G
    [0, 0, 0, 31, 10, 10, 10, 19], // pi
    [0, 31, 16, 8, 4, 8, 16, 31], // Sigma
    [0, 0, 0, 15, 18, 18, 18, 12], // sigma
    [6, 5, 7, 5, 5, 29, 27, 3], // notes
    [0, 0, 1, 14, 20, 4, 4, 2], // tau
    [0, 4, 14, 14, 14, 31, 4], // bell
    [0, 14, 17, 17, 31, 17, 17, 14], // Theta
    [0, 0, 14, 17, 17, 17, 10, 27], // Omega
    [0, 6, 9, 4, 10, 17, 17, 14], // delta
    [0, 0, 0, 11, 21, 26], // inf
    [0, 0, 10, 31, 31, 31, 14, 4], // heart
    [0, 0, 0, 14, 16, 12, 17, 14], // epsilon
    [0, 14, 17, 17, 17, 17, 17, 17],
    [0, 27, 27, 27, 27, 27, 27, 27],
    [0, 4, 0, 0, 4, 4, 4, 4], // !!
    [0, 4, 14, 20, 20, 21, 14, 4], // cent
    [0, 6, 8, 8, 28, 8, 9, 22], // pound
    [0, 0, 17, 14, 10, 14, 17], // money
    [0, 17, 10, 31, 4, 31, 4, 4], // yen
    [0, 4, 4, 4, 0, 4, 4, 4], // pipe
    [0, 6, 9, 4, 10, 4, 18, 12], // paragraph
    [0, 2, 5, 4, 31, 4, 20, 8], // f
    [0, 31, 17, 21, 23, 21, 17, 31], // (C)
    [0, 14, 1, 15, 17, 15, 0, 31], // a_
    [0, 0, 5, 10, 20, 10, 5], // <<
    [0, 18, 21, 21, 29, 21, 21, 18], // .Ju
    [0, 15, 17, 17, 15, 5, 9, 17], // .Ja
    [0, 31, 17, 21, 17, 19, 21, 31], // (R)
    [0, 4, 8, 12], // `
    [12, 18, 18, 18, 12], // 0
    [0, 4, 4, 31, 4, 4, 0, 31], // +-
    [12, 18, 4, 8, 30], // 2
    [28, 2, 12, 2, 28], // 3
    [28, 18, 28, 16, 18, 23, 18, 3], // Pt
    [0, 17, 17, 17, 19, 29, 16, 16], // mu
    [0, 15, 19, 19, 15, 3, 3, 3], // pilcrow
    [0, 0, 0, 0, 12, 12], // dot
    [0, 0, 0, 10, 17, 21, 21, 10], // omega
    [8, 24, 8, 8, 28], // 1
    [0, 14, 17, 17, 17, 14, 0, 31], // o_
    [0, 0, 20, 10, 5, 10, 20], // >>
    [17, 18, 20, 10, 22, 10, 15, 2], // 1/4
    [17, 18, 20, 10, 21, 1, 2, 7], // 1/2
    [24, 8, 24, 9, 27, 5, 7, 1], // 3/4
    [0, 4, 0, 4, 8, 16, 17, 14], // !?
    [8, 4, 4, 10, 17, 31, 17, 17], // A\
    [2, 4, 4, 10, 17, 31, 17, 17], // A/
    [4, 10, 0, 14, 17, 31, 17, 17], // A^
    [13, 18, 0, 14, 17, 31, 17, 17], // A~
    [10, 0, 4, 10, 17, 31, 17, 17], // A:
    [4, 10, 4, 10, 17, 31, 17, 17], // Ao
    [0, 7, 12, 20, 23, 28, 20, 23], // AE
    [14, 17, 16, 16, 17, 14, 2, 6], // C,
    [8, 4, 0, 31, 16, 30, 16, 31], // E\
    [2, 4, 0, 31, 16, 30, 16, 31], // E/
    [4, 10, 0, 31, 16, 30, 16, 31], // E^
    [0, 10, 0, 31, 16, 30, 16, 31], // E:
    [8, 4, 0, 14, 4, 4, 4, 14], // I\
    [2, 4, 0, 14, 4, 4, 4, 14], // I/
    [4, 10, 0, 14, 4, 4, 4, 14], // I^
    [0, 10, 0, 14, 4, 4, 4, 14], // I:
    [0, 14, 9, 9, 29, 9, 9, 14], // -D
    [13, 18, 0, 17, 25, 21, 19, 17], // N~
    [8, 4, 14, 17, 17, 17, 17, 14], // O\
    [2, 4, 14, 17, 17, 17, 17, 14], // O/
    [4, 10, 0, 14, 17, 17, 17, 14], // O^
    [13, 18, 0, 14, 17, 17, 17, 14], // O~
    [10, 0, 14, 17, 17, 17, 17, 14], // O:
    [0, 0, 17, 10, 4, 10, 17], // X
    [0, 14, 4, 14, 21, 14, 4, 14], // .F
    [8, 4, 17, 17, 17, 17, 17, 14], // U\
    [2, 4, 17, 17, 17, 17, 17, 14], // U/
    [4, 10, 0, 17, 17, 17, 17, 14], // U^
    [10, 0, 17, 17, 17, 17, 17, 14], // U:
    [2, 4, 17, 10, 4, 4, 4, 4], // Y/
    [24, 8, 14, 9, 9, 14, 8, 28], // -P
    [0, 6, 9, 9, 14, 9, 9, 22], // beta
    [8, 4, 0, 14, 1, 15, 17, 15], // a\
    [2, 4, 0, 14, 1, 15, 17, 15], // a/
    [4, 10, 0, 14, 1, 15, 17, 15], // a^
    [13, 18, 0, 14, 1, 15, 17, 15], // a~
    [0, 10, 0, 14, 1, 15, 17, 15], // a:
    [4, 10, 4, 14, 1, 15, 17, 15], // ao
    [0, 0, 26, 5, 15, 20, 21, 10], // ae
    [0, 0, 14, 16, 17, 14, 4, 12], // c,
    [8, 4, 0, 14, 17, 31, 16, 14], // e\
    [2, 4, 0, 14, 17, 31, 16, 14], // e/
    [4, 10, 0, 14, 17, 31, 16, 14], // e^
    [0, 10, 0, 14, 17, 31, 16, 14], // e:
    [8, 4, 0, 4, 12, 4, 4, 14], // i\
    [2, 4, 0, 4, 12, 4, 4, 14], // i/
    [4, 10, 0, 4, 12, 4, 4, 14], // i^
    [0, 10, 0, 4, 12, 4, 4, 14], // i:
    [0, 20, 8, 20, 2, 15, 17, 14], // -d
    [13, 18, 0, 22, 25, 17, 17, 17], // n~
    [8, 4, 0, 14, 17, 17, 17, 14], // o\
    [2, 4, 0, 14, 17, 17, 17, 14], // o/
    [0, 4, 10, 0, 14, 17, 17, 14], // o^
    [0, 13, 18, 0, 14, 17, 17, 14], // o~
    [0, 10, 0, 14, 17, 17, 17, 14], // o:
    [0, 0, 4, 0, 31, 0, 4], // :/
    [0, 2, 4, 14, 21, 14, 4, 8], // .f
    [8, 4, 0, 17, 17, 17, 19, 13], // u\
    [2, 4, 0, 17, 17, 17, 19, 13], // u/
    [4, 10, 0, 17, 17, 17, 19, 13], // u^
    [0, 10, 0, 17, 17, 17, 19, 13], // u:
    [2, 4, 0, 17, 17, 15, 1, 14], // y/
    [0, 12, 4, 6, 5, 6, 4, 14], // p-
    [0, 10, 0, 17, 17, 15, 1, 14] // y:
  ],
  cmap: {
    // Greek
    0x391: 0x41, 0x392: 0x42, 0x393: 0x92, 0x395: 0x45, 0x396: 0x5a, 0x397: 0x48, 0x398: 0x99, 0x399: 0x49,
    0x39a: 0x4b, 0x39c: 0x4d, 0x39d: 0x4e, 0x39f: 0x4f, 0x3a0: 0x87, 0x3a1: 0x50, 0x3a3: 0x94, 0x3a4: 0x54,
    0x3a5: 0x59, 0x3a6: 0xd8, 0x3a7: 0x58, 0x3a9: 0x9a, 0x3aa: 0xcf, 0x3ab: 0xff, 0x3b1: 0x90, 0x3b2: 0xdf,
    0x3b4: 0x9b, 0x3b5: 0x9e, 0x3b8: 0x99, 0x3bc: 0xb5, 0x3bf: 0x6f, 0x3c0: 0x93, 0x3c3: 0x95, 0x3c4: 0x97, 0x3c9: 0xb8,
    // Cyrillic
    0x400: 0xc8, 0x450: 0xc8, 0x401: 0xcb, 0x451: 0xcb, 0x404: 0x45, 0x454: 0x45, 0x405: 0x53, 0x455: 0x53,
    0x406: 0x49, 0x456: 0x49, 0x407: 0xcf, 0x457: 0xcf, 0x408: 0x4a, 0x458: 0x4a,
    0x410: 0x41, 0x430: 0x41, 0x411: 0x80, 0x431: 0x80, 0x412: 0x42, 0x432: 0x42, 0x413: 0x92, 0x433: 0x92,
    0x414: 0x81, 0x434: 0x81, 0x415: 0x45, 0x435: 0x45, 0x416: 0x82, 0x436: 0x82, 0x417: 0x83, 0x437: 0x83,
    0x418: 0x84, 0x438: 0x84, 0x419: 0x85, 0x439: 0x85, 0x41a: 0x4b, 0x43a: 0x4b, 0x41b: 0x86, 0x43b: 0x86,
    0x41c: 0x4d, 0x43c: 0x4d, 0x41d: 0x48, 0x43d: 0x48, 0x41e: 0x4f, 0x43e: 0x4f, 0x41f: 0x87, 0x43f: 0x87,
    0x420: 0x50, 0x440: 0x50, 0x421: 0x43, 0x441: 0x43, 0x422: 0x54, 0x442: 0x54, 0x423: 0x88, 0x443: 0x88,
    0x424: 0xd8, 0x444: 0xd8, 0x425: 0x58, 0x445: 0x58, 0x426: 0x89, 0x446: 0x89, 0x427: 0x8a, 0x447: 0x8a,
    0x428: 0x8b, 0x448: 0x8b, 0x429: 0x8c, 0x449: 0x8c, 0x42a: 0x8d, 0x44a: 0x8d, 0x42b: 0x8e, 0x44b: 0x8e,
    0x42c: 0x62, 0x44c: 0x62, 0x42d: 0x8f, 0x44d: 0x8f, 0x42e: 0xac, 0x44e: 0xac, 0x42f: 0xad, 0x44f: 0xad,
    // Misc
    0x201c: 0x12, 0x201d: 0x13, 0x20a7: 0xb4, 0x2190: 0x1b, 0x2191: 0x18, 0x2192: 0x1a, 0x2193: 0x19, 0x21b2: 0x17,
    0x2211: 0x94, 0x221e: 0x9c, 0x2229: 0x9f, 0x222a: 0x55, 0x222e: 0xf8, 0x2264: 0x1c, 0x2265: 0x1d, 0x22c2: 0x9f,
    0x22c3: 0x55, 0x237a: 0x90, 0x23eb: 0x14, 0x23ec: 0x15, 0x23f4: 0x11, 0x23f5: 0x10, 0x23f6: 0x1e, 0x23f7: 0x1f,
    0x23f8: 0xa0, 0x23fa: 0x16, 0x2665: 0x9d, 0x2669: 0x91, 0x266a: 0x91, 0x266b: 0x92, 0x266c: 0x92, 0x2a0d: 0xa8,
    0xffe5: 0xa5, 0x5186: 0xa5, // Yen characters
    0x1F514: 0x98
  }
};

////////////////////////////
  CharLCD.GraphicLCD = GraphicLCD;
  return CharLCD;
});
