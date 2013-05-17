#!/usr/bin/env python2

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
import sys, os
# Unix
sys.path.append('/usr/share/inkscape/extensions')
# OS X
sys.path.append('/Applications/Inkscape.app/Contents/Resources/extensions')
# Windows
sys.path.append('C:\Program Files\Inkscape\share\extensions')

# We will use the inkex module with the predefined Effect base class.
import inkex

import re

import sozi.upgrade
from sozi.document import *
from sozi.ui import *

class Sozi(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.model = None
        

    def effect(self):
        sozi.upgrade.upgrade_or_install(self)

        self.model = SoziDocument(self)
        self.ui = SoziUserInterface(self)


# Create effect instance
effect = Sozi()
effect.affect()

