#!/usr/bin/env python

# Sozi - A presentation tool using the SVG standard
#
# Copyright (C) 2010-2011 Guillaume Savaton
#
# This program is dual licensed under the terms of the MIT license
# or the GNU General Public License (GPL) version 3.
# A copy of both licenses is provided in the doc/ folder of the
# official release of Sozi.
# 
# See http://sozi.baierouge.fr/wiki/en:license for details.

import os

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


class SoziExtrasAddVideo(inkex.Effect):

    VERSION = "{{SOZI_VERSION}}"

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        self.OptionParser.add_option('-W', '--width', action = 'store',
            type = 'int', dest = 'width', default = 640,
            help = 'Video width')
        self.OptionParser.add_option('-H', '--height', action = 'store',
            type = 'int', dest = 'height', default = 480,
            help = 'Video height')
        self.OptionParser.add_option('-T', '--type', action = 'store',
            type = 'string', dest = 'type', default = 'video/ogg',
            help = 'Video MIME type')
        self.OptionParser.add_option('-S', '--src', action = 'store',
            type = 'string', dest = 'src', default = '',
            help = 'Video file name')
        self.OptionParser.add_option('-A', '--auto', action = 'store',
            type = 'string', dest = 'auto', default = 'false',
            help = 'Play automatically in Sozi frame')
        self.OptionParser.add_option('-F', '--start-frame', action = 'store',
            type = 'int', dest = 'start_frame', default = '1',
            help = 'Start video when entering frame number')
        self.OptionParser.add_option('-G', '--stop-frame', action = 'store',
            type = 'int', dest = 'stop_frame', default = '1',
            help = 'Stop video when entering frame number')
        inkex.NSS[u"sozi"] = SoziExtrasAddVideo.NS_URI


    def effect(self):
        self.upgrade_or_install("script", "js")
        self.upgrade_document()
        self.add_video()


    def upgrade_or_install(self, tag, ext):
        # Check version and remove older versions
        latest_version_found = False
        for elt in self.document.xpath("//svg:" + tag + "[@id='sozi-extras-addvideo-" + tag + "']", namespaces=inkex.NSS):
            version = elt.attrib[inkex.addNS("version", "sozi")]
            if version == SoziExtrasAddVideo.VERSION:
                latest_version_found = True
            elif version < SoziExtrasAddVideo.VERSION:
                elt.getparent().remove(elt)
            else:
                sys.stderr.write("Document has been created using a higher version of Sozi. Please upgrade the Inkscape plugin.\n")
                exit()
      
        # Create new element if needed
        if not latest_version_found:
            elt = inkex.etree.Element(inkex.addNS(tag, "svg"))
            elt.text = open(os.path.join(os.path.dirname(__file__), "sozi_extras_addvideo." + ext)).read()
            elt.set("id","sozi-extras-addvideo-" + tag)
            elt.set(inkex.addNS("version", "sozi"), SoziExtrasAddVideo.VERSION)
            self.document.getroot().append(elt)


    def upgrade_document(self):
        pass      
    

    def add_video(self):
        rect = None
        if len(self.selected) != 0:
            elt = self.selected.values()[0]
            if elt.tag == inkex.addNS("g", "svg") and len(elt) > 0 and elt[0].tag == inkex.addNS("rect", "svg") and len(elt[0]) > 0 and elt[0][0].tag == inkex.addNS("video", "sozi"):
                rect = elt[0]

        if rect == None:
            rect = inkex.etree.Element("rect")
            rect.set("x", "0")
            rect.set("y", "0")
            rect.set("width", unicode(self.options.width))
            rect.set("height", unicode(self.options.height))
            rect.set("stroke", "none")
            rect.set("fill", "#aaa")

            g = inkex.etree.Element("g")
            g.append(rect)

            self.document.getroot().append(g)

        v = inkex.etree.Element(inkex.addNS("video", "sozi"))
        v.set("type", unicode(self.options.type))
        v.set("src", unicode(self.options.src))

        if self.options.auto == "true":
            start_frame = self.document.xpath("//sozi:frame[@sozi:sequence='" + unicode(self.options.start_frame) + "']", namespaces=inkex.NSS)
            stop_frame = self.document.xpath("//sozi:frame[@sozi:sequence='" + unicode(self.options.stop_frame) + "']", namespaces=inkex.NSS)
            if len(start_frame) == 0:
                sys.stderr.write("The start frame does not exist in this Sozi presentation.\n")
                exit()
            elif len(stop_frame) == 0:
                sys.stderr.write("The stop frame does not exist in this Sozi presentation.\n")
                exit()
            elif "id" in start_frame[0].attrib and "id" in stop_frame[0].attrib:
                v.set("start-frame", unicode(start_frame[0].attrib["id"]))
                v.set("stop-frame", unicode(stop_frame[0].attrib["id"]))
            else:
                sys.stderr.write("The chosen frames are not compatible with this version of Sozi. Please run Sozi to upgrade your document.\n")
                exit()
                
        rect.append(v)


# Create effect instance
effect = SoziExtrasAddVideo()
effect.affect()

