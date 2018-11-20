(function(global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  }
  else if (typeof define === 'function' && define.amd) {
    define('CharLCD', [], factory);
  }
  else {
    if (!global) global = window;
    global.CharLCD = factory();
  }
})(this, function() {
////////////////////////////

var CW = 5; // charachter width
var CH = 8; // character height
var CL = 10; // large character height

function CharLCD(obj) {
  var _ = {
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
    ]
  };
  _.arg = {
    rows: 2,
    cols: 16,
    pix: 3,
    brk: 1,
    off: '#cd2',
    on: '#143'
  };
  if (obj) for (var key in obj) {
    if (typeof _.arg[key] != 'undefined' && _.arg[key] == parseInt(_.arg[key])) { // numeric
      if (obj[key] == parseInt(obj[key]) && obj[key] > 0) _.arg[key] = parseInt(obj[key]);
    }
    else _.arg[key] = obj[key];
  }
  create(_);
  this.set = function(r, c, data) { set(_, r, c, data); };
  this.char = function(r, c, ch) { char(_, r, c, ch); };
  this.text = function(r, c, str) { text(_, r, c, str); };
  this.font = function(n, data) { font(_, n, data); };
}

function create(_) {
  if (typeof _.arg.at == 'string') _.arg.at = document.getElementById(_.arg.at);
  if (_.arg.at) {
    try {
      createAt(_);
      return;
    }
    catch(e) {}
  }
  var bottom = document.createElement('div');
  document.body.appendChild(bottom);
  _.arg.at = bottom;
  createAt(_);
}

function createAt(_) {
  var r, c, rr, cc, x, y, xx, yy, pix;
  var cell = _.arg.pix + _.arg.brk;
  var HH = _.arg.large ? CL : CH;

  var lcd = document.createElement('div');
  lcd.style.position = 'relative';
  lcd.style.display = 'inline-block';
  lcd.style.width = cell * ((1 + CW) * _.arg.cols + 1) + _.arg.brk + 'px';
  lcd.style.height = cell * ((1 + HH) * _.arg.rows + 1) + _.arg.brk + 'px';
  lcd.style.backgroundColor = _.arg.off;
  _.pix = [];
  _.txt = [];

  for (r = 0; r < _.arg.rows; r++) {
    for (c = 0; c < _.arg.cols; c++) {
      for (rr = 0; rr < CH; rr++) {
        for (cc = 0; cc < CW; cc++) {
          x = cell * ((1 + CW) * c + 1 + cc) + _.arg.brk;
          y = cell * ((1 + HH) * r + 1 + rr) + _.arg.brk;
          pix = document.createElement('div');
          pix.style.position = 'absolute';
          pix.style.display = 'inline-block';
          pix.style.top = y + 'px';
          pix.style.left = x + 'px';
          pix.style.width = _.arg.pix + 'px';
          pix.style.height = _.arg.pix + 'px';
          pix.style.backgroundColor = _.arg.off;
          _.pix.push(pix);
          lcd.appendChild(pix);
        }
      }
    }
  }
  _.arg.at.appendChild(lcd);
}

function set(_, r, c, data) {
  if (r != parseInt(r) || r < 0 || r >= _.arg.rows || c != parseInt(c) || c < 0 || c >= _.arg.cols) return;
  if (!data) data = [];
  var offset = (r * _.arg.cols + c) * CW * CH - 1;
  for (var i = 0; i < CH; i++) {
    var mask = (data[i] == parseInt(data[i])) ? parseInt(data[i]) : 0;
    for (var j = 0; j < CW; j++) {
      _.pix[offset + CW - j].style.backgroundColor = ((1 << j) & mask) ? _.arg.on : _.arg.off;
    }
    offset += CW;
  }
}

function char(_, r, c, ch) {
  set(_, r, c, _.font[ch.charCodeAt(0)]);
}

var _map = {
  0x5c: 0xa4, // backslash
  0xa5: 0x5c, 0xffe5: 0x5c, 0x5186: 0xfc, // Yen characters
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

};

function text(_, r, c, str) {
  if (r != parseInt(r) || r < 0 || r >= _.arg.rows || c != parseInt(c) || c < 0 || c >= _.arg.cols) return;
  var i, k, x;
  for (i = 0; i < str.length; i++) {
    if (str[i] == '\n') {
      c = 0;
      r++;
      if (r >= _.arg.rows) return;
    }
    else {
      if (c >= _.arg.cols) continue;
      x = str.charCodeAt(i);
      if (_map[x]) x = _map[x];
      if (x instanceof Array) {
        for (j = 0; j < x.length; j++) {
          char(_, r, c, String.fromCharCode(x[j]));
          c++;
        }
      }
      else {
        if (x > 255) x = 255;
        char(_, r, c, String.fromCharCode(x));
        c++;
      }
    }
  }
}

function font(_, n, data) {
  _.font[n] = data;
}

////////////////////////////
  return CharLCD;
});
