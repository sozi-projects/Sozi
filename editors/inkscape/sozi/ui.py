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

import gettext
gettext.install("sozi", os.path.join(os.path.dirname(__file__), "lang"))
gettext.textdomain("sozi")

import pygtk
pygtk.require("2.0")
import gtk, gtk.glade

gtk.glade.bindtextdomain("sozi", os.path.join(os.path.dirname(__file__), "lang"))
gtk.glade.textdomain("sozi")

from version import *
from fields import *
from actions import *

import re


class SoziUserInterface:
    """
    The user interface of Sozi.
    """
    
    def __init__(self, effect):
        """
        Create a new window with the frame edition form.
            - effect: the effect instance given by Inkscape
        """
        
        self.effect = effect
        self.model = effect.model
        
        self.undo_stack = []
        self.redo_stack = []
        
        self.builder = gtk.Builder()
        self.builder.set_translation_domain("sozi")
        self.builder.add_from_file(os.path.join(os.path.dirname(__file__), "ui.glade"))
        
        self.builder.connect_signals({
            "on_sozi_window_destroy":           self.on_save,
            "on_sozi_window_key_press_event":   self.on_key_press,
            "on_undo_button_clicked":           self.on_undo,
            "on_redo_button_clicked":           self.on_redo,
            "on_duplicate_button_clicked":      self.on_duplicate_frame,
            "on_new_button_clicked":            self.on_create_new_frame,
            "on_new_frame_item_activate":       self.on_create_new_frame,
            "on_delete_button_clicked":         self.on_delete_frame_or_layer,
            "on_up_button_clicked":             self.on_move_frame_up,
            "on_down_button_clicked":           self.on_move_frame_down,
            "on_refid_icon_clicked":            self.on_set_clear_refid,
            "on_transition_path_icon_clicked":  self.on_set_clear_transition_path,
            "on_ok_button_clicked":             self.on_save,
            "on_cancel_button_clicked":         gtk.main_quit
        })
        
        self.builder.get_object("sozi-window").set_title("Sozi " + SOZI_VERSION)
        
        self.tree_view = self.builder.get_object("frame-tree-view")
        self.frame_store = self.tree_view.get_model()
        
        selection = self.tree_view.get_selection()
        selection.set_mode(gtk.SELECTION_SINGLE)
        selection.set_select_function(self.on_selection_changed)

        selected_ids_menu = self.builder.get_object("selection-menu")
        for id in self.model.selected_ids:
            selected_ids_menu_item = gtk.MenuItem(id)
            selected_ids_menu_item.connect("activate", self.on_activate_ids_menu_item)
            selected_ids_menu_item.show()
            selected_ids_menu.append(selected_ids_menu_item)
        
        new_button = self.builder.get_object("new-button")
        new_button.set_arrow_tooltip_text(_("Create a new frame or add a layer"))

        self.new_layer_items = {}
        
        for id, l in self.model.layer_labels.iteritems():
            new_layer_item = gtk.MenuItem(_("Add layer '{0}'").format(l))
            new_button.get_menu().append(new_layer_item)
            new_layer_item.show()
            new_layer_item.set_sensitive(False)
            new_layer_item.connect("activate", self.on_add_layer, id)
            self.new_layer_items[id] = new_layer_item

        profiles = ["linear", "accelerate", "strong-accelerate", "decelerate", "strong-decelerate",
            "accelerate-decelerate", "strong-accelerate-decelerate", "decelerate-accelerate", "strong-decelerate-accelerate",
            "immediate-beginning", "immediate-end", "immediate-middle"]
            
        self.frame_fields = {
            "id": SoziTextField(self, "id", ""),
            "title": SoziTextField(self, "title", _("New frame")),
            "show-in-frame-list": SoziToggleField(self, "show-in-frame-list", True),
            "timeout-enable": SoziToggleButtonField(self, "timeout-enable", _("Enabled"), _("Disabled"), False),
            "timeout-ms": SoziSpinButtonField(self, "timeout-ms", 5, factor=1000),
            "transition-duration-ms": SoziSpinButtonField(self, "transition-duration-ms", 1, factor=1000)
        }

        self.layer_fields = {
            "refid": SoziTextField(self, "refid", None, optional=True),
            "hide": SoziToggleField(self, "hide", True),
            "clip": SoziToggleField(self, "clip", True),
            "transition-zoom-percent": SoziSpinButtonField(self, "transition-zoom-percent", 0),
            "transition-profile": SoziComboField(self, "transition-profile", profiles, "linear"),
            "transition-path": SoziTextField(self, "transition-path", None, optional=True),
            "transition-path-hide": SoziToggleField(self, "transition-path-hide", True)
        }
        
        self.all_fields = self.frame_fields.copy()
        self.all_fields.update(self.layer_fields)
        
        # When these strings are set inside the Glade UI definition,
        # xgettext fails to include them in the pot file
        profile_store = self.builder.get_object("profile-store")
        profile_store.append([_("Constant speed")])
        profile_store.append([_("Speed up")])
        profile_store.append([_("Speed up (strong)")])
        profile_store.append([_("Speed down")])
        profile_store.append([_("Speed down (strong)")])
        profile_store.append([_("Speed up, then down")])
        profile_store.append([_("Speed up, then down (strong)")])
        profile_store.append([_("Speed down, then up")])
        profile_store.append([_("Speed down, then up (strong)")])
        profile_store.append([_("Immediate (beginning)")])
        profile_store.append([_("Immediate (end)")])
        profile_store.append([_("Immediate (middle)")])

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
        
        if self.model.has_selected_id():
            for f in self.model.frames:
                if f.refid in self.model.selected_ids:
                    selected_frame = f
                    break
        elif len(self.model.frames) > 0:
            selected_frame = self.model.frames[0]
        
        # Fill frame list
        for i in range(len(self.model.frames)):
            self.append_frame_tree(i)

        # Select current frame in frame list and fill form
        if selected_frame is not None:
            index = self.model.frames.index(selected_frame)
            self.tree_view.get_selection().select_path((index,))
            self.tree_view.scroll_to_cell(index)
        else:
            self.clear_form()
        
        gtk.main()
        

    def get_markup_title(self, frame):
        """
        Return a markup string with the title of the given frame.
        
        If the given frame has no associated SVG element, the title will be displayed in italics.
        If the given frame is associated to the SVG element selected in Inkscape, the title will
        be displayed in bold font.
        """
        if frame.refid is None:
            return "<i>" + frame.title + "</i>"
        elif frame.refid in self.model.selected_ids:
            return "<b>" + frame.title + "</b>"
        else:
            return frame.title


    def append_frame_tree(self, index):
        """
        Append the title and layers of the frame at the given index to the frame tree view.
        This method is used when filling the tree view initially or when creating a new frame.
        
        A negative index is counted back from the end of the frame list.
        """
        # Compute the actual index. This is not needed for Python arrays,
        # but we need to show the correct frame number in the list view.
        if (index < 0):
            index += len(self.model.frames)
        
        frame = self.model.frames[index]
        tree_iter = self.frame_store.append(None, [index + 1, self.get_markup_title(frame)])
        
        for l in frame.layers.itervalues():
            self.frame_store.append(tree_iter, ["", l.label])


    def insert_frame_tree(self, index):
        """
        Insert a frame in the frame list view.
        This method is used when undoing a frame deletion.
        """
        frame = self.model.frames[index]
        tree_iter = self.frame_store.insert(None, index, [index + 1, self.get_markup_title(frame)])
        
        for l in frame.layers.itervalues():
            self.frame_store.append(tree_iter, ["", l.label])

        self.renumber_from_index(index)


    def remove_last_frame_tree(self):
        """
        Remove the title of the last frame in the list view.
        This method is used when undoing the creation of a new frame.
        """
        self.frame_store.remove(self.frame_store.get_iter(len(self.model.frames) - 1))

     
    def remove_frame_tree(self, index):
        """
        Remove the title of the frame at the given index from the list view.
        This method is used when deleting a frame.
        """
        iter = self.frame_store.get_iter(index)
        if self.frame_store.remove(iter):
            self.tree_view.get_selection().select_iter(iter)
            self.renumber_from_index(index)
        else:
            self.clear_form()


    def renumber_from_index(self, index):
        for i in range(index, self.frame_store.iter_n_children(None)):
            self.frame_store.set(self.frame_store.get_iter(i), 0, i + 1)


    def insert_layer_tree(self, frame_index, group_id):
        """
        Insert a new row for a layer recently added to an existing frame.
        """
        frame = self.model.frames[frame_index]
        layer = frame.layers[group_id]
        
        layer_index = frame.layers.keys().index(group_id)
        frame_iter = self.frame_store.get_iter(frame_index)
        
        self.frame_store.insert(frame_iter, layer_index, ["", layer.label])


    def remove_layer_tree(self, frame_index, group_id):
        """
        Remove the title of the layer at the given index from the list view.
        This method is used when deleting a frame.
        """
        layer_index = self.model.frames[frame_index].layers.keys().index(group_id)
        iter = self.frame_store.get_iter((frame_index, layer_index))
        if self.frame_store.remove(iter):
            self.tree_view.get_selection().select_iter(iter)
        else:
            self.clear_form()


    def clear_form(self):
        """
        Fill all fields with default values.
        """
        for field in self.all_fields.itervalues():
            field.disable()

        self.set_button_state("duplicate-button", False)
        self.set_button_state("delete-button", False)
        
        refid_field = self.builder.get_object("refid-field")
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, False)
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, False)

        transition_path_field = self.builder.get_object("transition-path-field")
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, False)
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, False)


    def fill_form_with_frame(self, frame):
        """
        Fill all fields with the values of the attributes of the given frame.
        
        Precondition: frame is not None
        """
        for field in self.all_fields.itervalues():
            field.set_from(frame)

        self.set_button_state("duplicate-button", True)
        self.set_button_state("delete-button", True)

        self.builder.get_object("delete-button").set_tooltip_text(_("Delete the selected frame"))

        refid_field = self.builder.get_object("refid-field")
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(frame.refid))
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, frame.refid is not None)

        transition_path_field = self.builder.get_object("transition-path-field")
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(frame.transition_path))
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, frame.transition_path is not None)

    def fill_form_with_layer(self, layer):
        """
        Fill all fields with the values of the attributes of the given layer.
        
        Precondition: layer is not None
        """
        for field in self.frame_fields.itervalues():
            field.set_from(layer.frame, sensitive = False)

        for field in self.layer_fields.itervalues():
            field.set_from(layer)

        self.set_button_state("duplicate-button", False)
        self.set_button_state("delete-button", True)

        self.builder.get_object("delete-button").set_tooltip_text(_("Remove the selected layer"))

        refid_field = self.builder.get_object("refid-field")
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(layer.refid))
        refid_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, False)

        transition_path_field = self.builder.get_object("transition-path-field")
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(layer.transition_path))
        transition_path_field.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, False)


    def get_selected_frame_index(self):
        """
        Return the index of the currently selected frame.
        None is returned if no frame is selected.
        """
        selection = self.tree_view.get_selection()
        model, iter = selection.get_selected()
        if iter:
            return model.get_path(iter)[0]
        else:
            return None


    def get_selected_layer_id(self):
        """
        Return the index of the currently selected layer.
        None is returned if no layer is selected.
        """
        selection = self.tree_view.get_selection()
        model, iter = selection.get_selected()
        if iter:
            path = model.get_path(iter)
            if len(path) > 1:
                return self.model.frames[path[0]].layers.keys()[path[1]]
            else:
                return None
        else:
            return None


    def select_frame_at_index(self, index):
        """
        Select the frame at the given index.
        A negative index is counted back from the end of the frame list.
        """
        if (index < 0):
            index += len(self.model.frames)
        self.tree_view.get_selection().select_path((index,))
        self.tree_view.scroll_to_cell(index)

    
    def select_layer_with_id(self, frame_index, group_id):
        """
        Select the layer with the given id in the current frame.
        """
        layer_index = self.model.frames[frame_index].layers.keys().index(group_id)
        path = (frame_index, layer_index)
        self.tree_view.expand_to_path(path)
        self.tree_view.get_selection().select_path(path)
        self.tree_view.scroll_to_cell(path)


    def select_frame(self, frame):
        """
        Select the given frame in the frame list.
        """
        self.select_frame_at_index(self.model.frames.index(frame))
        

    def selected_item_is_a_frame(self):
        selection = self.tree_view.get_selection()
        model, iter = selection.get_selected()
        return iter is not None and len(model.get_path(iter)) == 1


    def selected_item_is_a_layer(self):
        selection = self.tree_view.get_selection()
        model, iter = selection.get_selected()
        return iter is not None and len(model.get_path(iter)) == 2


    def on_create_new_frame(self, widget):
        """
        Event handler: click on button "create new frame".
        """
        self.do_action(SoziCreateFrameAction(self))


    def on_add_layer(self, widget, id):
        """
        Event handler: add a layer to the current frame.
        """
        self.do_action(SoziAddLayerAction(self, id))


    def on_delete_frame_or_layer(self, widget):
        """
        Event handler: click on button "Delete frame or layer".
        """
        if self.selected_item_is_a_frame():
            self.do_action(SoziDeleteFrameAction(self))
        elif self.selected_item_is_a_layer():
            self.do_action(SoziDeleteLayerAction(self))


    def on_duplicate_frame(self, widget):
        """
        Event handler: click on button "Duplicate frame"
        """
        self.do_action(SoziDuplicateFrameAction(self))


    def on_move_frame_up(self, widget):
        """
        Event handler: click on button "Move frame up".
        """
        self.do_action(SoziReorderFramesAction(self, False))
        

    def on_move_frame_down(self, widget):
        """
        Event handler: click on button "Move frame down".
        """
        self.do_action(SoziReorderFramesAction(self, True))


    def show_selected_ids_menu(self, event, field_name):
        self.selected_ids_menu_target = field_name
        self.builder.get_object("selection-menu").popup(None, None, None, event.button, event.time)


    def on_set_clear_refid(self, widget, icon_pos, event):
        """
        Event handler: click on button "Paste" or "Clear" refid.
        """
        if icon_pos == gtk.ENTRY_ICON_PRIMARY:
            self.show_selected_ids_menu(event, "refid")
        elif icon_pos == gtk.ENTRY_ICON_SECONDARY:
            self.all_fields["refid"].set_value(None)
            self.all_fields["refid"].write_if_needed()
            

    def on_set_clear_transition_path(self, widget, icon_pos, event):
        """
        Event handler: click on button "Paste" or "Clear" transition path.
        """
        if icon_pos == gtk.ENTRY_ICON_PRIMARY:
            self.show_selected_ids_menu(event, "transition-path")
        elif icon_pos == gtk.ENTRY_ICON_SECONDARY:
            self.all_fields["transition-path"].set_value(None)
            self.all_fields["transition-path"].write_if_needed()
            

    def on_activate_ids_menu_item(self, item):
        field_name = self.selected_ids_menu_target
        self.all_fields[field_name].set_value(item.get_label())
        self.all_fields[field_name].write_if_needed()


    def on_selection_changed(self, path):
        """
        Event handler: selection changed in frame list view.
        This event can be triggered either due to a user action
        or due to a programmatic selection change.
        """
        if self.tree_view.get_selection().path_is_selected(path):
            # Disable all "Add layer" menu items
            for item in self.new_layer_items.itervalues():
                item.set_sensitive(False)

            # If the selection change happens on a selected row
            # then the action is a deselection
            self.clear_form()
            self.set_button_state("up-button", False)
            self.set_button_state("down-button", False)
        else:
            frame_index = path[0]
            frame = self.model.frames[frame_index]
            
            # Enable "Add layer" menu items for layers not present
            # in the selected frame
            for id, item in self.new_layer_items.iteritems():
                item.set_sensitive(id not in frame.layers)

            if len(path) == 1:
                # If the path contains one index, it references a frame
                self.fill_form_with_frame(frame)
                self.set_button_state("up-button", frame_index > 0)
                self.set_button_state("down-button", frame_index < len(self.model.frames) - 1)
            elif len(path) == 2:
                # If the path contains two indices, it references a layer
                layer_index = path[1]
                self.fill_form_with_layer(frame.layers.values()[layer_index])
                self.set_button_state("up-button", False)
                self.set_button_state("down-button", False)
        
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


    def on_save(self, widget=None):
        """
        Event handler: click on button "OK" or close window.
        Save document and exit
        """
        self.model.write()
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
        if isinstance(action, SoziFieldAction):
            # Update the title in the frame list if the "title" or "refid" field of a frame has changed.
            if action.field is self.all_fields["title"] or action.field is self.all_fields["refid"]:
                if isinstance(action.frame, SoziFrame):
                    index = self.model.frames.index(action.frame)
                    self.frame_store.set(self.frame_store.get_iter(index), 1, self.get_markup_title(action.frame))
                else:
                    index = self.model.frames.index(action.frame.frame)
                    self.frame_store.set(self.frame_store.get_iter(index), 1, self.get_markup_title(action.frame.frame))

            # Update "set" and "clear" buttons if the "refid" field of a frame has changed.
            if action.field is self.all_fields["refid"]:
                action.field.input_widget.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(action.frame.refid))
                action.field.input_widget.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, action.frame.refid is not None)

            # Update "set" and "clear" buttons if the "transition-path" field of a frame has changed.
            if action.field is self.all_fields["transition-path"]:
                action.field.input_widget.set_icon_sensitive(gtk.ENTRY_ICON_PRIMARY, self.model.has_other_selected_id(action.frame.transition_path))
                action.field.input_widget.set_icon_sensitive(gtk.ENTRY_ICON_SECONDARY, action.frame.transition_path is not None)
        
        # Update the status of the "Undo" button 
        if self.undo_stack:
            self.set_button_state("undo-button", True, self.undo_stack[-1].undo_description)
        else:
            self.set_button_state("undo-button", False, _("No action to undo"))
        
        # Update the status of the "Redo" button 
        if self.redo_stack:
            self.set_button_state("redo-button", True, self.redo_stack[-1].redo_description)
        else:
            self.set_button_state("redo-button", False, _("No action to redo"))

        # Update the status of the "Apply" button
        self.set_button_state("ok-button", bool(self.undo_stack))


    def set_button_state(self, key, sensitive, tooltip_text=None):
        button = self.builder.get_object(key)
        button.set_sensitive(sensitive)
        if tooltip_text is not None:
            button.set_tooltip_text(tooltip_text)


