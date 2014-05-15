/**
 * @namespace tetris
 */
define(['./Arrays', './Point', './Tetromino'],
       function (Arrays, Point, Tetromino) {
'use strict';

/**
 * @class tetris.SimulatorBase
 */
function SimulatorBase(simulator) {

  this._simulator = simulator;

  this._cols = null;
  this._rows = null;
  this._spawnPoint = null;

  this._playfield = null;
  this._bag = [];
  this._fallingPiece = null;
  this._fallingPoint = null;
  this._ghostPoint = null;
  this._holdPiece = null;
  this._holdReady = null;
  this._stopped = true;

  /* The following is needed to implement IRS, IHS */
  this._chargedOperations = [];
  this._uncharging = null;

  /* The following is needed to implement T-spin detection */
  this._diagonalPoints = Point.arrayOf(1, 1, 1,-1,-1, 1,-1,-1);
  this._lastAttemptedMove = null;
  this._lastSuccessfulMove = null;
  this._kick = null;
}

SimulatorBase.prototype.start = function (cols, rows, spawnPoint) {
  this._cols = cols;
  this._rows = rows;
  this._spawnPoint = spawnPoint;
  this._playfield = Arrays.repeat(rows + 4, cols).map(
    function (cols) {
      return Arrays.repeat(cols, 0);
    });
  this._bag.length = 0;
  this._fillBag();
  this._fallingPiece = null;
  this._fallingPoint = null;
  this._ghostPoint = null;
  this._holdPiece = null;
  this._holdReady = true;
  this._chargedOperations.length = 0;
  this._uncharging = false;
  this._stopped = false;
};

SimulatorBase.prototype.spawn = function () {
  var i, n, op;
  if (this._fallingPiece || this._stopped) return;
  this._fallingPiece = this._bag.shift();
  this._fallingPoint = this._spawnPoint;
  this._ghostPoint = this._computeGhost();
  this._holdReady = true;
  if (this._bag.length < 7) this._fillBag();
  if (this._uncharging) return;
  if (this._chargedOperations.length > 0) {
    this._uncharging = true;
    for (i = 0, n = this._chargedOperations.length; i < n; ++i) {
      op = this._chargedOperations.shift();
      op.call(this);
    }
    this._uncharging = false;
  }
  this._simulator.onPreviewUpdate(this._bag);
  this._simulator.onPieceSpawn(this._fallingPiece, this._fallingPoint,
                               this._ghostPoint);
  this._move(this._fallingPiece, this._fallingPoint, false, this._stop);
};

SimulatorBase.prototype.drop = function () {
  this._drop(true);
};

SimulatorBase.prototype.softDrop = function () {
  return this._drop(false);
};

SimulatorBase.prototype.hardDrop = function () {
  var distance;
  this._lastAttemptedMove = this._drop;
  if (!this._active()) {
    return 0;
  }
  distance = this._fallingPoint.y - this._ghostPoint.y;
  if (distance > 0) {
    this._lastSuccessfulMove = this._lastAttemptedMove;
  }
  this._fallingPoint = this._ghostPoint;
  this._simulator.onPieceMove(this._fallingPiece, this._fallingPoint,
                              this._ghostPoint, true);
  this._lock();
  return distance;
};

SimulatorBase.prototype.shiftLeft = function () {
  this._shift(-1);
};

SimulatorBase.prototype.shiftRight = function () {
  this._shift(1);
};

SimulatorBase.prototype.rotateLeft = function () {
  this._rotate(-1);
};

SimulatorBase.prototype.rotateRight = function () {
  this._rotate(1);
};

SimulatorBase.prototype.hold = function () {
  var temp;
  this._lastAttemptedMove = this._hold;
  if (!this._active()) {
    this._chargedOperations.push(this._hold);
    return;
  }
  if (!this._holdReady ||
      this._holdPiece &&
      this._checkCollision(this._holdPiece, this._spawnPoint)) {
    this._simulator.onHoldPieceFail();
    return;
  }
  temp = this._holdPiece;
  this._holdPiece = this._fallingPiece.rotate(0);
  this._simulator.onHoldPiece(this._holdPiece);
  if (temp) {
    this._move(temp, this._spawnPoint, true, null);
  } else {
    this._fallingPiece = null;
    this.spawn();
  }
  this._holdReady = false;
};

SimulatorBase.prototype._fillBag = function () {
  /* Using an array literal instead of the Array constructor
     causes a problem in Opera */
  var remainders = new Array('I', 'J', 'L', 'O', 'S', 'Z', 'T'),
      i;
  while (remainders.length > 0) {
    i = Math.floor(Math.random() * remainders.length);
    this._bag.push(Tetromino.of(remainders[i], 0));
    Arrays.remove(remainders, i);
  }
};

SimulatorBase.prototype._computeGhost = function () {
  var p = this._fallingPoint, q;
  while (!this._checkCollision(this._fallingPiece, q = p.addY(-1))) {
    p = q;
  }
  return p;
};

SimulatorBase.prototype._stop = function () {
  this._stopped = true;
  this._merge();
  this._simulator.onBlockOut();
};

SimulatorBase.prototype._drop = function (shouldLock) {
  var resolveFunc;
  this._lastAttemptedMove = this._drop;
  if (!this._active()) return 0;
  resolveFunc = shouldLock ? this._lock : null;
  if (this._move(this._fallingPiece, this._fallingPoint.addY(-1), false,
                 resolveFunc)) {
    return 1;
  }
};

SimulatorBase.prototype._shift = function (dir) {
  this._lastAttemptedMove = this._shift;
  if (!this._active()) return;
  this._move(this._fallingPiece, this._fallingPoint.addX(dir), true, null);
};

SimulatorBase.prototype._rotate = (function () {
  var rotatedPiece, offset = [];
  function resolve() {
    // jshint validthis:true
    var i, n, p;
    this._kick = true;
    for (i = 1, n = offset.length; i < n; ++i) {
      p = this._fallingPoint.add(offset[i]);
      if (!this._checkCollision(rotatedPiece, p)) return p;
    }
  }
  return function (dir) {
    var i, n;
    this._lastAttemptedMove = this._rotate;
    if (!this._active()) {
      this._chargedOperations.push(dir === -1 ? this._rotateLeft :
                                                this._rotateRight);
      return;
    }
    rotatedPiece = dir === 1 ? this._fallingPiece.rotateRight() :
                               this._fallingPiece.rotateLeft();
    for (i = 0, n = this._fallingPiece.offset.length; i < n; ++i) {
      offset[i] = this._fallingPiece.offset[i].subtract(
        rotatedPiece.offset[i]);
    }
    offset.length = n;
    this._kick = false;
    this._move(rotatedPiece, this._fallingPoint.add(offset[0]), true, resolve);
  };
})();

SimulatorBase.prototype._move = function (piece, point, updateGhost,
                                          resolveFunc) {
  var landed;
  if (this._checkCollision(piece, point)) {
    if (!resolveFunc || !(point = resolveFunc.call(this, piece, point))) {
      return false;
    }
  }
  this._lastSuccessfulMove = this._lastAttemptedMove;
  this._fallingPiece = piece;
  this._fallingPoint = point;
  if (updateGhost) {
    this._ghostPoint = this._computeGhost();
  }
  if (!this._uncharging) {
    landed = this._checkCollision(this._fallingPiece,
                                  this._fallingPoint.addY(-1));
    this._simulator.onPieceMove(this._fallingPiece, this._fallingPoint,
                                this._ghostPoint, landed);
  }
  return true;
};

SimulatorBase.prototype._checkCollision = function (piece, point) {
  var i, n, q;
  for (i = 0, n = piece.geometry.length; i < n; ++i) {
    q = piece.geometry[i].add(point);
    if (q.y < 0 || q.x >= this._cols || q.x < 0 || this._playfield[q.y][q.x]) {
      return true;
    }
  }
  return false;
};

SimulatorBase.prototype._lock = function () {
  var rawTspin = false, count, i, q;
  if (this._fallingPiece.name === 'T' &&
      this._lastSuccessfulMove === this._rotate) {
    count = 0;
    for (i = 0; i < 4; ++i) {
      q = this._fallingPoint.add(this._diagonalPoints[i]);
      if (q.y < 0 ||
          q.x >= this._cols ||
          q.x < 0 ||
          this._playfield[q.y][q.x]) {
        count += 1;
      }
    }
    if (count >= 3) {
      rawTspin = true;
    }
  }
  this._merge();
  this._simulator.onPieceLock(this._playfield, this._clearLines(), rawTspin,
                              this._kick);
};

SimulatorBase.prototype._merge = function () {
  var i, n, q;
  for (i = 0, n = this._fallingPiece.geometry.length; i < n; ++i) {
    q = this._fallingPiece.geometry[i].add(this._fallingPoint);
    this._playfield[q.y][q.x] = this._fallingPiece.name;
  }
  this._fallingPiece = null;
  this._fallingPoint = null;
  this._ghostPoint = null;
};

SimulatorBase.prototype._active = function () {
  return this._fallingPiece && !this._stopped;
};

SimulatorBase.prototype._clearLines = function () {
  var lines = [], height, i, n, j, k;
  for (i = 0, n = this._playfield.length; i < n; ++i) {
    if (this._playfield[i].every(SimulatorBase._nonZero)) {
      lines.push(i);
    } else if (this._playfield[height = i].every(SimulatorBase._zero)) {
      break;
    }
  }
  i = 0;
  j = lines[0];
  k = 1;
  while (i < lines.length && j < height) {
    j += 1;
    while (j === lines[i + 1]) {
      i += 1;
      j += 1;
      k += 1;
    }
    Arrays.copy(this._playfield[j], this._playfield[j - k]);
  }
  for (i = j - k; i < j; ++i) {
    Arrays.fill(this._playfield[i], 0);
  }
  return lines;
};

SimulatorBase._zero = function (x) {
  return x === 0;
};

SimulatorBase._nonZero = function (x) {
  return x !== 0;
};

return SimulatorBase;

});
