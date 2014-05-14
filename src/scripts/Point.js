'use strict';

/**
 * @namespace tetris
 */
(function (window, undefined) {

/**
 * Location in (x, y) coordinate space.
 *
 * Use Point.of() instead of new Point() to create an instance
 * if you want to use cached objects.
 *
 * @class tetris.Point
 * @immutable
 */
function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.add = function (p) {
  return Point.of(this.x + p.x, this.y + p.y);
};

Point.prototype.addX = function (x) {
  return Point.of(this.x + x, this.y);
};

Point.prototype.addY = function (y) {
  return Point.of(this.x, this.y + y)
};

Point.prototype.subtract = function (p) {
  return Point.of(this.x - p.x, this.y - p.y);
};

Point.of = function (x, y) {
  var a = Point._cache[x],
      b = a ? a[y] : (Point._cache[x] = {}, null);
  return b || (Point._cache[x][y] = new Point(x, y));
};

Point.arrayOf = function () {
  var a = [], i, n;
  for (i = 0, n = arguments.length; i < n; i += 2) {
    a.push(Point.of(arguments[i], arguments[i + 1]));
  }
  return a;
};

Point._cache = {};

window.tetris.Point = Point;

})(this);
