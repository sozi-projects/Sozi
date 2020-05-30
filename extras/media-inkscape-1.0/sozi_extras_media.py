#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# Sozi - A presentation tool using the SVG standard

# These lines are only needed if you don't put the script directly into
# the installation directory
import sys
# Unix
sys.path.append('/usr/share/inkscape/extensions')
# OS X
sys.path.append('/Applications/Inkscape.app/Contents/Resources/extensions')
# Windows
sys.path.append('C:\Program Files\Inkscape\share\extensions')

# We will use the inkex module with the predefined Effect base class.
import inkex
from lxml import etree

class SoziExtrasMedia(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"

    def __init__(self):
        super().__init__()
        self.arg_parser.add_argument('-E', '--element', action = 'store',
            type = str, dest = 'element', default = 'video',
            help = 'Media element (video | audio)')
        self.arg_parser.add_argument('-W', '--width', action = 'store',
            type = int, dest = 'width', default = 640,
            help = 'Media region width')
        self.arg_parser.add_argument('-H', '--height', action = 'store',
            type = int, dest = 'height', default = 480,
            help = 'Media region height')
        self.arg_parser.add_argument('-T', '--type', action = 'store',
            type = str, dest = 'type', default = 'video/ogg',
            help = 'Media MIME type')
        self.arg_parser.add_argument('-S', '--src', action = 'store',
            type = str, dest = 'src', default = '',
            help = 'Media file name')
        self.arg_parser.add_argument('-A', '--auto', action = 'store',
            type = str, dest = 'auto', default = 'false',
            help = 'Play automatically in Sozi frame')
        self.arg_parser.add_argument('-F', '--start-frame', action = 'store',
            type = str, dest = 'start_frame',
            help = 'Start playing when entering frame (id)')
        self.arg_parser.add_argument('-G', '--stop-frame', action = 'store',
            type = str, dest = 'stop_frame',
            help = 'Stop playing when entering frame (id)')
        self.arg_parser.add_argument('-L', '--loop', action = 'store',
            type = str, dest = 'loop', default = 'false',
            help = 'Loop')
        self.arg_parser.add_argument('-C', '--controls', action = 'store',
            type = str, dest = 'controls', default = 'false',
            help = 'Show controls')
        inkex.NSS[u"sozi"] = SoziExtrasMedia.NS_URI


    def effect(self):
        # Create a group.
        group = etree.Element("g")

        # Create a rectangle with the dimensions provided by the user.
        rect = etree.Element("rect")
        rect.set("x",      str(self.svg.view_center[0] - self.options.width / 2))
        rect.set("y",      str(self.svg.view_center[1] - self.options.height / 2))
        rect.set("width",  str(self.options.width))
        rect.set("height", str(self.options.height))
        rect.set("stroke", "none")
        rect.set("fill",   "#aaa")

        # Create a <sozi:video /> or <sozi:audio /> element.
        media = etree.Element(inkex.addNS(self.options.element, "sozi"))
        media.set(inkex.addNS("type",     "sozi"), self.options.type)
        media.set(inkex.addNS("src",      "sozi"), self.options.src)
        media.set(inkex.addNS("loop",     "sozi"), self.options.loop)
        media.set(inkex.addNS("controls", "sozi"), self.options.controls)

        # If the media is set to autoplay, add "start-frame" and "stop-frame" attributes
        if self.options.auto == "true":
            media.set(inkex.addNS("start-frame", "sozi"), self.options.start_frame)
            media.set(inkex.addNS("stop-frame",  "sozi"), self.options.stop_frame)

        # Add the subtree group -> rect -> media to the current layer.
        rect.append(media)
        group.append(rect)
        self.svg.get_current_layer().append(group)


# Create effect instance
effect = SoziExtrasMedia()
effect.run()
