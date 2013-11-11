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

import inkex

from actions import SoziFieldAction


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
        self.attr = attr.replace("-", "_")
        
        self.input_widget = parent.builder.get_object(attr + "-field")
        self.label = parent.builder.get_object(attr + "-label")
        if self.label is None:
            self.label = self.input_widget.get_label()
        else:
            self.label = self.label.get_text()
            
        self.optional = optional
        self.default_value = default_value
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
        if self.current_frame is not None and self.current_frame.is_attached and self.last_value != self.get_value():
            self.parent.do_action(SoziFieldAction(self))
            self.reset_last_value()
            
            
    def disable(self):
        """
        Set the current field to its default value and disable edition.
        The previous value of the field is written to the document if needed.
        """
        self.write_if_needed()
        self.current_frame = None
        if self.optional:
            self.last_value = None
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)
        self.input_widget.set_sensitive(False)


    def set_from(self, frame, sensitive = True):
        """
        Set the value of the current field with the corresponding attribute of the given frame or layer.
        The previous value of the field is written to the document if needed.
        """
        self.write_if_needed()
        self.current_frame = frame
        if getattr(frame, self.attr) is not None:
            self.last_value = getattr(frame, self.attr)
        elif self.optional:
            self.last_value = None
        else:
            self.last_value = self.default_value
        self.set_value(self.last_value)
        self.input_widget.set_sensitive(sensitive)


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
            return value


class SoziComboField(SoziField):
    """
    A wrapper for a GTK ComboBox with text items mapped to a Sozi frame attribute.
    """
    
    def __init__(self, parent, attr, items, default_value):
        """
        Initialize a new combo field.
            - items: the list of items in the combo box
        See class SoziField for other initializer arguments.
        """
        SoziField.__init__(self, parent, attr, default_value)
        self.items = items
        self.changed_handler = self.input_widget.connect("changed", self.on_edit_event)

      
    def set_value(self, value):
        self.input_widget.handler_block(self.changed_handler)
        index = self.items.index(value)
        if index >= 0:
            self.input_widget.set_active(index)
        self.input_widget.handler_unblock(self.changed_handler)

    
    def get_value(self):
        index = self.input_widget.get_active()
        if index >= 0:
            return self.items[index]
        else:
            return self.default_value


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
        self.input_widget.set_active(value)
        self.input_widget.handler_unblock(self.toggle_handler)


    def get_value(self):
        return self.input_widget.get_active()


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
        default_value = float(default_value) * factor

        SoziField.__init__(self, parent, attr, default_value)
        self.input_widget.connect("focus-out-event", self.on_edit_event)

        self.factor = factor


    def set_value(self, value):
        self.input_widget.set_value(float(value) / self.factor)


    def get_value(self):
        return int(float(self.input_widget.get_value()) * self.factor)


    def on_edit_event(self, widget, event=None):
        self.input_widget.update()
        SoziField.on_edit_event(self, widget, event)

