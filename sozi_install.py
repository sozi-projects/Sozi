#!/usr/bin/env python

# Sozi - A presentation tool using the SVG standard
# 
# Copyright (C) 2010 Guillaume Savaton
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

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

class SoziInstall(inkex.Effect):
	def __init__(self):
		inkex.Effect.__init__(self)
		inkex.NSS[u"sozi"] = u"http://sozi.baierouge.fr"

	def effect(self):
		# Find and delete old script node
		for node in self.document.xpath("//svg:script[@id='sozi-script']", namespaces=inkex.NSS):
			node.getparent().remove(node)
	
		# Create new script node
		scriptElm = inkex.etree.Element(inkex.addNS("script", "svg"))
		scriptElm.text = open(os.path.join(os.path.dirname(__file__),	"sozi.js")).read()
		scriptElm.set("id","sozi-script")
		scriptElm.set("{" + inkex.NSS["sozi"] + "}version", "10.11")
		self.document.getroot().append(scriptElm)

# Create effect instance
effect = SoziInstall()
effect.affect()

