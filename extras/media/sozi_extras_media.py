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

class SoziExtrasMedia(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"

    SOZI_VERSION = "15.04"

    def __init__(self):
        inkex.Effect.__init__(self)
        self.OptionParser.add_option('-E', '--element', action = 'store',
            type = 'string', dest = 'element', default = 'video',
            help = 'Media element (video | audio)')
        self.OptionParser.add_option('-W', '--width', action = 'store',
            type = 'int', dest = 'width', default = 640,
            help = 'Media region width')
        self.OptionParser.add_option('-H', '--height', action = 'store',
            type = 'int', dest = 'height', default = 480,
            help = 'Media region height')
        self.OptionParser.add_option('-T', '--type', action = 'store',
            type = 'string', dest = 'type', default = 'video/ogg',
            help = 'Media MIME type')
        self.OptionParser.add_option('-S', '--src', action = 'store',
            type = 'string', dest = 'src', default = '',
            help = 'Media file name')
        self.OptionParser.add_option('-A', '--auto', action = 'store',
            type = 'string', dest = 'auto', default = 'false',
            help = 'Play automatically in Sozi frame')
        self.OptionParser.add_option('-F', '--start-frame', action = 'store',
            type = 'string', dest = 'start_frame',
            help = 'Start playing when entering frame (id)')
        self.OptionParser.add_option('-G', '--stop-frame', action = 'store',
            type = 'string', dest = 'stop_frame',
            help = 'Stop playing when entering frame (id)')
        inkex.NSS[u"sozi"] = SoziExtrasMedia.NS_URI


    def effect(self):
        # If an element is selected, check if it is of the form
        # <g><rect><sozi:video /></rect></g> or <g><rect><sozi:audio /></rect></g>
        # and get a reference to the <rect> element.
        rect = None
        if len(self.selected) != 0:
            elt = self.selected.values()[0]
            if elt.tag == inkex.addNS("g", "svg") and len(elt) > 0 and elt[0].tag == inkex.addNS("rect", "svg") and len(elt[0]) > 0 and elt[0][0].tag == inkex.addNS(self.options.element, "sozi"):
                rect = elt[0]

        # If no <rect> was selected, create one with the dimensions
        # provided by the user and insert it into a <g> element.
        if rect == None:
            rect = inkex.etree.Element("rect")
            rect.set("x", unicode(self.view_center[0] - self.options.width / 2))
            rect.set("y", unicode(self.view_center[1] - self.options.height / 2))
            rect.set("width", unicode(self.options.width))
            rect.set("height", unicode(self.options.height))
            rect.set("stroke", "none")
            rect.set("fill", "#aaa")

            g = inkex.etree.Element("g")
            g.append(rect)

            self.current_layer.append(g)

        # Add a <sozi:video /> or <sozi:audio /> element inside the <rect>
        v = inkex.etree.Element(inkex.addNS(self.options.element, "sozi"))
        v.set(inkex.addNS("type", "sozi"), self.options.type.decode("utf-8"))
        v.set(inkex.addNS("src", "sozi"), self.options.src.decode("utf-8"))

        # If the media is set to autoplay, add "start-frame" and "stop-frame" attributes
        if self.options.auto == "true":
            v.set(inkex.addNS("start-frame", "sozi"), self.options.start_frame.decode("utf-8"))
            v.set(inkex.addNS("stop-frame", "sozi"), self.options.stop_frame.decode("utf-8"))

        rect.append(v)


# Create effect instance
effect = SoziExtrasMedia()
effect.affect()


