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

/**
 * Removes all values not being of a primitive type from an arbitrary object
 * literal.
 *
 * @method strip
 * @memberof Utilities
 * @param  {any}        primitive or (non-)serializable object without
 *                      circular references
 * @return {any}        primitive or (nested) object only containing primitive
 *                      types (serializable)
 */
function strip(obj) {
    switch (obj) {
        case null:
        case undefined:
            return obj;
    }
    switch (obj.constructor) {
        case Boolean:
        case Number:
        case String:
        case Symbol:
            return obj;
        case Object:
            for (var key in obj) {
                var stripped = strip(obj[key], true);
                obj[key] = stripped;
            }
            return obj;
        default:
            return null;
    }
}

module.exports = strip;
