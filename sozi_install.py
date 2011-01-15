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
   VERSION = "{{SOZI_VERSION}}"

   def __init__(self):
      inkex.Effect.__init__(self)
      inkex.NSS[u"sozi"] = u"http://sozi.baierouge.fr"

   def effect(self):
      # Find and delete old script node
      for elt in self.document.xpath("//svg:script[@id='sozi-script']", namespaces=inkex.NSS):
         elt.getparent().remove(elt)
	
      # Create new script node
      script_elt = inkex.etree.Element(inkex.addNS("script", "svg"))
      script_elt.text = open(os.path.join(os.path.dirname(__file__), "sozi.js")).read()
      script_elt.set("id","sozi-script")
      script_elt.set("{" + inkex.NSS["sozi"] + "}version", SoziInstall.VERSION)
      self.document.getroot().append(script_elt)

      # Upgrade document if needed
      self.upgrade()

   def upgrade(self):
      # Upgrade from 10.x

      # FIXME allow multiple classes in element
      for elt in self.document.xpath("//svg:*[@class='sozi-frame']", namespaces=inkex.NSS):
         del elt.attrib["class"];

         # Create a new frame element
         frame_elt = inkex.etree.Element(inkex.addNS("frame", "sozi"))
         frame_elt.set("{" + inkex.NSS["sozi"] + "}refid", elt.get("id")) # TODO check namespace for id?
         self.document.getroot().append(frame_elt)

         # Move all Sozi-specific attributes from the original element to the frame element
         for attr in ["title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
                      "transition-duration-ms", "transition-zoom-percent", "transition-profile"]:
            ns_attr = "{" + inkex.NSS["sozi"] + "}" + attr
            if elt.attrib.has_key(ns_attr):
               frame_elt.set(ns_attr, elt.get(ns_attr))
               del elt.attrib[ns_attr]
      

# Create effect instance
effect = SoziInstall()
effect.affect()

