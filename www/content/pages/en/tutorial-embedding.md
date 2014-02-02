Title: Embedding Sozi presentations in HTML documents
Slug: tutorial-embedding
Lang: en
Author: Guillaume Savaton
Status: hidden

There are three known techniques to embed a Sozi presentation in an HTML page.

Using the ``<object>`` element
------------------------------

    :::html
    <object data="url_of_my_presentation.svg" type="image/svg+xml">
        This was supposed to be an SVG document
        in an &lt;object&gt; element.
    </object>

The width and height of the viewport for the embedded document can be set either as attributes
of the ``<object>`` element, or using CSS.
An example is shown below.
[Read more about the ``<object>`` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object).

<object class="sozi" data="../static/images/this-is-not-a-slideshow.fast.svg" type="image/svg+xml">
    This was supposed to be an SVG document in an &lt;object&gt; element.
</object>

Using the ``<iframe>`` element
------------------------------

    :::html
    <iframe src="url_of_my_presentation.svg">
        This was supposed to be an SVG document
        in an &lt;iframe&gt; element.
    </iframe>

The width and height of the viewport for the embedded document can be set either as attributes
of the ``<iframe>`` element, or using CSS.
An example is shown below.
[Read more about the ``<iframe>`` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe).

<iframe class="sozi" src="|filename|/images/this-is-not-a-slideshow.fast.svg">
    This was supposed to be an SVG document in an &lt;object&gt; element.
</iframe>

Using the ``<embed>`` element
-----------------------------

    :::html
    <embed src="url_of_my_presentation.svg" type="image/svg+xml">
    
The width and height of the viewport for the embedded document can be set either as attributes
of the ``<embed>`` element, or using CSS.
An example is shown below.
[Read more about the ``<embed>`` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed).

<embed class="sozi" src="|filename|/images/this-is-not-a-slideshow.fast.svg" type="image/svg+xml">

Giving the keyboard focus to the Sozi presentation
--------------------------------------------------

When loading an HTML page, the browser gives the keyboard focus to the first element
that can accept it (hyperlink, form element, etc).
For this reason, in many cases, the embedded Sozi presentation will not respond to keyboard events
immediately on load.
One solution is to repeatedly hit the ``TAB`` key
until the ``<iframe>``, ``<object>`` or ``<embed>`` element that displays your presentation
receives focus.

You can also add the following script to your document to automatically focus the
``<object>`` element containing your presentation (assuming it is the first ``<object>``
element in the page).
It works also with the ``<embed>`` element, but not with ``<iframe>``.

    :::html
    <script>
        window.addEventListener("load", function () {
            document.querySelector("object").focus();
        }, false);
    </script>
