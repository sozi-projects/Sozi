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

import pygtk
pygtk.require("2.0")
import gtk


class SoziField:
    
    def __init__(self, parent, attr, label, container, widget, default, focus_events=True):
        self.parent = parent
        self.ns_attr = inkex.addNS(attr, "sozi")
        self.label = label
        self.default_value = default
        self.last_value = None
        self.current_frame = None
        self.current_frame_index = -1
        self.container = container
        self.widget = widget
        if focus_events:
            self.widget.connect("focus-out-event", self.on_focus_out)
        else:
            self.widget.connect("changed", self.on_focus_out)


    def set_value(self, value):
        pass


    def get_value(self):
        pass


    def write_if_needed(self):
        if self.current_frame is not None and self.last_value != self.get_value():
            self.parent.message_field.set_text("Changed " + self.label + " in frame " + str(self.current_frame_index + 1))
            self.current_frame["frame_element"].set(self.ns_attr, self.get_value())
            self.last_value = self.get_value()

            
    def fill_for_frame(self, frame, index):
        self.write_if_needed()
        self.current_frame = frame
        self.current_frame_index = index
        if frame is not None and self.ns_attr in frame["frame_element"].attrib:
            self.last_value = frame["frame_element"].attrib[self.ns_attr]
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)


    def on_focus_out(self, widget, event=None):
        self.write_if_needed()


class SoziTextField(SoziField):
    
    def __init__(self, parent, attr, label, default):
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.Entry(), default)
        self.container.add(gtk.Label(label))
        self.container.add(self.widget)


    def set_value(self, value):
        self.widget.set_text(value)


    def get_value(self):
        return unicode(self.widget.get_text())


class SoziComboField(SoziField):
    
    def __init__(self, parent, attr, label, items, default):
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.combo_box_new_text(), default, False)
        self.items = items  
        for text in items:
            self.widget.append_text(text)
        self.container.add(gtk.Label(label))
        self.container.add(self.widget)

      
    def set_value(self, value):
        self.widget.set_active(self.items.index(value))

    
    def get_value(self):
        return unicode(self.items[self.widget.get_active()])
        
        
class SoziCheckButtonField(SoziField):
    
    def __init__(self, parent, attr, label, default):
        button = gtk.CheckButton(label)
        SoziField.__init__(self, parent, attr, label, button, button, default)


    def set_value(self, value):
        self.widget.set_active(value == "true")


    def get_value(self):
        return unicode("true" if self.widget.get_active() else "false")
    
    
class SoziSpinButtonField(SoziField):
    
    def __init__(self, parent, attr, label, min, max, default):
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.SpinButton(digits=0), default)
        self.widget.set_range(min, max)
        self.widget.set_increments(1, 1)
        self.widget.set_numeric(True)
        self.container.pack_start(gtk.Label(label))
        self.container.pack_start(self.widget)


    def set_value(self, value):
        self.widget.set_value(int(value))


    def get_value(self):
        return unicode(self.widget.get_value_as_int())


class SoziUI:

    PROFILES = ["linear",
                "accelerate", "strong-accelerate",
                "decelerate", "strong-decelerate",
                "accelerate-decelerate", "strong-accelerate-decelerate",
                "decelerate-accelerate", "strong-decelerate-accelerate"]


    def __init__(self, effect):
        self.effect = effect
        
        window = gtk.Window(gtk.WINDOW_TOPLEVEL)
        window.connect("destroy", self.destroy)
        window.set_title("Sozi")
        
        # Enable icons on stock buttons
        gtk.settings_get_default().set_long_property("gtk-button-images", True, "Sozi")

        # Create fields for frame information
        self.fields = {
            "title": SoziTextField(self, "title", "Title", "New frame"),
            "hide": SoziCheckButtonField(self, "hide", "Hide", "true"),
            "clip": SoziCheckButtonField(self, "clip", "Clip", "true"),
            "timeout-enable": SoziCheckButtonField(self, "timeout-enable", "Timeout enable", "false"),
            "timeout-ms": SoziSpinButtonField(self, "timeout-ms", "Timeout (ms)", 0, 3600000, 5000),
            "transition-duration-ms": SoziSpinButtonField(self, "transition-duration-ms", "Duration (ms)", 0, 3600000, 1000),
            "transition-zoom-percent": SoziSpinButtonField(self, "transition-zoom-percent", "Zoom (%)", -100, 100, 0),
            "transition-profile": SoziComboField(self, "transition-profile", "Profile", SoziUI.PROFILES, SoziUI.PROFILES[0])
        }

        # Transition properties
        transition_box = gtk.VBox()
        transition_box.pack_start(self.fields["transition-duration-ms"].container, expand=False)
        transition_box.pack_start(self.fields["transition-zoom-percent"].container, expand=False)
        transition_box.pack_start(self.fields["transition-profile"].container, expand=False)

        transition_group = gtk.Frame("Transition")
        transition_group.add(transition_box)

        # Frame properties
        frame_box = gtk.VBox()
        frame_box.pack_start(self.fields["title"].container, expand=False)
        frame_box.pack_start(self.fields["hide"].container, expand=False)
        frame_box.pack_start(self.fields["clip"].container, expand=False)
        frame_box.pack_start(self.fields["timeout-enable"].container, expand=False)
        frame_box.pack_start(self.fields["timeout-ms"].container, expand=False)

        frame_group = gtk.Frame("Frame")
        frame_group.add(frame_box)

        # Create buttons
        self.create_new_frame_button = gtk.Button(stock=gtk.STOCK_NEW)
        self.create_new_frame_button.connect("clicked", self.on_create_new_frame)

        self.delete_button = gtk.Button(stock=gtk.STOCK_DELETE)
        self.delete_button.connect("clicked", self.on_delete_frame)

        buttons_box = gtk.HBox()
        buttons_box.pack_start(self.create_new_frame_button)
        buttons_box.pack_start(self.delete_button)

        # Fill left pane
        left_pane = gtk.VBox()
        left_pane.pack_start(transition_group, expand=False)
        left_pane.pack_start(frame_group, expand=False)
        left_pane.pack_start(buttons_box, expand=False)

        # Create frame list
        list_renderer = gtk.CellRendererText()
        list_renderer.set_property("background", "white")
        sequence_column = gtk.TreeViewColumn("Seq.", list_renderer, text = 0, foreground = 2)
        title_column = gtk.TreeViewColumn("Title", list_renderer, text = 1, foreground = 2)

        store = gtk.ListStore(int, str, str)
        self.list_view = gtk.TreeView(store)
        self.list_view.append_column(sequence_column)
        self.list_view.append_column(title_column)

        list_scroll = gtk.ScrolledWindow()
        list_scroll.set_policy(gtk.POLICY_NEVER, gtk.POLICY_AUTOMATIC)	
        list_scroll.add(self.list_view)

        selection = self.list_view.get_selection()
        selection.set_mode(gtk.SELECTION_SINGLE) # TODO multiple selection
        selection.set_select_function(self.on_selection_changed)

        # Create up/down buttons
        self.up_button = gtk.Button(stock=gtk.STOCK_GO_UP)
        self.up_button.connect("clicked", self.on_move_frame_up)

        self.down_button = gtk.Button(stock=gtk.STOCK_GO_DOWN)
        self.down_button.connect("clicked", self.on_move_frame_down)

        # Fill right pane
        right_pane = gtk.VBox()
        right_pane.pack_start(list_scroll, expand=True, fill=True)
        right_pane.pack_start(self.up_button, expand=False)
        right_pane.pack_start(self.down_button, expand=False)

        hbox = gtk.HBox()
        hbox.pack_start(left_pane)
        hbox.pack_start(right_pane)

        # Message field
        self.message_field = gtk.Entry()
        self.message_field.set_text("Sozi started")
        self.message_field.set_editable(False)
        
        vbox = gtk.VBox()
        vbox.pack_start(self.message_field)
        vbox.pack_start(hbox)
        
        window.add(vbox)
        window.show_all()

        # Get selected frame
        selected_frame = None
        if len(effect.selected) > 0:
            for f in effect.frames:
                if f["svg_element"].attrib["id"] in effect.selected:
                    selected_frame = f
                    break
        elif len(effect.frames) > 0:
            selected_frame = effect.frames[0]

        # Fill frame list
        store = self.list_view.get_model()
        for i in range(len(effect.frames)):
            self.append_frame(store, i)

        if selected_frame is not None:
            index = effect.frames.index(selected_frame)
            self.list_view.get_selection().select_path((index,))
            self.list_view.scroll_to_cell(index)
        else:
            self.fill_form(None)
        
        gtk.main()
        

    def append_frame(self, store, index):
        frame = self.effect.frames[index]

        title_attr = inkex.addNS("title", "sozi")
        if title_attr in frame["frame_element"].attrib:
            title = frame["frame_element"].attrib[title_attr]
        else:
            title = "Untitled"

        if frame["svg_element"] in self.effect.selected.values():
            color = "#ff0000"
        else:
            color = "#000000"

        store.append([index+1, title, color])


    def fill_form(self, frame=None, index=-1):
        for field in self.fields.itervalues():
            field.fill_for_frame(frame, index)

        self.create_new_frame_button.set_sensitive(frame is not None or len(self.effect.selected) > 0)
        self.delete_button.set_sensitive(frame is not None)


    def swap_frames(self, model, first, second):
        self.effect.swap_frames(first, second)
        model.set(model.get_iter(first), 0, second + 1)
        model.set(model.get_iter(second), 0, first + 1)

    # TODO
#    def update_frame_title(self):
#        model, iter = self.list_view.get_selection().get_selected()
#        model.set(iter, 1, self.fields["title"].get_value())


    def on_create_new_frame(self, widget):
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        if iter:
            index = model.get_path(iter)[0]
        else:
            index = -1

        frame = self.effect.create_new_frame(index)
        for field in self.fields.itervalues():
            frame["frame_element"].set(field.ns_attr, field.get_value())
            
        # Create row in list view
        i = len(self.effect.frames) - 1
        self.append_frame(model, i)
        selection.select_path((i,))
        self.list_view.scroll_to_cell(i)


    def on_delete_frame(self, widget):
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        index = model.get_path(iter)[0]

        self.effect.delete_frame(index)

        # Delete frame from list view
        if model.remove(iter):
            selection.select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.effect.frames)):
                model.set(model.get_iter(i), 0, i + 1)
        else:
            self.fill_form()


    def on_move_frame_up(self, widget):
        model, iter = self.list_view.get_selection().get_selected()
        index = model.get_path(iter)[0]
        self.swap_frames(model, index, index - 1)
        model.move_before(iter, model.get_iter(index-1))
        self.up_button.set_sensitive(index > 1)
        self.down_button.set_sensitive(True)


    def on_move_frame_down(self, widget):
        model, iter = self.list_view.get_selection().get_selected()
        index = model.get_path(iter)[0]
        self.swap_frames(model, index, index + 1)
        model.move_after(iter, model.iter_next(iter))
        self.up_button.set_sensitive(True)
        self.down_button.set_sensitive(index < len(self.effect.frames) - 2)


    def on_selection_changed(self, path):
        if self.list_view.get_selection().path_is_selected(path):
            self.up_button.set_sensitive(False)
            self.down_button.set_sensitive(False)
            self.delete_button.set_sensitive(False)
            self.fill_form()
        else:
            index = path[0]
            frame = self.effect.frames[index]
            self.up_button.set_sensitive(index > 0)
            self.down_button.set_sensitive(index < len(self.effect.frames) - 1)
            self.delete_button.set_sensitive(True)
            self.fill_form(frame, index)
        return True


    def destroy(self, widget):
        gtk.main_quit()


class Sozi(inkex.Effect):

    VERSION = "{{SOZI_VERSION}}"

    ATTR = ["title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
            "transition-duration-ms", "transition-zoom-percent", "transition-profile"]

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []


    def effect(self):
        self.upgrade_or_install("script", "js")
        self.upgrade_or_install("style", "css")
        self.upgrade_document()
        self.create_or_edit_frame()


    def upgrade_or_install(self, tag, ext):
        # Check version and remove older versions
        latest_version_found = False
        for elt in self.document.xpath("//svg:" + tag + "[@id='sozi-" + tag + "']", namespaces=inkex.NSS):
            version = elt.attrib[inkex.addNS("version", "sozi")]
            if version == Sozi.VERSION:
                latest_version_found = True
            elif version < Sozi.VERSION:
                elt.getparent().remove(elt)
            else:
                sys.stderr.write("Document has been created using a higher version of Sozi. Please upgrade the Inkscape plugin.\n")
                exit()
      
        # Create new element if needed
        if not latest_version_found:
            elt = inkex.etree.Element(inkex.addNS(tag, "svg"))
            elt.text = open(os.path.join(os.path.dirname(__file__), "sozi." + ext)).read()
            elt.set("id","sozi-" + tag)
            elt.set(inkex.addNS("version", "sozi"), Sozi.VERSION)
            self.document.getroot().append(elt)


    def upgrade_document(self):
        # Upgrade from 10.x

        # FIXME allow multiple classes in element
        for elt in self.document.xpath("//svg:*[@class='sozi-frame']", namespaces=inkex.NSS):
            del elt.attrib["class"]

            # Create a new frame element
            f = inkex.etree.Element(inkex.addNS("frame", "sozi"))
            f.set(inkex.addNS("refid", "sozi"), elt.attrib["id"]) # TODO check namespace for id?
            self.document.getroot().append(f)

            # Move all Sozi-specific attributes from the original element to the frame element
            for attr in Sozi.ATTR:
                ns_attr = inkex.addNS(attr, "sozi")
                if ns_attr in elt.attrib:
                    f.set(ns_attr, elt.attrib[ns_attr])
                    del elt.attrib[ns_attr]
      

    def create_or_edit_frame(self):
        # Get list of valid frame elements and remove orphan frames
        self.frames = []
        for f in self.document.xpath("//sozi:frame", namespaces=inkex.NSS):
            e = self.document.xpath("//svg:*[@id='" + f.attrib[inkex.addNS("refid", "sozi")] + "']", namespaces=inkex.NSS)
            if len(e) == 0:
                self.document.getroot().remove(f)
            else:
                self.frames.append(
                    {
                        "frame_element": f,
                        "svg_element": e[0]
                    }
                )

        # Sort frames by sequence attribute 
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames = sorted(self.frames, key=lambda f:
            int(f["frame_element"].attrib[sequence_attr]) if sequence_attr in f["frame_element"].attrib else len(self.frames))

        # Renumber frames
        for i, f in enumerate(self.frames):
            f["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i+1))

        # Initialize the user interface
        self.ui = SoziUI(self)


    def swap_frames(self, first, second):
        # Swap frames in SVG document
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames[first]["frame_element"].set(sequence_attr, unicode(second + 1))
        self.frames[second]["frame_element"].set(sequence_attr, unicode(first + 1))

        # Swap frames in frame list
        self.frames[first], self.frames[second] = self.frames[second], self.frames[first]


    def create_new_frame(self, index):
        if index >= 0:
            svg_element = self.frames[index]["svg_element"]
        else:            
            svg_element = self.selected.values()[0]
            
        # Create frame in SVG document
        frame_element = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        frame_element.set(inkex.addNS("refid", "sozi"), svg_element.attrib["id"]) # TODO check namespace?
        frame_element.set(inkex.addNS("sequence", "sozi"), unicode(len(self.frames)+1))
        self.document.getroot().append(frame_element)
        
        # Create frame in frame list
        frame = {
            "frame_element": frame_element,
            "svg_element": svg_element
        }
        
        self.frames.append(frame)
        return frame


    def delete_frame(self, index):
        # Delete frame from SVG document
        self.document.getroot().remove(self.frames[index]["frame_element"])

        # Delete frame from frame list
        del self.frames[index]

        # Renumber frames
        for i in range(index, len(self.frames)):
            self.frames[i]["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i+1))


# Create effect instance
effect = Sozi()
effect.affect()

