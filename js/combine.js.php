<?php
$start = microtime(true);
if (!$_GET['q'])
	die();
$filenames = explode(' ', $_GET['q']);
foreach ($filenames as $fn)
	if (!preg_match('/^([a-z0-9_\-]+\.)+js$/i', $fn))
		die("/* ERROR: Filename '$fn' is not allowed */");
header('Content-Type: application/javascript; charset=utf-8');
foreach ($filenames as $fn) {
	if (!is_readable($fn))
		echo "/* ERROR: File '$fn' is not readable */\n";
	else
		echo file_get_contents($fn);
}
$processing_time = microtime(true) - $start;
echo "/* PHP: $processing_time seconds */";
