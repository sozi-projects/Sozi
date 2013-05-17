#!/usr/bin/env python

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

import re

class SoziExtrasCreateLink(inkex.Effect):

    XLINK_NS_URI = u"http://www.w3.org/1999/xlink"
    SOZI_NS_URI = u"http://sozi.baierouge.fr"
    
    def __init__(self):
        inkex.Effect.__init__(self)

        inkex.NSS[u"sozi"] = SoziExtrasCreateLink.SOZI_NS_URI
        if "xlink" not in inkex.NSS:
            inkex.NSS["xlink"] = SoziExtrasCreateLink.XLINK_NS_URI
        
        self.OptionParser.add_option('-F', '--frame', action = 'store',
            type = 'string', dest = 'seq_or_id', default = '',
            help = 'URL')


    def effect(self):
        if len(self.selected) == 0:
            sys.stderr.write("No element selected.\n")
            exit()

        elt = self.selected.values()[0]
        
        # Search for an existing "a" element containing the selected element
        a = elt
        a_tag = inkex.addNS("a", "svg")
        while a is not None and a.tag != a_tag:
            a = a.getparent()
        
        # If no containing "a" element was found, create a new one
        # and insert it as the parent of the selected element
        if a is None:            
            a = inkex.etree.Element("a")
            elt.getparent().replace(elt, a)
            a.append(elt)

        # The provided option is supposed to be a frame id        
        target_id = self.options.seq_or_id
        
        # If the provided option is an integer number
        sequence_re = re.compile("^[0-9]+$")
        if sequence_re.match(self.options.seq_or_id):
            target_sequence = int(self.options.seq_or_id)
            # Find the corresponding frame
            sequence_attr = inkex.addNS("sequence", "sozi")
            for frame_elt in self.document.xpath("//sozi:frame", namespaces=inkex.NSS):
                if int(frame_elt.attrib[sequence_attr]) == target_sequence:
                    # If a frame is found, read its id
                    target_id = frame_elt.attrib["id"]
                    break
            
        # Assign the given URL to the "a" element
        a.set(inkex.addNS("href", "xlink"), unicode("#" + target_id))



# Create effect instance
effect = SoziExtrasCreateLink()
effect.affect()


