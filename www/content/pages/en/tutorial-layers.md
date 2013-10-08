Title: Using layers
Slug: tutorial-layers
Lang: en
Author: Guillaume Savaton
Status: hidden


A Sozi presentation can be organized in one or more layers that will
move independently.
A typical use of layers is to add a fixed background to your frames,
but there are many other possibilities.
With some work and ingeniosity, you can make sophisticated animations.
But remember: since the primary goal of Sozi is to make presentations,
it will not provide the facilities that you would expect from a general-purpose
animation editor.

Download and open the example document
--------------------------------------

This tutorial is based on a plain SVG document that contains the visual elements of our presentation.
[Download the base SVG document](|filename|/images/tutorial-layers/sozi-layers-tutorial-base.svg)
(right-click on the link and choose *Save link target as*) and open it in Inkscape.

![Open the base SVG document in Inkscape](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-01.png)


Show the layers dialog
----------------------

Inkscape allows to organize a document in layers.
You can open the layers dialog by clicking on the *View layers* button in the toolbar.

![Show layers](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-02.png)

In this example, the document contains three layers:

* ``Text``: the foreground layer.
* ``Landscape``: the intermediate layer.
* ``Sky``: the background layer.

You can show or hide a layer by clicking on the corresponding "eye" icon in the *Layers* dialog.
In the screenshot above, only the ``Text`` layer is visible.

Create the frames of the Sozi presentation
------------------------------------------

In the first place, we will proceed as if we were creating a presentation with no layers.

1. Select the four rectangles in the ``Text`` layer, from right to left.
2. Open the Sozi editor.
3. Create four frames as shown below.
4. Click the *Ok* button to close the Sozi editor.

![Create the frames of the Sozi presentation](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-03.png)


Add a fixed layer
-----------------

Now, we will select a region of the ``Landscape`` layer containing the fixed elements of our presentation.

1. Select the rectangle in the ``Landscape`` layer.
2. Open the Sozi editor.
3. Select the first frame.
4. Below the frame list, click on the arrow button *Create a new frame or add a layer* and select *Add layer 'Landscape'*.

![Add a fixed layer](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-04.png)

The layer will appear in the frame list as a child of the first frame:

![Add a fixed layer](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-05.png)

Click the *Ok* button to close the Sozi editor.


Add an animated layer
---------------------

Finally, the ``Sky`` layer will serve as an animated background.

1. Select the four rectangles in the ``Landscape`` layer, from the top-right to the bottom-left.
2. Open the Sozi editor.
3. Select the first frame.
4. Below the frame list, click on the arrow button *Create a new frame or add a layer* and select *Add layer 'Sky'*.
5. Repeat steps 3 and 4 for the other frames.

![Add an animated layer](|filename|/images/tutorial-layers/sozi-layers-tutorial-screenshot-06.png)

Click the *Ok* button to close the Sozi editor.


Play the presentation in a web browser
--------------------------------------

Save the document in Inkscape.

Open the SVG document with your favorite web browser.
It will automatically focus on the first frame.
Click inside the browser window to move to the next frame
(See also: [Playing a presentation](|filename|play.md)).

[Download or play the full presentation](|filename|/images/tutorial-layers/sozi-layers-tutorial-full.svg).
