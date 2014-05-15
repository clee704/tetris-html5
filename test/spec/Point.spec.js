'use strict';

define(['tetris/Point'], function (Point) {
  describe('Point', function () {
    describe('add', function () {
      it('should add', function () {
        expect(Point.of(1, 1).add(Point.of(2, 3))).toEqual(Point.of(3, 4));
      });
    });
  });
});
