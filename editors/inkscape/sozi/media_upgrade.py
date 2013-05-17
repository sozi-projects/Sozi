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

import os
import sys
import inkex

from version import SOZI_VERSION


def upgrade_or_install(context):
    upgrade_or_install_element(context, "script", "js")
    upgrade_document(context)
    

def upgrade_or_install_element(context, tag, ext):
    # Check version and remove older versions
    latest_version_found = False
    
    for elt in context.document.xpath("//svg:" + tag + "[@id='sozi-extras-addvideo-" + tag + "']", namespaces=inkex.NSS):
        elt.getparent().remove(elt)
        
    for elt in context.document.xpath("//svg:" + tag + "[@id='sozi-extras-media-" + tag + "']", namespaces=inkex.NSS):
        version_attr = inkex.addNS("version", "sozi")
        if version_attr in elt.attrib:
            version = elt.attrib[version_attr]
        else:
            version = "0"
        if version == SOZI_VERSION:
            latest_version_found = True
        elif version < SOZI_VERSION:
            elt.getparent().remove(elt)
        else:
            sys.stderr.write("Document has been created using a higher version of Sozi. Please upgrade the Inkscape plugin.\n")
            exit()
  
    # Create new element if needed
    if not latest_version_found:
        elt = inkex.etree.Element(inkex.addNS(tag, "svg"))
        elt.text = open(os.path.join(os.path.dirname(__file__), "sozi_extras_media.min." + ext)).read()
        elt.set("id","sozi-extras-media-" + tag)
        elt.set(inkex.addNS("version", "sozi"), SOZI_VERSION)
        context.document.getroot().append(elt)


def upgrade_document(context):
    # Upgrade from 11.10
    frame_count = len(context.document.xpath("//sozi:frame", namespaces=inkex.NSS))
    
    # For each video element in the document
    for velt in context.document.xpath("//sozi:video", namespaces=inkex.NSS):
        # Get the Sozi frame index for the current video if it is set
        frame_index = None
        if "frame" in velt.attrib:
            frame_index = velt.attrib["frame"]
            del velt.attrib["frame"]
        
        # If the video was set to start automatically and has a frame index set
        if "auto" in velt.attrib:
            if velt.attrib["auto"] == "true" and frame_index is not None:
                # Get the frame element at the given index
                felt = context.document.xpath("//sozi:frame[@sozi:sequence='" + frame_index + "']", namespaces=inkex.NSS)
                if len(felt) > 0:
                    # Use the ID of that frame to start the video
                    velt.set(inkex.addNS("start-frame", "sozi"), felt[0].attrib["id"])
                    
                    # Get the next frame element
                    # We assume that the frames are correctly numbered                        
                    if int(frame_index) >= frame_count:
                        frame_index = "1"
                    else:
                        frame_index = unicode(int(frame_index) + 1)
                    felt = context.document.xpath("//sozi:frame[@sozi:sequence='" + frame_index + "']", namespaces=inkex.NSS)
                    if len(felt) > 0:
                        # Use the ID of that frame to stop the video
                        velt.set(inkex.addNS("stop-frame", "sozi"), felt[0].attrib["id"])
            del velt.attrib["auto"]                

        # If the video has attributes "type" and "src" with no namespace, add Sozi namespace
        if "type" in velt.attrib:
            velt.set(inkex.addNS("type", "sozi"), velt.attrib["type"])
            del velt.attrib["type"]
            
        if "src" in velt.attrib:
            velt.set(inkex.addNS("src", "sozi"), velt.attrib["src"])
            del velt.attrib["src"]

