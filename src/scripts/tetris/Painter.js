'use strict';

/**
 * @namespace tetris
 */
define(['jquery', './Color', './Point'], function ($, Color, Point) {

/**
 * @class tetris.Painter
 * @singleton This class might not work when there are multiple instances
 */
function Painter(cols, rows, size) {

  this._COLS = cols;
  this._ROWS = rows;
  this._BLOCK_COLORS = {
    'I': Color.fromHSL(180, 100, 47.5),
    'O': Color.fromHSL(55, 100, 50),
    'T': Color.fromHSL(285, 100, 50),
    'S': Color.fromHSL(105, 100, 45),
    'Z': Color.fromHSL(5, 100, 45),
    'J': Color.fromHSL(240, 100, 50),
    'L': Color.fromHSL(35, 100, 47.5)
  };
  this._TEXTS = {
    lineClear: {1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS'},
    tspin: 'T-SPIN',
    combo: 'COMBO',
    b2b: 'BACK-TO-BACK'
  };
  this._DIGITS = [
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09'
  ];

  /* Pre-rendered block image data */
  this._blocks = {};

  /* Canvas elements and contexts */
  this._canvases = {};
  this._contexts = {};
  this._previewContexts = [];

  /* jQuery elements */
  this._labels = {};
  this._$actionLabel;
  this._$levelLabel;
  this._$scoreLabel;

  /* Small variables */
  this._size;
  this._width;
  this._height;
  this._state = {};

  this._init(size);
}

Painter.prototype.start = function () {
  var name, i, n;
  for (name in this._contexts) {
    Painter._clearCanvas(this._contexts[name]);
  }
  for (i = 0, n = this._previewContexts.length; i < n; ++i) {
    Painter._clearCanvas(this._previewContexts[i]);
  }
  for (name in this._labels) {
    Painter._clearText(this._labels[name]);
  }
  for (name in this._state) {
    delete this._state[name];
  }
};

Painter.prototype.drawFallingPiece = function (fallingPiece, fallingPoint,
                                               ghostPoint, landed) {
  var blocks;
  if (fallingPiece !== this._state.fallingPiece ||
      landed !== this._state.landed) {
    blocks = landed ? this._blocks.light : this._blocks.normal;
    this._drawPiece(this._contexts.fallingPiece, fallingPiece, blocks);
    this._drawPiece(this._contexts.ghostPiece, fallingPiece,
                    this._blocks.normal);
  }
  this._setPosition(this._canvases.fallingPiece, fallingPoint);
  this._setPosition(this._canvases.ghostPiece, ghostPoint);
  this._setState(fallingPiece, fallingPoint, ghostPoint, landed);
};

Painter.prototype.drawLockedPiece = function () {
  if (!this._state.fallingPiece) return;
  Painter._clearCanvas(this._contexts.fallingPiece);
  Painter._clearCanvas(this._contexts.ghostPiece);
  this._drawPiece(this._contexts.playfield, this._state.fallingPiece,
                  this._blocks.normal, this._state.fallingPoint);
  this._state.fallingPiece = null;
  this._state.fallingPoint = null;
  this._state.ghostPoint = null;
  this._state.landed = null;
};

Painter.prototype.drawPreview = function (preview) {
  var i, n = Math.min(preview.length, this._previewContexts.length);
  for (i = 0; i < n; ++i) {
    this._drawPiece(this._previewContexts[i], preview[i], this._blocks.normal,
                    null, true);
  }
};

Painter.prototype.drawHoldPiece = function (holdPiece) {
  this._drawPiece(this._contexts.holdPiece, holdPiece, this._blocks.normal,
                  null, true);
};

Painter.prototype.setAction = function (action) {
  if (!action.points) {
    if (!this._$actionLabel.hasClass('unhighlight')) {
      this._$actionLabel.addClass('unhighlight');
    }
    return;
  }
  this._$actionLabel.removeClass('unhighlight');
  this._labels.$combo.text(action.combo > 0 ?
                           this._TEXTS.combo + ' ' + action.combo : '');
  this._labels.$points.text(action.points > 0 ? '+' + action.points : '');
  this._labels.$b2b.text(action.b2b ? this._TEXTS.b2b : '');
  this._labels.$tspin.text(action.tspin ? this._TEXTS.tspin : '');
  this._labels.$lineClear.text(action.lineClear > 0 ?
                               this._TEXTS.lineClear[action.lineClear] : '');
};

Painter.prototype.setMode = function (mode) {
  this._labels.$mode.text(mode.toUpperCase());
};

Painter.prototype.setFigures = function (figures, ignoreCache) {
  var name;
  Painter._setFigure(this._labels.$level, figures.level, this._state.level,
                     ignoreCache);
  Painter._setFigure(this._labels.$lines, figures.lines, this._state.lines,
                     ignoreCache);
  Painter._setFigure(this._labels.$score, figures.score, this._state.score,
                     ignoreCache);
  for (name in figures) {
    this._state[name] = figures[name];
  }
};

Painter.prototype.setTime = function (seconds) {
  var m = Math.floor(seconds / 60),
      s = Math.floor(seconds % 60);
  this._labels.$minute.text(m);
  this._labels.$second.text(s < 10 ? this._DIGITS[s] : s);
};

Painter.prototype.setLevelVisible = function (visible) {
  if (visible) {
    this._$levelLabel.show();
  } else {
    this._$levelLabel.hide();
  }
};

Painter.prototype.setScoreVisible = function (visible) {
  if (visible) {
    this._$scoreLabel.show();
  } else {
    this._$scoreLabel.hide();
  }
};

Painter.prototype.onLineClear = function (fps, frames, lines, playfield,
                                          callback) {
  /* Just remove the cleared lines immediately with no speical effect */
  var x, y, row, name;
  for (y = 0; y < this._ROWS; ++y) {
    row = playfield[y];
    for (x = 0; x < this._COLS; ++x) {
      name = row[x];
      this._clearBlock(this._contexts.playfield, x, y);
      if (name) {
        this._drawBlock(this._contexts.playfield, x, y, name,
                        this._blocks.normal);
      }
    }
  }
  setTimeout(callback, 1000 * frames / fps);
};

Painter.prototype.onGameOver = function (fps, frames, callback) {
  /* Do nothing for now (some sort of visual effects may be added later) */
  setTimeout(callback, 1000 * frames / fps);
};

Painter.prototype._init = function (size) {
  this._setDimensions(size);
  this._cacheElements();
  this._prepareBlockImages();
  this._drawGrid();
};

Painter.prototype._drawPiece = function (ctx, piece, blocks, point, center) {
  var i, n, q;
  if (!point) {
    point = Point.of(2, 2);
    Painter._clearCanvas(ctx);
  }
  for (i = 0, n = piece.geometry.length; i < n; ++i) {
    q = piece.geometry[i].add(point);
    if (center) q = q.subtract(piece.center);
    this._drawBlock(ctx, q.x, q.y, piece.name, blocks);
  }
};

Painter.prototype._drawBlock = function (ctx, x, y, pieceName, blocks) {
  var x = x * this._size,
      y = ctx.canvas.height - (y + 1) * this._size;
  ctx.putImageData(blocks[pieceName], x, y);
};

Painter.prototype._clearBlock = function (ctx, x, y) {
  var size = this._size;
  ctx.clearRect(x * size, this._height - (y + 1) * size, size, size);
};

Painter.prototype._setPosition = function (canvas, p) {
  var x = (p.x - 2) * this._size,
      y = (p.y - 2) * this._size;
  canvas.style.left = x + 'px';
  canvas.style.bottom = y + 'px';
};

Painter.prototype._setState = function (fallingPiece, fallingPoint, ghostPoint,
                                        landed) {
  this._state.fallingPiece = fallingPiece;
  this._state.fallingPoint = fallingPoint;
  this._state.ghostPoint = ghostPoint;
  this._state.landed = landed;
};

Painter.prototype._setDimensions = function (size) {
  var width = this._COLS * size,
      widthSide = 6 * size,
      actualWidth = width + 2 * (widthSide + size),
      height = this._ROWS * size,
      heightBlind = 1.5 * size,
      actualHeight = height - heightBlind;
  this._size = size;
  this._width = width;
  this._height = height;
  $('#wrapper')
    .css('margin', '0 auto')
    .css('margin-top', (-(0.5 * actualHeight + size)) + 'px')
    .width(actualWidth + 2 * size)
    .height(actualHeight + 2 * size);
  $('#panels')
    .css('border-width', size + 'px')
    .width(actualWidth)
    .height(actualHeight);
  $('#left')
    .css('margin-right', size + 'px')
    .width(widthSide).height(actualHeight);
  $('#right')
    .css('margin-left', size + 'px')
    .width(widthSide).height(actualHeight);
  $('#center')
    .css('margin-top', (-heightBlind) + 'px')
    .width(width)
    .height(height);
  $('#hold-tag').css('top', (1.5 * size) + 'px');
  $('#hold-piece')
    .css('top', (2 * size) + 'px')
    .css('left', (0.5 * size) + 'px');
  $('#action')
    .css('top', (0.5 * height - 4 * size) + 'px')
    .css('line-height', size + 'px');
  $('#action .static').height(size);
  $('#combo').css('margin-bottom', (0.5 * size) + 'px');
  $('#points').css('margin-bottom', (0.5 * size) + 'px');
  $('#mode').css('top', (0.5 * height + 3 * size) + 'px');
  $('#level-tag, #level').css('top', (0.5 * height + 4 * size) + 'px');
  $('#lines-tag, #lines').css('top', (0.5 * height + 5 * size) + 'px');
  $('#score-tag, #score').css('top', (0.5 * height + 6 * size) + 'px');
  $('#time-tag, #time').css('top', (0.5 * height + 7.5 * size) + 'px');
  $('#next-tag').css('top', (1.5 * size) + 'px');
  $('#playfield, #playfield-background').each(function () {
    this.width = width;
    this.height = height;
  });
  $('#falling-piece, #ghost-piece, #hold-piece, .preview').each(function () {
    this.width = this.height = 5 * size;
  });
  $('.preview').each(function (i) {
    var t = 2.0;
    if (i >= 1) t += 3.2;
    if (i >= 2) t += 3;
    if (i >= 3) t += 2.6 * (i - 2);
    $(this).css('top', (t * size) + 'px').css('left', (0.5 * size) + 'px');
  });
};

Painter.prototype._cacheElements = function () {
  var self = this;
  this._canvases.fallingPiece = $('#falling-piece')[0];
  this._canvases.ghostPiece = $('#ghost-piece')[0];
  this._contexts.playfield = $('#playfield')[0].getContext('2d');
  this._contexts.fallingPiece = $('#falling-piece')[0].getContext('2d');
  this._contexts.ghostPiece = $('#ghost-piece')[0].getContext('2d');
  this._contexts.holdPiece = $('#hold-piece')[0].getContext('2d');
  $('.preview').each(function (i) {
    return self._previewContexts[i] = this.getContext('2d');
  });
  this._labels.$combo = $('#combo');
  this._labels.$points = $('#points');
  this._labels.$b2b = $('#b2b');
  this._labels.$tspin = $('#t-spin');
  this._labels.$lineClear = $('#line-clear');
  this._labels.$mode = $('#mode');
  this._labels.$level = $('#level');
  this._labels.$lines = $('#lines');
  this._labels.$score = $('#score');
  this._labels.$minute = $('#minute');
  this._labels.$second = $('#second');
  this._$actionLabel = $('#action');
  this._$levelLabel = $('#level-tag, #level');
  this._$scoreLabel = $('#score-tag, #score');
};

Painter.prototype._prepareBlockImages = function () {
  this._blocks.normal = this._renderBlockImages();
  this._blocks.light = this._renderBlockImages({bright: 1.25});
};

Painter.prototype._renderBlockImages = function (options) {
  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      options = options || {},
      colorFilter = options.bright ?
                    function (c) { return c.brighter(options.bright); } :
                    function (c) { return c; },
      blocks = {}, name, color, grad;
  canvas.width = this._size;
  canvas.height = this._size;
  for (name in this._BLOCK_COLORS) {
    color = colorFilter(this._BLOCK_COLORS[name]);
    grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, color.brighter(1.05).toString());
    grad.addColorStop(1, color.brighter(0.952).toString());
    Painter._clearCanvas(ctx);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.brighter(0.8).toString();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.stroke();
    ctx.closePath();
    blocks[name] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  return blocks;
};

Painter.prototype._drawGrid = function () {
  var ctx = $('#playfield-background')[0].getContext('2d'),
      x, y;
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  for (x = 1; x < this._COLS; ++x) {
    ctx.beginPath();
    ctx.moveTo(x * this._size, 0);
    ctx.lineTo(x * this._size, this._height);
    ctx.stroke();
    ctx.closePath();
  }
  for (y = 1; y < this._ROWS; ++y) {
    ctx.beginPath();
    ctx.moveTo(0, y * this._size);
    ctx.lineTo(this._width, y * this._size);
    ctx.stroke();
    ctx.closePath();
  }
};

Painter._clearCanvas = function (ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

Painter._clearText = function ($label) {
  $label.text('');
};

Painter._setFigure = function ($label, n, ref, ignoreCache) {
  if (n !== ref || ignoreCache) {
    $label.text(n);
  }
};

return Painter;

});
