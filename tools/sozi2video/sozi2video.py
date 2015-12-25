#!/usr/bin/python2

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys, os, tempfile, shutil, subprocess
from optparse import OptionParser


if __name__ == '__main__':
    option_parser = OptionParser()

    option_parser.description = "Export a Sozi presentation to a video"
    option_parser.usage = "sozi2video.py [options] url.svg"
    
    option_parser.add_option("-W", "--width", type="int", dest="width_px", default=1024,
        help="Page width, in pixels (default is 1024)")
    option_parser.add_option("-H", "--height", type="int", dest="height_px", default=768,
        help="Page height, in pixels (default is 768)")

    option_parser.add_option("-b", "--bit-rate", type="string", dest="bit_rate", default="2M",
        help="The target video bit rate (default is 2M)")
        
    option_parser.add_option("-o", "--output", type="string", dest="output",
        help="The target video file name")

    options, args = option_parser.parse_args()

    if len(args) == 0:
        option_parser.print_usage(sys.stderr)
        sys.exit()
    
    # Set input and output file name
    input_file_name = args[0]
    
    if options.output is not None:
        output_file_name = options.output
    else:
        output_file_name = os.path.basename(input_file_name)
        output_file_name = os.path.splitext(output_file_name)[0] + ".ogv"        
    
    # Create a temporary directory for intermediate files
    tmp_dir = tempfile.mkdtemp()
    
    # Export Sozi frames to individual PNG files
    js = os.path.join(os.path.dirname(__file__), "sozi2video.js") 
    subprocess.call(["phantomjs", js, input_file_name, tmp_dir, str(options.width_px), str(options.height_px)])
    
    # Merge all frames to a single video file
    if len(os.listdir(tmp_dir)):
        sys.stdout.write("Writing video to: {0}\n".format(output_file_name))
        frame_pngs = os.path.join(tmp_dir, "frame-%d.png")
        subprocess.call(["ffmpeg", "-r", "50", "-f", "image2", "-vf", "movie=bg.png, scale=1280:720:0:0 [bg]; [in] format=rgb32, split [T1], fifo, [bg] overlay=0:0, [T2] overlay=0:0 [out]; [T1] fifo [T2]",
            "-i", frame_pngs, "-b", options.bit_rate, output_file_name])

    # Remove the temporary directory and its content
    shutil.rmtree(tmp_dir, ignore_errors=True)

