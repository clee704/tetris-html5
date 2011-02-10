/**
 * @namespace tetris
 */
(function (window, document, undefined) {

/**
 * @class tetris.Simulator
 */
function Simulator(cols, rows, spawnPoint, controller, painter, soundManager, ui) {
	var self = this;

	this._COLS = cols;
	this._ROWS = rows;
	this._SPAWN_POINT = spawnPoint;

	/* Timings */
	this._fps = 60;
	this._skipTicks = 1000 / this._fps; // milliseconds per frame
	this._defaultTimings = {
		lineClear:   0, // frames
		gameOver : 120, // frames
		softDrop : 0.5, // G
		lockDelay: 600  // milliseconds
	};
	this._timingFunctions = {
		gravity: function () {
			var n = self._figures.level - 1,
				t = window.Math.pow(0.8 - n * 0.007, n);
			// Level 1: 0.017 G = 1/60 G
			// Level 2: 0.021 G
			// ...
			// Level 11: 0.39 G
			// Level 12: 0.59 G
			// Level 13: 0.92 G
			// Level 14: 1.5 G
			// Level 15: 2.4 G
			return 1 / t / self._fps;
		}
	};
	this._infinityLimit = 24;

	/* Scores */
	this._baseScores = {
		normal: {1: 100, 2: 300, 3: 500, 4: 800},
		tspin: {0: 400, 1: 800, 2: 1200, 3: 1600},
		combo: 50,
		softDrop: 1,
		hardDrop: 2,
		b2b: 1.5
	};
	this._tspin = function (lineClear, rawTspin, kick) {
		return rawTspin && (!kick || lineClear === 3);
	};
	this._difficult = function (lineClear, rawTspin, kick) {
		return lineClear === 4 || self._tspin(lineClear, rawTspin, kick);
	};

	/* Mode-specific settings */
	this._gameModes = ['marathon', 'ultra', 'sprint'];
	this._marathonMaxLevel = 15;
	this._ultraTimeout = 180;
	this._sprintLines = 40;

	/* Big objects */
	this._simulatorBase = new window.tetris.SimulatorBase(this);
	this._controller = controller;
	this._painter = painter;
	this._soundManager = soundManager;
	this._ui = ui;

	/* Small Variables */
	this._gameMode;
	this._timings = {};
	this._figures = {};
	this._action = {};

	/* Timers and counters */
	this._timer;
	this._startTime;
	this._endTime;
	this._freeFallTimer;
	this._freeFallDistance;
	this._nextFallTime;
	this._lockTimer;
	this._infinityCounter = window.tetris.Arrays.repeat(rows, 0);

	/* Flags */
	this._softDropping;
	this._blockedOut;

	/* Functions for the controller */
	this.softDrop = function () { self._softDropping = !self._softDropping; };
	this.hardDrop = function () {
		var distance = self._simulatorBase.hardDrop();
		if (distance > 0) {
			self._figures.score += distance * self._baseScores.hardDrop;
			self._painter.setFigures(self._figures);
		}
	};
	this.shiftLeft = function () { self._simulatorBase.shiftLeft(); };
	this.shiftRight = function () { self._simulatorBase.shiftRight(); };
	this.rotateLeft = function () { self._simulatorBase.rotateLeft(); };
	this.rotateRight = function () { self._simulatorBase.rotateRight(); };
	this.hold = function () { self._simulatorBase.hold(); };
	this._spawnPiece = function () {
		if (self._endTime) {
			self._stop();
			return;
		}
		self._simulatorBase.spawn();
	};

	/* Functions for setTimeout */
	this._timeUpdate = function () {
		var current = (Date.now() - self._startTime) / 1000,
			remaining;
		if (self._gameMode !== 'ultra') {
			self._painter.setTime(current);
		} else {
			remaining = window.Math.max(self._ultraTimeout - current, 0);
			self._painter.setTime(remaining);
			if (remaining === 0)
				self._stop();
		}
		self._timer = window.setTimeout(self._timeUpdate, 125);
	};
	this._freeFall = function () {
		while (self._nextFallTime <= Date.now()) {
			self._freeFallDistance += self._softDropping
				? self._timings.softDrop
				: self._timings.gravity;
			while (self._freeFallDistance >= 1) {
				self._freeFallDistance -= 1;
				if (!self._simulatorBase.softDrop()) {
					self._freeFallDistance = 0;
					break;
				}
				if (self._softDropping && self._gameMode !== 'sprint') {
					self._figures.score += self._baseScores.softDrop;
					self._painter.setFigures(self._figures);
				}
			}
			self._nextFallTime += self._skipTicks;
		}
		self._freeFallTimer = window.setTimeout(self._freeFall, self._nextFallTime - Date.now());
	};
	this._lock = function () { self._simulatorBase.drop(); };

	/* Function for the painter */
	this._onGameOver = function () {
		var record = self._gameMode !== 'sprint'
			? self._figures.score
			: self._blockedOut
				? null
				: self._endTime - self._startTime;
		self._ui.onGameOver(self._gameMode, record);
	};

	this._init();
}

Simulator.prototype.start = function (gameMode) {
	var name;
	if (this._gameModes.indexOf(gameMode) < 0)
		throw 'Unknown Game Mode: ' + gameMode;
	this._gameMode = gameMode;
	this._figures.level = 1;
	this._figures.lines = 0;
	this._figures.score = 0;
	for (name in this._defaultTimings)
		this._timings[name] = this._defaultTimings[name];
	this._updateTimings();
	for (name in this._action)
		this._action[name] = null;
	this._softDropping = false;
	this._blockedOut = false;
	this._simulatorBase.start(this._COLS, this._ROWS, this._SPAWN_POINT);
	this._painter.start();
	this._painter.setLevelVisible(gameMode === 'marathon');
	this._painter.setScoreVisible(gameMode !== 'sprint');
	this._painter.setMode(gameMode);
	this._painter.setFigures(this._figures, true);
	this._controller.start();
	this._startTime = Date.now();
	this._endTime = null;
	this._timeUpdate();
	this._spawnPiece();
};

Simulator.prototype.onPieceSpawn = function (fallingPiece, fallingPoint, ghostPoint) {
	window.clearTimeout(this._freeFallTimer);
	window.clearTimeout(this._lockTimer);
	this._painter.drawFallingPiece(fallingPiece, fallingPoint, ghostPoint);
	this._controller.interrupt();
	this._resetInfinityCounter();
	this._startFreeFall();
};

Simulator.prototype.onPieceMove = function (fallingPiece, fallingPoint, ghostPoint, landed) {
	var y;
	window.clearTimeout(this._lockTimer);
	this._painter.drawFallingPiece(fallingPiece, fallingPoint, ghostPoint, landed);
	if (!landed)
		return;
	for (y = fallingPoint.y; y < this._ROWS; ++y)
		this._infinityCounter[y] += 1;
	if (this._infinityCounter[fallingPoint.y] > this._infinityLimit)
		this._simulatorBase.drop();
	else
		this._lockTimer = window.setTimeout(this._lock, this._timings.lockDelay);
};

Simulator.prototype.onPieceLock = function (playfield, lines, tspin, kick) {
	this._painter.drawLockedPiece();
	this._updateState(lines.length, tspin, kick);
	this._painter.setAction(this._action);
	this._painter.setFigures(this._figures);
	this._soundManager.play('lock');
	if (lines.length === 0) {
		this._spawnPiece();
	} else {
		this._painter.onLineClear(this._fps, this._timings.lineClear, lines, playfield, this._spawnPiece);
		this._soundManager.play('lineclear');
	}
};

Simulator.prototype.onHoldPiece = function (holdPiece) {
	window.clearTimeout(this._lockTimer);
	this._painter.drawHoldPiece(holdPiece);
	this._controller.interrupt();
	this._resetInfinityCounter();
	this._soundManager.play('hold');
};

Simulator.prototype.onHoldPieceFail = function () {
	this._soundManager.play('hold2');
};

Simulator.prototype.onPreviewUpdate = function (preview) {
	this._painter.drawPreview(preview);
};

Simulator.prototype.onBlockOut = function () {
	this._blockedOut = true;
	this._endTime = Date.now();
	this._stop();
	this._soundManager.play('gameover');
};

Simulator.prototype._init = function () {
	this._controller.link(this);
};

Simulator.prototype._stop = function () {
	this._controller.stop();
	window.clearTimeout(this._timer);
	window.clearTimeout(this._freeFallTimer);
	window.clearTimeout(this._lockTimer);
	this._painter.drawLockedPiece();
	this._painter.onGameOver(this._fps, this._timings.gameOver, this._onGameOver);
};

Simulator.prototype._startFreeFall = function () {
	this._nextFallTime = Date.now() + this._skipTicks;
	this._freeFallDistance = 0;
	this._freeFallTimer = window.setTimeout(this._freeFall, this._skipTicks);
};

Simulator.prototype._updateTimings = function () {
	var name;
	for (name in this._timingFunctions)
		this._timings[name] = this._timingFunctions[name]();
};

Simulator.prototype._updateState = function (lineClear, rawTspin, kick) {
	var base, diff, b2b, b2bBonus, comboBonus, points, level;
	this._action.lineClear = lineClear;
	this._action.tspin = this._tspin(lineClear, rawTspin, kick);
	this._action.combo = lineClear === 0
		? null
		: this._action.combo === null
			? 0
			: this._action.combo + 1;
	base = this._action.tspin ? this._baseScores.tspin : this._baseScores.normal;
	diff = this._difficult(lineClear, rawTspin, kick);
	b2b = this._action.b2bReady && diff && lineClear > 0;
	b2bBonus = b2b ? this._baseScores.b2b : 1;
	comboBonus = (this._action.combo || 0) * this._baseScores.combo;
	points = (base[lineClear] * b2bBonus + comboBonus) * this._figures.level;
	this._action.points = points > 0 ? points : null;
	this._action.b2b = b2b;
	this._action.b2bReady = diff || this._action.b2bReady && lineClear === 0;
	this._figures.score += points || 0;
	this._figures.lines += lineClear;
	switch (this._gameMode) {
	case 'marathon':
		level = window.Math.floor(this._figures.lines / 10) + 1;
		if (level > this._marathonMaxLevel)
			this._endTime = Date.now();
		else if (level > this._figures.level) {
			this._figures.level = level;
			this._updateTimings();
			this._soundManager.play('levelup');
		}
		break;
	case 'sprint':
		if (this._figures.lines >= this._sprintLines)
			this._endTime = Date.now();
		break;
	}
};

Simulator.prototype._resetInfinityCounter = function () {
	var y;
	for (y in this._infinityCounter)
		this._infinityCounter[y] = 0;
};

window.tetris.Simulator = Simulator;

})(this, this.document);
