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

import pygtk
pygtk.require("2.0")
import gtk

import re

import sozi_upgrade


class SoziField:
    """
    A field is a wrapper for a GTK input control mapped to a Sozi frame attribute.
    Provide a subclass of SoziField for each type of GTK control.
    """

    def __init__(self, parent, attr, default_value, optional=False):
        """
        Initialize a new field.
            - parent: the UI object that contains the current field
            - attr: the frame attribute that corresponds to the current field
            - default_value: the default value of the current field
            - focus_events: True if the GTK input control handles focus events, False otherwise
            - optional: True if this field tolerates None value
        """
        self.parent = parent
        self.ns_attr = inkex.addNS(attr, "sozi")
        
        self.input_widget = parent.builder.get_object(attr + "-field")
        self.label = parent.builder.get_object(attr + "-label")
        if self.label is None:
            self.label = self.input_widget.get_label()
        else:
            self.label = self.label.get_text()
            
        self.optional = optional
        
        if default_value is None:
            self.default_value = None
        else:
            self.default_value = unicode(default_value)

        self.last_value = None
        self.current_frame = None


    def set_value(self, value):
        """
        Fill the GTK control for the current field with the given value.
        The value must be provided as a string or None.
        
        Implemented by subclasses.
        """
        pass


    def get_value(self):
        """
        Return the value of the GTK control for the current field.
        The value is returned as a string or None.
        
        Implemented by subclasses.
        """
        pass


    def reset_last_value(self):
        """
        Set the current value of the input widget as the last submitted value.
        """
        self.last_value = self.get_value()

        
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
            self.reset_last_value()
            
            
    def set_with_frame(self, frame):
        """
        Set the value of the current field with the corresponding attribute of the given frame.
        If frame is None, the field is filled with its default value and edition is inhibited.
        The previous value of the field is written to the document if needed.
        """
        self.write_if_needed()
        self.current_frame = frame
        if frame is not None and self.ns_attr in frame.attrib:
            self.last_value = frame.attrib[self.ns_attr]
        elif self.optional:
            self.last_value = None
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)
        self.input_widget.set_sensitive(frame is not None)


    def on_edit_event(self, widget, event=None):
        """
        Default event handler, called each time the current field has been edited.
        Registering this handler is the responsibility of subclasses.
        """
        self.write_if_needed()


class SoziTextField(SoziField):
    """
    A wrapper for a GTK Entry mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, default_value, optional=False):
        """
        Initialize a new text field.
        See class SoziField for initializer arguments.
        """
        SoziField.__init__(self, parent, attr, default_value, optional)
        self.input_widget.connect("focus-out-event", self.on_edit_event)


    def set_value(self, value):
        if value is not None:
            self.input_widget.set_text(value)
        else:
            self.input_widget.set_text("")


    def get_value(self):
        value = self.input_widget.get_text()
        if value == "" and self.optional:
            return None
        else:
            return unicode(value)


class SoziComboField(SoziField):
    """
    A wrapper for a GTK ComboBox with text items mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, default_value):
        """
        Initialize a new combo field.
            - items: the list of items in the combo box
        See class SoziField for other initializer arguments.
        """
        SoziField.__init__(self, parent, attr, default_value)
        self.changed_handler = self.input_widget.connect("changed", self.on_edit_event)

      
    def set_value(self, value):
        self.input_widget.handler_block(self.changed_handler)
        model = self.input_widget.get_model()
        it = model.get_iter_first()
        while it is not None:
            if model.get_value(it, 0) == value:
                self.input_widget.set_active_iter(it)
                break
            else:
                it = model.iter_next(it)
        self.input_widget.handler_unblock(self.changed_handler)

    
    def get_value(self):
        it = self.input_widget.get_active_iter()
        if it is not None:
            return unicode(self.input_widget.get_model().get_value(it, 0))
        else:
            return unicode(self.default_value)


class SoziToggleField(SoziField):
    """
    A wrapper for a toggle based GTK Widget mapped to a Sozi frame attribute.
    It can match gtk.CheckButton.
    """
    
    def __init__(self, parent, attr, default_value):
        """
        Initialize a new check button field.
        See class SoziField for initializer arguments.
        """
        SoziField.__init__(self, parent, attr, default_value)
        self.toggle_handler = self.input_widget.connect("toggled", self.on_edit_event)


    def set_value(self, value):
        self.input_widget.handler_block(self.toggle_handler)
        self.input_widget.set_active(value == "true")
        self.input_widget.handler_unblock(self.toggle_handler)


    def get_value(self):
        return unicode("true" if self.input_widget.get_active() else "false")


class SoziToggleButtonField(SoziToggleField):
    """
    A wrapper for a GTK ToggleButton mapped to a Sozi frame attribute.
    """

    def __init__(self, parent, attr, on_label, off_label, default_value):
        SoziToggleField.__init__(self, parent, attr, default_value)
        self.on_label = on_label
        self.off_label = off_label


    def update_label(self):
        if self.input_widget.get_active():
            self.input_widget.set_label(self.on_label)
        else:
            self.input_widget.set_label(self.off_label)


    def set_value(self, value):
        SoziToggleField.set_value(self, value)
        self.update_label()


    def on_edit_event(self, widget, event=False):
        SoziToggleField.on_edit_event(self, widget, event)
        self.update_label()


class SoziSpinButtonField(SoziField):
    """
    A wrapper for a GTK SpinButton mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, default_value, factor=1):
        """
        Initialize a new spin button field.
            - default_value: the default_value
            - factor : eg: factor 1000 -> comboBox=1.3s ; sozi_svg=1300
        See class SoziField for other initializer arguments.
        """
        factor = float(factor)
        default_value = default_value * factor

        SoziField.__init__(self, parent, attr, default_value)
        self.input_widget.connect("focus-out-event", self.on_edit_event)

        self.factor = factor


    def set_value(self, value):
        self.input_widget.set_value(float(value) / self.factor)


    def get_value(self):
        return unicode(float(self.input_widget.get_value()) * self.factor)


    def on_edit_event(self, widget, event=None):
        self.input_widget.update()
        SoziField.on_edit_event(self, widget, event)


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
        if self.value is None:
            del self.frame.attrib[self.field.ns_attr]
        else:
            self.frame.set(self.field.ns_attr, self.value)


    def undo(self):
        """
        Restore the previous value of the field in the frame and in the UI.
        If needed, select the frame that was active when the field was modified.
        """
        if self.last_value is None:
            del self.frame.attrib[self.field.ns_attr]
        else:
            self.frame.set(self.field.ns_attr, self.last_value)
        if self.field.current_frame is self.frame:
            self.field.set_value(self.last_value)
            self.field.reset_last_value()
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
            self.field.reset_last_value()
        else:
            self.field.parent.select_frame(self.frame)


class SoziCreateAction(SoziAction):
    """
    A wrapper for a frame creation action.
    """
    
    def __init__(self, ui, free):
        """
        Initialize a new frame creation action.
            - ui: an instance of SoziUI
            - free: True if the new frame will have no attached SVG element
        """
        # The new frame will be added at the end of the presentation
        new_frame_number = str(len(ui.effect.frames) + 1)

        SoziAction.__init__(self,
            "Remove frame " + new_frame_number,
            "Recreate frame " + new_frame_number)
        
        self.ui = ui
        self.free = free
                            

    def do(self):
        """
        Create a new frame and select it in the frame list.
        """

        self.ui.fill_form(None)

        if not self.free and self.ui.effect.selected_element is not None:
            self.ui.frame_fields["refid"].set_value(self.ui.effect.selected_element.attrib["id"])
        
        frame = self.ui.effect.create_new_frame()
        for field in self.ui.frame_fields.itervalues():
            value = field.get_value()
            if value is not None:
                frame.set(field.ns_attr, value)

        self.ui.effect.add_frame(frame)
        self.ui.append_frame_title(-1)
        self.ui.select_index(-1)


    def undo(self):        
        """
        Remove the created frame and select the previously selected frame.
        """
        self.ui.remove_last_frame_title()
        self.ui.effect.delete_frame(-1)
       

class SoziDeleteAction(SoziAction):
    """
    A wrapper for a frame delete action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame delete action.
            - ui: an instance of SoziUI
        """
        index = ui.get_selected_index()

        SoziAction.__init__(self,
            "Restore frame " + str(index + 1),
            "Remove frame " + str(index + 1))
        
        self.ui = ui
        self.index = index
        self.frame = ui.effect.frames[index]
        
        self.row = self.ui.frame_store.get(self.ui.frame_store.get_iter(index), 0, 1)


    def do(self):
        """
        Remove the current frame and select the next one in the frame list.
        """
        self.ui.effect.delete_frame(self.index)
        self.ui.remove_frame_title(self.index)
        # If the removed frame was the last, and if the frame list is not empty,
        # select the last frame
        if self.index > 0 and self.index >= len(self.ui.effect.frames):
            self.ui.select_index(-1)


    def undo(self):        
        """
        Add the removed frame and select it.
        """
        self.ui.effect.insert_frame(self.index, self.frame)
        self.ui.insert_row(self.index, self.row)


class SoziDuplicateAction(SoziAction):
    """
    A wrapper for a frame creation action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame creation action.
            - ui: an instance of SoziUI
        """

        # The new frame is a copy of the currently selected frame
        self.index = ui.get_selected_index()

        # The new frame will be added at the end of the presentation
        new_frame_number = str(len(ui.effect.frames) + 1)

        SoziAction.__init__(self,
            "Remove frame " + new_frame_number,
            "Duplicate frame " + str(self.index + 1))
        
        self.ui = ui
        
        self.frame = ui.effect.create_new_frame()
        
        for field in ui.frame_fields.itervalues():
            value = field.get_value()
            if value is not None:
                self.frame.set(field.ns_attr, value)
                    

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


class SoziReorderAction(SoziAction):
    """
    A wrapper for a frame reordering action.
    """
    
    def __init__(self, ui, down):
        """
        Initialize a new frame reorder action.
            - ui: an instance of SoziUI
        """
        index = ui.get_selected_index()
        if down:
            index_other = index + 1
        else:
            index_other = index - 1

        SoziAction.__init__(self,
            "Move frame " + str(index_other + 1) + (" up" if down else " down"),
            "Move frame " + str(index + 1) + (" down" if down else " up"))
        
        self.ui = ui
        self.index = index
        self.index_other = index_other


    def move(self, first, second):
        # Swap frames in the document
        self.ui.effect.swap_frames(first, second)
        
        # Swap frame numbers in current and other rows
        iter_first = self.ui.frame_store.get_iter(first)
        iter_second = self.ui.frame_store.get_iter(second)
        
        self.ui.frame_store.set(iter_first, 0, second + 1)
        self.ui.frame_store.set(iter_second, 0, first + 1)

        # Move selected row
        if first < second:
            self.ui.frame_store.move_after(iter_first, iter_second)
        else:
            self.ui.frame_store.move_before(iter_first, iter_second)
        
        self.ui.list_view.scroll_to_cell(second)
        
        # Update up/down button sensitivity
        self.ui.set_button_state("up-button", second > 0)
        self.ui.set_button_state("down-button", second < len(self.ui.effect.frames) - 1)

        
    def do(self):
        """
        Swap current frame and next/previous frame.
        """
        self.move(self.index, self.index_other)


    def undo(self):        
        """
        Swap frames back.
        """
        self.move(self.index_other, self.index)
        self.ui.select_index(self.index)


    def redo(self):        
        """
        Swap frames again.
        """
        self.do()
        self.ui.select_index(self.index_other)


class SoziUI:
    """
    The user interface of Sozi.
    """
    
    def __init__(self, effect):
        """
        Create a new window with the frame edition form.
            - effect: the effect instance given by Inkscape
        """
        
        self.effect = effect
        self.undo_stack = []
        self.redo_stack = []
        
        self.builder = gtk.Builder()
        self.builder.add_from_file("sozi.glade")
        
        self.builder.connect_signals({
            "on_sozi_window_destroy":           self.on_destroy,
            "on_sozi_window_key_press_event":   self.on_key_press,
            "on_undo_button_clicked":           self.on_undo,
            "on_redo_button_clicked":           self.on_redo,
            "on_duplicate_button_clicked":      self.on_duplicate_frame,
            "on_new_button_clicked":            self.on_create_new_frame,
            "on_new_frame_item_activate":       self.on_create_new_frame,
            "on_new_free_frame_item_activate":  self.on_create_new_free_frame,
            "on_delete_button_clicked":         self.on_delete_frame,
            "on_up_button_clicked":             self.on_move_frame_up,
            "on_down_button_clicked":           self.on_move_frame_down,
            "on_refid_clear_button_clicked":    self.on_clear_refid,
            "on_refid_set_button_clicked":      self.on_set_refid,
            "on_ok_button_clicked":             gtk.main_quit,
            "on_cancel_button_clicked":         self.on_full_undo
        })
        
        self.list_view = self.builder.get_object("frame-tree-view")
        self.frame_store = self.list_view.get_model()
        
        selection = self.list_view.get_selection()
        selection.set_mode(gtk.SELECTION_SINGLE)
        selection.set_select_function(self.on_selection_changed)

        new_button = self.builder.get_object("new-button")
        new_button.set_arrow_tooltip_text("Create a new frame or layer view")
        
        if effect.selected_element is not None:
            # The tooltip of the "new" button will show the tag of the SVG element
            # selected in Inkscape, removing the namespace URI if present 
            selected_tag = re.sub("{.*}", "", effect.selected_element.tag)
            tooltip_text = "Create a new frame using the selected '" + selected_tag + "'"
            
            new_button.set_tooltip_text(tooltip_text)
            
            new_frame_item = self.builder.get_object("new-frame-item")
            new_frame_item.set_sensitive(True)
            new_frame_item.set_tooltip_text(tooltip_text)            
        else:
            new_button.set_tooltip_text("Create a new frame with no SVG element")

        if effect.selected_element is not None:
            self.builder.get_object("refid-set-button").set_tooltip_text("Set the boundaries of this frame to the selected '" + selected_tag + "'")

        if effect.selected_element is not None and "id" in effect.selected_element.attrib:
            selected_id = effect.selected_element.attrib["id"]
        else:
            selected_id = None

        self.frame_fields = {
            "title": SoziTextField(self, "title", "New frame"),
            "refid": SoziTextField(self, "refid", selected_id, optional=True),
            "hide": SoziToggleField(self, "hide", "true"),
            "clip": SoziToggleField(self, "clip", "true"),
            "timeout-enable": SoziToggleButtonField(self, "timeout-enable", "Enabled", "Disabled", "false"),
            "timeout-ms": SoziSpinButtonField(self, "timeout-ms", 5, factor=1000),
            "transition-duration-ms": SoziSpinButtonField(self, "transition-duration-ms", 1, factor=1000),
            "transition-zoom-percent": SoziSpinButtonField(self, "transition-zoom-percent", 0),
            "transition-profile": SoziComboField(self, "transition-profile", "linear")
        }

        # Force the size of the tree view so that the tool bar is completely visible.
        # This statement also attempts to show the entire frame edition form.
        self.builder.get_object("frame-tree-view").set_size_request(
            new_button.get_allocation().width * len(self.builder.get_object("frame-list-toolbar").get_children()),
            self.builder.get_object("frame-form").get_allocation().height
        )

        # If an element is selected in Inkscape, and if it corresponds to
        # one or more existing frames, select the first matching frame.
        # If no element is selected in Inkscape, if at least one frame exists
        # in the document, select the first frame.
        selected_frame = None
        
        if effect.selected_element is not None:
            refid_attr = inkex.addNS("refid", "sozi")
            for f in effect.frames:
                if refid_attr in f.attrib and f.attrib[refid_attr] == effect.selected_element.attrib["id"]:
                    selected_frame = f
                    break
        elif len(effect.frames) > 0:
            selected_frame = effect.frames[0]
        
        # Fill frame list
        for i in range(len(effect.frames)):
            self.append_frame_title(i)

        # Select current frame in frame list and fill form
        if selected_frame is not None:
            index = effect.frames.index(selected_frame)
            self.list_view.get_selection().select_path((index,))
            self.list_view.scroll_to_cell(index)
        else:
            self.fill_form(None)
        
        gtk.main()
        

    def get_markup_title(self, frame):
        # Get the title of the frame
        title_attr = inkex.addNS("title", "sozi")
        if title_attr in frame.attrib:
            title = frame.attrib[title_attr]
        else:
            title = ""

        # The markup will show whether the current frame has a corresponding SVG element
        # or corresponds to the selected object in Inkscape
        refid_attr = inkex.addNS("refid", "sozi")
        if refid_attr not in frame.attrib:
            title = "<i>" + title + "</i>"
        elif self.effect.selected_element is not None and frame.attrib[refid_attr] == self.effect.selected_element.attrib["id"]:
            title = "<b>" + title + "</b>"

        return title


    def append_frame_title(self, index):
        """
        Append the title of the frame at the given index to the frame list view.
        This method is used when filling the list view initially or when creating
        a new frame.
        """
        # A negative index is counted back from the end of the frame list.
        # This is not needed for Python arrays, but we need to show the correct
        # frame number in the list view.
        if (index < 0):
            index += len(self.effect.frames)
        self.frame_store.append([index + 1, self.get_markup_title(self.effect.frames[index])])


    def insert_row(self, index, row):
        """
        Insert a row in the frame list view.
        This method is used when undoing a frame deletion.
        """
        self.frame_store.insert(index, row)

        # Renumber frames in list view
        for i in range(index + 1, len(self.effect.frames)):
            self.frame_store.set(self.frame_store.get_iter(i), 0, i + 1)

        # Select the inserted frame
        self.select_index(index)


    def remove_last_frame_title(self):
        """
        Remove the title of the last frame in the list view.
        This method is used when undoing the creation of a new frame.
        """
        self.frame_store.remove(self.frame_store.get_iter(len(self.effect.frames) - 1))

     
    def remove_frame_title(self, index):
        """
        Remove the title of the frame at the given index from the list view.
        This method is used when deleting a frame.
        """
        iter = self.frame_store.get_iter(index)
        if self.frame_store.remove(iter):
            self.list_view.get_selection().select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.effect.frames)):
                self.frame_store.set(self.frame_store.get_iter(i), 0, i + 1)
        else:
            self.fill_form(None)


    def fill_form(self, frame):
        """
        Fill all fields with the values of the attributes of the given frame.
        """
        for field in self.frame_fields.itervalues():
            field.set_with_frame(frame)

        self.set_button_state("duplicate-button", frame is not None)
        self.set_button_state("delete-button", frame is not None)

        refid_attr = inkex.addNS("refid", "sozi")
        self.set_button_state("refid-set-button",
            frame is not None and
            self.effect.selected_element is not None and
            "id" in self.effect.selected_element.attrib and
            (not refid_attr in frame.attrib or
            self.effect.selected_element.attrib["id"] != frame.attrib[refid_attr]))
        self.set_button_state("refid-clear-button",
            frame is not None and
            refid_attr in frame.attrib)


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
        self.do_action(SoziCreateAction(self, free=False))


    def on_create_new_free_frame(self, widget):
        """
        Event handler: click on button "create new frame".
        """
        self.do_action(SoziCreateAction(self, free=True))


    def on_delete_frame(self, widget):
        """
        Event handler: click on button "Delete frame".
        """
        self.do_action(SoziDeleteAction(self))


    def on_duplicate_frame(self, widget):
        """
        Event handler: click on button "Duplicate frame"
        """
        self.do_action(SoziDuplicateAction(self))


    def on_move_frame_up(self, widget):
        """
        Event handler: click on button "Move frame up".
        """
        self.do_action(SoziReorderAction(self, False))
        

    def on_move_frame_down(self, widget):
        """
        Event handler: click on button "Move frame down".
        """
        self.do_action(SoziReorderAction(self, True))


    def on_set_refid(self, widget):
        """
        Event handler: click on button "Set".
        """
        self.frame_fields["refid"].set_value(self.effect.selected_element.attrib["id"])
        self.frame_fields["refid"].write_if_needed()


    def on_clear_refid(self, widget):
        """
        Event handler: click on button "Clear".
        """
        self.frame_fields["refid"].set_value(None)
        self.frame_fields["refid"].write_if_needed()

        
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
            self.set_button_state("up-button", False)
            self.set_button_state("down-button", False)
            self.set_button_state("delete-button", False)
        else:
            # If the selection change happens on a non-selected row
            # then the action is a selection
            index = path[0]
            frame = self.effect.frames[index]
            self.set_button_state("up-button", index > 0)
            self.set_button_state("down-button", index < len(self.effect.frames) - 1)
            self.set_button_state("delete-button", True)
        
        # Show the properties of the selected frame,
        # or default values if no frame is selected.
        self.fill_form(frame)
        
        # Success: highlight or clear the affected row in the frame list
        return True


    def on_key_press(self, widget, event):
        if event.state & gtk.gdk.CONTROL_MASK:
            if event.keyval == gtk.keysyms.z:
                self.builder.get_object("sozi-window").set_focus(None)
                self.on_undo()
            elif event.keyval == gtk.keysyms.y:
                self.on_redo()


    def do_action(self, action):
        """
        Execute the given action and push it to the undo stack.
        The redo stack is emptied.
        """
        action.do()
        self.undo_stack.append(action)
        self.redo_stack = []
        self.finalize_action(action)


    def on_undo(self, widget=None):
        """
        Event handler: click on button "Undo".
        Undo the action at the top of the undo stack and push it to the redo stack.
        """
        if self.undo_stack:
            action = self.undo_stack.pop()
            self.redo_stack.append(action)
            action.undo()
            self.finalize_action(action)


    def on_full_undo(self, widget=None):
        """
        Event handler: click on button "Cancel".
        Undo all actions.
        """
        while self.undo_stack:
            self.on_undo()
        gtk.main_quit()


    def on_redo(self, widget=None):
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
        if isinstance(action, SoziFieldAction):
            if action.field is self.frame_fields["title"]:
                index = self.effect.frames.index(action.frame)
                self.frame_store.set(self.frame_store.get_iter(index), 1, action.frame.get(action.field.ns_attr))
            elif action.field is self.frame_fields["refid"]:
                # Update markup in frame list
                index = self.effect.frames.index(action.frame)
                self.frame_store.set(self.frame_store.get_iter(index), 1, self.get_markup_title(action.frame))
                
                # Update "set" and "clear" buttons
                refid_attr = inkex.addNS("refid", "sozi")
                self.set_button_state("refid-set-button",
                    self.effect.selected_element is not None and
                    "id" in self.effect.selected_element.attrib and
                    (not refid_attr in action.frame.attrib or
                    self.effect.selected_element.attrib["id"] != action.frame.attrib[refid_attr]))
                self.set_button_state("refid-clear-button", refid_attr in action.frame.attrib)
        
        # Update the status of the "Undo" button 
        if self.undo_stack:
            self.set_button_state("undo-button", True, self.undo_stack[-1].undo_description)
        else:
            self.set_button_state("undo-button", False, "No action to undo")
        
        # Update the status of the "Redo" button 
        if self.redo_stack:
            self.set_button_state("redo-button", True, self.redo_stack[-1].redo_description)
        else:
            self.set_button_state("redo-button", False, "No action to redo")

        # Update the status of the "Apply" button
        self.set_button_state("ok-button", bool(self.undo_stack))


    def set_button_state(self, key, sensitive, tooltip_text=None):
        button = self.builder.get_object(key)
        button.set_sensitive(sensitive)
        if tooltip_text is not None:
            button.set_tooltip_text(tooltip_text)


    def on_destroy(self, widget):
        """
        Event handler: close the Sozi window.
        """
        gtk.main_quit()


class Sozi(inkex.Effect):

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []
        self.selected_element = None
        

    def effect(self):
        sozi_upgrade.upgrade_or_install(self)

        if len(self.selected) > 0 and "id" in self.selected.values()[0].attrib:
            self.selected_element = self.selected.values()[0]

        self.analyze_document()
        self.ui = SoziUI(self)


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

