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
	this._$mainMenu = $('#menus .menu.main');
	this._$currentMenu = null;
	this._$prevMenu = null;

	/* Big objects */
	this._controller = new window.tetris.Controller();
	this._painter = new window.tetris.Painter(this._COLS, this._ROWS, this._SIZE);
	this._soundManager = new window.tetris.SoundManager(this._NUM_CHANNELS);
	this._simulator = new window.tetris.Simulator(this._COLS, this._ROWS, this._SPAWN_POINT, this._controller, this._painter, this._soundManager, this);

	this._init();
}

UserInterface.prototype.onGameOver = function (gameMode, record) {
	//
	// TODO Show the record and save it if needed.
	// The following is temporary code.
	//
	this._$panels.addClass('unhighlight');
	this._showMenu(this._$mainMenu);
};

UserInterface.prototype._init = function () {
	var self = this;

	/* Set position of each menu */
	$('#menus .menu').css('top', function () {
		return 0.5 * ($('#wrapper').height() - $(this).height()) + 'px';
	});

	/* Add event listeners for menu and focus traversal */
	$doc.keydown(function ($e) {
		var $menu = self._$currentMenu, $button;
		if ($menu === null)
			return;
		$button = $menu.find('.focus');
		switch ($e.which) {
		case 13:  // Enter
		case 32:  // Space
			$button.click();
			break;
		case 38:  // Up
			self._focusButton($button.prev());
			break;
		case 40:  // Down
			self._focusButton($button.next());
			break;
		default:
			return;
		}
	});
	$('.button:not(.leaf, .back)').click(function () {
		var $button = $(this), menuName;
		self._focusButton($button);
		menuName = $button.text().toLowerCase();
		self._showMenu($('#menus .menu.' + menuName));
	});
	$('.button.back').click(function () {
		self._showMenu(self._$prevMenu);
	});
	$('#menus .menu.play .button.leaf').click(function () {
		var gameMode = $(this).text().toLowerCase();
		self._$panels.removeClass('unhighlight');
		self._hideMenu(self._$currentMenu);
		self._simulator.start(gameMode);
	});

	/* Make external links open a new window */
	$('a[rel~=external]').click(function () {
		window.open(this.href, 'tetris');
		return false;
	});

	/* Finally, show the main menu */
	this._showMenu(this._$mainMenu);
};

UserInterface.prototype._showMenu = function ($menu) {
	if (this._$currentMenu !== null) {
		this._hideMenu(this._$currentMenu);
	}
	$menu.addClass('focus');
	this._$currentMenu = $menu;
};

UserInterface.prototype._hideMenu = function ($menu) {
	$menu.removeClass('focus');
	this._$prevMenu = this._$currentMenu;
	this._$currentMenu = null;
};

UserInterface.prototype._focusButton = function ($button) {
	var $prev = $button.parent('.buttons').find('.focus');
	if ($prev[0] === $button[0])
		return;
	$prev.removeClass('focus');
	$button.addClass('focus');
};

window.tetris.UserInterface = UserInterface;

})(this, this.document, this.jQuery);
