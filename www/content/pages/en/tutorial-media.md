Title: Embedding video and audio
Slug: tutorial-media
Lang: en
Author: Guillaume Savaton
Status: hidden

You can insert video and audio into a Sozi presentation,
or even into any SVG document, using the *Add video or audio* extension
in the *Sozi extras* extensions submenu.

Technically, this feature relies on the HTML5 &lt;video&gt; and &lt;audio&gt;
elements that can be embedded into SVG documents.
Web browsers do not support the same set of media formats.
See the follwing page for more information:
[Media formats supported by the HTML audio and video elements (Mozilla Developer Network)](https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats).

> Currently, Chrome (as of version 33) does not apply geometrical transformations
> (rotation, scaling, translation) to video elements embedded in SVG documents.
> Videos will always show in the top-left corner of the browser window.
> As far as we know, only Firefox handles videos correctly.
