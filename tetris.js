(function (window, document, undefined) {


var tetris = new function () {


/**
 * Utility functions for various purposes.
 */
var Utils = {

    clamp: function (v, min, max) {
        return v < min ? min : v > max ? max : v;
    },

    points: function (args) {
        var a = [];
        for (var i = 0, n = args.length; i < n; i += 2)
            a.push(Point.of(args[i], args[i + 1]));
        return a;
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

    repeats: function (n, value) {
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
        a.length -= 1;
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


/**
 * Tetromino with a specific shape and rotation.
 *
 * Use Tetromino.of() instead of new Tetromino() to create an instance
 * for convenience and performance.
 *
 * @immutable
 */
function Tetromino(name, rotation, geometry, offset, center) {
    this.name = name;           // one of I, J, L, O, S, T, Z
    this.rotation = rotation;   // 0 on spawn; +1 for one right rotation; max 3
    this.geometry = geometry;   // points on which this piece occupies
    this.offset = offset;       // see www.tetrisconcept.net/wiki/SRS
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
    var points = Utils.points;
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
        'I': rotations(points([-1, 0, 0, 0, 1, 0, 2, 0])),
        'J': rotations(points([-1, 1,-1, 0, 0, 0, 1, 0])),
        'L': rotations(points([ 1, 1,-1, 0, 0, 0, 1, 0])),
        'O': rotations(points([ 0, 1, 1, 1, 0, 0, 1, 0])),
        'S': rotations(points([ 0, 1, 1, 1,-1, 0, 0, 0])),
        'T': rotations(points([ 0, 1,-1, 0, 0, 0, 1, 0])),
        'Z': rotations(points([-1, 1, 0, 1, 0, 0, 1, 0]))
    };
    var offsets = {
        'O': {
            0: points([ 0, 0]),
            1: points([ 0,-1]),
            2: points([-1,-1]),
            3: points([-1, 0])
        },
        'I': {
            0: points([ 0, 0,-1, 0, 2, 0,-1, 0, 0,-2]),
            1: points([-1, 0, 0, 0, 0, 0, 0, 1, 0,-2]),
            2: points([-1, 1, 1, 1,-2, 1, 1, 0,-2, 0]),
            3: points([ 0, 1, 0, 1, 0, 1, 0,-1, 0, 2])
        },
        'others': {
            0: points([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            1: points([ 0, 0, 1, 0, 1,-1, 0, 2, 1, 2]),
            2: points([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            3: points([ 0, 0,-1, 0,-1,-1, 0, 2,-1, 2])
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
    var round = Math.round;
    var rgba = [round(this.r), round(this.g), round(this.b), this.a];
    this.string = 'rgba(' + rgba.join(',') + ')';
}

Color.prototype.brighter = function (factor) {
    return Color.fromHSL(this.h, this.s, factor * this.l, this.a);
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
        var h = r === max ? (g - b) / diff
                          : g === max ? 2 + (b - r) / diff
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
    var readyToHold;

    // needed to implement IRS, IHS
    var chargedOperations = [];
    var uncharging;

    // needed to implement T-spin detection
    var diagonalPoints = Utils.points([1, 1, 1,-1,-1, 1,-1,-1]);
    var lastAttemptedMove;
    var lastSuccessfulMove;
    var kick;

    var stopped = true;

    this.start = function (cols_, rows_, spawnPoint_) {
        cols = cols_;
        rows = rows_;
        spawnPoint = spawnPoint_;
        playfield = Arrays.repeats(rows + 4, cols).map(function (cols) {
            return Arrays.repeats(cols, 0);
        });
        bag.length = 0;
        fillBag(bag);
        fallingPiece = fallingPoint = ghostPoint = holdPiece = null;
        readyToHold = true;
        chargedOperations.length = 0;
        uncharging = false;
        stopped = false;
    };

    this.spawn = spawn;

    this.rotateLeft = rotateLeft;

    this.rotateRight = rotateRight;

    this.shiftLeft = shiftLeft;

    this.shiftRight = shiftRight;

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

    function spawn() {
        if (!(!fallingPiece && !stopped))
            return;
        fallingPiece = bag.shift();
        fallingPoint = spawnPoint;
        ghostPoint = computeGhost();
        readyToHold = true;
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

    function rotateLeft() { rotate(-1); }

    function rotateRight() { rotate(1); }

    var rotate = (function () {
        var rotatedPiece;
        var offset = [];
        function resolve() {
            kick = true;
            for (var i = 1, n = offset.length; i < n; ++i) {
                var p = fallingPoint.add(offset[i]);
                if (!pieceCollides(rotatedPiece, p))
                    return p;
            }
        }
        return function (dir) {
           lastAttemptedMove = rotate;
           if (!active()) {
               chargedOperations.push(dir === -1 ? rotateLeft : rotateRight);
               return;
           }
           rotatedPiece = dir === 1 ? fallingPiece.rotateRight()
                                    : fallingPiece.rotateLeft();
           for (var i = 0, n = fallingPiece.offset.length; i < n; ++i)
               offset[i] = fallingPiece.offset[i].sub(rotatedPiece.offset[i]);
           offset.length = n;
           kick = false;
           move(rotatedPiece, fallingPoint.add(offset[0]), resolve, true);
        };
    })();

    function shiftLeft() { shift(-1); }

    function shiftRight() { shift(1); }

    function shift(dir) {
        lastAttemptedMove = shift;
        if (!active())
            return;
        move(fallingPiece, fallingPoint.addX(dir), null, true);
    }

    function drop(shouldLock) {
        lastAttemptedMove = drop;
        if (!active())
            return 0;
        var resolve = shouldLock ? lock : null;
        if (move(fallingPiece, fallingPoint.addY(-1), resolve, false))
            return 1;
    }

    function move(piece, point, resolve, updateGhost) {
        if (pieceCollides(piece, point))
            if (!resolve || !(point = resolve(piece, point)))
                return false;
        lastSuccessfulMove = lastAttemptedMove;
        fallingPiece = piece;
        fallingPoint = point;
        if (updateGhost)
            ghostPoint = computeGhost();
        if (!uncharging) {
            var landed = pieceCollides(fallingPiece, fallingPoint.addY(-1));
            simulator.onPieceMove(fallingPiece, fallingPoint, ghostPoint, landed);
        }
        return true;
    }

    function hold() {
        lastAttemptedMove = hold;
        if (!active()) {
            chargedOperations.push(hold);
            return;
        }
        if (!readyToHold)
            return;
        if (holdPiece && pieceCollides(holdPiece, spawnPoint))
            return;
        var temp = holdPiece;
        holdPiece = fallingPiece.rotate(0);
        simulator.onHoldPiece(holdPiece);
        if (temp)
            move(temp, spawnPoint, null, true);
        else
            fallingPiece = null,
            spawn();
        readyToHold = false;
    }

    function active() {
        return fallingPiece && !stopped;
    }

    function fillBag(bag) {
        // new Array() instead of an array literal: due to a bug in Opera
        var remainders = new Array('I', 'J', 'L', 'O', 'S', 'Z', 'T');
        while (remainders.length > 0) {
            var i = Math.floor(Math.random() * remainders.length);
            bag.push(Tetromino.of(remainders[i], 0));
            Arrays.remove(remainders, i);
        }
    }

    function computeGhost() {
        var p = fallingPoint;
        var q;
        while (!pieceCollides(fallingPiece, q = p.addY(-1)))
            p = q;
        return p;
    }

    function pieceCollides(piece, point) {
        for (var i = 0, n = piece.geometry.length; i < n; ++i) {
            var q = piece.geometry[i].add(point);
            if (q.y < 0 || q.x >= cols || q.x < 0 || playfield[q.y][q.x])
                return true;
        }
        return false;
    }

    function lock() {
        var rawTspin = false;
        if (fallingPiece.name == 'T' && lastSuccessfulMove === rotate) {
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
    }

    function merge() {
        for (var i = 0, n = fallingPiece.geometry.length; i < n; ++i) {
            var q = fallingPiece.geometry[i].add(fallingPoint);
            playfield[q.y][q.x] = fallingPiece.name;
        }
        fallingPiece = fallingPoint = ghostPoint = null;
    }

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

    function zero(x) {
        return x === 0;
    }

    function nonZero(x) {
        return x !== 0;
    }

    function stop() {
        stopped = true;
        merge();
        simulator.onBlockOut();
    }
}


function Simulator(cols, rows, spawnPoint, ui) {

    var fps = 60;
    var skipTime = 1000 / fps;
    var defaultTimings = {
        softDrop       :   .5,  // G (lines per frame)
        lineClear      :   15,  // frames
        gameOver       :  200   // frames
    };
    var timingExpressions = {
        gravity: function () {
            var n = figures.level - 1;
            var t = Math.pow(.8 - n * .007, n);
            return 1 / t / fps;
        },
        lockDelay: function () { return 725 - 15 * figures.level; },
        lineClear: function () {
            return gameMode == 'sprint' ? 0 : defaultTimings.lineClear;
        }
    };
    var infinityLimit = 16;

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

    var gravitateTimer;
    var lockTimer;
    var infinityCounter = Arrays.repeats(rows, 0);
    var softDropping;

    var timer;
    var startTime;
    var currentTime;
    var endTime;

    var blockedOut;

    var simulatorBase = new SimulatorBase(this);
    var controller;
    var painter;

    this.shiftLeft = simulatorBase.shiftLeft;

    this.shiftRight = simulatorBase.shiftRight;

    this.rotateLeft = simulatorBase.rotateLeft;

    this.rotateRight = simulatorBase.rotateRight;

    this.softDrop = function () {
        softDropping = !softDropping;
    };

    this.hardDrop = function () {
        var distance = simulatorBase.hardDrop();
        if (distance > 0) {
            figures.score += distance * baseScores.hardDrop;
            painter.setFigures(figures);
        }
    };

    this.hold = simulatorBase.hold;

    this.onPieceSpawn = function (fallingPiece, fallingPoint, ghostPoint) {
        clearTimeout(gravitateTimer);
        clearTimeout(lockTimer);
        painter.drawFallingPiece(fallingPiece, fallingPoint, ghostPoint);
        controller.interrupt();
        resetInfinityCounter();
        gravitate();
    };

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

    this.onPieceLock = function (playfield, lines, tspin, kick) {
        painter.drawLockedPiece();
        updateState(lines.length, tspin, kick);
        painter.setAction(action);
        painter.setFigures(figures);
        painter.clearLines(fps, timings.lineClear, spawnPiece, playfield, lines);
    };

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
        stop();
    };

    this.setController = function (controller_) {
        controller = controller_;
    };

    this.setPainter = function (painter_) {
        painter = painter_;
    };

    this.start = function (gameMode_) {
        if (gameModes.indexOf(gameMode_) < 0)
            throw 'Unknown Game Mode: ' + mode;
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
        painter.setScoreVisible(gameMode != 'sprint');
        painter.setFigures(figures, true);
        simulatorBase.start(cols, rows, spawnPoint);
        controller.start();

        currentTime = startTime = Date.now();
        endTime = null;
        time();

        spawnPiece();
    };

    function spawnPiece() {
        if (endTime) {
            stop();
            return;
        }
        simulatorBase.spawn();
    }

    function stop() {
        controller.stop();
        clearTimeout(timer);
        clearTimeout(gravitateTimer);
        clearTimeout(lockTimer);
        painter.drawLockedPiece();
        painter.setGameOver(fps, timings.gameOver, onGameOver);
    }

    function onGameOver() {
        var record = gameMode !== 'sprint'
            ? figures.score
            : blockedOut ? null : endTime - startTime;
        ui.onGameOver(gameMode, record);
    }

    function updateState(lineClear, rawTspin, kick) {
        action.lineClear = lineClear;
        action.tspin = tspin(lineClear, rawTspin, kick);
        action.combo = lineClear === 0
            ? null
            : action.combo === null ? 0 : action.combo + 1;

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

    function updateTimings() {
        for (var key in timingExpressions)
            timings[key] = timingExpressions[key]();
    }

    function resetInfinityCounter() {
        for (var y in infinityCounter)
            infinityCounter[y] = 0;
    }

    var gravitate = (function () {
        var gravityDistance;
        var nextTime;
        function update() {
            while (nextTime <= Date.now()) {
                gravityDistance += softDropping ? timings.softDrop
                                                : timings.gravity;
                while (gravityDistance >= 1) {
                    gravityDistance -= 1;
                    if (!simulatorBase.softDrop()) {
                        gravityDistance = 0;
                        break;
                    }
                    if (softDropping && gameMode != 'sprint') {
                        figures.score += baseScores.softDrop;
                        painter.setFigures(figures);
                    }
                }
                nextTime += skipTime;
            }
            gravitateTimer = setTimeout(update, nextTime - Date.now());
        }
        return function () {
            gravityDistance = 0;
            nextTime = Date.now() + skipTime;
            gravitateTimer = setTimeout(update, skipTime);
        };
    })();

    function time() {
        currentTime = Date.now();
        var d = currentTime - startTime;
        timer = setTimeout(time, 1000 - d % 1000);
        var seconds = Math.round(d / 1000);
        if (gameMode != 'ultra') {
            painter.setTime(seconds);
            return;
        }
        var remaining = Math.max(ultraTimeout - seconds, 0);
        painter.setTime(remaining);
        if (remaining === 0)
            stop();
    }
}


function Controller() {

    var keys = {
        'SL': {delay: 150, frequency: 30, exclude: 'SR'},
        'SR': {delay: 150, frequency: 30, exclude: 'SL'},
        'RL': {exclude: 'RR'},
        'RR': {exclude: 'RL'},
        'DS': {interruptable: true},
        'DH': {},
        'H' : {}
    };

    var keymap = {
        16: 'H', 17: 'RL', 32: 'DH', 37: 'SL', 38: 'RR', 39: 'SR', 40: 'DS',
        67: 'H', 88: 'RR', 90: 'RL'
    };

    var doc = $(document);

    this.setSimulator = function (simulator) {
        register('SL', simulator.shiftLeft);
        register('SR', simulator.shiftRight);
        register('RL', simulator.rotateLeft);
        register('RR', simulator.rotateRight);
        register('DS', simulator.softDrop, simulator.softDrop);
        register('DH', simulator.hardDrop);
        register('H', simulator.hold);
    };

    this.start = function () {
        for (var name in keys) {
            var key = keys[name];
            delete key.pressed;
            delete key.interrupted;
        }
        doc.bind('keydown.controller', keydown).bind('keyup.controller', keyup);
    };

    this.interrupt = function () {
        for (var name in keys)
            if (keys[name].interruptable)
                keys[name].interrupt();
    };

    this.stop = function () {
        doc.unbind('.controller');
    };

    function keydown(e) {
        if (e.keyCode in keymap)
            keys[keymap[e.keyCode]].keydown();
    }

    function keyup(e) {
        if (e.keyCode in keymap)
            keys[keymap[e.keyCode]].keyup();
    }

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
}


function Painter(cols, rows) {

    var blockColors = {
        'I': Color.fromHSL(180, 100, 47.5),
        'O': Color.fromHSL(55, 100, 47.5),
        'T': Color.fromHSL(285, 100, 52.5),
        'S': Color.fromHSL(105, 100, 42.5),
        'Z': Color.fromHSL(5, 100, 47.5),
        'J': Color.fromHSL(240, 100, 52.5),
        'L': Color.fromHSL(35, 100, 47.5)
    };

    var effectColors = {
        gray: Color.fromHSL(0, 0, 80),
        yellow0: Color.fromHSL(50, 100, 50, 0),
        orange25: Color.fromHSL(25, 100, 50, .25),
        red50: Color.fromHSL(0, 100, 50, .50)
    };

    var texts = {
        lineClear: {1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS'},
        tspin: 'T-SPIN',
        combo: 'COMBO',
        b2b: 'BACK-TO-BACK'
    };

    var size;  // grid size
    var width;
    var height;

    // Constants used for scaling block images in the preview panel
    var small = .875;
    var smaller = .75;

    // Pre-rendered block images
    var blocks = {};

    // Cached DOM elements
    var canvases = {};
    var labels = {};
    var actionLabel;
    var scoreLabel;

    // Canvas contexts
    var ctx = {};
    var ctxPreview = [];

    var state = {};

    this.init = function (size_) {
        setDimensions(size_);
        cacheDOMElements();
        renderBlockImages();
        getCanvasContexts();
        drawGrid();
    };

    this.start = function () {
        Utils.forEach(ctx, clear);
        Utils.forEach(labels, clearText);
        ctxPreview.forEach(clear);
        for (var key in state)
            delete state[key];
    };

    this.drawFallingPiece = function (fallingPiece, fallingPoint, ghostPoint, landed) {
        if (state.fallingPiece !== fallingPiece || state.landed !== landed) {
            drawPiece(ctx.fallingPiece, fallingPiece, landed ? blocks.light : blocks.normal);
            drawPiece(ctx.ghostPiece, fallingPiece, blocks.ghost);
        }
        setPosition(canvases.fallingPiece, fallingPoint);
        setPosition(canvases.ghostPiece, ghostPoint);

        state.fallingPiece = fallingPiece;
        state.fallingPoint = fallingPoint;
        state.ghostPoint = ghostPoint;
        state.landed = landed;
    };

    this.drawLockedPiece = function () {
        if (!state.fallingPiece)
            return;
        clear(ctx.fallingPiece);
        clear(ctx.ghostPiece);
        drawPiece(ctx.playfield, state.fallingPiece, blocks.normal, state.fallingPoint);
        state.fallingPiece = null;
        state.fallingPoint = null;
        state.ghostPoint = null;
        state.landed = null;
    };

    this.drawPreview = (function () {
        var p;
        function drawPreview(c, i) {
            drawPiece(c, p[i], blocks.normal, null, true);
        }
        return function (preview) {
            p = preview;
            ctxPreview.forEach(drawPreview);
        };
    })();

    this.drawHoldPiece = function (holdPiece) {
        drawPiece(ctx.holdPiece, holdPiece, blocks.normal, null, true);
    };

    this.clearLines = (function () {
        var playfield;
        var callback;
        function chainedCallback() {
            drawPlayfield(playfield);
            callback();
        }
        return function (fps, frames, callback_, playfield_, lines) {
            if (lines.length === 0) {
                callback_();
                return;
            }
            playfield = playfield_;
            callback = callback_;
            animate(fps, frames, lineClearAnimation, lines, chainedCallback);
        };
    })();

    this.setAction = function (action) {
        if (!action.points) {
            if (!actionLabel.hasClass('unhighlighted'))
                actionLabel.addClass('unhighlighted');
            return;
        }
        actionLabel.removeClass('unhighlighted');
        labels.combo.text(action.combo > 0 ? texts.combo + ' ' + action.combo : '');
        labels.points.text(action.points > 0 ? '+' + action.points : '');
        labels.b2b.text(action.b2b ? texts.b2b : '');
        labels.tspin.text(action.tspin ? texts.tspin : '');
        labels.lineClear.text(action.lineClear > 0 ? texts.lineClear[action.lineClear] : '');
    };

    this.setFigures = (function () {
        var flag = false;
        function setFigure(label, n, ref) {
            if (n !== ref || flag)
                label.text(n);
        }
        return function (figures, ignoreCache) {
            flag = ignoreCache;
            setFigure(labels.level, figures.level, state.level);
            setFigure(labels.lines, figures.lines, state.lines);
            setFigure(labels.score, figures.score, state.score);
            for (var key in figures)
                state[key] = figures[key];
        };
    })();

    this.setScoreVisible = function (visible) {
        if (visible)
            scoreLabel.show();
        else
            scoreLabel.hide();
    };

    this.setTime = (function () {
        var o = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'];
        return function (seconds) {
            var m = Math.floor(seconds / 60);
            var s = Math.floor(seconds % 60);
            labels.minute.text(m);
            labels.second.text(s < 10 ? o[s] : s);
        };
    })();

    this.setGameOver = function (fps, frames, callback) {
        animate(fps, frames, gameOverAnimation, null, callback);
    };

    function setDimensions(size_) {
        size = size_;
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
            $(this).css('top', px(t * size)).css('left', px(.5 * size));
            var f = $(this).hasClass('small')
                ? small
                : $(this).hasClass('smaller') ? smaller
                                              : 1;
            t += 3.3 * f;
        });
    }

    function px(n) {
        return n + 'px';
    }

    function cacheDOMElements() {
        canvases.fallingPiece = $('#falling-piece')[0];
        canvases.ghostPiece = $('#ghost-piece')[0];
        labels.combo = $('#combo');
        labels.points = $('#points');
        labels.b2b = $('#b2b');
        labels.tspin = $('#t-spin');
        labels.lineClear = $('#line-clear');
        labels.level = $('#level');
        labels.lines = $('#lines');
        labels.score = $('#score');
        labels.minute = $('#minute');
        labels.second = $('#second');
        actionLabel = $('#action');
        scoreLabel = $('#score-tag, #score');
    }

    function renderBlockImages() {
        blocks.normal = createBlocks();
        blocks.light = createBlocks({bright: 1.15});
        blocks.ghost = createBlocks({bright: 1.125, lineWidth: 2, margin: 1.5, noFill: true});
    }

    function createBlocks(options) {
        var options = options || {};
        var context = document.createElement('canvas').getContext('2d');
        var m = options.margin ? options.margin : 0;
        var mm = m + .5;  // margins for stroke
        var blocks = {};
        var f = options.bright
            ? function (c) { return c.brighter(options.bright); }
            : function (c) { return c; };
        for (var pieceName in blockColors) {
            var color = f(blockColors[pieceName]);
            if (!options.noFill) {
                context.fillStyle = color.toString();
                context.fillRect(m, m, size - 2 * m, size - 2 * m);
            }
            context.strokeStyle = color.brighter(1).toString();
            context.lineWidth = options.lineWidth || 1;
            context.strokeRect(mm, mm, size - 2 * mm, size - 2 * mm);
            blocks[pieceName] = context.getImageData(0, 0, size, size);
        }
        return blocks;
    }

    function getCanvasContexts() {
        ctx.playfield = getContext2D('playfield');
        ctx.fallingPiece = getContext2D('falling-piece');
        ctx.ghostPiece = getContext2D('ghost-piece');
        ctx.holdPiece = getContext2D('hold-piece');
        $('.preview').each(function (i) {
            return ctxPreview[i] = this.getContext('2d');
        });
    }

    function getContext2D(id) {
        return document.getElementById(id).getContext('2d');
    }

    function drawGrid() {
        var c = getContext2D('playfield-background');
        c.strokeStyle = effectColors.gray.toString();
        c.lineWidth = 1;
        for (var x = 1; x < cols; ++x) {
            c.beginPath();
            c.moveTo(x * size, 0);
            c.lineTo(x * size, height);
            c.stroke();
            c.closePath();
        }
        for (var y = 1; y < rows; ++y) {
            c.beginPath();
            c.moveTo(0, y * size);
            c.lineTo(width, y * size);
            c.stroke();
            c.closePath();
        }
    }

    function drawPiece(c, piece, blocks, point, center) {
        if (!point) {
            clear(c);
            point = Point.of(2, 2);
        }
        for (var i = 0, n = piece.geometry.length; i < n; ++i) {
            var q = piece.geometry[i].add(point);
            if (center)
                q = q.sub(piece.center);
            drawBlock(c, q.x, q.y, piece.name, blocks);
        }
    }

    function drawPlayfield(playfield) {
        for (var y = 0; y < rows; ++y) {
            var row = playfield[y];
            for (var x = 0; x < cols; ++x) {
                var pieceName = row[x];
                clearBlock(ctx.playfield, x, y);
                if (pieceName)
                    drawBlock(ctx.playfield, x, y, pieceName, blocks.normal);
            }
        }
    }

    function drawBlock(c, x, y, pieceName, blocks) {
        var x = x * size;
        var y = c.canvas.height - (y + 1) * size;
        c.putImageData(blocks[pieceName], x, y);
    }

    function clearBlock(c, x, y) {
        c.clearRect(x * size, height - (y + 1) * size, size, size);
    }

    function clear(c) {
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }

    function clearText(label) {
        label.text('');
    }

    var setPosition = (function () {
        cache = {};  // e.g. '10px'
        return function (canvas, p) {
            var x = (p.x - 2) * size;
            var y = (p.y - 2) * size;
            canvas.style.left = cache[x] || (cache[x] = px(x));
            canvas.style.bottom = cache[y] || (cache[y] = px(y));
        };
    })();

    function lineClearAnimation(i, frames, lines) {
        var c = ctx.playfield;
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.globalAlpha = 9 / frames / frames * i;
        for (var i = 0, n = lines.length; i < n; ++i)
            c.fillRect(0, (rows - lines[i] - 1) * size, width, size);
        c.restore();
    }

    function gameOverAnimation(i, frames) {
        var c = ctx.playfield;
        c.save();
        c.globalCompositeOperation = 'source-atop';
        var solid = height / frames / frames * i * (i + 1);
        c.fillStyle = effectColors.gray.toString();
        c.fillRect(0, height - solid, width, solid);
        var h = height - solid;
        var grad = solid * 3;
        var g = c.createLinearGradient(0, h - grad, 0, h);
        g.addColorStop(0, effectColors.yellow0.toString());
        g.addColorStop(.3, effectColors.orange25.toString());
        g.addColorStop(.6, effectColors.red50.toString());
        g.addColorStop(1, effectColors.gray.toString());
        c.fillStyle = g;
        c.fillRect(0, h - grad, width, grad);
        c.restore();
    }

    var animate = (function () {
        var frames, draw, arg, callback, timer, i;
        function update() {
            if (i > frames) {
                clearInterval(timer);
                if (callback)
                    callback();
            } else {
                draw(i, frames, arg);
                i += 1;
            }
        }
        return function (fps, frames_, draw_, arg_, callback_) {
            if (frames_ === 0) {
                if (callback_)
                    callback_();
                return;
            }
            frames = frames_;
            draw = draw_;
            arg = arg_;
            callback = callback_;
            i = 1;
            timer = setInterval(update, 1000 / fps);
        };
    })();
}


function UserInterface() {

    var currentMenu;
    var lastFocus;

    var simulator = new Simulator(10, 22, Point.of(4, 20), this);
    var controller = new Controller();
    var painter = new Painter(10, 22);

    var screen = $('#screen');
    var panels = $('#left, #right, #center');
    var mainMenu = $('#main-menu');
    var playMenu = $('#play-menu');

    this.init = function () {
        painter.init(20);
        simulator.setController(controller);
        simulator.setPainter(painter);
        controller.setSimulator(simulator);
        makeMenuButtons();
        setEventListeners();
        show(mainMenu);
    };

    this.onGameOver = function (gameMode, record) {
        if (console)
            console.log(gameMode, record);
        show(mainMenu);
    };

    function makeMenuButtons() {
        $('.menu').each(function () {
            $(this).find('li').wrapInner(menuButton);
            $(this)
                .css('top', .5 * (screen.height() - $(this).height()) + 'px')
                .data('focus', $(this).find('li:first button'));
        });
    }

    function menuButton() {
        return $('<button />')
            .keydown(keydown)
            .focus(focus)
            .attr('value', $(this).attr('id'));
    }

    function setEventListeners() {
        $('button').click(function () { $(this).focus(); });
        $('.return button').click(function () { show(mainMenu); });
        $('#play button').click(function () { show(playMenu); });
        playMenu.find('li:not(.return) button').click(function () {
            hide(currentMenu);
            simulator.start($(this).blur().attr('value'));
        }).unbind('focus').focus(function () {
            screen.removeClass().addClass($(this).attr('value'));
            lastFocus = this;
        });
    }

    function show(menu) {
        if (currentMenu)
            hide(currentMenu);
        menu.show();
        menu.data('focus').focus();
        currentMenu = menu;
    }

    function hide(menu) {
        menu.data('focus', $(lastFocus));
        menu.hide();
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

    function focus() {
        screen.removeClass();
        lastFocus = this;
    }
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


}


$(window).load(function () {
    new tetris.UserInterface().init();
});


})(this, this.document);
