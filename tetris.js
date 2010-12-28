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
 * A point representing a location in (x, y) coordinate space.
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
 * A tetromino with a specific shape and rotation.
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


function SimulatorBase(simulator) {

    var cols;
    var rows;
    var spawn_point;

    var playfield;
    var bag = [];

    var falling_piece;
    var falling_point;
    var ghost_point;
    var hold_piece;
    var ready_to_hold;

    // needed to implement IRS, IHS
    var charged_operations = [];
    var uncharging;

    // needed to implement T-spin detection
    var diagonal = Utils.points([1, 1, 1,-1,-1, 1,-1,-1]);
    var last_attempted_move;
    var last_successful_move;
    var kick;

    var stopped = true;

    this.start = function (cols_, rows_, spawn_point_) {
        cols = cols_;
        rows = rows_;
        spawn_point = spawn_point_;
        playfield = Arrays.repeats(rows + 4, cols).map(function (cols) {
            return Arrays.repeats(cols, 0);
        });
        bag.length = 0;
        fillBag(bag);
        falling_piece = falling_point = ghost_point = hold_piece = null;
        ready_to_hold = true;
        charged_operations.length = 0;
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
        last_attempted_move = drop;
        if (!active())
            return 0;
        var distance = falling_point.y - ghost_point.y;
        if (distance > 0)
            last_successful_move = last_attempted_move;
        falling_point = ghost_point;
        simulator.onPieceMove(falling_piece, falling_point, ghost_point, true);
        lock();
        return distance;
    };

    this.hold = hold;

    function spawn() {
        if (!(!falling_piece && !stopped))
            return;
        falling_piece = bag.shift();
        falling_point = spawn_point;
        ghost_point = computeGhost();
        ready_to_hold = true;
        if (bag.length < 7)
            fillBag(bag);
        if (uncharging)
            return;
        if (charged_operations.length > 0) {
            uncharging = true;
            for (var i = 0, n = charged_operations.length; i < n; ++i)
                (charged_operations.shift())();
            uncharging = false;
        }
        simulator.onPreviewUpdate(bag);
        simulator.onPieceSpawn(falling_piece, falling_point, ghost_point);
        move(falling_piece, falling_point, stop, false);
    }

    function rotateLeft() { rotate(-1); }

    function rotateRight() { rotate(1); }

    var rotate = (function () {
        var rotated_piece;
        var offset = [];
        function resolve() {
            kick = true;
            for (var i = 1, n = offset.length; i < n; ++i) {
                var p = falling_point.add(offset[i]);
                if (!pieceCollides(rotated_piece, p))
                    return p;
            }
        }
        return function (dir) {
           last_attempted_move = rotate;
           if (!active()) {
               charged_operations.push(dir === -1 ? rotateLeft : rotateRight);
               return;
           }
           rotated_piece = dir === 1 ? falling_piece.rotateRight()
                                     : falling_piece.rotateLeft();
           for (var i = 0, n = falling_piece.offset.length; i < n; ++i)
               offset[i] = falling_piece.offset[i].sub(rotated_piece.offset[i]);
           offset.length = n;
           kick = false;
           move(rotated_piece, falling_point.add(offset[0]), resolve, true);
        };
    })();

    function shiftLeft() { shift(-1); }

    function shiftRight() { shift(1); }

    function shift(dir) {
        last_attempted_move = shift;
        if (!active())
            return;
        move(falling_piece, falling_point.addX(dir), null, true);
    }

    function drop(should_lock) {
        last_attempted_move = drop;
        if (!active())
            return 0;
        var resolve = should_lock ? lock : null;
        if (move(falling_piece, falling_point.addY(-1), resolve, false))
            return 1;
    }

    function move(piece, point, resolve, update_ghost) {
        if (pieceCollides(piece, point))
            if (!resolve || !(point = resolve(piece, point)))
                return false;
        last_successful_move = last_attempted_move;
        falling_piece = piece;
        falling_point = point;
        if (update_ghost)
            ghost_point = computeGhost();
        if (!uncharging) {
            var landed = pieceCollides(falling_piece, falling_point.addY(-1));
            simulator.onPieceMove(falling_piece, falling_point, ghost_point, landed);
        }
        return true;
    }

    function hold() {
        last_attempted_move = hold;
        if (!active()) {
            charged_operations.push(hold);
            return;
        }
        if (!ready_to_hold)
            return;
        if (hold_piece && pieceCollides(hold_piece, spawn_point))
            return;
        var temp = hold_piece;
        hold_piece = falling_piece.rotate(0);
        simulator.onHoldPiece(hold_piece);
        if (temp)
            move(temp, spawn_point, null, true);
        else
            falling_piece = null,
            spawn();
        ready_to_hold = false;
    }

    function active() {
        return falling_piece && !stopped;
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
        var p = falling_point;
        var q;
        while (!pieceCollides(falling_piece, q = p.addY(-1)))
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
        var raw_tspin = false;
        if (falling_piece.name == 'T' && last_successful_move === rotate) {
            var count = 0;
            for (var i = 0; i < 4; ++i) {
                var q = falling_point.add(diagonal[i]);
                if (q.y < 0 || q.x >= cols || q.x < 0 || playfield[q.y][q.x])
                    count += 1;
            }
            if (count >= 3)
                raw_tspin = true;
        }
        merge();
        simulator.onPieceLock(playfield, clearLines(), raw_tspin, kick);
    }

    function merge() {
        for (var i = 0, n = falling_piece.geometry.length; i < n; ++i) {
            var q = falling_piece.geometry[i].add(falling_point);
            playfield[q.y][q.x] = falling_piece.name;
        }
        falling_piece = falling_point = ghost_point = null;
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


function Simulator(cols, rows, spawn_point, ui) {

    var fps = 60;
    var skip_time = 1000 / fps;
    var default_timings = {
        soft_drop       :   .5,  // G (lines per frame)
        line_clear      :   15,  // frames
        game_over       :  200   // frames
    };
    var timing_expressions = {
        gravity: function () {
            var n = figures.level - 1;
            var t = Math.pow(.8 - n * .007, n);
            return 1 / t / fps;
        },
        lock_delay: function () { return 725 - 15 * figures.level; },
        line_clear: function () {
            return game_mode == 'sprint' ? 0 : default_timings.line_clear;
        }
    };
    var infinity_limit = 16;

    var base_scores = {
        normal: {1: 100, 2: 300, 3: 500, 4: 800},
        tspin: {0: 400, 1: 800, 2: 1200, 3: 1600},
        combo: 50,
        soft_drop: 1,
        hard_drop: 2,
        b2b: 1.5
    };
    var tspin = function (line_clear, raw_tspin, kick) {
        return raw_tspin && (!kick || line_clear === 3);
    };
    var difficult = function (line_clear, raw_tspin, kick) {
        return line_clear === 4 || tspin(line_clear, raw_tspin, kick);
    };

    var game_modes = ['marathon', 'ultra', 'sprint'];
    var marathon_max_level = 15;
    var ultra_timeout = 180;
    var sprint_lines = 40;

    var game_mode;
    var timings = {};
    var figures = {};
    var action = {};

    var gravitate_timer;
    var lock_timer;
    var infinity_counter = Arrays.repeats(rows, 0);
    var soft_drop;

    var timer;
    var start_time;
    var current_time;
    var end_time;

    var blocked_out;

    var simulator_base = new SimulatorBase(this);
    var controller;
    var painter;

    this.shiftLeft = simulator_base.shiftLeft;

    this.shiftRight = simulator_base.shiftRight;

    this.rotateLeft = simulator_base.rotateLeft;

    this.rotateRight = simulator_base.rotateRight;

    this.softDrop = function () {
        soft_drop = !soft_drop;
    };

    this.hardDrop = function () {
        var distance = simulator_base.hardDrop();
        if (distance > 0) {
            figures.score += distance * base_scores.hard_drop;
            painter.setFigures(figures);
        }
    };

    this.hold = simulator_base.hold;

    this.onPieceSpawn = function (falling_piece, falling_point, ghost_point) {
        clearTimeout(gravitate_timer);
        clearTimeout(lock_timer);
        painter.drawFallingPiece(falling_piece, falling_point, ghost_point);
        controller.interrupt();
        resetInfinityCounter();
        gravitate();
    };

    this.onPieceMove = function (falling_piece, falling_point, ghost_point, landed) {
        clearTimeout(lock_timer);
        painter.drawFallingPiece(falling_piece, falling_point, ghost_point, landed);
        if (!landed)
            return;
        for (var y = falling_point.y; y < rows; ++y)
            infinity_counter[y] += 1;
        if (infinity_counter[falling_point.y] > infinity_limit)
            simulator_base.drop();
        else
            lock_timer = setTimeout(simulator_base.drop, timings.lock_delay);
    };

    this.onPieceLock = function (playfield, lines, tspin, kick) {
        painter.drawLockedPiece();
        updateState(lines.length, tspin, kick);
        painter.setAction(action);
        painter.setFigures(figures);
        painter.clearLines(fps, timings.line_clear, spawnPiece, playfield, lines);
    };

    this.onHoldPiece = function (hold_piece) {
        clearTimeout(lock_timer);
        painter.drawHoldPiece(hold_piece);
        controller.interrupt();
        resetInfinityCounter();
    };

    this.onPreviewUpdate = function (preview) {
        painter.drawPreview(preview);
    };

    this.onBlockOut = function () {
        blocked_out = true;
        end_time = Date.now();
        stop();
    };

    this.setController = function (controller_) {
        controller = controller_;
    };

    this.setPainter = function (painter_) {
        painter = painter_;
    };

    this.start = function (game_mode_) {
        if (game_modes.indexOf(game_mode_) < 0)
            throw 'Unknown Game Mode: ' + mode;
        game_mode = game_mode_;
        figures.level = 1;
        figures.lines = 0;
        figures.score = 0;
        for (var key in default_timings)
            timings[key] = default_timings[key];
        updateTimings();
        for (var key in action)
            action[key] = null;
        soft_drop = false;
        blocked_out = false;

        painter.start();
        painter.setScoreVisible(game_mode != 'sprint');
        painter.setFigures(figures, true);
        simulator_base.start(cols, rows, spawn_point);
        controller.start();

        current_time = start_time = Date.now();
        end_time = null;
        time();

        spawnPiece();
    };

    function spawnPiece() {
        if (end_time) {
            stop();
            return;
        }
        simulator_base.spawn();
    }

    function stop() {
        controller.stop();
        clearTimeout(timer);
        clearTimeout(gravitate_timer);
        clearTimeout(lock_timer);
        painter.drawLockedPiece();
        painter.setGameOver(fps, timings.game_over, onGameOver);
    }

    function onGameOver() {
        var record = game_mode !== 'sprint'
            ? figures.score
            : blocked_out ? null : end_time - start_time;
        ui.onGameOver(game_mode, record);
    }

    function updateState(line_clear, raw_tspin, kick) {
        action.line_clear = line_clear;
        action.tspin = tspin(line_clear, raw_tspin, kick);
        action.combo = line_clear === 0
            ? null
            : action.combo === null ? 0 : action.combo + 1;

        var base = action.tspin ? base_scores.tspin : base_scores.normal;
        var diff = difficult(line_clear, raw_tspin, kick);
        var b2b = action.b2b_ready && diff && line_clear > 0;
        var b2b_bonus = b2b ? base_scores.b2b : 1;
        var combo_bonus = (action.combo || 0) * base_scores.combo;
        var points = (base[line_clear] * b2b_bonus + combo_bonus) * figures.level;

        action.points = points > 0 ? points : null;
        action.b2b = b2b;
        action.b2b_ready = diff || action.b2b_ready && line_clear === 0;

        figures.score += points || 0;
        figures.lines += line_clear;

        switch (game_mode) {
        case 'marathon':
            var level = Math.floor(figures.lines / 10) + 1;
            if (level > marathon_max_level)
                end_time = Date.now();
            else if (level > figures.level) {
                figures.level = level;
                updateTimings();
            }
            break;
        case 'sprint':
            if (figures.lines >= sprint_lines)
                end_time = Date.now();
            break;
        }
    }

    function updateTimings() {
        for (var key in timing_expressions)
            timings[key] = timing_expressions[key]();
    }

    function resetInfinityCounter() {
        for (var y in infinity_counter)
            infinity_counter[y] = 0;
    }

    var gravitate = (function () {
        var gravity_distance;
        var next_time;
        function update() {
            while (next_time <= Date.now()) {
                gravity_distance += soft_drop ? timings.soft_drop
                                              : timings.gravity;
                while (gravity_distance >= 1) {
                    gravity_distance -= 1;
                    if (!simulator_base.softDrop()) {
                        gravity_distance = 0;
                        break;
                    }
                    if (soft_drop && game_mode != 'sprint') {
                        figures.score += base_scores.soft_drop;
                        painter.setFigures(figures);
                    }
                }
                next_time += skip_time;
            }
            gravitate_timer = setTimeout(update, next_time - Date.now());
        }
        return function () {
            gravity_distance = 0;
            next_time = Date.now() + skip_time;
            gravitate_timer = setTimeout(update, skip_time);
        };
    })();

    function time() {
        current_time = Date.now();
        var d = current_time - start_time;
        timer = setTimeout(time, 1000 - d % 1000);
        var seconds = Math.round(d / 1000);
        if (game_mode != 'ultra') {
            painter.setTime(seconds);
            return;
        }
        var remaining = Math.max(ultra_timeout - seconds, 0);
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

    function register(name, f_keydown, f_keyup) {
        var key = keys[name];
        var ex_key = keys[key.exclude];
        var interval = 1000 / key.frequency;
        var timer;
        function repeat() {
            if (!key.pressed)
                return;
            f_keydown();
            timer = setTimeout(repeat, interval);
        }
        key.keydown = function () {
            if (key.pressed)
                return;
            if (ex_key && ex_key.pressed)
                ex_key.interrupt();
            key.pressed = true;
            f_keydown();
            if (key.frequency)
                timer = setTimeout(repeat, key.delay);
        };
        key.keyup = function () {
            clearTimeout(timer);
            if (!key.interrupted && f_keyup)
                f_keyup();
            delete key.pressed;
            delete key.interrupted;
            return;
        };
        key.interrupt = function () {
            if (!key.pressed || key.interrupted)
                return;
            clearTimeout(timer);
            if (f_keyup)
                f_keyup();
            key.interrupted = true;
        };
    }
}


function Painter(cols, rows) {

    var size = 20;  // grid size

    var width = cols * size;
    var height = rows * size;

    var small = .875;
    var smaller = .75;

    var block_colors = {
        'I': Color.fromHSL(180, 100, 47.5),
        'O': Color.fromHSL(55, 100, 47.5),
        'T': Color.fromHSL(285, 100, 52.5),
        'S': Color.fromHSL(105, 100, 42.5),
        'Z': Color.fromHSL(5, 100, 47.5),
        'J': Color.fromHSL(240, 100, 52.5),
        'L': Color.fromHSL(35, 100, 47.5)
    };

    var colors = {
        gray     : Color.fromHSL( 0,   0, 80),
        yellow_0 : Color.fromHSL(50, 100, 50, 0),
        orange_25: Color.fromHSL(25, 100, 50, .25),
        red_50   : Color.fromHSL( 0, 100, 50, .50)
    };

    var blocks = {
        normal: createBlocks(),
        light : createBlocks({bright: 1.15}),
        ghost : createBlocks({
            bright: 1.125, line_width: 2, margin: 1.5, no_fill: true
        })
    };

    var texts = {
        line_clear: {1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS'},
        tspin: 'T-SPIN',
        combo: 'COMBO',
        b2b: 'BACK-TO-BACK'
    };

    var canvas = {};
    var ctx = {};
    var ctx_preview = [];
    var labels = {};

    var action_label;
    var score_label;

    var cache = {};

    this.init = function () {
        var width_side = 6 * size;
        var height_blind = 1.5 * size;

        var screen_width = width + 2 * (width_side + size);
        var screen_height = height - height_blind;
        $('#screen')
            .css('margin', '0 auto')
            .css('margin-top', px(-(.5 * screen_height + size)))
            .css('border-width', px(size))
            .width(screen_width)
            .height(screen_height);

        $('#left').width(width_side).height(screen_height);
        $('#right').width(width_side).height(screen_height);
        $('#center')
            .css('margin-top', px(-height_blind))
            .width(width)
            .height(height);

        $('#left').css('margin-right', px(size));
        $('#right').css('margin-left', px(size));
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
        var t = 2.0;
        $('.preview').each(function (i) {
            $(this).css('top', px(t * size)).css('left', px(.5 * size));
            var f = $(this).hasClass('small')
                ? small
                : $(this).hasClass('smaller') ? smaller
                                              : 1;
            t += 3.3 * f;
        });
        $('#playfield, #playfield-background').each(function () {
            this.width = width;
            this.height = height;
        });
        $('#falling-piece, #ghost-piece, #hold-piece, .preview')
            .each(function () { this.width = this.height = 5 * size; });

        canvas.falling_piece = $('#falling-piece')[0];
        canvas.ghost_piece = $('#ghost-piece')[0];

        ctx.playfield = getContext2D('playfield');
        ctx.falling_piece = getContext2D('falling-piece');
        ctx.ghost_piece = getContext2D('ghost-piece');
        ctx.hold_piece = getContext2D('hold-piece');
        $('.preview').each(function (i) {
            return ctx_preview[i] = this.getContext('2d');
        });

        labels.combo = $('#combo');
        labels.points = $('#points');
        labels.b2b = $('#b2b');
        labels.tspin = $('#t-spin');
        labels.line_clear = $('#line-clear');

        labels.level = $('#level');
        labels.lines = $('#lines');
        labels.score = $('#score');

        labels.minute = $('#minute');
        labels.second = $('#second');

        action_label = $('#action');
        score_label = $('#score-tag, #score');

        drawGrid();
    };

    this.start = function () {
        Utils.forEach(ctx, clear);
        Utils.forEach(labels, clearText);
        ctx_preview.forEach(clear);
        for (var key in cache)
            delete cache[key];
    };

    this.drawFallingPiece = function (falling_piece, falling_point, ghost_point, landed) {
        if (cache.falling_piece !== falling_piece || cache.landed !== landed) {
            drawPiece(ctx.falling_piece, falling_piece, landed ? blocks.light : blocks.normal);
            drawPiece(ctx.ghost_piece, falling_piece, blocks.ghost);
        }
        setPosition(canvas.falling_piece, falling_point);
        setPosition(canvas.ghost_piece, ghost_point);

        cache.falling_piece = falling_piece;
        cache.falling_point = falling_point;
        cache.ghost_point = ghost_point;
        cache.landed = landed;
    };

    this.drawLockedPiece = function () {
        if (!cache.falling_piece)
            return;
        clear(ctx.falling_piece);
        clear(ctx.ghost_piece);
        drawPiece(ctx.playfield, cache.falling_piece, blocks.normal, cache.falling_point);
        cache.falling_piece = null;
        cache.falling_point = null;
        cache.ghost_point = null;
        cache.landed = null;
    };

    this.drawPreview = (function () {
        var p;
        function drawPreview(c, i) {
            drawPiece(c, p[i], blocks.normal, null, true);
        }
        return function (preview) {
            p = preview;
            ctx_preview.forEach(drawPreview);
        };
    })();

    this.drawHoldPiece = function (hold_piece) {
        drawPiece(ctx.hold_piece, hold_piece, blocks.normal, null, true);
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
            if (!action_label.hasClass('unhighlighted'))
                action_label.addClass('unhighlighted');
            return;
        }
        action_label.removeClass('unhighlighted');
        labels.combo.text(action.combo > 0 ? texts.combo + ' ' + action.combo : '');
        labels.points.text(action.points > 0 ? '+' + action.points : '');
        labels.b2b.text(action.b2b ? texts.b2b : '');
        labels.tspin.text(action.tspin ? texts.tspin : '');
        labels.line_clear.text(action.line_clear > 0 ? texts.line_clear[action.line_clear] : '');
    };

    this.setFigures = (function () {
        var flag = false;
        function setFigure(label, n, ref) {
            if (n !== ref || flag)
                label.text(n);
        }
        return function (figures, ignore_cache) {
            flag = ignore_cache;
            setFigure(labels.level, figures.level, cache.level);
            setFigure(labels.lines, figures.lines, cache.lines);
            setFigure(labels.score, figures.score, cache.score);
            for (var key in figures)
                cache[key] = figures[key];
        };
    })();

    this.setScoreVisible = function (visible) {
        if (visible)
            score_label.show();
        else
            score_label.hide();
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

    function createBlocks(options) {
        var options = options || {};
        var context = document.createElement('canvas').getContext('2d');
        var m = options.margin ? options.margin : 0;
        var mm = m + .5;  // margins for stroke
        var blocks = {};
        var f = options.bright
            ? function (c) { return c.brighter(options.bright); }
            : function (c) { return c; };
        for (var piece_name in block_colors) {
            var color = f(block_colors[piece_name]);
            if (!options.no_fill) {
                context.fillStyle = color.toString();
                context.fillRect(m, m, size - 2 * m, size - 2 * m);
            }
            context.strokeStyle = color.brighter(1).toString();
            context.lineWidth = options.line_width || 1;
            context.strokeRect(mm, mm, size - 2 * mm, size - 2 * mm);
            blocks[piece_name] = context.getImageData(0, 0, size, size);
        }
        return blocks;
    }

    function px(n) {
        return n + 'px';
    }

    function getContext2D(id) {
        return document.getElementById(id).getContext('2d');
    }

    function drawGrid() {
        var c = getContext2D('playfield-background');
        c.strokeStyle = colors.gray.toString();
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

    function drawPlayfield(playfield) {
        for (var y = 0; y < rows; ++y) {
            var row = playfield[y];
            for (var x = 0; x < cols; ++x) {
                var piece_name = row[x];
                clearBlock(ctx.playfield, x, y);
                if (piece_name)
                    drawBlock(ctx.playfield, x, y, piece_name, blocks.normal);
            }
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

    function drawBlock(c, x, y, piece_name, blocks) {
        var x = x * size;
        var y = c.canvas.height - (y + 1) * size;
        c.putImageData(blocks[piece_name], x, y);
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
        cache = {};
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
        c.fillStyle = colors.gray.toString();
        c.fillRect(0, height - solid, width, solid);
        var h = height - solid;
        var grad = solid * 3;
        var g = c.createLinearGradient(0, h - grad, 0, h);
        g.addColorStop(0, colors.yellow_0.toString());
        g.addColorStop(.3, colors.orange_25.toString());
        g.addColorStop(.6, colors.red_50.toString());
        g.addColorStop(1, colors.gray.toString());
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

    var current_menu;
    var last_focus;

    var simulator = new Simulator(10, 22, Point.of(4, 20), this);
    var controller = new Controller();
    var painter = new Painter(10, 22);

    var screen = $('#screen');
    var panels = $('#left, #right, #center');
    var main_menu = $('#main-menu');
    var play_menu = $('#play-menu');

    this.init = function () {
        painter.init();
        simulator.setController(controller);
        simulator.setPainter(painter);
        controller.setSimulator(simulator);

        $('.menu').each(function () {
            $(this).find('li').wrapInner(button);
            $(this)
                .css('top', .5 * (screen.height() - $(this).height()) + 'px')
                .data('focus', $(this).find('li:first button'));
        });
        $('button').click(function () { $(this).focus(); });
        $('.return button').click(function () { show(main_menu); });
        $('#play button').click(function () { show(play_menu); });
        play_menu.find('li:not(.return) button').click(function () {
            hide(current_menu);
            simulator.start($(this).blur().attr('value'));
        }).unbind('focus').focus(function () {
            screen.removeClass().addClass($(this).attr('value'));
            last_focus = this;
        });

        show(main_menu);
    };

    this.onGameOver = function (game_mode, record) {
        if (console)
            console.log(game_mode, record);
        show(main_menu);
    };

    function show(menu) {
        if (current_menu)
            hide(current_menu);
        menu.show();
        menu.data('focus').focus();
        current_menu = menu;
    }

    function hide(menu) {
        menu.data('focus', $(last_focus));
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
        last_focus = this;
    }

    function button() {
        return $('<button />')
            .keydown(keydown)
            .focus(focus)
            .attr('value', $(this).attr('id'));
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
