#!/usr/bin/python2

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys, os, tempfile, shutil, subprocess
from optparse import OptionParser

# The resolution used by PhantomJS is supposed to be 72dpi
# However, we have to compute the viewport dimensions
# as if the resolution was 72 dots per cm.
# Moreover, a zoom factor of 0.5 will be needed when rendering
# (see sozi2pdf.js, function page.onCallback).
PAGE_FORMATS = {
    "a3":         { "width": 42,   "height": 29.7, "resolution": 72 },
    "a4":         { "width": 29.7, "height": 21,   "resolution": 72 },
    "letter":     { "width": 11,   "height": 8.5,  "resolution": 72*2.54 },
    "screen":     { "width": 1024, "height": 768,  "resolution": 2 },
    "widescreen": { "width": 1920, "height": 1080, "resolution": 2 }
}

DEFAULT_RESOLUTION = 3.6


if __name__ == '__main__':
    option_parser = OptionParser()

    option_parser.description = "Export a Sozi presentation to PDF"
    option_parser.usage = "sozi2pdf.py [options] url.svg"
    
    option_parser.add_option("-f", "--format", type="string", dest="format", default="a4",
        help="Page format: 'a3' | 'a4' | 'letter' | 'screen' | 'widescreen' (default is 'a4')")
    option_parser.add_option("-l", "--landscape", action="store_true", dest="landscape", default=True,
        help="Set page orientation to landscape (default)")
    option_parser.add_option("-p", "--portrait", action="store_false", dest="landscape",
        help="Set page orientation to portrait")

    option_parser.add_option("-W", "--width", type="float", dest="width",
        help="Page width (default is 29.7), supersedes 'format', 'landscape' and 'portrait' options")
    option_parser.add_option("-H", "--height", type="float", dest="height",
        help="Page height (default is 21), supersedes 'format', 'landscape' and 'portrait' options")
    option_parser.add_option("-r", "--resolution", type="float", dest="resolution",
        help="Pixels per width/height unit (default is 72)")

    option_parser.add_option("-i", "--include", type="string", dest="include", default="all",
        help="List of frames to include (default is 'all')")
    option_parser.add_option("-x", "--exclude", type="string", dest="exclude", default="none",
        help="List of frames to exclude (default is 'none')")

    option_parser.add_option("-o", "--output", type="string", dest="output",
        help="The target PDF file name")
        
    options, args = option_parser.parse_args()

    if len(args) == 0:
        option_parser.print_usage(sys.stderr)
        sys.exit()
    
    # Set page dimensions based on "format" and "landscape" options
    page_format = options.format.lower()
    if page_format not in PAGE_FORMATS:
        sys.stderr.write("Unknown page format: " + page_format+ "\n")
        sys.exit()
        
    width = PAGE_FORMATS[page_format]["width"]
    height = PAGE_FORMATS[page_format]["height"]
    resolution = PAGE_FORMATS[page_format]["resolution"]
    
    if not options.landscape:
        width, height = height, width

    # Supersede page dimensions with "width" and "height" options
    if options.width is not None:
        width = options.width
        
    if options.height is not None:
        height = options.height
    
    # Compute page dimensions in pixels
    width_px  = width  * resolution
    height_px = height * resolution
    
    # Set input and output file name
    input_file_name = args[0]
    
    if options.output is not None:
        output_file_name = options.output
    else:
        output_file_name = os.path.basename(input_file_name)
        output_file_name = os.path.splitext(output_file_name)[0] + ".pdf"        
    
    # Create a temporary directory for intermediate files
    tmp_dir = tempfile.mkdtemp()
    
    # Export Sozi frames to individual PDF files
    js = os.path.join(os.path.dirname(__file__), "sozi2pdf.js") 
    subprocess.call(["phantomjs", js, input_file_name, tmp_dir, str(width_px), str(height_px), options.include, options.exclude])
    
    # Merge all frames to a single PDF file.
    # In some situations, PhantomJS generates two pages per frame. Only the first page is kept.
    # TODO support other pdf merge tools
    frame_pdfs = [os.path.join(tmp_dir, file_name) for file_name in sorted(os.listdir(tmp_dir))]
    if len(frame_pdfs):
        sys.stdout.write("Writing PDF to: {0}\n".format(output_file_name))
        subprocess.call(["pdfjoin", "--outfile", output_file_name] + frame_pdfs + ["1"])

    # Remove the temporary directory and its content
    shutil.rmtree(tmp_dir, ignore_errors=True)

