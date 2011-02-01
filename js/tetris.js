(function (window, document, $, undefined) {


var $win = $(window);
var $doc = $(document);
var $body = $(document.body);


var tetris = new function () {


/**
 * Utility functions for various purposes.
 */
var Utils = {
	clamp: function (v, min, max) {
		return v < min ? min : v > max ? max : v;
	},
	forEach: function (obj, callback, thisp) {
		for (var key in obj)
			callback.call(thisp, obj[key], key, obj);
	}
};


/**
 * Utility functions for arrays.
 */
var Arrays = {
	repeat: function (n, value) {
		var a = [];
		for (var i = 0; i < n; ++i)
			a.push(value);
		return a;
	},
	copy: function (source, destination) {
		for (var i = 0, n = source.length; i < n; ++i)
			destination[i] = source[i];
		destination.length = n;
	},
	fill: function (a, value) {
		for (var i = 0, n = a.length; i < n; ++i)
			a[i] = value;
	},
	remove: function (a, i) {
		var n = a.length;
		if (i < 0 || i >= n)
			return;
		var temp = a[i];
		for (var j = i + 1; j < n; ++j)
			a[j - 1] = a[j];
		--a.length;
		return temp;
	}
};


/**
 * Point representing a location in (x, y) coordinate space.
 *
 * Use Point.of() instead of new Point() to create an instance
 * if you want to use cached objects.
 *
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

Point.prototype.sub = function (p) {
	return Point.of(this.x - p.x, this.y - p.y);
};

Point.of = (function () {
	var cache = {};
	return function (x, y) {
		var a = cache[x];
		var b = a ? a[y] : (cache[x] = {}, null);
		return b || (cache[x][y] = new Point(x, y));
	}
})();

Point.arrayOf = function () {
	var a = [];
	for (var i = 0, n = arguments.length; i < n; i += 2)
		a.push(Point.of(arguments[i], arguments[i + 1]));
	return a;
};


/**
 * Tetromino with a specific shape and rotation.
 *
 * Use Tetromino.of() instead of new Tetromino() to create an instance
 * for convenience and performance.
 *
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

Tetromino.of = (function () {
	function rotateRight(p) { return Point.of(p.y, -p.x); }
	function rotations(base) {
		var rotations = {0: base};
		for (var i = 1; i <= 3; ++i)
			rotations[i] = rotations[i - 1].map(rotateRight);
		return rotations;
	}
	function center(geometry) {
		var mx = -Infinity;
		var my = -Infinity;
		var nx = Infinity;
		var ny = Infinity;
		geometry.forEach(function (p) {
			mx = Math.max(mx, p.x);
			my = Math.max(my, p.y);
			nx = Math.min(nx, p.x);
			ny = Math.min(ny, p.y);
		});
		return Point.of((mx + nx) / 2, (my + ny) / 2);
	}
	var geometries = {
		'I': rotations(Point.arrayOf(-1, 0, 0, 0, 1, 0, 2, 0)),
		'J': rotations(Point.arrayOf(-1, 1,-1, 0, 0, 0, 1, 0)),
		'L': rotations(Point.arrayOf( 1, 1,-1, 0, 0, 0, 1, 0)),
		'O': rotations(Point.arrayOf( 0, 1, 1, 1, 0, 0, 1, 0)),
		'S': rotations(Point.arrayOf( 0, 1, 1, 1,-1, 0, 0, 0)),
		'T': rotations(Point.arrayOf( 0, 1,-1, 0, 0, 0, 1, 0)),
		'Z': rotations(Point.arrayOf(-1, 1, 0, 1, 0, 0, 1, 0))
	};
	var offsets = {
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
	var cache = {};
	return function (name, rotation) {
		var a = cache[name];
		var b = a ? a[rotation] : (cache[name] = {}, null);
		if (b)
			return b;
		var g = geometries[name][rotation];
		var o = (offsets[name] || offsets['others'])[rotation];
		var c = center(g);
		return cache[name][rotation] = new Tetromino(name, rotation, g, o, c);
	};
})();


/**
 * Represents a color in both RGB and HSL values, with an optional
 * alpha-channel.
 *
 * Use Color.fromRGB() and Color.fromHSL() instead of new Color()
 * to create an instance.
 *
 * @immutable
 */
function Color(r, g, b, h, s, l, a) {
	this.r = Utils.clamp(r, 0, 255);
	this.g = Utils.clamp(g, 0, 255);
	this.b = Utils.clamp(b, 0, 255);
	this.h = (h % 360 + 360) % 360;
	this.s = Utils.clamp(s, 0, 100);
	this.l = Utils.clamp(l, 0, 100);
	this.a = a === undefined ? 1 : Utils.clamp(a, 0, 1);
	var rgba = [Math.round(this.r), Math.round(this.g), Math.round(this.b), this.a];
	this.string = 'rgba(' + rgba.join(',') + ')';
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
 * Note that if the given value is not in the range (see below),
 * it will be clampped.
 *
 * Note also that although it is possible to specify floating values
 * for red, green and blue, the string representation (returned by
 * toString()) will display rounded integer values, in order to be
 * compatible with CSS syntax.
 *
 * @param r  red [0.0 .. 255.0]
 * @param g  green [0.0 .. 255.0]
 * @param b  blue [0.0 .. 255.0]
 * @param a  alpha [0.0 .. 1.0] - optional (default: 1.0)
 */
Color.fromRGB = (function () {
	function RGBToHSL(r, g, b) {
		r = Utils.clamp(r, 0, 255) / 255;
		g = Utils.clamp(g, 0, 255) / 255;
		b = Utils.clamp(b, 0, 255) / 255;
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);
		var sum = max + min;
		var l = sum / 2;
		if (max === min)
			return {h: 0, s: 0, l: l * 100};
		var diff = max - min;
		var s = l < .5 ? diff / sum : diff / (2 - sum);
		var h = r === max
			? (g - b) / diff
			: g === max
				? 2 + (b - r) / diff
				: 4 + (r - g) / diff;
		return {h: h * 60, s: s * 100, l: l * 100};
	}
	return function (r, g, b, a) {
		var hsl = RGBToHSL(r, g, b);
		return new Color(r, g, b, hsl.h, hsl.s, hsl.l, a);
	};
})();

/**
 * Returns a Color object from the given HSL value.
 *
 * Note that if the given value is not in the range (see below),
 * it will be clampped or converted appropriately.
 *
 * @param h  hue [0.0 .. 360.0)
 * @param s  saturation [0.0 .. 100.0]
 * @param l  lightness [0.0 .. 100.0]
 * @param a  alpha [0.0 .. 1.0] - optional (default: 1.0)
 */
Color.fromHSL = (function () {
	function HSLToRGB(h, s, l) {
		h = (h % 360 + 360) % 360 / 360;
		s = Utils.clamp(s, 0, 100) / 100;
		l = Utils.clamp(l, 0, 100) / 100;
		var m2 = l < .5 ? l * (s + 1) : l + s - l * s;
		var m1 = l * 2 - m2;
		return {
			r: HueToRGB(m1, m2, h + 1 / 3),
			g: HueToRGB(m1, m2, h),
			b: HueToRGB(m1, m2, h - 1 / 3)
		};
	}
	function HueToRGB(m1, m2, h) {
		var x = m1;
		h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
		if (h * 6 < 1)
			x = m1 + (m2 - m1) * h * 6;
		else if (h * 2 < 1)
			x = m2;
		else if (h * 3 < 2)
			x = m1 + (m2 - m1) * (2 / 3 - h) * 6;
		return x * 255;
	}
	return function (h, s, l, a) {
		var rgb = HSLToRGB(h, s, l);
		return new Color(rgb.r, rgb.g, rgb.b, h, s, l, a);
	};
})();


/**
 * Static simulator without timings.
 */
function SimulatorBase(simulator) {

	var cols;
	var rows;
	var spawnPoint;

	var playfield;
	var bag = [];

	var fallingPiece;
	var fallingPoint;
	var ghostPoint;
	var holdPiece;
	var holdReady;

	// needed to implement IRS, IHS
	var chargedOperations = [];
	var uncharging;

	// needed to implement T-spin detection
	var diagonalPoints = Point.arrayOf(1, 1, 1,-1,-1, 1,-1,-1);
	var lastAttemptedMove;
	var lastSuccessfulMove;
	var kick;

	var stopped = true;

	var spawn = (function () {
		function stop() {
			stopped = true;
			merge();
			simulator.onBlockOut();
		}
		return function () {
			if (fallingPiece || stopped)
				return;
			fallingPiece = bag.shift();
			fallingPoint = spawnPoint;
			ghostPoint = computeGhost();
			holdReady = true;
			if (bag.length < 7)
				fillBag(bag);
			if (uncharging)
				return;
			if (chargedOperations.length > 0) {
				uncharging = true;
				for (var i = 0, n = chargedOperations.length; i < n; ++i)
					(chargedOperations.shift())();
				uncharging = false;
			}
			simulator.onPreviewUpdate(bag);
			simulator.onPieceSpawn(fallingPiece, fallingPoint, ghostPoint);
			move(fallingPiece, fallingPoint, stop, false);
		}
	})();

	var shiftLeft = function () { shift(-1); };
	var shiftRight = function () { shift(1); };
	var shift = function (dir) {
		lastAttemptedMove = shift;
		if (!active())
			return;
		move(fallingPiece, fallingPoint.addX(dir), null, true);
	};

	var rotateLeft = function () { rotate(-1); };
	var rotateRight = function () { rotate(1); };
	var rotate = (function () {
		var rotatedPiece;
		var offset = [];
		function resolve() {
			kick = true;
			for (var i = 1, n = offset.length; i < n; ++i) {
				var p = fallingPoint.add(offset[i]);
				if (!checkCollision(rotatedPiece, p))
					return p;
			}
		}
		return function (dir) {
			lastAttemptedMove = rotate;
			if (!active()) {
				chargedOperations.push(dir === -1 ? rotateLeft : rotateRight);
				return;
			}
			rotatedPiece = dir === 1 ? fallingPiece.rotateRight() : fallingPiece.rotateLeft();
			for (var i = 0, n = fallingPiece.offset.length; i < n; ++i)
				offset[i] = fallingPiece.offset[i].sub(rotatedPiece.offset[i]);
			offset.length = n;
			kick = false;
			move(rotatedPiece, fallingPoint.add(offset[0]), resolve, true);
		};
	})();

	var drop = function (shouldLock) {
		lastAttemptedMove = drop;
		if (!active())
			return 0;
		var resolve = shouldLock ? lock : null;
		if (move(fallingPiece, fallingPoint.addY(-1), resolve, false))
			return 1;
	};

	var hold = function () {
		lastAttemptedMove = hold;
		if (!active()) {
			chargedOperations.push(hold);
			return;
		}
		if (!holdReady)
			return;
		if (holdPiece && checkCollision(holdPiece, spawnPoint))
			return;
		var temp = holdPiece;
		holdPiece = fallingPiece.rotate(0);
		simulator.onHoldPiece(holdPiece);
		if (temp)
			move(temp, spawnPoint, null, true);
		else
			fallingPiece = null,
			spawn();
		holdReady = false;
	};

	var move = function (piece, point, resolve, updateGhost) {
		if (checkCollision(piece, point))
			if (!resolve || !(point = resolve(piece, point)))
				return false;
		lastSuccessfulMove = lastAttemptedMove;
		fallingPiece = piece;
		fallingPoint = point;
		if (updateGhost)
			ghostPoint = computeGhost();
		if (!uncharging) {
			var landed = checkCollision(fallingPiece, fallingPoint.addY(-1));
			simulator.onPieceMove(fallingPiece, fallingPoint, ghostPoint, landed);
		}
		return true;
	};

	var fillBag = function (bag) {
		// new Array() instead of an array literal: due to a bug in Opera
		var remainders = new Array('I', 'J', 'L', 'O', 'S', 'Z', 'T');
		while (remainders.length > 0) {
			var i = Math.floor(Math.random() * remainders.length);
			bag.push(Tetromino.of(remainders[i], 0));
			Arrays.remove(remainders, i);
		}
	};

	var computeGhost = function () {
		var p = fallingPoint;
		var q;
		while (!checkCollision(fallingPiece, q = p.addY(-1)))
			p = q;
		return p;
	};

	var checkCollision = function (piece, point) {
		for (var i = 0, n = piece.geometry.length; i < n; ++i) {
			var q = piece.geometry[i].add(point);
			if (q.y < 0 || q.x >= cols || q.x < 0 || playfield[q.y][q.x])
				return true;
		}
		return false;
	};

	var lock = (function () {
		function zero(x) { return x === 0; }
		function nonZero(x) { return x !== 0; }
		function clearLines() {
			var lines = [];
			var height;
			for (var i = 0, n = playfield.length; i < n; ++i)
				if (playfield[i].every(nonZero))
					lines.push(i);
				else if (playfield[height = i].every(zero))
					break;
			var i = 0;
			var j = lines[0];
			var k = 1;
			while (i < lines.length && j < height) {
				j += 1;
				while (j === lines[i + 1]) {
					i += 1;
					j += 1;
					k += 1;
				}
				Arrays.copy(playfield[j], playfield[j - k]);
			}
			for (var i = j - k; i < j; ++i)
				Arrays.fill(playfield[i], 0);
			return lines;
		}
		return function () {
			var rawTspin = false;
			if (fallingPiece.name === 'T' && lastSuccessfulMove === rotate) {
				var count = 0;
				for (var i = 0; i < 4; ++i) {
					var q = fallingPoint.add(diagonalPoints[i]);
					if (q.y < 0 || q.x >= cols || q.x < 0 || playfield[q.y][q.x])
						count += 1;
				}
				if (count >= 3)
					rawTspin = true;
			}
			merge();
			simulator.onPieceLock(playfield, clearLines(), rawTspin, kick);
		};
	})();

	var merge = function () {
		for (var i = 0, n = fallingPiece.geometry.length; i < n; ++i) {
			var q = fallingPiece.geometry[i].add(fallingPoint);
			playfield[q.y][q.x] = fallingPiece.name;
		}
		fallingPiece = fallingPoint = ghostPoint = null;
	}

	var active = function () { return fallingPiece && !stopped; }

	this.start = function (cols_, rows_, spawnPoint_) {
		cols = cols_;
		rows = rows_;
		spawnPoint = spawnPoint_;
		playfield = Arrays.repeat(rows + 4, cols).map(function (cols) {
			return Arrays.repeat(cols, 0);
		});
		bag.length = 0;
		fillBag(bag);
		fallingPiece = fallingPoint = ghostPoint = holdPiece = null;
		holdReady = true;
		chargedOperations.length = 0;
		uncharging = false;
		stopped = false;
	};

	this.spawn = spawn;

	this.shiftLeft = shiftLeft;
	this.shiftRight = shiftRight;

	this.rotateLeft = rotateLeft;
	this.rotateRight = rotateRight;

	this.drop = function () { drop(true); };
	this.softDrop = function () { return drop(false); };
	this.hardDrop = function () {
		lastAttemptedMove = drop;
		if (!active())
			return 0;
		var distance = fallingPoint.y - ghostPoint.y;
		if (distance > 0)
			lastSuccessfulMove = lastAttemptedMove;
		fallingPoint = ghostPoint;
		simulator.onPieceMove(fallingPiece, fallingPoint, ghostPoint, true);
		lock();
		return distance;
	};

	this.hold = hold;
}


function Simulator(cols, rows, spawnPoint, ui) {

	var simulatorBase = new SimulatorBase(this);
	var controller;
	var soundManager;
	var painter;

	var fps = 60;
	var skipTime = 1000 / fps;
	var defaultTimings = {
		softDrop: .5,  // G (lines per frame)
		lineClear: 0, // frames
		gameOver: 120  // frames
	};
	var timingExpressions = {
		gravity: function () {
			var n = figures.level - 1;
			var t = Math.pow(.8 - n * .007, n);
			return 1 / t / fps;
		},
		lockDelay: function () {
			return 725 - 10 * figures.level;
		}
	};
	var infinityLimit = 24;

	var baseScores = {
		normal: {1: 100, 2: 300, 3: 500, 4: 800},
		tspin: {0: 400, 1: 800, 2: 1200, 3: 1600},
		combo: 50,
		softDrop: 1,
		hardDrop: 2,
		b2b: 1.5
	};
	var tspin = function (lineClear, rawTspin, kick) {
		return rawTspin && (!kick || lineClear === 3);
	};
	var difficult = function (lineClear, rawTspin, kick) {
		return lineClear === 4 || tspin(lineClear, rawTspin, kick);
	};

	var gameModes = ['marathon', 'ultra', 'sprint'];
	var marathonMaxLevel = 15;
	var ultraTimeout = 180;
	var sprintLines = 40;

	var gameMode;
	var timings = {};
	var figures = {};
	var action = {};

	var timer;
	var startTime;
	var endTime;

	var gravitateTimer;
	var lockTimer;
	var infinityCounter = Arrays.repeat(rows, 0);

	var softDropping;
	var blockedOut;

	var spawnPiece = function () {
		if (endTime) {
			stop();
			return;
		}
		simulatorBase.spawn();
	};

	var stop = (function () {
		function onGameOver() {
			var record = gameMode !== 'sprint'
				? figures.score
				: blockedOut
					? null
					: endTime - startTime;
			ui.onGameOver(gameMode, record);
		}
		return function () {
			controller.stop();
			clearTimeout(timer);
			clearTimeout(gravitateTimer);
			clearTimeout(lockTimer);
			painter.drawLockedPiece();
			painter.setGameOver(fps, timings.gameOver, onGameOver);
		};
	})();

	var updateTimings = function () {
		for (var key in timingExpressions)
			timings[key] = timingExpressions[key]();
	};

	var resetInfinityCounter = function () {
		for (var y in infinityCounter)
			infinityCounter[y] = 0;
	};

	this.setController = function (o) { controller = o; };
	this.setSoundManager = function (o) { soundManager = o; };
	this.setPainter = function (o) { painter = o; };
	this.start = (function () {
		var currentTime;
		function startTimer() {
			currentTime = startTime = Date.now();
			endTime = null;
			time();
		}
		function time() {
			currentTime = Date.now();
			var d = currentTime - startTime;
			timer = setTimeout(time, 1000 - d % 1000);
			var seconds = Math.round(d / 1000);
			if (gameMode !== 'ultra')
				painter.setTime(seconds);
			else {
				var remaining = Math.max(ultraTimeout - seconds, 0);
				painter.setTime(remaining);
				if (remaining === 0)
					stop();
			}
		}
		return function (gameMode_) {
			if (gameModes.indexOf(gameMode_) < 0)
				throw 'Unknown Game Mode: ' + gameMode_;
			gameMode = gameMode_;
			figures.level = 1;
			figures.lines = 0;
			figures.score = 0;
			for (var key in defaultTimings)
				timings[key] = defaultTimings[key];
			updateTimings();
			for (var key in action)
				action[key] = null;
			softDropping = false;
			blockedOut = false;
			painter.start();
			painter.setLevelVisible(gameMode === 'marathon');
			painter.setScoreVisible(gameMode !== 'sprint');
			painter.setFigures(figures, true);
			simulatorBase.start(cols, rows, spawnPoint);
			controller.start();
			startTimer();
			spawnPiece();
		};
	})();

	this.shiftLeft = simulatorBase.shiftLeft;
	this.shiftRight = simulatorBase.shiftRight;

	this.rotateLeft = simulatorBase.rotateLeft;
	this.rotateRight = simulatorBase.rotateRight;

	this.softDrop = function () { softDropping = !softDropping; };
	this.hardDrop = function () {
		var distance = simulatorBase.hardDrop();
		if (distance > 0) {
			figures.score += distance * baseScores.hardDrop;
			painter.setFigures(figures);
		}
	};

	this.hold = simulatorBase.hold;

	this.onPieceSpawn = (function () {
		var gravityDistance;
		var nextTime;
		function gravitate() {
			gravityDistance = 0;
			nextTime = Date.now() + skipTime;
			gravitateTimer = setTimeout(update, skipTime);
		}
		function update() {
			while (nextTime <= Date.now()) {
				gravityDistance += softDropping ? timings.softDrop : timings.gravity;
				while (gravityDistance >= 1) {
					gravityDistance -= 1;
					if (!simulatorBase.softDrop()) {
						gravityDistance = 0;
						break;
					}
					if (softDropping && gameMode !== 'sprint') {
						figures.score += baseScores.softDrop;
						painter.setFigures(figures);
					}
				}
				nextTime += skipTime;
			}
			gravitateTimer = setTimeout(update, nextTime - Date.now());
		}
		return function (fallingPiece, fallingPoint, ghostPoint) {
			clearTimeout(gravitateTimer);
			clearTimeout(lockTimer);
			painter.drawFallingPiece(fallingPiece, fallingPoint, ghostPoint);
			controller.interrupt();
			resetInfinityCounter();
			gravitate();
		};
	})();

	this.onPieceMove = function (fallingPiece, fallingPoint, ghostPoint, landed) {
		clearTimeout(lockTimer);
		painter.drawFallingPiece(fallingPiece, fallingPoint, ghostPoint, landed);
		if (!landed)
			return;
		for (var y = fallingPoint.y; y < rows; ++y)
			infinityCounter[y] += 1;
		if (infinityCounter[fallingPoint.y] > infinityLimit)
			simulatorBase.drop();
		else
			lockTimer = setTimeout(simulatorBase.drop, timings.lockDelay);
	};

	this.onPieceLock = (function () {
		function updateState(lineClear, rawTspin, kick) {
			action.lineClear = lineClear;
			action.tspin = tspin(lineClear, rawTspin, kick);
			action.combo = lineClear === 0
				? null
				: action.combo === null
					? 0
					: action.combo + 1;
			var base = action.tspin ? baseScores.tspin : baseScores.normal;
			var diff = difficult(lineClear, rawTspin, kick);
			var b2b = action.b2bReady && diff && lineClear > 0;
			var b2bBonus = b2b ? baseScores.b2b : 1;
			var comboBonus = (action.combo || 0) * baseScores.combo;
			var points = (base[lineClear] * b2bBonus + comboBonus) * figures.level;
			action.points = points > 0 ? points : null;
			action.b2b = b2b;
			action.b2bReady = diff || action.b2bReady && lineClear === 0;
			figures.score += points || 0;
			figures.lines += lineClear;
			switch (gameMode) {
			case 'marathon':
				var level = Math.floor(figures.lines / 10) + 1;
				if (level > marathonMaxLevel)
					endTime = Date.now();
				else if (level > figures.level) {
					figures.level = level;
					updateTimings();
				}
				break;
			case 'sprint':
				if (figures.lines >= sprintLines)
					endTime = Date.now();
				break;
			}
		}
		return function (playfield, lines, tspin, kick) {
			soundManager.play('land');
			painter.drawLockedPiece();
			updateState(lines.length, tspin, kick);
			painter.setAction(action);
			painter.setFigures(figures);
			if (lines.length === 0) {
				spawnPiece();
			} else {
				soundManager.play('lineclear');
				painter.clearLines(fps, timings.lineClear, lines, playfield, spawnPiece);
			}
		};
	})();

	this.onHoldPiece = function (holdPiece) {
		clearTimeout(lockTimer);
		painter.drawHoldPiece(holdPiece);
		controller.interrupt();
		resetInfinityCounter();
	};

	this.onPreviewUpdate = function (preview) {
		painter.drawPreview(preview);
	};

	this.onBlockOut = function () {
		blockedOut = true;
		endTime = Date.now();
		soundManager.play('gameover');
		stop();
	};
}


function Controller() {

	var keys = {
		'ShiftLeft': {delay: 150, frequency: 30, exclude: 'ShiftRight'},
		'ShiftRight': {delay: 150, frequency: 30, exclude: 'ShiftLeft'},
		'RotateLeft': {exclude: 'RotateRight'},
		'RotateRight': {exclude: 'RotateLeft'},
		'SoftDrop': {interruptable: true},
		'HardDrop': {},
		'Hold' : {}
	};

	var keymap = {
		37: 'ShiftLeft',   // Left
		39: 'ShiftRight',  // Right
		17: 'RotateLeft',  // Ctrl
		90: 'RotateLeft',  // z
		38: 'RotateRight',  // Up
		88: 'RotateRight',  // x
		40: 'SoftDrop',  // Down
		32: 'HardDrop',  // Space
		16: 'Hold',  // Shift
		67: 'Hold'   // c
	};

	this.setSimulator = (function () {
		function register(name, keydownFunc, keyupFunc) {
			var key = keys[name];
			var exclusiveKey = keys[key.exclude];
			var interval = 1000 / key.frequency;
			var timer;
			function repeat() {
				if (!key.pressed)
					return;
				keydownFunc();
				timer = setTimeout(repeat, interval);
			}
			key.keydown = function () {
				if (key.pressed)
					return;
				if (exclusiveKey && exclusiveKey.pressed)
					exclusiveKey.interrupt();
				key.pressed = true;
				keydownFunc();
				if (key.frequency)
					timer = setTimeout(repeat, key.delay);
			};
			key.keyup = function () {
				clearTimeout(timer);
				if (!key.interrupted && keyupFunc)
					keyupFunc();
				delete key.pressed;
				delete key.interrupted;
				return;
			};
			key.interrupt = function () {
				if (!key.pressed || key.interrupted)
					return;
				clearTimeout(timer);
				if (keyupFunc)
					keyupFunc();
				key.interrupted = true;
			};
		}
		return function (simulator) {
			register('ShiftLeft', simulator.shiftLeft);
			register('ShiftRight', simulator.shiftRight);
			register('RotateLeft', simulator.rotateLeft);
			register('RotateRight', simulator.rotateRight);
			register('SoftDrop', simulator.softDrop, simulator.softDrop);
			register('HardDrop', simulator.hardDrop);
			register('Hold', simulator.hold);
		};
	})();

	this.start = (function () {
		function down(e) {
			if (e.keyCode in keymap)
				keys[keymap[e.keyCode]].keydown();
		}
		function up(e) {
			if (e.keyCode in keymap)
				keys[keymap[e.keyCode]].keyup();
		}
		return function () {
			for (var name in keys) {
				var key = keys[name];
				delete key.pressed;
				delete key.interrupted;
			}
			$doc.bind('keydown.controller', down).bind('keyup.controller', up);
		};
	})();

	this.interrupt = function () {
		for (var name in keys)
			if (keys[name].interruptable)
				keys[name].interrupt();
	};

	this.stop = function () {
		$doc.unbind('.controller');
	};
}


function SoundManager() {

	var enabled;
	var prefix = 'sounds/';
	var suffix;
	var numAudioElements = 12;
	var readyQueue = [];

	this.play = function (name) {
		var audio;
		if (!enabled || readyQueue.length === 0)
			return;
		audio = readyQueue.shift();
		audio.src = prefix + name + suffix;
	};

	(function init() {
		var i, audio;
		for (i = 0; i < numAudioElements; ++i) {
			audio = document.createElement('audio');
			audio.preload = 'auto';
			audio.autoplay = true;
			audio.loop = false;
			audio.controls = false;
			audio.volume = 0.5;
			audio.muted = false;
			audio.addEventListener('ended', function () {
				readyQueue.push(this);
			}, false);
			$body.append(audio);
			readyQueue.push(audio);
		}
		if (audio.canPlayType('audio/mpeg; codecs="mp3"') !== '')
			suffix = '.mp3';
		else if (audio.canPlayType('audio/ogg; codecs="vorbis"') !== '')
			suffix = '.ogg';
		enabled = suffix !== undefined;
	})();
}


function Painter(cols, rows, size) {

	var blockColors = {
		'I': Color.fromHSL(180, 100, 47.5),
		'O': Color.fromHSL(55, 100, 50),
		'T': Color.fromHSL(285, 100, 50),
		'S': Color.fromHSL(105, 100, 45),
		'Z': Color.fromHSL(5, 100, 45),
		'J': Color.fromHSL(240, 100, 50),
		'L': Color.fromHSL(35, 100, 47.5)
	};

	var texts = {
		lineClear: {1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS'},
		tspin: 'T-SPIN',
		combo: 'COMBO',
		b2b: 'BACK-TO-BACK'
	};

	var width;
	var height;

	// Constants used for scaling block images in the preview panel
	var small = .875;
	var smaller = .75;

	// Pre-rendered block images
	var blocks = {};

	// Cached jQuery elements
	var canvases = {};
	var labels = {};
	var $actionLabel;
	var $levelLabel;
	var $scoreLabel;

	// Canvas contexts
	var contexts = {};
	var previewContexts = [];

	var state = {};

	var px = function (n) { return n + 'px'; };

	var drawPiece = function (ctx, piece, blocks, point, center) {
		if (!point) {
			clear(ctx);
			point = Point.of(2, 2);
		}
		for (var i = 0, n = piece.geometry.length; i < n; ++i) {
			var q = piece.geometry[i].add(point);
			if (center)
				q = q.sub(piece.center);
			drawBlock(ctx, q.x, q.y, piece.name, blocks);
		}
	};

	var drawBlock = function (ctx, x, y, pieceName, blocks) {
		var x = x * size;
		var y = ctx.canvas.height - (y + 1) * size;
		ctx.putImageData(blocks[pieceName], x, y);
	};

	var clear = function (ctx) {
		//ctx.canvas.width = ctx.canvas.width;  // not work in Safari
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	};

	this.start = (function () {
		function clearText(label) {
			label.text('');
		}
		return function () {
			Utils.forEach(contexts, clear);
			Utils.forEach(labels, clearText);
			previewContexts.forEach(clear);
			for (var key in state)
				delete state[key];
		};
	})();

	this.drawFallingPiece = (function () {
		var setPosition = (function () {
			cache = {};  // e.g. '10px'
			return function (canvas, p) {
				var x = (p.x - 2) * size;
				var y = (p.y - 2) * size;
				canvas.style.left = cache[x] || (cache[x] = px(x));
				canvas.style.bottom = cache[y] || (cache[y] = px(y));
			};
		})();
		function setState(fallingPiece, fallingPoint, ghostPoint, landed) {
			state.fallingPiece = fallingPiece;
			state.fallingPoint = fallingPoint;
			state.ghostPoint = ghostPoint;
			state.landed = landed;
		}
		return function (fallingPiece, fallingPoint, ghostPoint, landed) {
			if (state.fallingPiece !== fallingPiece || state.landed !== landed) {
				drawPiece(contexts.fallingPiece, fallingPiece, landed ? blocks.light : blocks.normal);
				drawPiece(contexts.ghostPiece, fallingPiece, blocks.normal);
			}
			setPosition(canvases.$fallingPiece, fallingPoint);
			setPosition(canvases.$ghostPiece, ghostPoint);
			setState(fallingPiece, fallingPoint, ghostPoint, landed);
		};
	})();

	this.drawLockedPiece = function () {
		if (!state.fallingPiece)
			return;
		clear(contexts.fallingPiece);
		clear(contexts.ghostPiece);
		drawPiece(contexts.playfield, state.fallingPiece, blocks.normal, state.fallingPoint);
		state.fallingPiece = null;
		state.fallingPoint = null;
		state.ghostPoint = null;
		state.landed = null;
	};

	this.drawPreview = (function () {
		var p;
		function drawPreview(ctx, i) {
			drawPiece(ctx, p[i], blocks.normal, null, true);
		}
		return function (preview) {
			p = preview;
			previewContexts.forEach(drawPreview);
		};
	})();

	this.drawHoldPiece = function (holdPiece) {
		drawPiece(contexts.holdPiece, holdPiece, blocks.normal, null, true);
	};

	this.clearLines = (function () {
		var playfield,
			callback;
		function drawPlayfield() {
			for (var y = 0; y < rows; ++y) {
				var row = playfield[y];
				for (var x = 0; x < cols; ++x) {
					var pieceName = row[x];
					clearBlock(contexts.playfield, x, y);
					if (pieceName)
						drawBlock(contexts.playfield, x, y, pieceName, blocks.normal);
				}
			}
			callback();
		}
		function clearBlock(ctx, x, y) {
			ctx.clearRect(x * size, height - (y + 1) * size, size, size);
		}
		return function (fps, frames, lines, playfield_, callback_) {
			playfield = playfield_;
			callback = callback_;
			setTimeout(drawPlayfield, 1000 * frames / fps);
		};
	})();

	this.setAction = function (action) {
		if (!action.points) {
			if (!$actionLabel.hasClass('unhighlighted'))
				$actionLabel.addClass('unhighlighted');
			return;
		}
		$actionLabel.removeClass('unhighlighted');
		labels.$combo.text(action.combo > 0 ? texts.combo + ' ' + action.combo : '');
		labels.$points.text(action.points > 0 ? '+' + action.points : '');
		labels.$b2b.text(action.b2b ? texts.b2b : '');
		labels.$tspin.text(action.tspin ? texts.tspin : '');
		labels.$lineClear.text(action.lineClear > 0 ? texts.lineClear[action.lineClear] : '');
	};

	this.setFigures = (function () {
		var flag = false;
		function setFigure(label, n, ref) {
			if (n !== ref || flag)
				label.text(n);
		}
		return function (figures, ignoreCache) {
			flag = ignoreCache;
			setFigure(labels.$level, figures.level, state.level);
			setFigure(labels.$lines, figures.lines, state.lines);
			setFigure(labels.$score, figures.score, state.score);
			for (var key in figures)
				state[key] = figures[key];
		};
	})();

	this.setLevelVisible = function (visible) {
		if (visible)
			$levelLabel.show();
		else
			$levelLabel.hide();
	};

	this.setScoreVisible = function (visible) {
		if (visible)
			$scoreLabel.show();
		else
			$scoreLabel.hide();
	};

	this.setTime = (function () {
		var o = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'];
		return function (seconds) {
			var m = Math.floor(seconds / 60);
			var s = Math.floor(seconds % 60);
			labels.$minute.text(m);
			labels.$second.text(s < 10 ? o[s] : s);
		};
	})();

	this.setGameOver = function (fps, frames, callback) {
		setTimeout(callback, 1000 * frames / fps);
	};

	(function init() {
		function setDimensions(pixels) {
			size = pixels;
			width = cols * size;
			height = rows * size;
			var widthSide = 6 * size;
			var heightBlind = 1.5 * size;
			var screenWidth = width + 2 * (widthSide + size);
			var screenHeight = height - heightBlind;
			var t = 2.0;
			$('#screen')
				.css('margin', '0 auto')
				.css('margin-top', px(-(.5 * screenHeight + size)))
				.css('border-width', px(size))
				.width(screenWidth)
				.height(screenHeight);
			$('#left')
				.css('margin-right', px(size))
				.width(widthSide).height(screenHeight);
			$('#right')
				.css('margin-left', px(size))
				.width(widthSide).height(screenHeight);
			$('#center')
				.css('margin-top', px(-heightBlind))
				.width(width)
				.height(height);
			$('#hold-tag').css('top', px(1.5 * size));
			$('#hold-piece').css('top', px(2 * size)).css('left', px(.5 * size));
			$('#action')
				.css('top', px(.5 * height - 3.5 * size))
				.css('line-height', px(size));
			$('#combo').css('margin-bottom', px(size));
			$('#action .placeholder').height(size);
			$('#level-tag, #level').css('top', px(.5 * height + 4 * size));
			$('#lines-tag, #lines').css('top', px(.5 * height + 5 * size));
			$('#score-tag, #score').css('top', px(.5 * height + 6 * size));
			$('#time-tag, #time').css('top', px(.5 * height + 7.5 * size));
			$('#next-tag').css('top', px(1.5 * size));
			$('#playfield, #playfield-background').each(function () {
				this.width = width;
				this.height = height;
			});
			$('#falling-piece, #ghost-piece, #hold-piece, .preview').each(function () {
				this.width = this.height = 5 * size;
			});
			$('.preview').each(function (i) {
				var $$ = $(this);
				$$.css('top', px(t * size)).css('left', px(.5 * size));
				var f = $$.hasClass('small')
					? small
					: $$.hasClass('smaller')
						? smaller
						: 1;
				t += 3.3 * f;
			});
		}

		function cacheElements() {
			canvases.$fallingPiece = $('#falling-piece')[0];
			canvases.$ghostPiece = $('#ghost-piece')[0];
			labels.$combo = $('#combo');
			labels.$points = $('#points');
			labels.$b2b = $('#b2b');
			labels.$tspin = $('#t-spin');
			labels.$lineClear = $('#line-clear');
			labels.$level = $('#level');
			labels.$lines = $('#lines');
			labels.$score = $('#score');
			labels.$minute = $('#minute');
			labels.$second = $('#second');
			$actionLabel = $('#action');
			$levelLabel = $('#level-tag, #level');
			$scoreLabel = $('#score-tag, #score');
		}

		function prepareBlockImages() {
			blocks.normal = renderBlockImages();
			blocks.light = renderBlockImages({bright: 1.25});
		}

		// temporary canvas
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		function renderBlockImages(options) {
			var options = options || {};
			var blocks = {};
			var colorFilter = options.bright
				? function (c) { return c.brighter(options.bright); }
				: function (c) { return c; };
			for (var pieceName in blockColors) {
				var color = colorFilter(blockColors[pieceName]);

				// Clear
				canvas.width = canvas.height = size;

				// Fill
				var g = ctx.createLinearGradient(0, 0, size, size);
				g.addColorStop(0, color.brighter(1.05).toString());
				g.addColorStop(1, color.brighter(.952).toString());
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, size, size);

				// Stroke
				ctx.lineWidth = 2;
				ctx.strokeStyle = color.brighter(.8).toString();
				ctx.beginPath();
				ctx.moveTo(0, size);
				ctx.lineTo(0, 0);
				ctx.lineTo(size, 0);
				ctx.lineTo(size, size);
				ctx.lineTo(0, size);
				ctx.stroke();
				ctx.closePath();

				blocks[pieceName] = ctx.getImageData(0, 0, size, size);
			}
			return blocks;
		}

		function getCanvasContexts() {
			contexts.playfield = getContext2D('playfield');
			contexts.fallingPiece = getContext2D('falling-piece');
			contexts.ghostPiece = getContext2D('ghost-piece');
			contexts.holdPiece = getContext2D('hold-piece');
			$('.preview').each(function (i) {
				return previewContexts[i] = this.getContext('2d');
			});
		}

		function drawGrid() {
			var ctx = getContext2D('playfield-background');
			ctx.strokeStyle = '#bbb';
			ctx.lineWidth = 1;
			for (var x = 1; x < cols; ++x) {
				ctx.beginPath();
				ctx.moveTo(x * size, 0);
				ctx.lineTo(x * size, height);
				ctx.stroke();
				ctx.closePath();
			}
			for (var y = 1; y < rows; ++y) {
				ctx.beginPath();
				ctx.moveTo(0, y * size);
				ctx.lineTo(width, y * size);
				ctx.stroke();
				ctx.closePath();
			}
		}

		function getContext2D(id) {
			return document.getElementById(id).getContext('2d');
		}

		setDimensions(size);
		cacheElements();
		prepareBlockImages();
		getCanvasContexts();
		drawGrid();
	})();
}


function UserInterface() {

	var cols = 10;
	var rows = 22;
	var spawnPoint = Point.of(4, 20);
	var defaultSize = 20;  // pixels per cell's side

	var simulator;
	var controller;
	var soundManager;
	var painter;

	var $mainMenu = $('#main');
	var $playMenu = $('#play');
	var $aboutMenu = $('#about');

	var $current = null;
	var $lastFocus = null;

	var showMenu = function ($menu) {
		if ($current)
			hideMenu($current);
		$menu.show();
		$menu.data('focus').focus();
		$current = $menu;
	};

	var hideMenu = function ($menu) {
		$menu.data('focus', $lastFocus);
		$menu.hide();
		$current = null;
	};

	this.onGameOver = function (gameMode, record) {
		if ('console' in window)
			console.log(gameMode, record);
		showMenu($mainMenu);
	};

	this.init = (function () {
		function makeMenuButtons() {
			$('.menu').each(function () {
				var $$ = $(this);
				$$.find('.buttons li').wrapInner('<button />');
				$$
					.css('top', .5 * ($('#screen').height() - $$.height()) + 'px')
					.data('focus', $$.find('.buttons li:first button'));
			});
			$playMenu.find('#marathon-button button').val('marathon');
			$playMenu.find('#ultra-button button').val('ultra');
			$playMenu.find('#sprint-button button').val('sprint');
		}
		function setEventListeners() {
			$('button')
				.click(function () { $(this).focus(); })
				.focus(focus)
				.focusout(focusout)
				.keydown(keydown);
			$('#play-button button').click(function () { showMenu($playMenu); });
			$('#about-button button').click(function () { showMenu($aboutMenu); });
			$('.return button').click(function () { showMenu($mainMenu); });
			$playMenu.find('.buttons li:not(.return) button').click(function () {
				hideMenu($current);
				simulator.start($(this).blur().val());
			})
			$('a[rel~=external]').click(function () {
				window.open(this.href, '_blank');
				return false;
			});
			if ($.browser.mozilla) {
				$doc.mousedown(function () {
					if ($current && $lastFocus)
						setTimeout(restoreFocus, 0);
				});
			}
		}
		function focus() {
			$lastFocus = $(this);
		}
		function focusout() {
			if (this === $lastFocus[0]) {
				restoreFocus();
				return false;
			}
		}
		function keydown(e) {
			switch (e.keyCode) {
			case 38:
				$(this).parent().prev().find('button').focus();
				break;
			case 40:
				$(this).parent().next().find('button').focus();
				break;
			}
		}
		function restoreFocus() {
			$lastFocus.focus();
		}
		return function () {
			simulator = new Simulator(cols, rows, spawnPoint, this);
			controller = new Controller();
			soundManager = new SoundManager();
			painter = new Painter(cols, rows, defaultSize);
			simulator.setController(controller);
			simulator.setSoundManager(soundManager);
			simulator.setPainter(painter);
			controller.setSimulator(simulator);
			makeMenuButtons();
			setEventListeners();
			showMenu($mainMenu);
		}
	})();
}


// Lightweight Classes
this.Utils = Utils;
this.Arrays = Arrays;
this.Point = Point;
this.Color = Color;

// Game Logic
this.SimulatorBase = SimulatorBase;
this.Simulator = Simulator;

// Interface
this.Controller = Controller;
this.Painter = Painter;
this.UserInterface = UserInterface;


};


$win.load(function () {
	new tetris.UserInterface().init();
});


})(this, this.document, this.jQuery);
