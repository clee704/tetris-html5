define(['tetris/Point'], function (Point) {
  'use strict';

  describe('Point', function () {
    describe('of', function () {
      it('should return a cached object', function () {
        expect(Point.of(1, 1)).toBe(Point.of(1, 1));
        expect(Point.of(2, 5)).toBe(Point.of(2, 5));
      });
    });
    describe('arrayOf', function () {
      it('should return an array of cached objects', function () {
        expect(Point.arrayOf(1, 3, 5, 4, 5, 6)).toEqual([
          Point.of(1, 3),
          Point.of(5, 4),
          Point.of(5, 6)
        ]);
      });
    });
    describe('add', function () {
      it('should add', function () {
        expect(Point.of(1, 1).add(Point.of(2, 3))).toBe(Point.of(3, 4));
        expect(Point.of(0, 0).add(Point.of(1, 1))).toBe(Point.of(1, 1));
      });
    });
    describe('addX', function () {
      it('should add x', function () {
        expect(Point.of(2, 3).addX(0)).toBe(Point.of(2, 3));
        expect(Point.of(0, 5).addX(10)).toBe(Point.of(10, 5));
      });
    });
    describe('addY', function () {
      it('should add y', function () {
        expect(Point.of(2, 3).addY(0)).toBe(Point.of(2, 3));
        expect(Point.of(0, 5).addY(10)).toBe(Point.of(0, 15));
      });
    });
    describe('subtract', function () {
      it('should subtract', function () {
        expect(Point.of(2, 3).subtract(Point.of(1, 1))).toBe(Point.of(1, 2));
        expect(Point.of(0, 5).subtract(Point.of(0, 0))).toBe(Point.of(0, 5));
      });
    });
  });
});
