/*!
 * @namespace tetris
 * @class tetris.Logger
 */
(function (window, document, undefined) {

/**
 * @class
 */
function Logger(name) {
	this._name = name;
	this._console = 'console' in window ? window.console : null;
}

Logger.prototype.error = function (msg) { this._log('error', msg); };
Logger.prototype.warn = function (msg) { this._log('warn', msg); };
Logger.prototype.info = function (msg) { this._log('info', msg); };
Logger.prototype.debug = function (msg) { this._log('debug', msg); };

Logger.prototype._log = function (level, msg) {
	var console = this._console,
		output;
	if (!console)
		return;
	output = this._name + ': (' + level.toUpperCase() + ') ' + msg;
	if (level in console)
		console[level](output);
	else if ('log' in console)
		console.log(output);
}

window.tetris.Logger = Logger;

})(this, this.document);
