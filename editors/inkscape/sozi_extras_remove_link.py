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


class SoziExtrasRemoveLink(inkex.Effect):
    def __init__(self):
        inkex.Effect.__init__(self)


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
        
        # If a containing "a" element was found, move its content
        # to the upper level, and remove it.
        if a is not None:
            for c in a.getchildren():
                a.addprevious(c)
            a.getparent().remove(a)


# Create effect instance
effect = SoziExtrasRemoveLink()
effect.affect()


