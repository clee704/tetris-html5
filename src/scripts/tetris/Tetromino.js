/**
 * @namespace tetris
 */
define(['./Point'], function (Point) {
'use strict';

/**
 * Tetromino with a specific shape and rotation.
 *
 * Use Tetromino.of() instead of new Tetromino() to create an instance
 * for both convenience and performance.
 *
 * @class tetris.Tetromino
 * @immutable
 */
function Tetromino(name, rotation, geometry, offset, center) {
  this.name = name;          // one of I, J, L, O, S, T, Z
  this.rotation = rotation;  // 0 on spawn; +1 for one right rotation; max 3
  this.geometry = geometry;  // points on which this piece occupies
  this.offset = offset;      // see www.tetrisconcept.net/wiki/SRS
  this.center = center;
}

Tetromino.prototype.rotateLeft = function () {
  return Tetromino.of(this.name, (this.rotation + 3) % 4);
};

Tetromino.prototype.rotateRight = function () {
  return Tetromino.of(this.name, (this.rotation + 1) % 4);
};

Tetromino.prototype.rotate = function (rotation) {
  return Tetromino.of(this.name, rotation);
};

Tetromino.of = function (name, rotation) {
  var a, b, c, g, o;
  a = Tetromino._cache[name];
  b = a ? a[rotation] : (Tetromino._cache[name] = {}, null);
  if (b) return b;
  g = Tetromino._geometries[name][rotation];
  o = (Tetromino._offsets[name] || Tetromino._offsets.others)[rotation];
  c = Tetromino._center(g);
  return (Tetromino._cache[name][rotation] =
          new Tetromino(name, rotation, g, o, c));
};

Tetromino._cache = {};

function rotations(base) {
  var ret = {0: base},
      i, j, n = base.length;
  for (i = 1; i <= 3; ++i) {
    ret[i] = [];
    for (j = 0; j < n; ++j) {
      ret[i][j] = rotateRight(ret[i - 1][j]);
    }
  }
  return ret;
}

function rotateRight(p) {
  return Point.of(p.y, -p.x);
}

Tetromino._geometries = {
  'I': rotations(Point.arrayOf(-1, 0, 0, 0, 1, 0, 2, 0)),
  'J': rotations(Point.arrayOf(-1, 1,-1, 0, 0, 0, 1, 0)),
  'L': rotations(Point.arrayOf( 1, 1,-1, 0, 0, 0, 1, 0)),
  'O': rotations(Point.arrayOf( 0, 1, 1, 1, 0, 0, 1, 0)),
  'S': rotations(Point.arrayOf( 0, 1, 1, 1,-1, 0, 0, 0)),
  'T': rotations(Point.arrayOf( 0, 1,-1, 0, 0, 0, 1, 0)),
  'Z': rotations(Point.arrayOf(-1, 1, 0, 1, 0, 0, 1, 0))
};

Tetromino._offsets = {
  'O': {
    0: Point.arrayOf( 0, 0),
    1: Point.arrayOf( 0,-1),
    2: Point.arrayOf(-1,-1),
    3: Point.arrayOf(-1, 0)
  },
  'I': {
    0: Point.arrayOf( 0, 0,-1, 0, 2, 0,-1, 0, 0,-2),
    1: Point.arrayOf(-1, 0, 0, 0, 0, 0, 0, 1, 0,-2),
    2: Point.arrayOf(-1, 1, 1, 1,-2, 1, 1, 0,-2, 0),
    3: Point.arrayOf( 0, 1, 0, 1, 0, 1, 0,-1, 0, 2)
  },
  'others': {
    0: Point.arrayOf( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    1: Point.arrayOf( 0, 0, 1, 0, 1,-1, 0, 2, 1, 2),
    2: Point.arrayOf( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    3: Point.arrayOf( 0, 0,-1, 0,-1,-1, 0, 2,-1, 2)
  }
};

Tetromino._center = function (geometry) {
  var mx = -Infinity,
      my = -Infinity,
      nx = Infinity,
      ny = Infinity,
      i, n, p;
  for (i = 0, n = geometry.length; i < n; ++i) {
    p = geometry[i];
    mx = Math.max(mx, p.x);
    my = Math.max(my, p.y);
    nx = Math.min(nx, p.x);
    ny = Math.min(ny, p.y);
  }
  return Point.of((mx + nx) / 2, (my + ny) / 2);
};

return Tetromino;

});
