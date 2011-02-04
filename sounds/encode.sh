#! /bin/sh
oggenc -q 0 -o $1.ogg pcm/$1.wav
lame -b 64 pcm/$1.wav $1.mp3
