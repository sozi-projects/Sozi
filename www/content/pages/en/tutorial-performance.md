Title: Improving rendering performance
Slug: tutorial-performance
Lang: en
Author: Guillaume Savaton
Status: hidden

When playing a Sozi presentation based on a complex SVG document,
you may observe that animations become jerky.
This issue is generally related to the SVG rendering performance of your web browser.

There are several known workarounds for this issue:

Convert texts to paths
----------------------

In some web browsers, the SVG rendering time can increase significantly if your
document contains a lot of text.
Converting text elements to paths facilitates the work of the browser by precomputing
the shape of the characters.
It also guarantees that the text will be rendered identically in all browsers,
even if the fonts used in the document are not available on the computer that will
display it.

However, this operation has a shortcoming: il will remove the original text from
your document, preventing modification and indexing by search engines.

> Do not perform this operation on your original document.
> Always save a copy of your document before.

In Inkscape, select all text elements (*Edit* menu / *Find*, or Ctrl-F).

![Find text elements](|filename|/images/tutorial-performance/sozi-tutorial-performance-screenshot-01.png)

From the *Path* menu, choose *Object to Path* (Shift-Ctrl-C).

Optimize your document
----------------------

[Scour](http://www.codedread.com/scour/) is a tool that performs optimizations on
SVG documents.
While the primary goal is to reduce file size, some
[operations](http://www.codedread.com/scour/ops.php) can help reduce the
rendering time:

* removing empty and unused elements,
* merging nested groups,
* reducing path and gradient data,
* removing useless style properties.

Scour can be run as a standalone Python script or as an Inkscape extension.

> Do not run Scour on your original document.
> Always save a copy of your document before.
>
> We have not thoroughly tested the use of Scour with Sozi presentations.
> Some optimizations may also remove information needed by the presentation engine.
