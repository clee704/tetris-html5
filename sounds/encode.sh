#! /bin/sh
oggenc -b 64 -o $1.ogg $1.wav
lame -b 64 $1.wav $1.mp3
