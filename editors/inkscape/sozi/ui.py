
import os

import gettext
gettext.install("sozi", os.path.join(os.path.dirname(__file__), "lang"), unicode=1)

import pygtk
pygtk.require("2.0")
import gtk, gtk.glade

gtk.glade.bindtextdomain("sozi", os.path.join(os.path.dirname(__file__), "lang"))
gtk.glade.textdomain("sozi")

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
            "on_new_free_frame_item_activate":  self.on_create_new_free_frame,
            "on_delete_button_clicked":         self.on_delete_frame,
            "on_up_button_clicked":             self.on_move_frame_up,
            "on_down_button_clicked":           self.on_move_frame_down,
            "on_refid_clear_button_clicked":    self.on_clear_refid,
            "on_refid_set_button_clicked":      self.on_set_refid,
            "on_ok_button_clicked":             self.on_save,
            "on_cancel_button_clicked":         gtk.main_quit
        })
        
        self.list_view = self.builder.get_object("frame-tree-view")
        self.frame_store = self.list_view.get_model()
        
        selection = self.list_view.get_selection()
        selection.set_mode(gtk.SELECTION_SINGLE)
        selection.set_select_function(self.on_selection_changed)

        new_button = self.builder.get_object("new-button")
        new_button.set_arrow_tooltip_text(_("Create a new frame or add a layer"))
        
        if effect.selected_element is not None:
            # The tooltip of the "new" button will show the tag of the SVG element
            # selected in Inkscape, removing the namespace URI if present 
            selected_tag = re.sub("{.*}", "", effect.selected_element.tag)
            tooltip_text = _("Create a new frame using the selected '{0}'").format(selected_tag)
            
            new_button.set_tooltip_text(tooltip_text)
            
            new_frame_item = self.builder.get_object("new-frame-item")
            new_frame_item.set_sensitive(True)
            new_frame_item.set_tooltip_text(tooltip_text)            
        else:
            new_button.set_tooltip_text(_("Create a new frame with no SVG element"))

        if effect.selected_element is not None:
            self.builder.get_object("refid-set-button").set_tooltip_text(_("Set the boundaries of this frame to the selected '{0}'").format(selected_tag))

        if effect.selected_element is not None and "id" in effect.selected_element.attrib:
            selected_id = effect.selected_element.attrib["id"]
        else:
            selected_id = None
        
        profiles = ["linear", "accelerate", "strong-accelerate", "decelerate", "strong-decelerate",
            "accelerate-decelerate", "strong-accelerate-decelerate", "decelerate-accelerate", "strong-decelerate-accelerate"]
            
        self.frame_fields = {
            "title": SoziTextField(self, "title", _("New frame")),
            "refid": SoziTextField(self, "refid", selected_id, optional=True),
            "hide": SoziToggleField(self, "hide", True),
            "clip": SoziToggleField(self, "clip", True),
            "timeout-enable": SoziToggleButtonField(self, "timeout-enable", _("Enabled"), _("Disabled"), False),
            "timeout-ms": SoziSpinButtonField(self, "timeout-ms", 5, factor=1000),
            "transition-duration-ms": SoziSpinButtonField(self, "transition-duration-ms", 1, factor=1000),
            "transition-zoom-percent": SoziSpinButtonField(self, "transition-zoom-percent", 0),
            "transition-profile": SoziComboField(self, "transition-profile", profiles, "linear")
        }

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
            for f in self.model.frames:
                if f.refid == effect.selected_element.attrib["id"]:
                    selected_frame = f
                    break
        elif len(self.model.frames) > 0:
            selected_frame = self.model.frames[0]
        
        # Fill frame list
        for i in range(len(self.model.frames)):
            self.append_frame_title(i)

        # Select current frame in frame list and fill form
        if selected_frame is not None:
            index = self.model.frames.index(selected_frame)
            self.list_view.get_selection().select_path((index,))
            self.list_view.scroll_to_cell(index)
        else:
            self.fill_form(None)
        
        gtk.main()
        

    def get_markup_title(self, frame):
        # The markup will show whether the current frame has a corresponding SVG element
        # or corresponds to the selected object in Inkscape
        if frame.refid is None:
            return "<i>" + frame.title + "</i>"
        elif self.effect.selected_element is not None and frame.refid == self.effect.selected_element.attrib["id"]:
            return "<b>" + frame.title + "</b>"
        else:
            return frame.title


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
            index += len(self.model.frames)
        self.frame_store.append(None, [index + 1, self.get_markup_title(self.model.frames[index])])


    def insert_row(self, index, row):
        """
        Insert a row in the frame list view.
        This method is used when undoing a frame deletion.
        """
        self.frame_store.insert(None, index, row)

        # Renumber frames in list view
        for i in range(index + 1, len(self.model.frames)):
            self.frame_store.set(self.frame_store.get_iter(i), 0, i + 1)

        # Select the inserted frame
        self.select_index(index)


    def remove_last_frame_title(self):
        """
        Remove the title of the last frame in the list view.
        This method is used when undoing the creation of a new frame.
        """
        self.frame_store.remove(self.frame_store.get_iter(len(self.model.frames) - 1))

     
    def remove_frame_title(self, index):
        """
        Remove the title of the frame at the given index from the list view.
        This method is used when deleting a frame.
        """
        iter = self.frame_store.get_iter(index)
        if self.frame_store.remove(iter):
            self.list_view.get_selection().select_iter(iter)
            # Renumber frames
            for i in range(index, len(self.model.frames)):
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

        self.set_button_state("refid-set-button",
            frame is not None and
            self.effect.selected_element is not None and
            "id" in self.effect.selected_element.attrib and
            self.effect.selected_element.attrib["id"] != frame.refid)
        self.set_button_state("refid-clear-button",
            frame is not None and frame.refid is not None)


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
            index += len(self.model.frames)
        self.list_view.get_selection().select_path((index,))
        self.list_view.scroll_to_cell(index)

    
    def select_frame(self, frame):
        """
        Select the given frame in the frame list.
        """
        self.select_index(self.model.frames.index(frame))
        
        
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
            frame = self.model.frames[index]
            self.set_button_state("up-button", index > 0)
            self.set_button_state("down-button", index < len(self.model.frames) - 1)
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


    def on_save(self, widget=None):
        """
        Event handler: click on button "OK".
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
            if action.field is self.frame_fields["title"] or action.field is self.frame_fields["refid"]:
                index = self.model.frames.index(action.frame)
                self.frame_store.set(self.frame_store.get_iter(index), 1, self.get_markup_title(action.frame))

            # Update "set" and "clear" buttons if the "refid" field of a frame has changed.
            if action.field is self.frame_fields["refid"]:
                self.set_button_state("refid-set-button",
                    self.effect.selected_element is not None and
                    "id" in self.effect.selected_element.attrib and
                    self.effect.selected_element.attrib["id"] != action.frame.refid)
                self.set_button_state("refid-clear-button", action.frame.refid is not None)
        
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


