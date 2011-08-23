#!/usr/bin/env python2

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
    """
    A field is a wrapper for a GTK input control mapped to a Sozi frame attribute.
    Provide a subclass of SoziField for each type of GTK control.
    """
    
    def __init__(self, parent, attr, label, container_widget, input_widget, default_value, focus_events=True):
        """
        Initialize a new field.
            - parent: the UI object that contains the current field
            - attr: the frame attribute that corresponds to the current field
            - label: the human-readable text that describes the current field
            - container_widget: the GTK widget that will contain the current field
            - input_widget: the GTK input control for the current field
            - default_value: the default value of the current field
            - focus_events: True if the GTK input control handles focus events, False otherwise
        """
        self.parent = parent
        self.ns_attr = inkex.addNS(attr, "sozi")
        self.label = label
        self.container_widget = container_widget
        self.input_widget = input_widget
        self.default_value = unicode(default_value)

        if focus_events:
            self.input_widget.connect("focus-out-event", self.on_focus_out)
        else:
            self.input_widget.connect("changed", self.on_focus_out)

        self.last_value = None
        self.current_frame = None


    def set_value(self, value):
        """
        Fill the GTK control for the current field with the given value.
        The value must be provided as a string.
        
        Implemented by subclasses.
        """
        pass


    def get_value(self):
        """
        Return the value of the GTK control for the current field.
        The value is returned as a string.
        
        Implemented by subclasses.
        """
        pass


    def write_if_needed(self):
        """
        Write the value of the current field to the SVG document.
        This operation is performed if all these conditions are met:
            - the current field shows a property of an existing frame
            - this frame has not been removed from the document
            - the value of the current field has changed since it was last written
        The write operation is delegated to a SoziFieldAction object.
        """
        if self.current_frame is not None and self.current_frame in self.parent.effect.frames and self.last_value != self.get_value():
            self.parent.do_action(SoziFieldAction(self))
            self.last_value = self.get_value()

            
    def set_with_frame(self, frame):
        """
        Set the value of the current field with the corresponding attribute of the given frame.
        If frame is None, the field is filled with its default value.
        The previous value of the field is written to the document if needed.
        """
        self.write_if_needed()
        self.current_frame = frame
        if frame is not None and self.ns_attr in frame["frame_element"].attrib:
            self.last_value = frame["frame_element"].attrib[self.ns_attr]
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)


    def on_focus_out(self, widget, event=None):
        """
        Event handler, called each time the current field loses focus.
        """
        self.write_if_needed()


class SoziTextField(SoziField):
    """
    A wrapper for a GTK Entry mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, default_value):
        """
        Initialize a new text field.
        See class SoziField for initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.Entry(), default_value)
        self.container_widget.add(gtk.Label(label))
        self.container_widget.add(self.input_widget)


    def set_value(self, value):
        self.input_widget.set_text(value)


    def get_value(self):
        return unicode(self.input_widget.get_text())


class SoziComboField(SoziField):
    """
    A wrapper for a GTK ComboBox with text items mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, items, default_value):
        """
        Initialize a new combo field.
            - items: the list of items in the combo box
        See class SoziField for other initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.combo_box_new_text(), default_value, False)
        self.items = items  
        for text in items:
            self.input_widget.append_text(text)
        self.container_widget.add(gtk.Label(label))
        self.container_widget.add(self.input_widget)

      
    def set_value(self, value):
        self.input_widget.set_active(self.items.index(value))

    
    def get_value(self):
        return unicode(self.items[self.input_widget.get_active()])
        
        
class SoziCheckButtonField(SoziField):
    """
    A wrapper for a GTK CheckButton mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, default_value):
        """
        Initialize a new check button field.
        See class SoziField for initializer arguments.
        """
        button = gtk.CheckButton(label)
        SoziField.__init__(self, parent, attr, label, button, button, default_value)


    def set_value(self, value):
        self.input_widget.set_active(value == "true")


    def get_value(self):
        return unicode("true" if self.input_widget.get_active() else "false")
    
    
class SoziSpinButtonField(SoziField):
    """
    A wrapper for a GTK SpinButton mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, min_value, max_value, default_value):
        """
        Initialize a new spin button field.
            - min_value: the minimum integer value for the current field
            - max_value: the maximum integer value for the current field
        See class SoziField for other initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(), gtk.SpinButton(digits=0), default_value)
        self.input_widget.set_range(min_value, max_value)
        self.input_widget.set_increments(1, 1)
        self.input_widget.set_numeric(True)
        self.container_widget.pack_start(gtk.Label(label))
        self.container_widget.pack_start(self.input_widget)


    def set_value(self, value):
        self.input_widget.set_value(int(value))


    def get_value(self):
        return unicode(self.input_widget.get_value_as_int())


class SoziAction:
    """
    A wrapper for UI actions.
    Action objects can be executed, undone and redone.
    They can be stored in undo and redo stacks.
    """
    
    def __init__(self, undo_description, redo_description):
        """
        Initialize a new action.
            - undo_description: a human-readable text that describes the undo action
            - redo_description: a human-readable text that describes the redo action
        """
        self.undo_description = undo_description
        self.redo_description = redo_description


    def do(self):
        """
        Execute the current action.
        Implemented by subclasses.
        """
        pass


    def undo(self):
        """
        Undo the current action.
        Implemented by subclasses.
        """
        pass


    def redo(self):
        """
        Redo the current action.
        The default implementation simply calls the do() method on the current action.
        Override this method to provide a specific implementation.
        """
        self.do()
        

class SoziFieldAction(SoziAction):
    """
    A wrapper for a field modification action.
    Executing a field action will write the field value to the SVG document.
    """
    
    def __init__(self, field):
        """
        Initialize a new field action for the given field.
        The action object saves a copy of the previous and current values of the field.
        """
        index = field.parent.effect.frames.index(field.current_frame)

        SoziAction.__init__(self,
            "Restore " + field.label + " in frame " + str(index + 1),
            "Change " + field.label + " in frame " + str(index + 1)
        )

        self.field = field
        self.frame = field.current_frame
        self.last_value = field.last_value
        self.value = field.get_value()


    def do(self):
        """
        Write the new value of the field to the current frame.
        """
        self.frame["frame_element"].set(self.field.ns_attr, self.value)


    def undo(self):
        """
        Restore the previous value of the field in the frame and in the UI.
        If needed, select the frame that was active when the field was modified.
        """
        self.frame["frame_element"].set(self.field.ns_attr, self.last_value)
        if self.field.current_frame is self.frame:
            self.field.set_value(self.last_value)
        else:
            self.field.parent.select_frame(self.frame)


    def redo(self):
        """
        Write the new value of the field to the frame and to the UI.
        If needed, select the frame that was active when the field was modified.
        """
        self.do()
        if self.field.current_frame is self.frame:
            self.field.set_value(self.value)
        else:
            self.field.parent.select_frame(self.frame)


class SoziCreateAction(SoziAction):
    """
    A wrapper for a frame creation action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame creation action.
            - ui: an instance of SoziUI
        """
        # The new frame will be added at the end of the presentation
        new_frame_number = str(len(ui.effect.frames) + 1)

        SoziAction.__init__(self,
            "Remove frame " + new_frame_number,
            "Recreate frame " + new_frame_number)
        
        self.ui = ui
        
        # The new frame is a copy of the currently selected frame
        self.index = ui.get_selected_index()
        self.frame = ui.effect.create_new_frame(self.index)
        for field in ui.fields.itervalues():
            self.frame["frame_element"].set(field.ns_attr, field.get_value())
                    

    def do(self):
        """
        Create a new frame and select it in the frame list.
        """
        self.ui.effect.add_frame(self.frame)
        self.ui.append_frame_title(-1)
        self.ui.select_index(-1)


    def undo(self):        
        """
        Remove the created frame and select the previously selected frame.
        """
        self.ui.remove_last_frame_title()
        self.ui.effect.delete_frame(-1)
        if self.index is not None:
            self.ui.select_index(self.index)


class SoziUI:
    """
    The user interface of Sozi.
    """
    
    PROFILES = ["linear",
                "accelerate", "strong-accelerate",
                "decelerate", "strong-decelerate",
                "accelerate-decelerate", "strong-accelerate-decelerate",
                "decelerate-accelerate", "strong-decelerate-accelerate"]


    def __init__(self, effect):
        """
        Create a new window with the frame edition form.
            - effect: the effect instance given by Inkscape
        """
        
        self.effect = effect
        self.undo_stack = []
        self.redo_stack = []
        
        window = gtk.Window(gtk.WINDOW_TOPLEVEL)
        window.connect("destroy", self.on_destroy)
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
        transition_box.pack_start(self.fields["transition-duration-ms"].container_widget, expand=False)
        transition_box.pack_start(self.fields["transition-zoom-percent"].container_widget, expand=False)
        transition_box.pack_start(self.fields["transition-profile"].container_widget, expand=False)

        transition_group = gtk.Frame("Transition")
        transition_group.add(transition_box)

        # Frame properties
        frame_box = gtk.VBox()
        frame_box.pack_start(self.fields["title"].container_widget, expand=False)
        frame_box.pack_start(self.fields["hide"].container_widget, expand=False)
        frame_box.pack_start(self.fields["clip"].container_widget, expand=False)
        frame_box.pack_start(self.fields["timeout-enable"].container_widget, expand=False)
        frame_box.pack_start(self.fields["timeout-ms"].container_widget, expand=False)

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

        # Undo/redo widgets
        self.undo_button = gtk.Button(stock=gtk.STOCK_UNDO)
        self.undo_button.set_sensitive(False)
        self.undo_button.connect("clicked", self.on_undo)

        self.redo_button = gtk.Button(stock=gtk.STOCK_REDO)
        self.redo_button.set_sensitive(False)
        self.redo_button.connect("clicked", self.on_redo)
        
        undo_redo_box = gtk.HBox()
        undo_redo_box.pack_start(self.undo_button)
        undo_redo_box.pack_start(self.redo_button)
        
        vbox = gtk.VBox()
        vbox.pack_start(hbox)
        vbox.pack_start(undo_redo_box)
        
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
        for i in range(len(effect.frames)):
            self.append_frame_title(i)

        if selected_frame is not None:
            index = effect.frames.index(selected_frame)
            self.list_view.get_selection().select_path((index,))
            self.list_view.scroll_to_cell(index)
        else:
            self.fill_form(None)
        
        gtk.main()
        

    def append_frame_title(self, index):
        """
        Append the title of the frame at the given index to the frame list view.
        This method is used when filling the list view initially or when creating
        a new frame.
        """
        # A negative index is counted back from the end of the frame list.
        # This is not needed for Python arrays, but we need to show the corect
        # frame number in the list view.
        if (index < 0):
            index += len(self.effect.frames)

        frame = self.effect.frames[index]

        # Get the title of the frame
        title_attr = inkex.addNS("title", "sozi")
        if title_attr in frame["frame_element"].attrib:
            title = frame["frame_element"].attrib[title_attr]
        else:
            title = "Untitled"

        # The text color will show whether the current frame
        # corresponds to the selected object in Inkscape
        if frame["svg_element"] in self.effect.selected.values():
            color = "#ff0000"
        else:
            color = "#000000"

        self.list_view.get_model().append([index+1, title, color])


    def remove_last_frame_title(self):
        """
        Remove the title of the last frame in the list view.
        This method is used when undoing the creation of a new frame.
        """
        model = self.list_view.get_model()
        model.remove(model.get_iter(len(self.effect.frames) - 1))

     
    def fill_form(self, frame):
        """
        Fill all fields with the values of the attributes of the given frame.
        """
        for field in self.fields.itervalues():
            field.set_with_frame(frame)

        if frame is not None:
            create_tooltip = "Duplicate the current frame"
            delete_tooltip = "Delete the current frame"
        else:
            if len(self.effect.selected) > 0:
                create_tooltip = "Create a new frame using the selected element"
            else:
                create_tooltip = "No element or frame selected"
            delete_tooltip = "No frame selected"
            
        self.create_new_frame_button.set_tooltip_text(create_tooltip)
        self.create_new_frame_button.set_sensitive(frame is not None or len(self.effect.selected) > 0)
        
        self.delete_button.set_tooltip_text(delete_tooltip)
        self.delete_button.set_sensitive(frame is not None)


    def get_selected_index(self):
        """
        Return the index of the currently selected frame.
        None is returned if no frame is selected.
        """
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        if iter:
            return model.get_path(iter)[0]
        else:
            return None


    def select_index(self, index):
        """
        Select the frame at the given index.
        A negative index is counted back from the end of the frame list.
        """
        if (index < 0):
            index += len(self.effect.frames)
        self.list_view.get_selection().select_path((index,))
        self.list_view.scroll_to_cell(index)

    
    def select_frame(self, frame):
        """
        Select the given frame in the frame list.
        """
        self.select_index(self.effect.frames.index(frame))
        
        
    def on_create_new_frame(self, widget):
        """
        Event handler: click on button "create new frame".
        """
        self.do_action(SoziCreateAction(self))


    def on_delete_frame(self, widget):
        """
        Event handler: click on button "Delete frame".
        """
        selection = self.list_view.get_selection()
        model, iter = selection.get_selected()
        index = model.get_path(iter)[0]

        # Delete frame from document
        self.effect.delete_frame(index)

        # Delete frame from list view
        if model.remove(iter):
            selection.select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.effect.frames)):
                model.set(model.get_iter(i), 0, i + 1)
        else:
            self.fill_form(None)


    def on_move_frame_up(self, widget):
        """
        Event handler: click on button "Move frame up".
        """
        model, iter = self.list_view.get_selection().get_selected()
        index = model.get_path(iter)[0]
        
        # Swap current and previous frames in the document
        self.effect.swap_frames(index, index - 1)
        
        # Swap frame numbers in current and previous rows
        model.set(model.get_iter(index), 0, index)
        model.set(model.get_iter(index - 1), 0, index + 1)

        # Move selected row up
        model.move_before(iter, model.get_iter(index - 1))
        self.list_view.scroll_to_cell(index - 1)
        
        # Update up/down button sensitivity
        self.up_button.set_sensitive(index > 1)
        self.down_button.set_sensitive(True)


    def on_move_frame_down(self, widget):
        """
        Event handler: click on button "Move frame down".
        """
        model, iter = self.list_view.get_selection().get_selected()
        index = model.get_path(iter)[0]

        # Swap current and next frames in the document
        self.effect.swap_frames(index, index + 1)

        # Swap frame numbers in current and next rows
        model.set(model.get_iter(index), 0, index + 2)
        model.set(model.get_iter(index + 1), 0, index + 1)

        # Move selected row down
        model.move_after(iter, model.iter_next(iter))
        self.list_view.scroll_to_cell(index + 1)
        
        # Update up/down button sensitivity
        self.up_button.set_sensitive(True)
        self.down_button.set_sensitive(index < len(self.effect.frames) - 2)


    def on_selection_changed(self, path):
        """
        Event handler: selection changed in frame list view.
        This event can be triggered either due to a user action
        or due to a programmatic selection change.
        """
        if self.list_view.get_selection().path_is_selected(path):
            # If the selection change happens on a selected row
            # then the action is a deselection
            frame = None
            self.up_button.set_sensitive(False)
            self.down_button.set_sensitive(False)
            self.delete_button.set_sensitive(False)
        else:
            # If the selection change happens on a non-selected row
            # then the action is a selection
            index = path[0]
            frame = self.effect.frames[index]
            self.up_button.set_sensitive(index > 0)
            self.down_button.set_sensitive(index < len(self.effect.frames) - 1)
            self.delete_button.set_sensitive(True)
        
        # Show the properties of the selected frame,
        # or default values if no frame is selected.
        self.fill_form(frame)
        
        # Success: highlight or clear the affected row in the frame list
        return True


    def do_action(self, action):
        """
        Execute the given action and push it to the undo stack.
        The redo stack is emptied.
        """
        action.do()
        self.undo_stack.append(action)
        self.redo_stack = []
        self.finalize_action(action)


    def on_undo(self, widget):
        """
        Event handler: click on button "Undo".
        Undo the action at the top of the undo stack and push it to the redo stack.
        """
        if self.undo_stack:
            action = self.undo_stack.pop()
            self.redo_stack.append(action)
            action.undo()
            self.finalize_action(action)


    def on_redo(self, widget):
        """
        Event handler: click on button "Redo".
        Execute the action at the top of the redo stack and push it to the undo stack.
        """
        if self.redo_stack:
            action = self.redo_stack.pop()
            self.undo_stack.append(action)
            action.redo()
            self.finalize_action(action)


    def finalize_action(self, action):
        """
        Update the UI after an action has been executed or undone.
        """
        # Update the frame list view if the "title" field of a frame has changed.
        if isinstance(action, SoziFieldAction) and action.field is self.fields["title"]:
            index = self.effect.frames.index(action.frame)
            model = self.list_view.get_model()
            model.set(model.get_iter(index), 1, action.frame["frame_element"].get(action.field.ns_attr))
        
        # Update the status of the "Undo" button 
        if self.undo_stack:
            self.undo_button.set_tooltip_text(self.undo_stack[-1].undo_description)
        else:
            self.undo_button.set_tooltip_text("")
        self.undo_button.set_sensitive(bool(self.undo_stack))
            
        # Update the status of the "Redo" button 
        if self.redo_stack:
            self.redo_button.set_tooltip_text(self.redo_stack[-1].redo_description)
        else:
            self.redo_button.set_tooltip_text("")
        self.redo_button.set_sensitive(bool(self.redo_stack))

   
    def on_destroy(self, widget):
        """
        Event handler: close the Sozi window.
        """
        gtk.main_quit()


class Sozi(inkex.Effect):

    # Replaced automatically by the version number during the build process
    VERSION = "{{SOZI_VERSION}}"

    ATTR = ["title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
            "transition-duration-ms", "transition-zoom-percent", "transition-profile"]

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []


    def effect(self):
        self.upgrade_or_install("script")
        self.upgrade_or_install("style")
        self.upgrade_document()
        self.analyze_document()
        self.ui = SoziUI(self)


    def upgrade_or_install(self, tag):
        """
        Upgrade or install a script or a style sheet into the document.
            - tag: "script" or "style"
        Depending on the argument, the content of file "sozi.js" or "sozi.css"
        will be copied to the script or style element.
        """
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
            ext = "js" if tag == "script" else "css"
            elt = inkex.etree.Element(inkex.addNS(tag, "svg"))
            elt.text = open(os.path.join(os.path.dirname(__file__), "sozi." + ext)).read()
            elt.set("id","sozi-" + tag)
            elt.set(inkex.addNS("version", "sozi"), Sozi.VERSION)
            self.document.getroot().append(elt)


    def upgrade_document(self):
        """
        Upgrade the Sozi-specific elements of the document to follow the evolutions of the document format.
        """
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
      

    def analyze_document(self):
        """
        Analyze the document and collect information about the presentation.
        Frames with no corresponding SVG element are removed.
        Frames numbers are updated if needed.
        """
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


    def swap_frames(self, first, second):
        """
        Swap frames with the given indices.
        """
        # Swap frames in SVG document
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames[first]["frame_element"].set(sequence_attr, unicode(second + 1))
        self.frames[second]["frame_element"].set(sequence_attr, unicode(first + 1))

        # Swap frames in frame list
        self.frames[first], self.frames[second] = self.frames[second], self.frames[first]


    def create_new_frame(self, index):
        """
        Create a new frame using the SVG element of the frame at the given index.
        The new frame is not added to the document.
        """
        if index is not None:
            svg_element = self.frames[index]["svg_element"]
        else:            
            svg_element = self.selected.values()[0]
            
        frame_element = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        frame_element.set(inkex.addNS("refid", "sozi"), svg_element.attrib["id"]) # TODO check namespace?
        frame_element.set(inkex.addNS("sequence", "sozi"), unicode(len(self.frames)+1))
        
        frame = {
            "frame_element": frame_element,
            "svg_element": svg_element
        }
        
        return frame


    def add_frame(self, frame):
        """
        Add the given frame to the document.
        """
        self.document.getroot().append(frame["frame_element"])
        self.frames.append(frame)

        
    def delete_frame(self, index):
        """
        Remove the frame at the given index from the document.
        """
        # Delete frame from SVG document
        self.document.getroot().remove(self.frames[index]["frame_element"])

        # Delete frame from frame list
        del self.frames[index]

        # Renumber frames
        if index >= 0:
            for i in range(index, len(self.frames)):
                self.frames[i]["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i+1))


# Create effect instance
effect = Sozi()
effect.affect()

