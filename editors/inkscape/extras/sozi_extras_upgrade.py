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

import sozi_upgrade
import sozi_extras_addvideo_upgrade

class SoziExtrasUpgrade(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"
    
    
    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = SoziExtrasUpgrade.NS_URI


    def effect(self):
        sozi_upgrade.upgrade_or_install(self)
        sozi_extras_addvideo_upgrade.upgrade_or_install(self)


# Create effect instance
effect = SoziExtrasUpgrade()
effect.affect()
