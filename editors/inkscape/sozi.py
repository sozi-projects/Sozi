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

import re

import sozi_upgrade


class SoziField:
    """
    A field is a wrapper for a GTK input control mapped to a Sozi frame attribute.
    Provide a subclass of SoziField for each type of GTK control.
    """

    def __init__(self, parent, attr, label, container_widget, input_widget, default_value, optional, focus_events=True):
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
        self.optional = optional
        
        if default_value is None:
            self.default_value = None
        else:
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
        if frame is not None and self.ns_attr in frame["frame_element"].attrib:
            self.last_value = frame["frame_element"].attrib[self.ns_attr]
        elif self.optional:
            self.last_value = None
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)
        self.input_widget.set_sensitive(frame is not None)


    def on_focus_out(self, widget, event=None):
        """
        Event handler, called each time the current field loses focus.
        """
        self.write_if_needed()


class SoziLabelField(SoziField):
    """
    A wrapper for a GTK Label mapped to a Sozi frame attribute
    """

    def __init__(self, parent, attr, label, default_value, optional=False):
        """
        Initialize a new label field.
        See class SoziField for initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(spacing=5), gtk.Label(), default_value, optional)
        self.container_widget.pack_start(gtk.Label(label), expand=False)
        self.container_widget.pack_start(self.input_widget)
        self.input_widget.set_justify(gtk.JUSTIFY_LEFT)


    def set_value(self, value):
        if value is None:
            self.input_widget.set_text("(undefined)")
        else:
            self.input_widget.set_text(value)


    def get_value(self):
        value = self.input_widget.get_text()
        if value == "(undefined)":
            return None
        else:
            return unicode(value)


class SoziTextField(SoziField):
    """
    A wrapper for a GTK Entry mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, default_value, width=0, optional=False):
        """
        Initialize a new text field.
        See class SoziField for initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(spacing=5), gtk.Entry(), default_value, optional)
        self.container_widget.pack_start(gtk.Label(label), expand=False)
        self.container_widget.pack_start(self.input_widget)

        if width > 0:
            self.input_widget.set_width_chars(width)


    def set_value(self, value):
        self.input_widget.set_text(value)


    def get_value(self):
        return unicode(self.input_widget.get_text())


class SoziComboField(SoziField):
    """
    A wrapper for a GTK ComboBox with text items mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, items, default_value, optional=False):
        """
        Initialize a new combo field.
            - items: the list of items in the combo box
        See class SoziField for other initializer arguments.
        """
        SoziField.__init__(self, parent, attr, label, gtk.HBox(spacing=5), gtk.combo_box_new_text(), default_value, optional, focus_events=False)
        self.items = items  
        for text in items:
            self.input_widget.append_text(text)
        self.container_widget.pack_start(gtk.Label(label), expand=False)
        self.container_widget.pack_start(self.input_widget)

      
    def set_value(self, value):
        self.input_widget.set_active(self.items.index(value))

    
    def get_value(self):
        return unicode(self.items[self.input_widget.get_active()])
        
        
class SoziCheckButtonField(SoziField):
    """
    A wrapper for a GTK CheckButton mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, default_value, optional=False):
        """
        Initialize a new check button field.
        See class SoziField for initializer arguments.
        """
        button = gtk.CheckButton(label)
        SoziField.__init__(self, parent, attr, label, button, button, default_value, optional)


    def set_value(self, value):
        self.input_widget.set_active(value == "true")


    def get_value(self):
        return unicode("true" if self.input_widget.get_active() else "false")
    
    
class SoziSpinButtonField(SoziField):
    """
    A wrapper for a GTK SpinButton mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, label, min_value, max_value, default_value, factor=1, digits=0, increments=1, optional=False):
        """
        Initialize a new spin button field.
            - label: label for the field
            - min_value: the minimum float value for the current field
            - max_value: the maximum float value for the current field
            - default_value: the default_value
            - factor : eg: factor 1000 -> comboBox=1.3s ; sozi_svg=1300
            - decimals: number of decimals to display, eg: 2=> 1.00 or 0=> 1
            - increments: step between 2 number when clic left on a arrow.
        See class SoziField for other initializer arguments.
        """
        factor = float(factor)
        min_value = min_value * factor
        max_value = max_value * factor
        default_value = default_value * factor

        SoziField.__init__(self, parent, attr, label, gtk.HBox(spacing=5), gtk.SpinButton(digits=digits), default_value, optional)
        self.input_widget.set_range(min_value, max_value)
        # def set_increments(step, page)
        # step :    increment applied for each left mousebutton press.
        # page :     increment applied for each middle mousebutton press.
        self.input_widget.set_increments(increments, increments * 10)
        self.input_widget.set_numeric(True)
        self.container_widget.pack_start(gtk.Label(label), expand=False)
        self.container_widget.pack_start(self.input_widget)
        self.factor = factor


    def set_value(self, value):
        self.input_widget.set_value(float(value) / self.factor)


    def get_value(self):
        return unicode(float(self.input_widget.get_value()) * self.factor)


    def on_focus_out(self, widget, event=None):
        self.input_widget.update()
        SoziField.on_focus_out(self, widget, event)


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
            del self.frame["frame_element"].attrib[self.field.ns_attr]
        else:
            self.frame["frame_element"].set(self.field.ns_attr, self.value)


    def undo(self):
        """
        Restore the previous value of the field in the frame and in the UI.
        If needed, select the frame that was active when the field was modified.
        """
        if self.last_value is None:
            del self.frame["frame_element"].attrib[self.field.ns_attr]
        else:
            self.frame["frame_element"].set(self.field.ns_attr, self.last_value)
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
                            

    def do(self):
        """
        Create a new frame and select it in the frame list.
        """

        self.ui.fill_form(None)
        # The new frame is a copy of the currently selected frame
        
        frame = self.ui.effect.create_new_frame(None)
        for field in self.ui.frame_fields.itervalues():
            frame["frame_element"].set(field.ns_attr, field.get_value())
            
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
        
        model = self.ui.list_view.get_model()
        self.row = model.get(model.get_iter(index), 0, 1, 2)


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
        self.frame = ui.effect.create_new_frame(self.index)
        for field in ui.frame_fields.itervalues():
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
        model = self.ui.list_view.get_model()
        iter_first = model.get_iter(first)
        iter_second = model.get_iter(second)
        
        model.set(iter_first, 0, second + 1)
        model.set(iter_second, 0, first + 1)

        # Move selected row
        if first < second:
            model.move_after(iter_first, iter_second)
        else:
            model.move_before(iter_first, iter_second)
        
        self.ui.list_view.scroll_to_cell(second)
        
        # Update up/down button sensitivity
        self.ui.up_button.set_sensitive(second > 0)
        self.ui.down_button.set_sensitive(second < len(self.ui.effect.frames) - 1)

        
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
        
        # window
        self.window = gtk.Window(gtk.WINDOW_TOPLEVEL)
        self.window.connect("destroy", self.on_destroy)
        self.window.connect("key-press-event", self.on_key_press)
        self.window.set_title("Sozi")
        self.window.set_icon_from_file(__file__ + ".png")
        self.window.set_border_width(5)
        
        # window > vbox
        vbox = gtk.VBox(spacing=5)
        self.window.add(vbox)

        # window > vbox > tool_bar
        tool_bar = gtk.Toolbar()
        vbox.pack_start(tool_bar)
        tool_bar.set_style(gtk.TOOLBAR_ICONS)
        tool_bar.set_icon_size(gtk.ICON_SIZE_SMALL_TOOLBAR)

        # window > vbox > tool_bar > undo_button
        self.undo_button = gtk.ToolButton(gtk.STOCK_UNDO)
        tool_bar.add(self.undo_button)
        self.undo_button.set_sensitive(False)
        self.undo_button.set_label("Annuler")
        self.undo_button.connect("clicked", self.on_undo)

        # window > vbox > tool_bar > redo_button
        self.redo_button = gtk.ToolButton(gtk.STOCK_REDO)
        tool_bar.add(self.redo_button)
        self.redo_button.set_sensitive(False)
        self.redo_button.connect("clicked", self.on_redo)
       
        # window > vbox > hpaned
        hpaned = gtk.HPaned()
        vbox.add(hpaned)

        # window > vbox > hpaned > left_pane
        left_pane = gtk.Frame()
        hpaned.pack1(left_pane, resize=True)
        frame_list_label = gtk.Label("<b>Frame list</b>")
        frame_list_label.set_use_markup(True) # enable bold with <b>
        left_pane.set_label_widget(frame_list_label)

        # window > vbox > hpaned > left_pane > left_pane_content
        left_pane_content = gtk.VBox(spacing=0)
        left_pane.add(left_pane_content)

        # window > vbox > hpaned > left_pane > left_pane_content > list_scroll
        list_scroll = gtk.ScrolledWindow()
        left_pane_content.pack_start(list_scroll, expand=True, fill=True)
        list_scroll.set_policy(gtk.POLICY_NEVER, gtk.POLICY_AUTOMATIC)	

        # window > vbox > hpaned > left_pane > left_pane_content > list_scroll > list_view
        store = gtk.ListStore(int, str, str)
        self.list_view = gtk.TreeView(store)
        list_scroll.add(self.list_view)

        selection = self.list_view.get_selection()
        selection.set_mode(gtk.SELECTION_SINGLE) # TODO multiple selection
        selection.set_select_function(self.on_selection_changed)

        list_renderer = gtk.CellRendererText()
        list_renderer.set_property("background", "white")

        # window > vbox > hpaned > left_pane > left_pane_content > list_scroll > list_view > sequence_column
        sequence_column = gtk.TreeViewColumn("Seq.", list_renderer, text=0, foreground=2)
        self.list_view.append_column(sequence_column)

        # window > vbox > hpaned > left_pane > left_pane_content > list_scroll > list_view > title_column
        title_column = gtk.TreeViewColumn("Title", list_renderer, text=1, foreground=2)
        self.list_view.append_column(title_column)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar
        list_tool_bar = gtk.Toolbar()
        left_pane_content.pack_end(list_tool_bar, expand=False)
        list_tool_bar.set_icon_size(1)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > new_button
        self.new_button = gtk.MenuToolButton(gtk.STOCK_ADD)
        list_tool_bar.add(self.new_button)

        # TODO set tooltip and sensitivity for layers
        self.new_button.set_arrow_tooltip_text("Create a new frame or layer view")
        self.new_button.connect("clicked", self.on_create_new_frame)
        if effect.selected_element is not None:
            # The tooltip of the "new" button will show the tag of the SVG element
            # selected in Inkscape, removing the namespace URI if present 
            selected_tag = re.sub("{.*}", "", effect.selected_element.tag)
            self.new_button.set_tooltip_text("Create a new frame using the selected '" + selected_tag + "'")
        else:
            # This button is disabled if no element is selected in Inkscape
            self.new_button.set_sensitive(False)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > new_button > new_menu
        new_menu = gtk.Menu()
        self.new_button.set_menu(new_menu)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > new_button > new_menu > items
        # TODO add other items
        new_menu.append(gtk.MenuItem("New frame"))
        new_menu.show_all()

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > delete_button
        self.delete_button = gtk.ToolButton()
        list_tool_bar.add(self.delete_button)
        self.delete_button.set_tooltip_text("Delete the current frame")
        self.delete_button.set_stock_id(gtk.STOCK_REMOVE)
        self.delete_button.connect("clicked", self.on_delete_frame)
        self.delete_button.set_sensitive(False)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > duplicate_button
        self.duplicate_button = gtk.ToolButton()
        list_tool_bar.add(self.duplicate_button)
        self.duplicate_button.set_tooltip_text("Duplicate the current frame")
        self.duplicate_button.set_stock_id(gtk.STOCK_COPY)
        self.duplicate_button.connect("clicked", self.on_duplicate_frame)
        self.duplicate_button.set_sensitive(False)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > up_button
        self.up_button = gtk.ToolButton()
        list_tool_bar.add(self.up_button)
        self.up_button.set_tooltip_text("Move the current frame up")
        self.up_button.set_stock_id(gtk.STOCK_GO_UP)
        self.up_button.connect("clicked", self.on_move_frame_up)
        self.up_button.set_sensitive(False)

        # window > vbox > hpaned > left_pane > left_pane_content > list_tool_bar > down_button
        self.down_button = gtk.ToolButton()
        list_tool_bar.add(self.down_button)
        self.down_button.set_tooltip_text("Move the current frame down")
        self.down_button.set_stock_id(gtk.STOCK_GO_DOWN)
        self.down_button.connect("clicked", self.on_move_frame_down)
        self.down_button.set_sensitive(False)

        # window > vbox > right_pane
        right_pane = gtk.VBox(spacing=5)
        hpaned.pack2(right_pane)

        # window > vbox > right_pane > frame_group
        frame_group = gtk.Frame()
        right_pane.pack_start(frame_group, expand=False)
        frame_label = gtk.Label("<b>Frame properties</b>")
        frame_label.set_use_markup(True) # enable bold with <b>
        frame_group.set_label_widget(frame_label)

        # window > vbox > right_pane > frame_group > frame_box
        frame_box = gtk.VBox(spacing=0)
        frame_group.add(frame_box)

        if effect.selected_element is not None and "id" in effect.selected_element.attrib:
            selected_id = effect.selected_element.attrib["id"]
        else:
            selected_id = None

        # window > vbox > right_pane > frame_group > frame_box > frame_fields
        self.frame_fields = {
            "refid": SoziLabelField(self, "refid", "SVG element", selected_id, optional=True),
            "title": SoziTextField(self, "title", "Title", "New frame", width=30),
            "hide": SoziCheckButtonField(self, "hide", "Hide", "true"),
            "clip": SoziCheckButtonField(self, "clip", "Clip", "true"),
            "timeout-enable": SoziCheckButtonField(self, "timeout-enable", "Timeout enable", "false"),
            "timeout-ms": SoziSpinButtonField(self, "timeout-ms", "Timeout (s)", 0, 3600, 5, factor=1000, digits=2, increments=0.2),
            "transition-duration-ms": SoziSpinButtonField(self, "transition-duration-ms", "Duration (s)", 0, 3600, 1, factor=1000, digits=2, increments=0.1),
            "transition-zoom-percent": SoziSpinButtonField(self, "transition-zoom-percent", "Zoom (%)", -100, 100, 0, increments=5),
            "transition-profile": SoziComboField(self, "transition-profile", "Profile", SoziUI.PROFILES, SoziUI.PROFILES[0])
        }

        frame_box.pack_start(self.frame_fields["refid"].container_widget, expand=False)
        frame_box.pack_start(self.frame_fields["title"].container_widget, expand=False)
        frame_box.pack_start(self.frame_fields["hide"].container_widget, expand=False)
        frame_box.pack_start(self.frame_fields["clip"].container_widget, expand=False)
        frame_box.pack_start(self.frame_fields["timeout-enable"].container_widget, expand=False)
        frame_box.pack_start(self.frame_fields["timeout-ms"].container_widget, expand=False)
        
        # window > vbox > right_pane > frame_group > frame_box > frame_fields["refid"] > refid_set_button
        self.refid_set_button = gtk.Button("Set")
        self.frame_fields["refid"].container_widget.pack_end(self.refid_set_button);
        if effect.selected_element is not None:
            self.refid_set_button.set_tooltip_text("Set the boundaries of this frame to the selected '" + selected_tag + "'")
        self.refid_set_button.set_sensitive(False)
        self.refid_set_button.connect("clicked", self.on_set_refid)
        
        # window > vbox > right_pane > frame_group > frame_box > frame_fields["refid"] > refid_clear_button
        self.refid_clear_button = gtk.Button("Clear")
        self.frame_fields["refid"].container_widget.pack_end(self.refid_clear_button);
        self.refid_clear_button.set_tooltip_text("Remove the reference to the boundary element for this frame")
        self.refid_clear_button.set_sensitive(False)
        self.refid_clear_button.connect("clicked", self.on_clear_refid)
        
        # window > vbox > right_pane > transition_group
        transition_group = gtk.Frame("Transition")
        right_pane.pack_start(transition_group, expand=False)
        transition_label = gtk.Label("<b>Transition</b>")
        transition_label.set_use_markup(True) # enable bold with <b>
        transition_group.set_label_widget(transition_label)

        # window > vbox > right_pane > transition_group > transition_box
        transition_box = gtk.VBox(spacing=5)
        transition_group.add(transition_box)
        transition_box.pack_start(self.frame_fields["transition-duration-ms"].container_widget, expand=False)
        transition_box.pack_start(self.frame_fields["transition-zoom-percent"].container_widget, expand=False)
        transition_box.pack_start(self.frame_fields["transition-profile"].container_widget, expand=False)

        # window > vbox > button_bar
        button_bar = gtk.HBox(spacing=10)
        vbox.add(button_bar)
        
        # window > vbox > button_bar > ok_button
        ok_button = gtk.Button(stock=gtk.STOCK_OK)#or Apply
        button_bar.pack_end(ok_button, False, False)
        ok_button.set_tooltip_text("Apply changes and go back to Inkscape")
        ok_button.connect("clicked", gtk.main_quit)

        # window > vbox > button_bar > cancel_button
        cancel_button = gtk.Button(stock=gtk.STOCK_CANCEL)
        button_bar.pack_end(cancel_button, False, False)
        cancel_button.set_tooltip_text("Cancel all changes and go back to Inkscape")
        cancel_button.connect("clicked", self.on_full_undo)

        # window > vbox > status_bar
        status_bar = gtk.Statusbar()
        vbox.pack_end(status_bar)
        #status_bar.push(status_bar.getContexteId("a"),"Etat initial")
        
        self.window.show_all()

        # This is a hack to force the toolbar at the bottom of the frame list to expand to its full size.
        # get_allocation() can only be called after the window is visible.
        title_column.set_min_width(self.new_button.get_allocation().width * len(list_tool_bar.get_children()))

        # If an element is selected in Inkscape, and if it corresponds to
        # one or more existing frames, select the first matching frame.
        # If no element is selected in Inkscape, if at least one frame exists
        # in the document, select the first frame.
        selected_frame = None
        
        if effect.selected_element is not None:
            for f in effect.frames:
                if f["svg_element"] is effect.selected_element:
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
        if frame["svg_element"] is self.effect.selected_element:
            color = "#ff0000"
        else:
            color = "#000000"

        self.list_view.get_model().append([index + 1, title, color])


    def insert_row(self, index, row):
        """
        Insert a row in the frame list view.
        This method is used when undoing a frame deletion.
        """
        model = self.list_view.get_model()
        model.insert(index, row)

        # Renumber frames in list view
        for i in range(index + 1, len(self.effect.frames)):
            model.set(model.get_iter(i), 0, i + 1)

        # Select the inserted frame
        self.select_index(index)


    def remove_last_frame_title(self):
        """
        Remove the title of the last frame in the list view.
        This method is used when undoing the creation of a new frame.
        """
        model = self.list_view.get_model()
        model.remove(model.get_iter(len(self.effect.frames) - 1))

     
    def remove_frame_title(self, index):
        """
        Remove the title of the frame at the given index from the list view.
        This method is used when deleting a frame.
        """
        model = self.list_view.get_model()
        iter = model.get_iter(index)
        if model.remove(iter):
            self.list_view.get_selection().select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.effect.frames)):
                model.set(model.get_iter(i), 0, i + 1)
        else:
            self.fill_form(None)


    def fill_form(self, frame):
        """
        Fill all fields with the values of the attributes of the given frame.
        """
        for field in self.frame_fields.itervalues():
            field.set_with_frame(frame)

        self.duplicate_button.set_sensitive(frame is not None )
        self.delete_button.set_sensitive(frame is not None)

        refid_attr = inkex.addNS("refid", "sozi")
        self.refid_set_button.set_sensitive(frame is not None and
            self.effect.selected_element is not None and
            "id" in self.effect.selected_element.attrib and
            (not refid_attr in frame["frame_element"].attrib or
            self.effect.selected_element.attrib["id"] != frame["frame_element"].attrib[refid_attr]))
        self.refid_clear_button.set_sensitive(frame is not None and
            refid_attr in frame["frame_element"].attrib)


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
        self.do_action(SoziDeleteAction(self))

    def on_duplicate_frame(self, widget):
        """
        
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


    def on_key_press(self, widget, event):
        if event.state & gtk.gdk.CONTROL_MASK:
            if event.keyval == gtk.keysyms.z:
                self.window.set_focus(None)
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
                model = self.list_view.get_model()
                model.set(model.get_iter(index), 1, action.frame["frame_element"].get(action.field.ns_attr))
            elif action.field is self.frame_fields["refid"]:
                refid_attr = inkex.addNS("refid", "sozi")
                self.refid_set_button.set_sensitive(self.effect.selected_element is not None and
                    "id" in self.effect.selected_element.attrib and
                    (not refid_attr in action.frame["frame_element"].attrib or
                    self.effect.selected_element.attrib["id"] != action.frame["frame_element"].attrib[refid_attr]))
                self.refid_clear_button.set_sensitive(refid_attr in action.frame["frame_element"].attrib)
        
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

    NS_URI = u"http://sozi.baierouge.fr"


    def __init__(self):
        inkex.Effect.__init__(self)
        inkex.NSS[u"sozi"] = Sozi.NS_URI

        self.frames = []
        self.selected_element = None
        

    def effect(self):
        sozi_upgrade.upgrade_or_install(self)

        if len(self.selected) > 0:
            self.selected_element = self.selected.values()[0]

        self.analyze_document()
        self.ui = SoziUI(self)


    def analyze_document(self):
        """
        Analyze the document and collect information about the presentation.
        Frames with no corresponding SVG element are removed.
        Frames numbers are updated if needed.
        
        FIXME this method currently does not support frames with layers
        """
        # Get list of valid frame elements and remove orphan frames
        refid_attr = inkex.addNS("refid", "sozi")
        self.frames = []
        for f in self.document.xpath("//sozi:frame", namespaces=inkex.NSS):
            if refid_attr in f.attrib:
                e = self.document.xpath("//svg:*[@id='" + f.attrib[refid_attr] + "']", namespaces=inkex.NSS)
                if len(e) == 0:
                    self.document.getroot().remove(f)
                else:
                    self.frames.append(
                        {
                            "frame_element": f,
                            "svg_element": e[0]
                        }
                    )
            else:
                # Frame elements with layers do not always contain a "refid" attribute.
                # FIXME add the frame only if it contains valid layer elements
                self.frames.append(
                    {
                        "frame_element": f,
                        "svg_element": None
                    }
                )

        # Sort frames by sequence attribute 
        sequence_attr = inkex.addNS("sequence", "sozi")
        self.frames = sorted(self.frames, key=lambda f:
            int(f["frame_element"].attrib[sequence_attr]) if sequence_attr in f["frame_element"].attrib else len(self.frames))

        # Renumber frames
        for i, f in enumerate(self.frames):
            f["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i + 1))


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
            svg_element = self.selected_element
            
        frame_element = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        frame_element.set(inkex.addNS("refid", "sozi"), svg_element.attrib["id"]) # TODO check namespace?
        frame_element.set(inkex.addNS("sequence", "sozi"), unicode(len(self.frames)+1))
        frame_element.set("id", self.uniqueId("frame" + unicode(len(self.frames)+1)))
        
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

    
    def insert_frame(self, index, frame):
        """
        Insert the given frame at the given index.
        """
        self.document.getroot().append(frame["frame_element"])
        self.frames.insert(index, frame)
        self.renumber_from_index(index)


    def delete_frame(self, index):
        """
        Remove the frame at the given index from the document.
        """
        self.document.getroot().remove(self.frames[index]["frame_element"])
        del self.frames[index]
        self.renumber_from_index(index)


    def renumber_from_index(self, index):
        if index >= 0:
            for i in range(index, len(self.frames)):
                self.frames[i]["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i + 1))


# Create effect instance
effect = Sozi()
effect.affect()
