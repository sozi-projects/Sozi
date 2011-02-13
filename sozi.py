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

      self.element = None
      self.all_frame_elements = []
      self.frame_element = None
      self.fields = {}


   def effect(self):
      self.upgrade_or_install_script()
      self.upgrade_document()
      self.create_or_edit_frame()


   def upgrade_or_install_script(self):
      # Check script version and remove older versions of the script
      latest_version_found = False
      for elt in self.document.xpath("//svg:script[@id='sozi-script']", namespaces=inkex.NSS):
         version = elt.attrib[Sozi.NS+"version"]
         if version == Sozi.VERSION:
            latest_version_found = True
         elif version < Sozi.VERSION:
            elt.getparent().remove(elt)
         else:
            sys.stderr.write("Document has been created using a higher version of Sozi. Please upgrade the Inkscape plugin.\n")
            exit()
      
      # Create new script element if needed
      if not latest_version_found:
         elt = inkex.etree.Element(inkex.addNS("script", "svg"))
         elt.text = open(os.path.join(os.path.dirname(__file__), "sozi.js")).read()
         elt.set("id","sozi-script")
         elt.set(Sozi.NS+"version", Sozi.VERSION)
         self.document.getroot().append(elt)


   def upgrade_document(self):
      # Upgrade from 10.x

      # FIXME allow multiple classes in element
      for elt in self.document.xpath("//svg:*[@class='sozi-frame']", namespaces=inkex.NSS):
         del elt.attrib["class"];

         # Create a new frame element
         frame_elt = inkex.etree.Element(inkex.addNS("frame", "sozi"))
         frame_elt.set(Sozi.NS+"refid", elt.attrib["id"]) # TODO check namespace for id?
         self.document.getroot().append(frame_elt)

         # Move all Sozi-specific attributes from the original element to the frame element
         for attr in Sozi.ATTR:
            ns_attr = Sozi.NS+attr
            if ns_attr in elt.attrib:
               frame_elt.set(ns_attr, elt.attrib[ns_attr])
               del elt.attrib[ns_attr]
      

   def create_or_edit_frame(self):
      # Get the first selected element
      for id, elt in self.selected.items():
         if self.element is None:
            self.element = elt
            break

      # Get list of valid frame elements and remove orphan frames
      self.all_frame_elements = []
      for elt in self.document.xpath("//sozi:frame", namespaces=inkex.NSS):
         svg_elt = self.document.xpath("//svg:*[@id='" + elt.attrib[Sozi.NS+"refid"] + "']", namespaces=inkex.NSS)
         if len(svg_elt) == 0:
            self.document.getroot().remove(elt)
         else:
            self.all_frame_elements.append(elt)

      # Sort frames by sequence attribute 
      sequence_attr = Sozi.NS+"sequence"
      self.all_frame_elements = sorted(self.all_frame_elements, key=lambda elt:
         int(elt.attrib[sequence_attr]) if sequence_attr in elt.attrib else len(self.all_frame_elements))

      if self.element is not None:
         # Find frame element for the selected element
         for elt in self.all_frame_elements:
            if elt.attrib[Sozi.NS+"refid"] == self.element.attrib["id"]: # TODO check namespace?
               self.frame_element = elt
               break

         # If no frame element exists, create a new one
         if self.frame_element is None:
            self.frame_element = inkex.etree.Element(inkex.addNS("frame", "sozi"))
            self.frame_element.set(Sozi.NS+"refid", self.element.attrib["id"]) # TODO check namespace?
            self.document.getroot().append(self.frame_element)

         self.show_form()


   def create_text_field(self, attr, label, value):
      ns_attr = Sozi.NS+attr
      if ns_attr in self.frame_element.attrib:
         value = self.frame_element.attrib[ns_attr]

      lbl = gtk.Label(label)

      entry = gtk.Entry()
      entry.set_text(value)

      hbox = gtk.HBox()
      hbox.add(lbl)
      hbox.add(entry)

      self.fields[attr] = entry
      return hbox

      
   def create_combo_field(self, attr, label, items, index):
      ns_attr = Sozi.NS+attr
      if ns_attr in self.frame_element.attrib:
         text = self.frame_element.attrib[ns_attr]
         if items.count(text) > 0:
            index = items.index(text)

      lbl = gtk.Label(label)

      combo = gtk.combo_box_new_text()
      for text in items:
         combo.append_text(text)
      combo.set_active(index)

      hbox = gtk.HBox()
      hbox.add(lbl)
      hbox.add(combo)

      self.fields[attr] = combo 
      return hbox

      
   def create_checked_spinbutton_field(self, enable_attr, value_attr, label, enable, value):
      ns_enable_attr = Sozi.NS+enable_attr
      if ns_enable_attr in self.frame_element.attrib:
         enable = self.frame_element.attrib[ns_enable_attr]

      ns_value_attr = Sozi.NS+value_attr
      if ns_value_attr in self.frame_element.attrib:
         value = int(self.frame_element.attrib[ns_value_attr])

      button = gtk.CheckButton(label)
      button.set_active(enable == "true")

      spin = gtk.SpinButton(digits=0)
      spin.set_range(0, 1000000)
      spin.set_increments(1, 1)
      spin.set_numeric(True)
      spin.set_value(value)

      hbox = gtk.HBox()
      hbox.pack_start(button)
      hbox.pack_start(spin)

      self.fields[enable_attr] = button
      self.fields[value_attr] = spin
      return hbox


   def create_checkbox_field(self, attr, label, value):
      ns_attr = Sozi.NS+attr
      if ns_attr in self.frame_element.attrib:
         value = self.frame_element.attrib[ns_attr]

      button = gtk.CheckButton(label)
      button.set_active(value == "true")

      self.fields[attr] = button
      return button


   def create_spinbutton_field(self, attr, label, value, minValue = 0, maxValue = 1000000):
      ns_attr = Sozi.NS+attr
      if ns_attr in self.frame_element.attrib:
         value = int(self.frame_element.attrib[ns_attr])
      
      lbl = gtk.Label(label)

      spin = gtk.SpinButton(digits=0)
      spin.set_range(minValue, maxValue)
      spin.set_increments(1, 1)
      spin.set_numeric(True)
      spin.set_value(value)

      hbox = gtk.HBox()
      hbox.pack_start(lbl)
      hbox.pack_start(spin)

      self.fields[attr] = spin
      return hbox


   def show_form(self):
      window = gtk.Window(gtk.WINDOW_TOPLEVEL)
      window.connect("destroy", self.destroy)

      # Rectangles are configured to be hidden by default.
      # Other elements are configured to be visible.
      if self.element is not None and (self.element.tag == "rect" or self.element.tag == "{" + inkex.NSS["svg"] + "}rect"):
         default_hide = "true"
      else:
         default_hide = "false"

      # Create form for the selected element
      # TODO click in frame list to change sequence
      # TODO change frame list when title field is changed
      title_field = self.create_text_field("title", "Title:", "New frame")
      sequence_field = self.create_spinbutton_field("sequence", "Sequence:", 1)
      hide_field = self.create_checkbox_field("hide", "Hide", default_hide)
      clip_field = self.create_checkbox_field("clip", "Clip", "true")
      timeout_field = self.create_checked_spinbutton_field("timeout-enable", "timeout-ms", "Timeout (ms):", "false", 5000)
      transition_duration_field = self.create_spinbutton_field("transition-duration-ms", "Duration (ms):", 1000)
      transition_zoom_field = self.create_spinbutton_field("transition-zoom-percent", "Zoom (%):", 0, -100, 100)
      transition_profile_field = self.create_combo_field("transition-profile", "Profile:", Sozi.PROFILES, 0)

      # Create "Done" and "Cancel" buttons
      done_button = gtk.Button("Done")
      done_button.connect("clicked", self.done)
      done_button.connect_object("clicked", gtk.Widget.destroy, window)

      cancel_button = gtk.Button("Cancel")
      cancel_button.connect_object("clicked", gtk.Widget.destroy, window)

      buttons_box = gtk.HBox()
      buttons_box.pack_start(done_button)
      buttons_box.pack_start(cancel_button)

      # Create frame list

      frame_index = len(self.all_frame_elements)
      list_store = gtk.ListStore(str)
      for index, elt in enumerate(self.all_frame_elements):
         if elt == self.frame_element:
            frame_index = index

         title_attr = Sozi.NS+"title"
         if title_attr in elt.attrib:
            title = elt.attrib[title_attr]
         else:
            title = "Untitled"

         list_store.append([str(index+1) + ". " + title])

      if frame_index < len(self.all_frame_elements):
         self.fields["sequence"].set_range(1, len(self.all_frame_elements))
      else:
         self.fields["sequence"].set_range(1, len(self.all_frame_elements) + 1)
      self.fields["sequence"].set_value(frame_index + 1)

      list_renderer = gtk.CellRendererText()
      list_column = gtk.TreeViewColumn("Sequence", list_renderer, text = 0)

      list_view = gtk.TreeView(list_store)
      list_view.append_column(list_column)

      if frame_index < len(self.all_frame_elements):
         list_view.get_selection().select_path(frame_index)

      list_scroll = gtk.ScrolledWindow()
      list_scroll.set_policy(gtk.POLICY_NEVER, gtk.POLICY_AUTOMATIC)	
      list_scroll.add(list_view)

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
      frame_box.pack_start(sequence_field, expand=False)
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

      hbox = gtk.HBox()
      hbox.pack_start(left_pane)
      hbox.pack_start(list_scroll)

      window.add(hbox)
      window.show_all()

      gtk.main()


   def done(self, widget):
      # Update frame attributes using form data
      self.frame_element.set(Sozi.NS+"title", unicode(self.fields["title"].get_text()))
      self.frame_element.set(Sozi.NS+"sequence", unicode(self.fields["sequence"].get_value_as_int()))
      self.frame_element.set(Sozi.NS+"hide", unicode("true" if self.fields["hide"].get_active() else "false"))
      self.frame_element.set(Sozi.NS+"clip", unicode("true" if self.fields["clip"].get_active() else "false"))
      self.frame_element.set(Sozi.NS+"timeout-enable", unicode("true" if self.fields["timeout-enable"].get_active() else "false"))
      self.frame_element.set(Sozi.NS+"timeout-ms", unicode(self.fields["timeout-ms"].get_value_as_int()))
      self.frame_element.set(Sozi.NS+"transition-duration-ms", unicode(self.fields["transition-duration-ms"].get_value_as_int()))
      self.frame_element.set(Sozi.NS+"transition-zoom-percent", unicode(self.fields["transition-zoom-percent"].get_value_as_int()))
      self.frame_element.set(Sozi.NS+"transition-profile", unicode(Sozi.PROFILES[self.fields["transition-profile"].get_active()]))

      # Renumber frames
      sequence = int(self.frame_element.attrib[Sozi.NS+"sequence"])
      index = 1
      for elt in self.all_frame_elements:
         if index == sequence:
            index += 1
         if elt != self.frame_element:
            elt.set(Sozi.NS+"sequence", str(index))
            index += 1


   def destroy(self, widget, data=None):
      gtk.main_quit()


# Create effect instance
effect = Sozi()
effect.affect()

