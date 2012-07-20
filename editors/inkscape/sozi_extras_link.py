#!/usr/bin/env python

# Sozi - A presentation tool using the SVG standard
#
# Copyright (C) 2010-2012 Guillaume Savaton
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


class SoziExtrasCreateLink(inkex.Effect):
    XLINK_NS_URI = u"http://www.w3.org/1999/xlink"
    
    def __init__(self):
        inkex.Effect.__init__(self)

        if "xlink" not in inkex.NSS:
            inkex.NSS["xlink"] = SoziExtrasCreateLink.XLINK_NS_URI
        
        self.OptionParser.add_option('-U', '--url', action = 'store',
            type = 'string', dest = 'url', default = '',
            help = 'URL')


    def effect(self):
        if len(self.selected) == 0:
            sys.stderr.write("No element selected.\n")
            exit()

        elt = self.selected.values()[0]

        a = inkex.etree.Element("a")
        a.set(inkex.addNS("href", "xlink"), unicode(self.options.url))

        elt.getparent().replace(elt, a)
        a.append(elt)


# Create effect instance
effect = SoziExtrasCreateLink()
effect.affect()


