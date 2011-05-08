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
		rect.append(v)


# Create effect instance
effect = SoziExtrasAddVideo()
effect.affect()

