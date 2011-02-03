/**
 * @namespace tetris
 */
(function (window, document, undefined) {

/**
 * @class tetris.SoundManager
 */
function SoundManager(numChannels) {

	this._NUM_CHANNELS = numChannels;

	this._prefix = 'sounds/';
	this._suffix = null;
	this._readyQueue = [];
	this._logger = new window.tetris.Logger('SoundManager');

	this._init();
}

SoundManager.prototype.play = function (name) {
	var audio, src;
	if (this._suffix === null)
		return;
	audio = this._readyQueue.shift();
	if (!audio) {
		this._logger.warn('cannot play "' + name + '": all channels are busy');
		return;
	}
	src = this._prefix + name + this._suffix;
	audio.src = src;
	audio.load();
	audio.play();
};

SoundManager.prototype._init = function () {
	var self = this, audio, i;

	/* Make audio elements for each channel */
	for (i = 0; i < this._NUM_CHANNELS; ++i) {
		audio = document.createElement('audio');
		audio.preload = 'none';
		audio.autoplay = false;
		audio.loop = false;
		audio.controls = false;
		audio.volume = 1;
		audio.muted = false;
		audio.addEventListener('ended', function () {
			self._readyQueue.push(this);
		}, false);
		document.body.appendChild(audio);
		this._readyQueue.push(audio);
	}

	/* Check which type of audio the browser can play */
	if (audio.canPlayType('audio/mpeg; codecs="mp3"') !== '')
		this._suffix = '.mp3';
	else if (audio.canPlayType('audio/ogg; codecs="vorbis"') !== '')
		this._suffix = '.ogg';
	else if (audio.canPlayType('audio/wav; codecs="1"') !== '')
		this._suffix = '.wav';
};

window.tetris.SoundManager = SoundManager;

})(this, this.document);
