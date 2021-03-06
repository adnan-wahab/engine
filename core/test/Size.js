/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var test = require('tape');
var Size = require('../Size');
var SizeTestCases = require('./expected/Size');

test('Size', function(t) {
    t.test('constructor', function(t) {
        t.equal(typeof Size, 'function', 'Size should be a constructor function');
        t.doesNotThrow(function() {
            new Size();
        }, 'Size constructor should not throw an error');
        t.end();
    });

    t.test('enum', function(t) {
        t.notLooseEqual(Size.RELATIVE, null, 'Size.RELATIVE should be set');
        t.notLooseEqual(Size.ABSOLUTE, null, 'Size.ABSOLUTE should be set');
        t.notLooseEqual(Size.RENDER, null, 'Size.RENDER should be set');
        t.notLooseEqual(Size.DEFAULT, null, 'Size.DEFAULT should be set');
        t.end();
    });

    t.test('fromSpecWithParent method', function(t) {
        var size = new Size();

        t.equal(typeof size.fromSpecWithParent, 'function', 'size.fromSpecWithParent should be a function');

        var i;
        var testCase;

        for (i = 0; i < SizeTestCases.length; i++) {
            testCase = SizeTestCases[i];
            testCase.actualResult = new Float32Array(3);
            size.fromSpecWithParent(testCase.parentSize, testCase.spec, testCase.actualResult);
        }

        for (i = 0; i < SizeTestCases.length; i++) {
            testCase = SizeTestCases[i];
            t.deepEqual(testCase.actualResult, testCase.expectedResult);
        }

        t.end();
    });
});
