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

import inkex
import time
from sets import Set

def read_xml_attr(element, attr, namespace, default = None, conversion = None):
    if namespace is None:
        ns_attr = attr
    else:
        ns_attr = inkex.addNS(attr, namespace)

    if ns_attr in element.attrib:
        value = element.attrib[ns_attr]
        if conversion is not None:
            return conversion(value)
        elif isinstance(value, unicode):
            return value.encode("utf-8")
        else:
            return value
    else:
        return default


def write_xml_attr(element, attr, namespace, value):
    if namespace is None:
        ns_attr = attr
    else:
        ns_attr = inkex.addNS(attr, namespace)
        
    if value is not None:
        if not isinstance(value, basestring):
            value = unicode(value)
        elif not isinstance(value, unicode):
            value = unicode(value, "utf-8")
        element.attrib[ns_attr] = value
    elif ns_attr in element.attrib:
        del element.attrib[ns_attr]


def to_boolean(value):
    return value == "true"


class SoziFrame:

    def __init__(self, document, xml = None):
        self.document = document
        
        if xml is None:
            self.xml = inkex.etree.Element(inkex.addNS("frame", "sozi"))
            self.is_attached = False
            self.is_new = True
        else:
            self.xml = xml
            self.is_attached = True
            self.is_new = False
        
        if hasattr(document, "frames"):
            default_seq = len(document.frames) + 1
        else:
            default_seq = 0

        # TODO get global defaults from the document
        self.refid = read_xml_attr(self.xml, "refid", "sozi")
        self.title = read_xml_attr(self.xml, "title", "sozi", _("Untitled"))
        self.sequence = read_xml_attr(self.xml, "sequence", "sozi", default_seq, int)
        self.hide = read_xml_attr(self.xml, "hide", "sozi", True, to_boolean)
        self.clip = read_xml_attr(self.xml, "clip", "sozi", True, to_boolean)
        self.show_in_frame_list = read_xml_attr(self.xml, "show-in-frame-list", "sozi", True, to_boolean)
        self.timeout_enable = read_xml_attr(self.xml, "timeout-enable", "sozi", False, to_boolean)
        self.timeout_ms = read_xml_attr(self.xml, "timeout-ms", "sozi", 5000, float)
        self.transition_duration_ms = read_xml_attr(self.xml, "transition-duration-ms", "sozi", 1000, float)
        self.transition_zoom_percent = read_xml_attr(self.xml, "transition-zoom-percent", "sozi", 0, float)
        self.transition_profile = read_xml_attr(self.xml, "transition-profile", "sozi", "linear")
        self.transition_path = read_xml_attr(self.xml, "transition-path", "sozi")
        self.transition_path_hide = read_xml_attr(self.xml, "transition-path-hide", "sozi", True, to_boolean)
        
        # Generate a frame id that does not look like a frame number
        id_suffix = (int(time.time()) + default_seq) % 10000
        if id_suffix < 1000:
            id_suffix += 1000
        self.id = read_xml_attr(self.xml, "id", None, document.effect.uniqueId("frame%04d" % id_suffix))

        # self.layers is a dict mapping layer group ids with layer objects
        group_attr = inkex.addNS("group", "sozi")
        self.layers = { l.attrib[group_attr] : SoziLayer(self, l) for l in self.xml.xpath("sozi:layer", namespaces=inkex.NSS) if group_attr in l.attrib }
        self.all_layers = Set(self.layers.values())


    def copy(self):
        result = SoziFrame(self.document)

        # New values for attributes sequence and id have been provided by the constructor
        result.refid = self.refid
        result.title = self.title
        result.hide = self.hide
        result.clip = self.clip
        result.show_in_frame_list = self.show_in_frame_list
        result.timeout_enable = self.timeout_enable
        result.timeout_ms = self.timeout_ms
        result.transition_duration_ms = self.transition_duration_ms
        result.transition_zoom_percent = self.transition_zoom_percent
        result.transition_profile = self.transition_profile
        result.transition_path = self.transition_path
        result.transition_path_hide = self.transition_path_hide

        # Fill layers dict with copies of each layer object
        for l in self.layers.itervalues():
            result.add_layer(l.copy(result))

        return result


    def is_valid(self):
        return self.refid is not None or len([ l for l in self.layers.itervalues() if l.is_valid() ]) > 0


    def add_layer(self, layer):
        """
        Add the given layer to the current frame.
        """
        self.layers[layer.group_id] = layer
        self.all_layers.add(layer)
        layer.is_attached = True


    def delete_layer(self, group_id):
        """
        Remove the layer with the given group id from the current frame.
        """
        layer = self.layers[group_id]
        del self.layers[group_id]
        layer.is_attached = False


    def write(self):
        """
        Commit all changes in the current frame to the SVG document.
        """
        if self.is_attached:
            if self.is_new:
                # Add element to the SVG document
                self.document.xml.getroot().append(self.xml)
                
            # TODO write only values different from the global defaults
            write_xml_attr(self.xml, "refid", "sozi", self.refid) # Optional
            write_xml_attr(self.xml, "title", "sozi", self.title)
            write_xml_attr(self.xml, "sequence", "sozi", self.sequence)
            write_xml_attr(self.xml, "hide", "sozi", "true" if self.hide else "false")
            write_xml_attr(self.xml, "clip", "sozi", "true" if self.clip else "false")
            write_xml_attr(self.xml, "show-in-frame-list", "sozi", "true" if self.show_in_frame_list else "false")
            write_xml_attr(self.xml, "timeout-enable", "sozi", "true" if self.timeout_enable else "false")
            write_xml_attr(self.xml, "timeout-ms", "sozi", self.timeout_ms)
            write_xml_attr(self.xml, "transition-duration-ms", "sozi", self.transition_duration_ms)
            write_xml_attr(self.xml, "transition-zoom-percent", "sozi", self.transition_zoom_percent)
            write_xml_attr(self.xml, "transition-profile", "sozi", self.transition_profile)
            write_xml_attr(self.xml, "transition-path", "sozi", self.transition_path) # Optional
            write_xml_attr(self.xml, "transition-path-hide", "sozi", "true" if self.transition_path_hide else "false")
            write_xml_attr(self.xml, "id", None, self.id)

            for l in self.all_layers:
                l.write()
                
        elif not self.is_new:
            # Remove element from the SVG document
            self.document.xml.getroot().remove(self.xml)


class SoziLayer:

    def __init__(self, frame, xml_or_group_id):
        self.frame = frame

        if isinstance(xml_or_group_id, str):
            self.xml = inkex.etree.Element(inkex.addNS("layer", "sozi"))
            self.is_attached = False
            self.is_new = True
            self.group_id = xml_or_group_id
        else:
            self.xml = xml_or_group_id
            self.is_attached = True
            self.is_new = False
            self.group_id = read_xml_attr(self.xml, "group", "sozi")

        self.refid = read_xml_attr(self.xml, "refid", "sozi")

        # Missing attributes are inherited from the enclosing frame element
        self.hide = read_xml_attr(self.xml, "hide", "sozi", frame.hide, to_boolean)
        self.clip = read_xml_attr(self.xml, "clip", "sozi", frame.clip, to_boolean)
        self.transition_zoom_percent = read_xml_attr(self.xml, "transition-zoom-percent", "sozi", frame.transition_zoom_percent, float)
        self.transition_profile = read_xml_attr(self.xml, "transition-profile", "sozi", frame.transition_profile)
        self.transition_path = read_xml_attr(self.xml, "transition-path", "sozi", frame.transition_path)
        self.transition_path_hide = read_xml_attr(self.xml, "transition-path-hide", "sozi", frame.transition_path_hide, to_boolean)

        group_xml = frame.document.xml.xpath("//*[@id='" + self.group_id + "']")
        label_attr = inkex.addNS("label", "inkscape")
        
        if len(group_xml) > 0 and label_attr in group_xml[0].attrib:
            self.label = group_xml[0].attrib[label_attr]
        else:
            self.label = self.group_id


    def copy(self, frame):
        result = SoziLayer(frame, self.group_id)
        
        result.refid = self.refid
        result.hide = self.hide
        result.clip = self.clip
        result.transition_zoom_percent = self.transition_zoom_percent
        result.transition_profile = self.transition_profile
        result.transition_path = self.transition_path
        result.transition_path_hide = self.transition_path_hide
        result.label = self.label

        return result


    def is_valid(self):
        return self.refid is not None


    def write(self):
        """
        Commit all changes in the current layer to the SVG document.
        """
        if self.is_attached:
            if self.is_new:
                # Add element to the SVG document
                self.frame.xml.append(self.xml)

            # TODO write only the values that are different from the enclosing frame element
            write_xml_attr(self.xml, "group", "sozi", self.group_id)
            write_xml_attr(self.xml, "refid", "sozi", self.refid)
            write_xml_attr(self.xml, "hide", "sozi", "true" if self.hide else "false")
            write_xml_attr(self.xml, "clip", "sozi", "true" if self.clip else "false")
            write_xml_attr(self.xml, "transition-zoom-percent", "sozi", self.transition_zoom_percent)
            write_xml_attr(self.xml, "transition-profile", "sozi", self.transition_profile)
            write_xml_attr(self.xml, "transition-path", "sozi", self.transition_path)
            write_xml_attr(self.xml, "transition-path-hide", "sozi", "true" if self.transition_path_hide else "false")
            
        elif not self.is_new:
            # Remove element from the SVG document
            self.frame.xml.remove(self.xml)


class SoziDocument:
    
    def __init__(self, effect):
        self.effect = effect
        self.xml = effect.document

        # self.layer_labels is a dict mapping layer ids with layer labels
        label_attr = inkex.addNS("label", "inkscape")
        self.layer_labels = { g.attrib["id"] : g.attrib[label_attr] for g in self.xml.xpath("svg:g[@inkscape:groupmode='layer']", namespaces=inkex.NSS) if "id" in g.attrib and label_attr in g.attrib }
                
        self.frames = [ SoziFrame(self, f) for f in self.xml.xpath("//sozi:frame", namespaces=inkex.NSS) ]
        self.frames = sorted(self.frames, key=lambda f: f.sequence if f.sequence > 0 else len(self.frames))

        self.all_frames = Set(self.frames)
        self.renumber_from_index(0)

        self.selected_index = 0
        self.selected_ids = effect.options.ids


    def get_next_selected_id(self):
        if self.selected_ids:
            result = self.selected_ids[self.selected_index]
            self.selected_index = (self.selected_index + 1) % len(self.selected_ids)
        else:
            result = None
        return result


    def has_selected_id(self):
        return len(self.selected_ids) > 0


    def has_other_selected_id(self, id):
        if len(self.selected_ids) > 1:
            return True
        elif len(self.selected_ids) > 0:
            return id not in self.selected_ids
        else:
            return False


    def add_frame(self, frame):
        """
        Add the given frame to the document.
        """
        self.frames.append(frame)
        self.all_frames.add(frame)
        frame.is_attached = True

    
    def insert_frame(self, index, frame):
        """
        Insert the given frame at the given index.
        """
        self.frames.insert(index, frame)
        self.all_frames.add(frame)
        frame.is_attached = True
        self.renumber_from_index(index)


    def swap_frames(self, first, second):
        """
        Swap frames with the given indices.
        """
        # Swap frames in SVG document
        self.frames[first].sequence = second + 1
        self.frames[second].sequence = first + 1

        # Swap frames in model
        self.frames[first], self.frames[second] = self.frames[second], self.frames[first]


    def delete_frame(self, index):
        """
        Remove the frame at the given index from the document.
        """
        frame = self.frames[index]
        del self.frames[index]
        frame.is_attached = False
        self.renumber_from_index(index)


    def renumber_from_index(self, index):
        """
        Renumber the frames starting from the one at the given index.
        Frames will receive the following numbers: index+1, index+2, etc.
        """
        if index >= 0:
            for i in range(index, len(self.frames)):
                self.frames[i].sequence = i + 1


    def write(self):
        """
        Commit all changes in the document model to the SVG document.
        """
        for f in self.all_frames:
            f.write()


