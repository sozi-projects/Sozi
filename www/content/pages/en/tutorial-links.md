Title: Frame URLs and hyperlinks
Slug: tutorial-links
Lang: en
Author: Guillaume Savaton
Status: hidden

This tutorial explains how to add hyperlinks in Sozi documents
and how to link to a Sozi frame.

Download and open the example document
--------------------------------------

This tutorial is based on a plain SVG document that contains the visual elements of our presentation.
[Download the base SVG document](|filename|/images/tutorial-links/sozi-links-tutorial-base.svg)
(right-click on the link and choose *Save link target as*) and open it in Inkscape.

![Open the base SVG document in Inkscape](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-01.png)

Create frames
-------------

Select all five rectangles and open Sozi from the *Extensions* menu.
Create a frame for each rectangle.
To help you identify each rectangle easily, we have already set their Ids to match their colors
(e.g the Id of the *blue* rectangle is ``blue-rect``).

![Create a frame for each rectangle](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-02.png)

Create five frames with the following properties:

<table>
    <tr>
        <th>Title</th>
        <th>Id</th>
        <th>SVG Element</th>
    </tr>
    <tr>
        <td>Black</td>
        <td>black-frame</td>
        <td>black-rect</td>
    </tr>
    <tr>
        <td>Red</td>
        <td>red-frame</td>
        <td>red-rect</td>
    </tr>
    <tr>
        <td>Green</td>
        <td>green-frame</td>
        <td>green-rect</td>
    </tr>
    <tr>
        <td>Magenta</td>
        <td>magenta-frame</td>
        <td>magenta-rect</td>
    </tr>
    <tr>
        <td>Blue</td>
        <td>blue-frame</td>
        <td>blue-rect</td>
    </tr>
</table>

Close Sozi and save the document.
You can already open it in a web browser to check that all frames are correctly defined.

Frame URLs
----------

When a Sozi document is opened in the web browser, the content of the address bar
changes when you move from one frame to another.

![Frame URL in the address bar of a web browser](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-03.png)

In the example above the address bar shows the URL:

    file://.../sozi-links-tutorial-full.svg#green-frame

If your document is served by a web server, the first element will be ``http`` or ``https`` instead of ``file``.
The last elements of the URL are the SVG file name followed by a *hash* character (``#``)
and the Id of the current frame (``green-frame``).

As a result, if you are sharing a presentation on the web, it will be possible to make a
direct link to any frame with a given Id.

Creating hyperlinks in a Sozi presentation
------------------------------------------

Back to Inkscape, right-click on the red circle and choose *Create Link*.
This action does not open any dialog. It just wraps the selected element inside an SVG link element.

![Creating a link in Inkscape](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-04.png)

Now right-click on the red circle again and choose *Link Properties*.

![Editing a link in Inkscape](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-05.png)

The following dialog allows to edit several attributes of the selected link.
To create a link to the frame enclosed in the red rectangle, we only need to set the ``Href`` attribute to
``#red-frame``. You can proceed similarly for the other three circles.

![Setting the href attribute of a link](|filename|/images/tutorial-links/sozi-links-tutorial-screenshot-06.png)

Play the presentation in a web browser
--------------------------------------

Save the document in Inkscape.

Open the SVG document with your favorite web browser.
It will automatically focus on the first frame.
Click inside the white background of the document to move to the next frame
(See also: [Playing a presentation](|filename|play.md))
or click on a circle to move directly to the corresponding frame.

[Download or play the full presentation](|filename|/images/tutorial-links/sozi-links-tutorial-full.svg).
