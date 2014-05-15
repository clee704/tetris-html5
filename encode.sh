#! /bin/sh
dir=src/sounds
oggenc -q 0 -o $dir/$1.ogg $dir/$1.wav
lame -b 64 $dir/$1.wav $dir/$1.mp3
