#!/usr/bin/python2

# Sozi - A presentation tool using the SVG standard
#
# Copyright (C) 2010-2013 Guillaume Savaton
#
# This program is dual licensed under the terms of the MIT license
# or the GNU General Public License (GPL) version 3.
# A copy of both licenses is provided in the doc/ folder of the
# official release of Sozi.
# 
# See http://sozi.baierouge.fr/wiki/en:license for details.

import sys, os, tempfile, shutil, subprocess
from optparse import OptionParser


PAGE_FORMATS = {
    "a4":     { "width_mm": 297, "height_mm": 210 },
    "letter": { "width_mm": 279, "height_mm": 216 }
}

DEFAULT_RESOLUTION = 7.2


if __name__ == '__main__':
    option_parser = OptionParser()

    option_parser.description = "Export a Sozi presentation to PDF"
    option_parser.usage = "sozi2pdf.py [options] url.svg"
    
    option_parser.add_option("-f", "--format", type="string", dest="format", default="a4",
        help="Page format: 'a4' | 'letter' (default is 'a4')")
    option_parser.add_option("-l", "--landscape", action="store_true", dest="landscape", default=True,
        help="Set page orientation to landscape (default)")
    option_parser.add_option("-p", "--portrait", action="store_false", dest="landscape",
        help="Set page orientation to portrait")

    option_parser.add_option("-W", "--width", type="float", dest="width_mm",
        help="Page width, in millimeters (default is 297), supersedes 'format', 'landscape' and 'portrait' options")
    option_parser.add_option("-H", "--height", type="float", dest="height_mm",
        help="Page height, in millimeters (default is 210), supersedes 'format', 'landscape' and 'portrait' options")
    option_parser.add_option("-r", "--resolution", type="float", dest="resolution", default=DEFAULT_RESOLUTION,
        help="Pixels per millimeters (default is 7.2)")

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
        
    width_mm = PAGE_FORMATS[page_format]["width_mm"]
    height_mm = PAGE_FORMATS[page_format]["height_mm"]
    
    if not options.landscape:
        width_mm, height_mm = height_mm, width_mm

    # Supersede page dimensions with "width" and "height" options
    if options.width_mm is not None:
        width_mm = options.width_mm
        
    if options.height_mm is not None:
        height_mm = options.height_mm
    
    # Compute page dimensions in pixels
    width_px = width_mm * options.resolution
    height_px = height_mm * options.resolution
    
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
    
    # Merge all frames to a single PDF file
    # TODO support other pdf merge tools
    frame_pdfs = [os.path.join(tmp_dir, file_name) for file_name in sorted(os.listdir(tmp_dir))]
    if len(frame_pdfs):
        sys.stdout.write("Writing PDF to: {0}\n".format(output_file_name))
        subprocess.call(["pdfjoin", "--outfile", output_file_name] + frame_pdfs)

    # Remove the temporary directory and its content
    shutil.rmtree(tmp_dir, ignore_errors=True)

