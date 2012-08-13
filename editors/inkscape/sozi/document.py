
import inkex
from sets import Set

def read_xml_attr(element, attr, namespace = None, default = None):
    if namespace is None:
        ns_attr = attr
    else:
        ns_attr = inkex.addNS(attr, namespace)
        
    if ns_attr in element.attrib:
        return element.attrib[ns_attr]
    else:
        return default


def write_xml_attr(element, attr, namespace = None, value = None):
    if namespace is None:
        ns_attr = attr
    else:
        ns_attr = inkex.addNS(attr, namespace)
        
    if value is not None:
        element.attrib[ns_attr] = value
    elif ns_attr in element.attrib:
        del element.attrib[ns_attr]


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
                    
        self.refid = read_xml_attr(self.xml, "refid", "sozi")
        self.title = read_xml_attr(self.xml, "title", "sozi", "")
        self.sequence = int(read_xml_attr(self.xml, "sequence", "sozi", default_seq))
        self.hide = read_xml_attr(self.xml, "hide", "sozi", "true") == "true"
        self.clip = read_xml_attr(self.xml, "clip", "sozi", "true") == "true"
        self.timeout_enable = read_xml_attr(self.xml, "timeout-enable", "sozi", "false") == "true"
        self.timeout_ms = int(read_xml_attr(self.xml, "timeout-ms", "sozi", 5000))
        self.transition_duration_ms = int(read_xml_attr(self.xml, "transition-duration-ms", "sozi", 1000))
        self.transition_zoom_percent = int(read_xml_attr(self.xml, "transition-zoom-percent", "sozi", 0))
        self.transition_profile = read_xml_attr(self.xml, "transition-profile", "sozi", "linear")
        self.id = read_xml_attr(self.xml, "id", None, document.effect.uniqueId("frame" + unicode(self.sequence)))

        self.layers = [ SoziLayer(self, l) for l in self.xml.xpath("sozi:layer", namespaces=inkex.NSS) ]


    def write(self):
        if self.is_attached:
            if self.is_new:
                # Add element to the SVG document
                self.document.xml.getroot().append(self.xml)
            write_xml_attr(self.xml, "refid", "sozi", self.refid)
            write_xml_attr(self.xml, "title", "sozi", self.title)
            write_xml_attr(self.xml, "sequence", "sozi", unicode(self.sequence))
            write_xml_attr(self.xml, "hide", "sozi", "true" if self.hide else "false")
            write_xml_attr(self.xml, "clip", "sozi", "true" if self.clip else "false")
            write_xml_attr(self.xml, "timeout-enable", "sozi", "true" if self.timeout_enable else "false")
            write_xml_attr(self.xml, "timeout-ms", "sozi", unicode(self.timeout_ms))
            write_xml_attr(self.xml, "transition-duration-ms", "sozi", unicode(self.transition_duration_ms))
            write_xml_attr(self.xml, "transition-zoom-percent", "sozi", unicode(self.transition_zoom_percent))
            write_xml_attr(self.xml, "transition-profile", "sozi", self.transition_profile)
            write_xml_attr(self.xml, "id", None, self.id)
        elif not self.is_new:
            # Remove element from the SVG document
            self.document.xml.getroot().remove(self.xml)


class SoziLayer:

    def __init__(self, frame, xml):
        self.frame = frame
        self.xml = xml

        self.group = read_xml_attr(self.xml, "group", "sozi")
        self.refid = read_xml_attr(self.xml, "refid", "sozi")
        self.hide = read_xml_attr(self.xml, "hide", "sozi", "true") == "true"
        self.clip = read_xml_attr(self.xml, "clip", "sozi", "true") == "true"
        self.transition_zoom_percent = int(read_xml_attr(self.xml, "transition-zoom-percent", "sozi", 0))
        self.transition_profile = read_xml_attr(self.xml, "transition-profile", "sozi", "linear")


    def write(self):
        # TODO implement this method
        pass


class SoziDocument:
    
    def __init__(self, effect):
        self.effect = effect
        self.xml = effect.document
        
        self.frames = [ SoziFrame(self, f) for f in self.xml.xpath("//sozi:frame", namespaces=inkex.NSS) ]
        self.frames = sorted(self.frames, key=lambda f: f.sequence if f.sequence > 0 else len(self.frames))

        self.all_frames = Set(self.frames)
        self.renumber_from_index(0)


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
        if index >= 0:
            for i in range(index, len(self.frames)):
                self.frames[i].sequence = i + 1


    def write(self):
        for f in self.all_frames:
            f.write()


