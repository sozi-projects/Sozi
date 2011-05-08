/*
 * Sozi - A presentation tool using the SVG standard
 * 
 * Copyright (C) 2010 Guillaume Savaton
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint plusplus: false, indent: 3, browser: true */
/*global window: true */

Function.prototype.bind = function (obj) {
   var args = Array.prototype.slice.call(arguments, 1),
       f = this;
   return function () {
      f.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
   };
};

// vim: sw=3

