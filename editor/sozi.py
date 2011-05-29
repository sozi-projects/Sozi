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


class Sozi(inkex.Effect):

    VERSION = "{{SOZI_VERSION}}"

    PROFILES = ["linear",
                "accelerate", "strong-accelerate",
                "decelerate", "strong-decelerate",
                "accelerate-decelerate", "strong-accelerate-decelerate",
                "decelerate-accelerate", "strong-decelerate-accelerate"]

    ATTR = ["title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
            "transition-duration-ms", "transition-zoom-percent", "transition-profile"]

    NS_URI = u"http://sozi.baierouge.fr"

    NS = "{" + NS_URI + "}"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []
        self.fields = {}


    def effect(self):
        self.upgrade_or_install("script", "js")
        self.upgrade_or_install("style", "css")
        self.upgrade_document()
        self.create_or_edit_frame()


    def upgrade_or_install(self, tag, ext):
        # Check version and remove older versions
        latest_version_found = False
        for elt in self.document.xpath("//svg:" + tag + "[@id='sozi-" + tag + "']", namespaces=inkex.NSS):
            version = elt.attrib[Sozi.NS+"version"]
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
            elt.set(Sozi.NS+"version", Sozi.VERSION)
            self.document.getroot().append(elt)


    def upgrade_document(self):
        # Upgrade from 10.x

        # FIXME allow multiple classes in element
        for elt in self.document.xpath("//svg:*[@class='sozi-frame']", namespaces=inkex.NSS):
            del elt.attrib["class"]

            # Create a new frame element
            f = inkex.etree.Element(inkex.addNS("frame", "sozi"))
            f.set(Sozi.NS+"refid", elt.attrib["id"]) # TODO check namespace for id?
            self.document.getroot().append(f)

            # Move all Sozi-specific attributes from the original element to the frame element
            for attr in Sozi.ATTR:
                ns_attr = Sozi.NS+attr
                if ns_attr in elt.attrib:
                    f.set(ns_attr, elt.attrib[ns_attr])
                    del elt.attrib[ns_attr]
      

    def create_or_edit_frame(self):
        # Get list of valid frame elements and remove orphan frames
        self.frames = []
        for f in self.document.xpath("//sozi:frame", namespaces=inkex.NSS):
            e = self.document.xpath("//svg:*[@id='" + f.attrib[Sozi.NS+"refid"] + "']", namespaces=inkex.NSS)
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
        sequence_attr = Sozi.NS+"sequence"
        self.frames = sorted(self.frames, key=lambda f:
            int(f["frame_element"].attrib[sequence_attr]) if sequence_attr in f["frame_element"].attrib else len(self.frames))

        # Renumber frames
        for i, f in enumerate(self.frames):
            f["frame_element"].set(Sozi.NS+"sequence", unicode(i+1))

        # Get the selected frame elements
        if len(self.selected) > 0:
            for f in self.frames:
                if f["svg_element"].attrib["id"] in self.selected:
                    self.create_form(f)
                    break
            else:
                self.create_form(None)
        elif len(self.frames) > 0:
            self.create_form(self.frames[0])


    def create_text_field(self, attr, label):
        lbl = gtk.Label(label)
        entry = gtk.Entry()

        hbox = gtk.HBox()
        hbox.add(lbl)
        hbox.add(entry)

        self.fields[attr] = entry
        return hbox


    def get_field_value(self, frame, attr, value):
        ns_attr = Sozi.NS+attr
        if frame is not None and ns_attr in frame["frame_element"].attrib:
            return frame["frame_element"].attrib[ns_attr]
        else:
            return value
      
      
    def fill_text_field(self, frame, attr, value):
        self.fields[attr].set_text(self.get_field_value(frame, attr, value))

      
    def create_combo_field(self, attr, label, items):
        lbl = gtk.Label(label)

        combo = gtk.combo_box_new_text()
        for text in items:
            combo.append_text(text)

        hbox = gtk.HBox()
        hbox.add(lbl)
        hbox.add(combo)

        self.fields[attr] = combo 
        return hbox

      
    def fill_combo_field(self, frame, attr, items, index):
        text = self.get_field_value(frame, attr, items[index])
        if items.count(text) > 0:
            index = items.index(text)
        self.fields[attr].set_active(index)


    def create_checkbox_field(self, attr, label):
        button = gtk.CheckButton(label)
        self.fields[attr] = button
        return button


    def fill_checkbox_field(self, frame, attr, value):
        self.fields[attr].set_active(self.get_field_value(frame, attr, value) == "true")


    def create_spinbutton_field(self, attr, label, minValue = 0, maxValue = 1000000):
        lbl = gtk.Label(label)

        spin = gtk.SpinButton(digits=0)
        spin.set_range(minValue, maxValue)
        spin.set_increments(1, 1)
        spin.set_numeric(True)

        hbox = gtk.HBox()
        hbox.pack_start(lbl)
        hbox.pack_start(spin)

        self.fields[attr] = spin
        return hbox


    def fill_spinbutton_field(self, frame, attr, value):
        self.fields[attr].set_value(int(self.get_field_value(frame, attr, value)))


    def create_checked_spinbutton_field(self, enable_attr, value_attr, label):
        button = gtk.CheckButton(label)

        spin = gtk.SpinButton(digits=0)
        spin.set_range(0, 1000000)
        spin.set_increments(1, 1)
        spin.set_numeric(True)

        hbox = gtk.HBox()
        hbox.pack_start(button)
        hbox.pack_start(spin)

        self.fields[enable_attr] = button
        self.fields[value_attr] = spin
        return hbox


    def create_form(self, frame):
        window = gtk.Window(gtk.WINDOW_TOPLEVEL)
        window.connect("destroy", self.destroy)

        # Enable icons on stock buttons
        gtk.settings_get_default().set_long_property("gtk-button-images", True, "Sozi")

        # Create form for the selected element
        title_field = self.create_text_field("title", "Title:")
        hide_field = self.create_checkbox_field("hide", "Hide")
        clip_field = self.create_checkbox_field("clip", "Clip")
        timeout_field = self.create_checked_spinbutton_field("timeout-enable", "timeout-ms", "Timeout (ms):")
        transition_duration_field = self.create_spinbutton_field("transition-duration-ms", "Duration (ms):")
        transition_zoom_field = self.create_spinbutton_field("transition-zoom-percent", "Zoom (%):", -100, 100)
        transition_profile_field = self.create_combo_field("transition-profile", "Profile:", Sozi.PROFILES)

        # Create save buttons
        self.save_button = gtk.Button(stock=gtk.STOCK_SAVE)
        self.save_button.connect("clicked", self.on_save_frame)

        self.save_as_new_frame_button = gtk.Button(stock=gtk.STOCK_NEW)
        self.save_as_new_frame_button.connect("clicked", self.on_save_as_new_frame)

        self.delete_button = gtk.Button(stock=gtk.STOCK_DELETE)
        self.delete_button.connect("clicked", self.on_delete_frame)

        buttons_box = gtk.HBox()
        buttons_box.pack_start(self.save_button)
        buttons_box.pack_start(self.save_as_new_frame_button)
        buttons_box.pack_start(self.delete_button)

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

        # Transition properties
        transition_box = gtk.VBox()
        transition_box.pack_start(transition_duration_field, expand=False)
        transition_box.pack_start(transition_zoom_field, expand=False)
        transition_box.pack_start(transition_profile_field, expand=False)

        transition_group = gtk.Frame("Transition")
        transition_group.add(transition_box)

        # Frame properties
        frame_box = gtk.VBox()
        frame_box.pack_start(title_field, expand=False)
        frame_box.pack_start(hide_field, expand=False)
        frame_box.pack_start(clip_field, expand=False)
        frame_box.pack_start(timeout_field, expand=False)

        frame_group = gtk.Frame("Frame")
        frame_group.add(frame_box)

        # Fill left pane
        left_pane = gtk.VBox()
        left_pane.pack_start(transition_group, expand=False)
        left_pane.pack_start(frame_group, expand=False)
        left_pane.pack_start(buttons_box, expand=False)

        # Fill right pane
        right_pane = gtk.VBox()
        right_pane.pack_start(list_scroll, expand=True, fill=True)
        right_pane.pack_start(self.up_button, expand=False)
        right_pane.pack_start(self.down_button, expand=False)

        hbox = gtk.HBox()
        hbox.pack_start(left_pane)
        hbox.pack_start(right_pane)

        window.add(hbox)
        window.show_all()

        # Fill frame list
        store = self.list_view.get_model()
        for i in range(len(self.frames)):
            self.append_frame(store, i)

        if frame is not None:
            index = self.frames.index(frame)
            self.list_view.get_selection().select_path((index,))
            self.list_view.scroll_to_cell(index)
        else:
            self.fill_form(None)

        gtk.main()


    def fill_form(self, frame):
        # Rectangles are configured to be hidden by default.
        # Other elements are configured to be visible.
        if frame is not None:
            tag = frame["svg_element"].tag
        elif len(self.selected) > 0:
            tag = self.selected.values()[0].tag
        else:
            tag = None

        if tag == "rect" or tag == "{" + inkex.NSS["svg"] + "}rect":
            default_hide = "true"
        else:
            default_hide = "false"

        self.fill_text_field(frame, "title", "New frame")
        self.fill_checkbox_field(frame, "hide", default_hide)
        self.fill_checkbox_field(frame, "clip", "true")
        self.fill_checkbox_field(frame, "timeout-enable", "false")
        self.fill_spinbutton_field(frame, "timeout-ms", 5000)
        self.fill_spinbutton_field(frame, "transition-duration-ms", 1000)
        self.fill_spinbutton_field(frame, "transition-zoom-percent", 0)
        self.fill_combo_field(frame, "transition-profile", Sozi.PROFILES, 0)

        self.save_button.set_sensitive(frame is not None)
        self.save_as_new_frame_button.set_sensitive(frame is not None or len(self.selected) > 0)
        self.delete_button.set_sensitive(frame is not None)


    def append_frame(self, store, index):
        frame = self.frames[index]

        title_attr = Sozi.NS+"title"
        if title_attr in frame["frame_element"].attrib:
            title = frame["frame_element"].attrib[title_attr]
        else:
            title = "Untitled"

        if frame["svg_element"] in self.selected.values():
            color = "#ff0000"
        else:
            color = "#000000"

        store.append([index+1, title, color])


    def swap_frames(self, model, first, second):
        # Swap frames in SVG document
        self.frames[first]["frame_element"].set(Sozi.NS+"sequence", unicode(second + 1))
        self.frames[second]["frame_element"].set(Sozi.NS+"sequence", unicode(first + 1))

        # Swap frames in frame list
        self.frames[first], self.frames[second] = self.frames[second], self.frames[first]

        # Swap frames in list view
        model.set(model.get_iter(first), 0, second + 1)
        model.set(model.get_iter(second), 0, first + 1)


    def save_frame(self, frame_element):
        frame_element.set(Sozi.NS+"title", unicode(self.fields["title"].get_text()))
        frame_element.set(Sozi.NS+"hide", unicode("true" if self.fields["hide"].get_active() else "false"))
        frame_element.set(Sozi.NS+"clip", unicode("true" if self.fields["clip"].get_active() else "false"))
        frame_element.set(Sozi.NS+"timeout-enable", unicode("true" if self.fields["timeout-enable"].get_active() else "false"))
        frame_element.set(Sozi.NS+"timeout-ms", unicode(self.fields["timeout-ms"].get_value_as_int()))
        frame_element.set(Sozi.NS+"transition-duration-ms", unicode(self.fields["transition-duration-ms"].get_value_as_int()))
        frame_element.set(Sozi.NS+"transition-zoom-percent", unicode(self.fields["transition-zoom-percent"].get_value_as_int()))
        frame_element.set(Sozi.NS+"transition-profile", unicode(Sozi.PROFILES[self.fields["transition-profile"].get_active()]))


    def on_save_frame(self, widget):
        model, iter = self.list_view.get_selection().get_selected()

        # Update frame in SVG document
        index = model.get_path(iter)[0]
        self.save_frame(self.frames[index]["frame_element"])

        # Update frame title in list view
        model.set(iter, 1, self.fields["title"].get_text())


    def on_save_as_new_frame(self, widget):
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        if iter:
            index = model.get_path(iter)[0]
            svg_element = self.frames[index]["svg_element"]
        else:
            svg_element = self.selected.values()[0]

        # Create frame in SVG document
        frame_element = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        frame_element.set(Sozi.NS+"refid", svg_element.attrib["id"]) # TODO check namespace?
        frame_element.set(Sozi.NS+"sequence", unicode(len(self.frames)+1))
        self.document.getroot().append(frame_element)
        self.save_frame(frame_element)

        # Create frame in frame list
        self.frames.append({
            "frame_element": frame_element,
            "svg_element": svg_element
        })

        # Create row in list view
        i = len(self.frames) - 1
        self.append_frame(model, i)
        selection.select_path((i,))
        self.list_view.scroll_to_cell(i)


    def on_delete_frame(self, widget):
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        index = model.get_path(iter)[0]

        # Delete frame from SVG document
        self.document.getroot().remove(self.frames[index]["frame_element"])

        # Delete frame from frame list
        del self.frames[index]

        # Delete frame from list view
        if model.remove(iter):
            selection.select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.frames)):
                model.set(model.get_iter(i), 0, i + 1)
                self.frames[i]["frame_element"].set(Sozi.NS+"sequence", unicode(i+1))
        else:
            self.fill_form(None)


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
        self.down_button.set_sensitive(index < len(self.frames) - 2)


    def on_selection_changed(self, path):
        if self.list_view.get_selection().path_is_selected(path):
            f = None
            self.up_button.set_sensitive(False)
            self.down_button.set_sensitive(False)
            self.delete_button.set_sensitive(False)
        else:
            index = path[0]
            f = self.frames[index]
            self.up_button.set_sensitive(index > 0)
            self.down_button.set_sensitive(index < len(self.frames) - 1)
            self.delete_button.set_sensitive(True)
        self.fill_form(f)
        return True


    def destroy(self, widget):
        gtk.main_quit()


# Create effect instance
effect = Sozi()
effect.affect()

