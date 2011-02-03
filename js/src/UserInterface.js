/**
 * @namespace tetris
 */
(function (window, document, $, undefined) {

var $doc = $(document);

/**
 * @class tetris.UserInterface
 * @singleton This class might not work when there are multiple instances
 */
function UserInterface() {

	this._COLS = 10;
	this._ROWS = 22;
	this._SPAWN_POINT = window.tetris.Point.of(4, 20);
	this._SIZE = 20;  // Pixels per cell's side
	this._NUM_CHANNELS = 16;  // Maximum number of sounds that can be played simultaneously

	/* jQuery elements */
	this._$panels = $('#panels');
	this._$mainMenu = $('#main');
	this._$playMenu = $('#play');
	this._$aboutMenu = $('#about');
	this._$current = null;
	this._$lastFocus = null;

	/* Big objects */
	this._controller = new window.tetris.Controller();
	this._painter = new window.tetris.Painter(this._COLS, this._ROWS, this._SIZE);
	this._soundManager = new window.tetris.SoundManager(this._NUM_CHANNELS);
	this._simulator = new window.tetris.Simulator(this._COLS, this._ROWS, this._SPAWN_POINT, this._controller, this._painter, this._soundManager, this);

	this._init();
}

UserInterface.prototype.onGameOver = function (gameMode, record) {
	// TODO show the record and save it if needed
	this._$panels.addClass('unhighlighted');
	this._showMenu(this._$mainMenu);
};

UserInterface.prototype._init = function () {
	var self = this;

	/* Make menu buttons */
	$('.menu').each(function () {
		var $$ = $(this);
		$$.find('.buttons li').wrapInner('<button />');
		$$.css('top', 0.5 * ($('#wrapper').height() - $$.height()) + 'px')
		$$.data('focus', $$.find('.buttons li:first button'));
	});
	this._$playMenu.find('#marathon-button button').val('marathon');
	this._$playMenu.find('#ultra-button button').val('ultra');
	this._$playMenu.find('#sprint-button button').val('sprint');

	/* Set event listeners */
	$('button')
		.focus(function () { self._$lastFocus = $(this); })
		.focusout(function () {
			/* Prevent focus out from the entire menu */
			if (this === self._$lastFocus[0]) {
				self._$lastFocus.focus();
				return false;
			}
		})
		.click(function () { $(this).focus(); })
		.keydown(function ($e) {
			if (self._$current === null)
				return;
			/* Traverse between buttons in the current menu */
			switch ($e.which) {
			case 38:  // Up
				$(this).parent().prev().find('button').focus();
				break;
			case 40:  // Down
				$(this).parent().next().find('button').focus();
				break;
			}
		});
	$('#play-button button').click(function () {
		self._showMenu(self._$playMenu);
	});
	$('#about-button button').click(function () {
		self._showMenu(self._$aboutMenu);
	});
	$('.back button').click(function () {
		self._showMenu(self._$mainMenu);
	});
	this._$playMenu.find('.buttons li:not(.back) button').click(function () {
		var gameMode = $(this).val();
		$(this).blur();
		self._$panels.removeClass('unhighlighted');
		self._hideMenu(self._$current);
		self._simulator.start(gameMode);
	});
	$('a[rel~=external]').click(function () {
		window.open(this.href, 'tetris');
		return false;
	});

	/* Deal with browser quirks */
	if ($.browser.mozilla) {
		/* Firefox tends to lose focus in menus without the following code */
		$doc.mousedown(function () {
			if (this._$current && this._$lastFocus) {
				window.setTimeout(function () {
					self._$lastFocus.focus();
				}, 0);
			}
		});
	}

	/* Finally, show the main menu */
	this._showMenu(this._$mainMenu);
};

UserInterface.prototype._showMenu = function ($menu) {
	if (this._$current !== null)
		this._hideMenu(this._$current);
	$menu.show();
	$menu.data('focus').focus();
	this._$current = $menu;
};

UserInterface.prototype._hideMenu = function ($menu) {
	$menu.data('focus', this._$lastFocus);
	$menu.hide();
	this._$lastFocus.blur();
	this._$current = null;
};

window.tetris.UserInterface = UserInterface;

})(this, this.document, this.jQuery);
