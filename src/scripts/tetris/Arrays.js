/**
 * @namespace tetris
 */
define(function () {
'use strict';

/**
 * Various functions for arrays
 *
 * @object tetris.Arrays
 */
return {

  /** Returns an array of n given values. */
  repeat: function (n, value) {
    var a = [], i;
    for (i = 0; i < n; ++i) {
      a.push(value);
    }
    return a;
  },

  /**
   * Overwrites the destination array with a shallow copy
   * of the source array.
   */
  copy: function (source, destination) {
    var i, n;
    for (i = 0, n = source.length; i < n; ++i) {
      destination[i] = source[i];
    }
    destination.length = n;
  },

  /**
   * Replaces all elements of the given array with the given value.
   */
  fill: function (a, value) {
    var i, n;
    for (i = 0, n = a.length; i < n; ++i) {
      a[i] = value;
    }
  },

  /**
   * Removes the i-th element of the given array. Does nothing
   * if the given index is not valid.
   */
  remove: function (a, i) {
    var n = a.length, temp, j;
    if (i < 0 || i >= n) return;
    temp = a[i];
    for (j = i + 1; j < n; ++j) {
      a[j - 1] = a[j];
    }
    --a.length;
    return temp;
  }

};

});
