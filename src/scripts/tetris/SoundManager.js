'use strict';

/**
 * @namespace tetris
 */
define(['./Logger'], function (Logger) {

var filetypes = {
  'mp3': 'audio/mpeg; codecs="mp3"',
  'ogg': 'audio/ogg; codecs="vorbis"',
  'wav': 'audio/wav; codecs="1"'
};

/**
 * @class tetris.SoundManager
 */
function SoundManager(args) {
  var AudioContext;
  try {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    this._ctx = new AudioContext();
    this._audio = document.createElement('audio');
  } catch (e) {
    this._ctx = null;
  }
  this._logger = new Logger('SoundManager');
  this._buffers = {};
  this._dir = args.dir;
  this._filetypes = args.filetypes;
  this._sounds = args.sounds;
  this._loadSounds();
}

SoundManager.prototype._loadSounds = function () {
  var self = this,
      dir = this._dir,
      ext, i, filetype;
  for (i = 0; i < this._filetypes.length; i++) {
    filetype = this._filetypes[i];
    if (filetype in filetypes &&
        this._audio.canPlayType(filetypes[filetype])) {
      ext = '.' + filetype;
      break;
    }
  }
  if (ext === undefined) {
    this._ctx = null;
    return;
  }
  function load(name) {
    var request = new XMLHttpRequest();
    request.open('GET', dir + name + ext, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
      self._ctx.decodeAudioData(request.response, function (buffer) {
        self._buffers[name] = buffer;
      });
    };
    request.send();
  }
  for (i = 0; i < this._sounds.length; i++) {
    load(this._sounds[i]);
  }
}

SoundManager.prototype.isSupported = function () {
  return this._ctx !== null;
};

SoundManager.prototype.play = function (name) {
  if (this._muted) return;
  var source = this._ctx.createBufferSource();
  source.buffer = this._buffers[name];
  source.connect(this._ctx.destination);
  source.start(0);
};

SoundManager.prototype.mute = function () {
  this._muted = true;
}

SoundManager.prototype.unmute = function () {
  this._muted = false;
}

return SoundManager;

});
