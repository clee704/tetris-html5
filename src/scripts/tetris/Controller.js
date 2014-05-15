/**
 * @namespace tetris
 */
define(['jquery'], function ($) {
'use strict';

var $doc = $(document);

/**
 * @class tetris.Controller
 * @singleton This class might not work when there are multiple instances
 */
function Controller() {
  var self = this;

  /* Virtual keys */
  this._keys = {
    'SoftDrop': {interruptable: true},
    'HardDrop': {},
    'ShiftLeft': {delay: 150, frequency: 30, exclude: 'ShiftRight'},
    'ShiftRight': {delay: 150, frequency: 30, exclude: 'ShiftLeft'},
    'RotateLeft': {exclude: 'RotateRight'},
    'RotateRight': {exclude: 'RotateLeft'},
    'Hold' : {}
  };

  /* Mappings from real keys to virtual keys */
  this._mappings = {
    40: 'SoftDrop',  // Down
    32: 'HardDrop',  // Space
    37: 'ShiftLeft',  // Left
    39: 'ShiftRight',  // Right
    17: 'RotateLeft',  // Ctrl
    90: 'RotateLeft',  // z
    38: 'RotateRight',  // Up
    88: 'RotateRight',  // x
    16: 'Hold',  // Shift
    67: 'Hold'  // c
  };

  /* jQuery event listeners */
  this._keydown = function ($e) {
    var name, key;
    if ($e.which in self._mappings) {
      name = self._mappings[$e.which];
      key = self._keys[name];
      key.keydown();
    }
  };
  this._keyup = function ($e) {
    var name, key;
    if ($e.which in self._mappings) {
      name = self._mappings[$e.which];
      key = self._keys[name];
      key.keyup();
    }
  };
}

Controller.prototype.link = function (simulator) {
  this._register('SoftDrop', simulator.softDrop, simulator.softDrop);
  this._register('HardDrop', simulator.hardDrop);
  this._register('ShiftLeft', simulator.shiftLeft);
  this._register('ShiftRight', simulator.shiftRight);
  this._register('RotateLeft', simulator.rotateLeft);
  this._register('RotateRight', simulator.rotateRight);
  this._register('Hold', simulator.hold);
};

Controller.prototype.start = function () {
  var name, key;
  for (name in this._keys) {
    key = this._keys[name];
    delete key.pressed;
    delete key.interrupted;
  }
  $doc.bind('keydown.controller', this._keydown);
  $doc.bind('keyup.controller', this._keyup);
};

Controller.prototype.interrupt = function () {
  var name, key;
  for (name in this._keys) {
    key = this._keys[name];
    if (key.interruptable) key.interrupt();
  }
};

Controller.prototype.stop = function () {
  $doc.unbind('.controller');
};

/**
 * Registers the given functions to the specified virtual key.
 */
Controller.prototype._register = function (name, keydownFunc, keyupFunc) {
  var key = this._keys[name],
    exclusiveKey = this._keys[key.exclude],
    interval = 1000 / key.frequency,
    timer;
  function repeat() {
    if (!key.pressed) return;
    keydownFunc();
    timer = setTimeout(repeat, interval);
  }
  key.keydown = function () {
    if (key.pressed) return;
    if (exclusiveKey && exclusiveKey.pressed) exclusiveKey.interrupt();
    key.pressed = true;
    keydownFunc();
    if (key.frequency) timer = setTimeout(repeat, key.delay);
  };
  key.keyup = function () {
    clearTimeout(timer);
    if (!key.interrupted && keyupFunc) keyupFunc();
    delete key.pressed;
    delete key.interrupted;
    return;
  };
  key.interrupt = function () {
    if (!key.pressed || key.interrupted) return;
    clearTimeout(timer);
    if (keyupFunc) keyupFunc();
    key.interrupted = true;
  };
};

return Controller;

});
