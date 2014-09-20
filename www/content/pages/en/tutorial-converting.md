Title: Converting Sozi presentations to PDF or video
Slug: tutorial-converting
Lang: en
Author: Guillaume Savaton
Status: hidden

PDF and video conversion tools are available in the
[source repository](https://github.com/senshu/Sozi/tree/dev/tools)
of the project.
These tools are Python scripts that can be run from the command line.
They have been tested only on GNU/Linux.

Converting a Sozi presentation to PDF
-------------------------------------

Download the scripts
[sozi2pdf.py](https://github.com/senshu/Sozi/raw/dev/tools/sozi2pdf/sozi2pdf.py)
and [sozi2pdf.js](https://github.com/senshu/Sozi/raw/dev/tools/sozi2pdf/sozi2pdf.js).
You can install them wherever you want, but both scripts must be in the same folder.

``sozi2pdf`` depends on the following software:

* [Python 2.7](http://python.org/download/)
* [PhantomJS](http://phantomjs.org/)
* [PDFjam](http://www2.warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/software/pdfjam), available in most GNU/Linux distributions.

To convert a presentation to a PDF document using A4 page size, run the following command:

    :::sh
    python /path/to/sozi2pdf.py my_sozi_presentation.svg

This will create a new file named ``my_sozi_presentation.pdf``.

If you want to convert only some frames of your document, you can use the ``--include`` and ``--exclude`` options.
These options accept a comma-separated list of frame numbers:

    :::sh
    python /path/to/sozi2pdf.py \
        --include=3,5,6,7,8,10,12,14,16,18 \
        my_sozi_presentation.svg

Long lists of frame numbers can be shortened using ranges:

    :::sh
    python /path/to/sozi2pdf.py \
        --include=3,5:8,10:12:18 \
        my_sozi_presentation.svg

* ``5:8`` will expand to ``5,6,7,8``
* ``10:12:18`` will expand to ``10,12,14,16,18``

A complete list of options can be displayed by running this command:

    :::sh
    python /path/to/sozi2pdf.py --help


Converting a Sozi presentation to video
---------------------------------------

Download the scripts
[sozi2video.py](https://github.com/senshu/Sozi/raw/dev/tools/sozi2video/sozi2video.py)
and [sozi2video.js](https://github.com/senshu/Sozi/raw/dev/tools/sozi2video/sozi2video.js).
You can install them wherever you want, but both scripts must be in the same folder.

``sozi2video`` depends on the following software:

* [Python 2.7](http://python.org/download/)
* [PhantomJS](http://phantomjs.org/)
* [FFmpeg](http://ffmpeg.org/) or [libav](https://libav.org/), available in most GNU/Linux distributions.

To convert a presentation to an [Ogg video](https://en.wikipedia.org/wiki/Ogg) with dimensions 1024 by 768,
run the following command:

    :::sh
    python /path/to/sozi2video.py my_sozi_presentation.svg

This will create a new file named ``my_sozi_presentation.ogv``.

The tool provides options to control the video format and dimensions.
This example will create a 720p MP4 video: 

    :::sh
    python /path/to/sozi2video.py \
        --output=my_sozi_presentation.mp4 \
        --width=1280 --height=720 \
        my_sozi_presentation.svg

A complete list of options can be displayed by running this command:

    :::sh
    python /path/to/sozi2video.py --help

