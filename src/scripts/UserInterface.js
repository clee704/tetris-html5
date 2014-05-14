'use strict';

/**
 * @namespace tetris
 */
(function (window, $, undefined) {

/**
 * @class tetris.UserInterface
 * @singleton This class might not work when there are multiple instances
 */
function UserInterface() {

  this._COLS = 10;
  this._ROWS = 22;
  this._SPAWN_POINT = window.tetris.Point.of(4, 20);
  this._SIZE = 20;  // Pixels per cell's side
  this._NUM_CHANNELS = 16;  // Maximum number of sounds that can be played
                            // simultaneously

  /* jQuery elements */
  this._$panels = $('#panels');
  this._$mainMenu = $('#menus .main.menu');
  this._$currentMenu = null;
  this._$previousMenu = null;

  /* Big objects */
  this._controller = new window.tetris.Controller();
  this._painter = new window.tetris.Painter(this._COLS, this._ROWS,
                                            this._SIZE);
  this._soundManager = new window.tetris.SoundManager({
    dir: 'sounds/',
    sounds: ['gameover', 'hold', 'hold2', 'levelup', 'lineclear', 'lock'],
    filetypes: ['mp3', 'ogg', 'wav']
  });
  this._simulator = new window.tetris.Simulator(
    this._COLS, this._ROWS, this._SPAWN_POINT, this._controller, this._painter,
    this._soundManager, this);

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
  $(window.document).keydown(function ($e) {
    var $menu = self._$currentMenu, $button;
    if ($menu === null) return;
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
  $('#menus .button').click(function () {
    self._focusButton($(this));
  });
  $('#menus .button:not(.leaf, .back)').click(function () {
    var menuName = $(this).text().toLowerCase();
    self._showMenu($('#menus .menu.' + menuName));
  });
  $('#menus .button.back').click(function () {
    self._showMenu(self._$previousMenu);
  });
  $('#menus .play.menu .button.leaf').click(function () {
    var gameMode = $(this).text().toLowerCase();
    self._$panels.removeClass('unhighlight');
    self._hideMenu(self._$currentMenu);
    self._simulator.start(gameMode);
  });

  /* Add event listeners for sound controls */
  if (this._soundManager.isSupported()) {
    $('#sound-controls .mute.button')
      .click(function () {
        if ($(this).hasClass('mute')) {
          self._mute();
        } else {
          self._unmute();
        }
      });
  } else {
    $('#sound-controls').addClass('disabled');
    $('#sound-controls')
      .mouseenter(function () {
        $('#sound-controls .tooltip').stop(true, true).show();
      })
      .mouseleave(function () {
        $('#sound-controls .tooltip').delay(1600).fadeOut(400);
      });
  }

  /* Make external links open a new window */
  $('a[rel~=external]').click(function () {
    window.open(this.href, 'tetris');
    return false;
  });

  /* Load options, if any, which are saved on previous sessions */
  this._loadOptions();

  /* Finally, show the main menu */
  this._showMenu(this._$mainMenu);
};

UserInterface.prototype._loadOptions = function () {
  if (window.localStorage['tetris.muted'] === 'false') {
    this._unmute();
  }
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
  this._$previousMenu = this._$currentMenu;
  this._$currentMenu = null;
};

UserInterface.prototype._focusButton = function ($button) {
  var $prev = $button.parent('.buttons').find('.focus');
  if ($prev[0] === $button[0]) return;
  $prev.removeClass('focus');
  $button.addClass('focus');
};

UserInterface.prototype._mute = function () {
  this._soundManager.mute();
  $('.mute').removeClass('mute').addClass('unmute').text('Off');
  window.localStorage['tetris.muted'] = true;
};

UserInterface.prototype._unmute = function () {
  this._soundManager.unmute();
  $('.unmute').removeClass('unmute').addClass('mute').text('On');
  window.localStorage['tetris.muted'] = false;
};

window.tetris.UserInterface = UserInterface;

})(this, this.jQuery);
