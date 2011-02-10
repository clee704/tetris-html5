<?php

$FILES = array(
	'commons' => array(
		'index.html',
		'css/fonts.css',
		'css/style.css',
		'css/fonts/Allerta-Stencil.ttf',
		'css/fonts/Sunshiney.ttf',
		'js/jquery.min.js',
		'js/tetris-src/__all__.js',
		'js/tetris-src/SimulatorBase.js',
		'js/tetris-src/Simulator.js',
		'js/tetris-src/Controller.js',
		'js/tetris-src/Painter.js',
		'js/tetris-src/SoundManager.js',
		'js/tetris-src/UserInterface.js',
		'js/tetris-src/Color.js',
		'js/tetris-src/Point.js',
		'js/tetris-src/Tetromino.js',
		'js/tetris-src/Arrays.js',
		'js/tetris-src/Logger.js',
		'js/tetris-src/__main__.js',
	),
	'eot' => array(
		'css/fonts/Allerta-Stencil.eot',
		'css/fonts/Sunshiney.eot',
	),
	'mp3' => array(
		'sounds/gameover.mp3',
		'sounds/hold.mp3',
		'sounds/hold2.mp3',
		'sounds/levelup.mp3',
		'sounds/lineclear.mp3',
		'sounds/lock.mp3',
	),
	'ogg' => array(
		'sounds/gameover.ogg',
		'sounds/hold.ogg',
		'sounds/hold2.ogg',
		'sounds/levelup.ogg',
		'sounds/lineclear.ogg',
		'sounds/lock.ogg',
	),
);

$files = array();
array_extend($files, $FILES['commons']);
array_extend($files, $FILES[$_GET['eot'] ? 'eot' : '']);
array_extend($files, $FILES[$_GET['mp3'] ? 'mp3' : 'ogg']);
$mtimes = array_map(filemtime, $files);
$max_mtime = max($mtimes);

header('Content-Type: text/cache-manifest');
header('Cache-Control: no-cache');
header('Expires: Mon, 01 Jan 2001 00:00:00 GMT');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $max_mtime) . ' GMT');

echo "CACHE MANIFEST\n";
echo "# rev $max_mtime\n";
echo "CACHE:\n";
foreach ($files as $f)
	echo "$f\n";
echo "NETWORK:\n*\n";

function array_extend(&$input, &$other) {
	array_splice($input, count($input), 0, $other);
}
