#!/usr/bin/env python2

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
from sozi.ui import *

class Sozi(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []
        self.selected_element = None
        

    def effect(self):
        sozi.upgrade.upgrade_or_install(self)

        if len(self.selected) > 0 and "id" in self.selected.values()[0].attrib:
            self.selected_element = self.selected.values()[0]

        self.analyze_document()
        self.ui = SoziUserInterface(self)


    def analyze_document(self):
        """
        Analyze the document and collect information about the presentation.
        Frames numbers are updated if needed.
        
        FIXME this method currently does not support frames with layers
        """
        # Get list of frame elements
        self.frames = self.document.xpath("//sozi:frame", namespaces=inkex.NSS)

        # Sort frames by sequence attribute 
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames = sorted(self.frames, key=lambda f:
            int(f.attrib[sequence_attr]) if sequence_attr in f.attrib else len(self.frames))

        # Renumber frames
        for i, f in enumerate(self.frames):
            f.set(inkex.addNS("sequence", "sozi"), unicode(i + 1))


    def swap_frames(self, first, second):
        """
        Swap frames with the given indices.
        """
        # Swap frames in SVG document
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames[first].set(sequence_attr, unicode(second + 1))
        self.frames[second].set(sequence_attr, unicode(first + 1))

        # Swap frames in frame list
        self.frames[first], self.frames[second] = self.frames[second], self.frames[first]


    def create_new_frame(self):
        """
        Create a new frame using the given SVG element.
        The new frame is not added to the document.
        """
        frame = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        frame.set(inkex.addNS("sequence", "sozi"), unicode(len(self.frames)+1))
        frame.set("id", self.uniqueId("frame" + unicode(len(self.frames)+1)))
        return frame


    def add_frame(self, frame):
        """
        Add the given frame to the document.
        """
        self.document.getroot().append(frame)
        self.frames.append(frame)

    
    def insert_frame(self, index, frame):
        """
        Insert the given frame at the given index.
        """
        self.document.getroot().append(frame)
        self.frames.insert(index, frame)
        self.renumber_from_index(index)


    def delete_frame(self, index):
        """
        Remove the frame at the given index from the document.
        """
        self.document.getroot().remove(self.frames[index])
        del self.frames[index]
        self.renumber_from_index(index)


    def renumber_from_index(self, index):
        if index >= 0:
            for i in range(index, len(self.frames)):
                self.frames[i].set(inkex.addNS("sequence", "sozi"), unicode(i + 1))


# Create effect instance
effect = Sozi()
effect.affect()

