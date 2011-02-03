/**
 * @namespace tetris
 */
(function (window, document, undefined) {

/**
 * @class tetris.SoundManager
 */
function SoundManager(numChannels) {
	var self = this, audio, i;

	this._prefix = 'sounds/';
	this._suffix = null;
	this._readyQueue = [];
	this._logger = new window.tetris.Logger('SoundManager');

	/* Make audio elements for each channel */
	for (i = 0; i < numChannels; ++i) {
		audio = document.createElement('audio');
		audio.preload = 'auto';
		audio.autoplay = true;
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
}

SoundManager.prototype.play = function (name) {
	var audio;
	if (this._suffix === null)
		return;
	audio = this._readyQueue.shift();
	if (!audio) {
		this._logger.warn('cannot play "' + name + '": all channels are busy');
		return;
	}
	audio.src = this._prefix + name + this._suffix;
};

window.tetris.SoundManager = SoundManager;

})(this, this.document);
