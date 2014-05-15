'use strict';

/**
 * @namespace tetris
 */
define(function () {

/**
 * Color in both RGB and HSL values, with an optional alpha-channel.
 *
 * Use Color.fromRGB() and Color.fromHSL() instead of new Color()
 * to create an instance.
 *
 * @class tetris.Color
 * @immutable
 */
function Color(r, g, b, h, s, l, a) {
  this.r = Color._clamp(r, 0, 255);
  this.g = Color._clamp(g, 0, 255);
  this.b = Color._clamp(b, 0, 255);
  this.h = (h % 360 + 360) % 360;
  this.s = Color._clamp(s, 0, 100);
  this.l = Color._clamp(l, 0, 100);
  this.a = a === undefined ? 1 : Color._clamp(a, 0, 1);
  r = Math.round(this.r);
  g = Math.round(this.g);
  b = Math.round(this.b);
  this.string = 'rgba(' + [r, g, b, this.a].join(',') + ')';
}

Color.prototype.brighter = function (multiplier) {
  return Color.fromHSL(this.h, this.s, this.l * multiplier, this.a);
};

Color.prototype.toString = function () {
  return this.string;
};

/**
 * Returns a Color object from the given RGB value.
 *
 * Note that the given value may be clampped if it is not in a proper
 * range (see below).
 *
 * Note also that although it is possible to specify floating values
 * for red, green and blue, the string representation (returned by
 * toString()) will show rounded integer values, in order to be
 * compatible with the CSS syntax.
 *
 * @param r  red [0.0, 255.0]
 * @param g  green [0.0, 255.0]
 * @param b  blue [0.0, 255.0]
 * @param a  alpha [0.0, 1.0] - optional (default: 1.0)
 */
Color.fromRGB = function (r, g, b, a) {
  var hsl = Color._RGBToHSL(r, g, b);
  return new Color(r, g, b, hsl.h, hsl.s, hsl.l, a);
};

/**
 * Returns a Color object from the given HSL value.
 *
 * Note that the given value may be clampped if it is not in a proper
 * range (see below).
 *
 * @param h  hue [0.0, 360.0)
 * @param s  saturation [0.0, 100.0]
 * @param l  lightness [0.0, 100.0]
 * @param a  alpha [0.0, 1.0] - optional (default: 1.0)
 */
Color.fromHSL = function (h, s, l, a) {
  var rgb = Color._HSLToRGB(h, s, l);
  return new Color(rgb.r, rgb.g, rgb.b, h, s, l, a);
};

/**
 * Returns a value in the range [min, max] based on the given value.
 * If the given value is in the range, then it is returned as-is.
 * Otherwise, a value in the range that is closest to the given value
 * is returned.
 */
Color._clamp = function (v, min, max) {
  return v < min ? min : v > max ? max : v;
};

Color._RGBToHSL = function (r, g, b) {
  var max, min, sum, diff, h, s, l;
  r = Color._clamp(r, 0, 255) / 255;
  g = Color._clamp(g, 0, 255) / 255;
  b = Color._clamp(b, 0, 255) / 255;
  max = Math.max(r, g, b);
  min = Math.min(r, g, b);
  sum = max + min;
  l = sum / 2;
  if (max === min) return {h: 0, s: 0, l: l * 100};
  diff = max - min;
  s = l < 0.5 ? diff / sum : diff / (2 - sum);
  h = r === max ? (g - b) / diff :
                  g === max ? 2 + (b - r) / diff :
                              4 + (r - g) / diff;
  return {h: h * 60, s: s * 100, l: l * 100};
};

Color._HSLToRGB = function (h, s, l) {
  var m1, m2;
  h = (h % 360 + 360) % 360 / 360;
  s = Color._clamp(s, 0, 100) / 100;
  l = Color._clamp(l, 0, 100) / 100;
  m2 = l < 0.5 ? l * (s + 1) : l + s - l * s;
  m1 = l * 2 - m2;
  return {
    r: Color._HueToRGB(m1, m2, h + 1 / 3),
    g: Color._HueToRGB(m1, m2, h),
    b: Color._HueToRGB(m1, m2, h - 1 / 3)
  };
};

Color._HueToRGB = function (m1, m2, h) {
  var x = m1;
  h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
  if (h * 6 < 1) {
    x = m1 + (m2 - m1) * h * 6;
  } else if (h * 2 < 1) {
    x = m2;
  } else if (h * 3 < 2) {
    x = m1 + (m2 - m1) * (2 / 3 - h) * 6;
  }
  return x * 255;
};

return Color;

});
