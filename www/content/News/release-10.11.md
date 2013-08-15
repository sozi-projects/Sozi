Title: Sozi 10.11 is available
Date: 2010-11-22
Slug: release-10.11
Lang: en
Author: Guillaume Savaton
Summary:
    Enable or disable clipping, create a frame from any SVG element, transition effects, new keyboard actions and bug fixes.

This release comes with the following new features and bug fixes:

General
-------

* [You can enable or disable clipping at frame boundaries](http://github.com/senshu/Sozi/issues/#issue/4).
* [A frame can be created from any SVG element, not only rectangles](http://github.com/senshu/Sozi/issues/closed/#issue/20).
* A zooming effect can be added to transitions.

Player
------

* [Press key "F" to show the entire document](http://github.com/senshu/Sozi/issues/#issue/5).
* [Go directly to a frame by putting its number in the URL, after the "#" character](http://github.com/senshu/Sozi/issues/#issue/6). During the presentation, the number of the current frame is automatically appended to the URL. This feature allows to bookmark frames in your web browser.
* Bug fix: [When an SVG document is embedded in a web page, using the mouse wheel over the SVG also scrolls the page](http://github.com/senshu/Sozi/issues/closed/#issue/2).
* Bug fix: [Blank or truncated page when a viewBox attribute exists in the SVG document](http://github.com/senshu/Sozi/issues#issue/9).
* Bug fix: [Non-responsive keyboard with Chrome/Chromium browser](http://github.com/senshu/Sozi/issues/#issue/5).
* Bug fix: Zooming with the mouse wheel or the "+" and "-" keys is not centered.

