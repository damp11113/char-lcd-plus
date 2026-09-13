# char-lcd

[![npm](https://img.shields.io/npm/v/char-lcd.svg)](https://www.npmjs.com/package/char-lcd)

## Character LCD display emulator
Emulate **Hitachi HD44780** and compatible devices in HTML

##### HD44780-A00 (Japanese standard font)  
![polymer-char-lcd](https://jazz-soft.github.io/img/char-lcd-jp.png)

##### HD44780-A02 (European standard font)  
![polymer-char-lcd](https://jazz-soft.github.io/img/char-lcd-eu.png)

## Install

`npm install char-lcd --save`  
or `yarn add char-lcd`  
or clone the whole project from [**GitHub**](https://github.com/jazz-soft/char-lcd)

## Usage

##### Web Component (Polymer)

https://github.com/jazz-soft/polymer-char-lcd

##### Plain HTML

```html
<script src="char-lcd.js"></script>
//...
```

##### CDN (jsdelivr)

```html
<script src="https://cdn.jsdelivr.net/npm/char-lcd"></script>
//...
```

##### CDN (unpkg)

```html
<script src="https://unpkg.com/char-lcd"></script>
//...
```

##### CommonJS

```js
var CharLCD = require('char-lcd');
var GraphicLCD = require('char-lcd').GraphicLCD;
//...
```

##### TypeScript / ES6

```js
import { CharLCD, GraphicLCD } from 'char-lcd';
//...
```

##### AMD

```js
require(['char-lcd'], function(CharLCD) {
  // ...
});
```

## Example
```html
<div id="lcd"></div>

<script>
  var lcd = new CharLCD({ at: 'lcd', rows: 4, cols: 16, rom: 'eu' });

  // Example 1: Display a single custom character at row 0, column 0
  // To set a custom character, use String.fromCharCode to map a character byte (16-255).
  // In this case, use character code 16, which is the first non-blank character in the set.
  lcd.char(0, 0, String.fromCharCode(16));  // Set the custom character at row 0, column 0

  // Example 2: Display another custom character at row 1, column 0
  lcd.char(1, 0, String.fromCharCode(17));  // Set another custom character at row 1, column 0

  // Example 3: Display a string with mapped Unicode characters
  // The lcd.text() function will automatically map Unicode characters to the internal character set.
  lcd.text(2, 1, "Hello LCD!");
  lcd.text(3, 0, "ЁЛКИ-ПАЛКИ!");
</script>
```

## API
##### constructor
`var lcd = new CharLCD(params);`  
`params` is an object with the following keys:  
- `at`: a DOM element in which to place the object, or its `id`;
default: at the bottom of the page;  
- `rom`: `jp` (default) for Japanese standard font, or `eu` for European standard font.  
- `rows`: number of rows;
default: 2;  
- `cols`: number of columns;
default: 16;
- `pix`: pixel size; default: 3;
- `brk`: space between pixel; default: 1;
- `off`: character pixel off color (background, backlight color); default: #cd2;
- `on`: character pixel on color; default: #143;
- `transitionDuration`: character pixel transition duration; default: 100ms;
- `backlight`: backlight state, `true` or `false`; default: true; switching is instant, like a real LED backlight;
- `bright`: brightness of the display when the backlight is on, from 0 (black) to 1 (full colors); default: 1;
- `dim`: brightness of the display when the backlight is off, from 0 (black) to 1 (full colors); default: 0.4;
- `contrast`: contrast, from 0 to 1, like the contrast potentiometer on the real module; default: 0.5;  
at 0.5 the `on`/`off` colors are shown as is; lower values fade the text out,
higher values make the unlit 5x8 character blocks visible, and at 1 the blocks are fully dark;
- `block`: color of the unlit pixels at maximum contrast;
default: the `on` color for dark-on-light displays, or `#000` for light-on-dark (e.g. blue) displays;

Unlike the real hardware where only certain combinations of `rows`/`cols` exist, there are no restrictions in the simulator;


##### char(r, c, h)
`lcd.char(r, c, h);` - set the character at row `r`, column `c` to byte `h`.

##### text(r, c, s)
`lcd.text(r, c, s);` - print string `s` at row `r`, column `c`.  
This function treats `\n` as new line and maps UNICODE characters to the internal character set.

##### font(n, data)
`lcd.font(n, data);` - define the pixels for the `n`-th character; `data` is an array of up to 10 bytes.  
In real hardware, only first 8 characters can be changed, but there is no such limitation in the simulator.

##### clear()
`lcd.clear();` - clear all characters in LCD.

##### backlight(on)
`lcd.backlight(on);` - turn the backlight on (`true`) or off (`false`).  
`lcd.backlight();` - return the current backlight state.

##### contrast(k)
`lcd.contrast(k);` - set the contrast to `k` (from 0 to 1).  
`lcd.contrast();` - return the current contrast.

##### bright(k)
`lcd.bright(k);` - set the brightness with the backlight on to `k` (from 0 to 1).  
`lcd.bright();` - return the current value.

##### dim(k)
`lcd.dim(k);` - set the brightness with the backlight off to `k` (from 0 to 1).  
`lcd.dim();` - return the current value.

##### colors(c)
`lcd.colors(c);` - change the colors without re-creating the display;
`c` is an object with any of the `off` (backlight color), `on` and `block` keys; `block: null` goes back to the default.  
`lcd.colors();` - return the current colors.

```js
// blue display with visible character blocks
var lcd = new CharLCD({ at: 'lcd', off: '#2f46f0', on: '#dde3f2', contrast: 0.6 });
lcd.text(0, 0, 'Hello LCD!');
lcd.backlight(false); // display goes dark
lcd.backlight(!lcd.backlight()); // toggle
lcd.bright(0.8); // a bit darker with the backlight on
lcd.dim(0.1); // almost black with the backlight off
lcd.colors({ off: '#f80', on: '#310' }); // orange backlight, dark brown text
```

## GraphicLCD
Pixel matrix display without the character blocks, like the 128x64 graphic LCD modules.

```html
<div id="glcd"></div>
<div id="gray"></div>

<script>
  var glcd = new GraphicLCD({ at: 'glcd', width: 128, height: 64 });
  glcd.rect(0, 0, 128, 64);
  glcd.text(4, 4, 'Hello LCD!');
  glcd.line(4, 60, 60, 16);
  glcd.fillCircle(100, 40, 10);

  var gray = new GraphicLCD({ at: 'gray', width: 128, height: 64, grayscale: true });
  for (var x = 0; x < 128; x++) gray.line(x, 0, x, 63, x * 2); // gradient
</script>
```

##### constructor
`var glcd = new GraphicLCD(params);`  
`params` is an object with the following keys:  
- `width`: number of pixels in a row; default: 128;
- `height`: number of pixels in a column; default: 64;
- `grayscale`: `true` to allow pixel values from 0 to 255 instead of on/off; default: false;
- `at`, `rom`, `pix`, `brk`, `off`, `on`, `transitionDuration`, `backlight`, `bright`, `dim`, `contrast`, `block`: same as for `CharLCD`;

##### Drawing
The value `v` is optional, it turns the pixels fully on by default.  
Normal mode: 0 is off, anything else is on. Grayscale mode: from 0 (off) to 255 (fully on).  
`x, y` start from `0, 0` at the top left corner; anything outside the display is clipped.

- `glcd.pixel(x, y, v);` - set one pixel.
- `glcd.get(x, y);` - return the pixel value: 0 or 1, or from 0 to 255 in grayscale mode.
- `glcd.fill(v);` - set all pixels.
- `glcd.clear();` - turn all pixels off.
- `glcd.line(x0, y0, x1, y1, v);` - draw a line.
- `glcd.rect(x, y, w, h, v);` - draw a rectangle outline.
- `glcd.fillRect(x, y, w, h, v);` - draw a filled rectangle.
- `glcd.circle(x, y, r, v);` - draw a circle outline with the center at `x, y` and radius `r`.
- `glcd.fillCircle(x, y, r, v);` - draw a filled circle.
- `glcd.text(x, y, s, v, bg);` - print string `s` with the ROM font, starting at the top left corner `x, y`.
Each character takes 6x9 pixels, `\n` starts a new line.
If `bg` is given, the character cells are filled with it first, otherwise only the character pixels are drawn.
- `glcd.bitmap(x, y, w, h, data);` - draw a `w` x `h` image; `data` is an array of `w * h` values, row by row;
`null` or `undefined` values are skipped.
- `glcd.font(n, data);` - define the pixels for the `n`-th character, same as `CharLCD.font()`.

`backlight()`, `contrast()`, `bright()`, `dim()` and `colors()` work the same as for `CharLCD`.
