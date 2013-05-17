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

import copy
from sozi.document import *


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
        if isinstance(field.current_frame, SoziFrame):
            index = field.parent.model.frames.index(field.current_frame)
            SoziAction.__init__(self,
                _("Restore '{0}' in frame {1}").format(field.label, index + 1),
                _("Change '{0}' in frame {1}").format(field.label, index + 1)
            )
        else:
            index = field.parent.model.frames.index(field.current_frame.frame)
            SoziAction.__init__(self,
                _("Restore '{0}' in layer '{1}' of frame {2}").format(field.label, field.current_frame.label, index + 1),
                _("Change '{0}' in layer '{1}' of frame {2}").format(field.label, field.current_frame.label, index + 1)
            )

        self.field = field
        self.frame = field.current_frame
        self.last_value = field.last_value
        self.value = field.get_value()


    def do(self):
        """
        Write the new value of the field to the current frame.
        """
        setattr(self.frame, self.field.attr, self.value)


    def undo(self):
        """
        Restore the previous value of the field in the frame and in the UI.
        If needed, select the frame that was active when the field was modified.
        """
        setattr(self.frame, self.field.attr, self.last_value)
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


class SoziCreateFrameAction(SoziAction):
    """
    A wrapper for a frame creation action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame creation action.
            - ui: an instance of SoziUI
        """
        # The new frame will be added at the end of the presentation
        new_frame_number = str(len(ui.model.frames) + 1)

        SoziAction.__init__(self,
            _("Delete the new frame {0}").format(new_frame_number),
            _("Create a new frame at {0}").format(new_frame_number)
        )
        
        self.ui = ui
                            

    def do(self):
        """
        Create a new frame and select it in the frame list.
        """
        self.ui.clear_form()

        frame = SoziFrame(self.ui.model)
        frame.refid = self.ui.model.get_next_selected_id()

        self.ui.model.add_frame(frame)
        self.ui.append_frame_tree(-1)
        self.ui.select_frame_at_index(-1)


    def undo(self):        
        """
        Remove the created frame and select the previously selected frame.
        """
        self.ui.remove_last_frame_tree()
        self.ui.model.delete_frame(-1)
       

class SoziAddLayerAction(SoziAction):
    """
    A wrapper for the action that adds a layer to a frame.
    """
    
    def __init__(self, ui, group_id):
        """
        Initialize a new layer creation action.
            - ui: an instance of SoziUI
            - id: the ID of the layer group to add
        """
        label = ui.model.layer_labels[group_id]
        self.frame_index = ui.get_selected_frame_index()
        
        SoziAction.__init__(self,
            _("Remove the layer '{0}' from frame {1}").format(label, self.frame_index + 1),
            _("Add layer '{0}' to frame {1}").format(label, self.frame_index + 1)
        )
        
        self.ui = ui
        self.group_id = group_id
        self.frame = ui.model.frames[self.frame_index]
                            

    def do(self):
        """
        Add a layer to the selected frame and select it in the frame list.
        """
        self.ui.clear_form()

        layer = SoziLayer(self.frame, self.group_id)
        layer.refid = self.ui.model.get_next_selected_id()
        self.frame.add_layer(layer)
        
        self.ui.insert_layer_tree(self.frame_index, layer.group_id)
        self.ui.select_layer_with_id(self.frame_index, layer.group_id)


    def undo(self):        
        """
        Remove a layer from the selected frame and select the frame.
        """
        self.ui.remove_layer_tree(self.frame_index, self.group_id)
        self.frame.delete_layer(self.group_id)
        self.ui.select_frame_at_index(self.frame_index)


class SoziDeleteFrameAction(SoziAction):
    """
    A wrapper for a frame delete action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame delete action.
            - ui: an instance of SoziUI
        """
        index = ui.get_selected_frame_index()

        SoziAction.__init__(self,
            _("Restore deleted frame {0}").format(index + 1),
            _("Delete frame {0}").format(index + 1)
        )
        
        self.ui = ui
        self.index = index
        self.frame = ui.model.frames[index]


    def do(self):
        """
        Remove the current frame and select the next one in the frame list.
        """
        self.ui.remove_frame_tree(self.index)
        self.ui.model.delete_frame(self.index)
        # If the removed frame was the last, and if the frame list is not empty,
        # select the last frame
        if self.index > 0 and self.index >= len(self.ui.model.frames):
            self.ui.select_frame_at_index(-1)


    def undo(self):        
        """
        Add the removed frame and select it.
        """
        self.ui.model.insert_frame(self.index, self.frame)
        self.ui.insert_frame_tree(self.index)


class SoziDeleteLayerAction(SoziAction):
    """
    A wrapper for a layer delete action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new layer delete action.
            - ui: an instance of SoziUI
        """
        self.frame_index = ui.get_selected_frame_index()
        self.group_id = ui.get_selected_layer_id()
        
        label = ui.model.layer_labels[self.group_id]
        
        SoziAction.__init__(self,
            _("Restore deleted layer '{0}' in frame {1}").format(label, self.frame_index + 1),
            _("Remove layer '{0}' from frame {1}").format(label, self.frame_index + 1)
        )
        
        self.ui = ui
        self.frame = ui.model.frames[self.frame_index]
        self.layer = self.frame.layers[self.group_id]


    def do(self):
        """
        Remove the current frame and select the next one in the frame list.
        """
        self.ui.remove_layer_tree(self.frame_index, self.group_id)
        self.frame.delete_layer(self.group_id)
        self.ui.select_frame_at_index(self.frame_index) # FIXME select next layer


    def undo(self):        
        """
        Add the removed frame and select it.
        """
        self.frame.add_layer(self.layer)
        self.ui.insert_layer_tree(self.frame_index, self.group_id)
        self.ui.select_layer_with_id(self.frame_index, self.group_id)


class SoziDuplicateFrameAction(SoziAction):
    """
    A wrapper for a frame duplication action.
    """
    
    def __init__(self, ui):
        """
        Initialize a new frame duplication action.
            - ui: an instance of SoziUI
        """

        # The new frame is a copy of the currently selected frame
        self.index = ui.get_selected_frame_index()

        # The new frame will be added at the end of the presentation
        new_frame_number = str(len(ui.model.frames) + 1)

        SoziAction.__init__(self,
            _("Delete duplicated frame {0}").format(new_frame_number),
            _("Duplicate frame {0}").format(self.index + 1)
        )
        
        self.ui = ui
        
        self.frame = ui.model.frames[self.index].copy()


    def do(self):
        """
        Create a new frame and select it in the frame list.
        """
        self.ui.model.add_frame(self.frame)
        self.ui.append_frame_tree(-1)
        self.ui.select_frame_at_index(-1)


    def undo(self):        
        """
        Remove the created frame and select the previously selected frame.
        """
        self.ui.remove_last_frame_tree()
        self.ui.model.delete_frame(-1)
        if self.index is not None:
            self.ui.select_frame_at_index(self.index)


class SoziReorderFramesAction(SoziAction):
    """
    A wrapper for a frame reordering action.
    """
    
    def __init__(self, ui, down):
        """
        Initialize a new frame reorder action.
            - ui: an instance of SoziUI
        """
        index = ui.get_selected_frame_index()
        if down:
            index_other = index + 1
        else:
            index_other = index - 1

        if down:
            SoziAction.__init__(self,
                _("Move frame {0} up").format(index_other + 1),
                _("Move frame {0} down").format(index + 1)
            )
        else:
            SoziAction.__init__(self,
                _("Move frame {0} down").format(index_other + 1),
                _("Move frame {0} up").format(index + 1)
            )
        
        self.ui = ui
        self.index = index
        self.index_other = index_other


    def move(self, first, second):
        # Swap frames in the document
        self.ui.model.swap_frames(first, second)
        
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
        
        self.ui.tree_view.scroll_to_cell(second)
        
        # Update up/down button sensitivity
        self.ui.set_button_state("up-button", second > 0)
        self.ui.set_button_state("down-button", second < len(self.ui.model.frames) - 1)

        
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
        self.ui.select_frame_at_index(self.index)


    def redo(self):        
        """
        Swap frames again.
        """
        self.do()
        self.ui.select_frame_at_index(self.index_other)


