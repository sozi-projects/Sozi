/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {EventEmitter} from "events";
import {CameraState} from "./CameraState";
import {hasReliableBoundaries} from "../player/Camera";

/** Copy a property from an object to another.
 *
 * If the source object has a property with the given name,
 * this property is copied to the target object.
 *
 * @param {object} dest - The destination object.
 * @param {object} src - The source object.
 * @param {string} prop - The name of the property to copy.
 */
function copyIfSet(dest, src, prop) {
    if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
    }
}

/** Signals that a new SVG document has been attached to a presentation.
 *
 * @event module:model/Presentation.svgChange */

/** Layer properties for a frame in a Sozi presentation.
 *
 * In a given frame, one instance of this class is created for each layer.
 * An instance of `LayerProperties` provides information about the properties
 * of a frame in a given layer.
 *
 * @todo Find a better name for this class.
 */
export class LayerProperties {

    /** Initialize a new layer properties object.
     *
     * If the argument is another instance of `LayerProperties`, this constructor will create a copy of
     * of that instance.
     * If the argument is a {@linkcode module:model/Presentation.Frame|Frame} instance,
     * an object with default properties will be created.
     *
     * @param {(LayerProperties|Frame)} obj - An instance to copy, or a frame.
     */
    constructor(obj) {
        if (obj instanceof LayerProperties) {
            this.copy(obj);
        }
        else {
            /** The frame that owns the current object.
             *
             * @type {module:model/Presentation.Frame} */
            this.frame = obj;

            /** Does the current frame copy the geometry of the previous frame in the current layer?
             *
             * @default
             * @type {boolean} */
            this.link = false;

            /** The SVG ID of the reference element for the current frame in the current layer.
             *
             * @default
             * @type {string} */
            this.referenceElementId = "";

            /** The SVG ID of the outline element for the current frame in the current layer.
             *
             * @default
             * @type {string} */
            this.outlineElementId = "";

            /** The name of the timing function for the transition to the current frame in the current layer.
             *
             * @default
             * @type {string} */
            this.transitionTimingFunction = "linear";

            /** The relative zoom factor for the transition to the current frame in the current layer.
             *
             * @default
             * @type {number} */
            this.transitionRelativeZoom = 0;

            /** The SVG ID of a path to follow during the transition to the current frame in the current layer.
             *
             * @default
             * @type {string} */
            this.transitionPathId = "";
        }
    }

    /** Copy another layer properties into the current instance.
     *
     * @param {module:model/Presentation.LayerProperties} other - The object to copy.
     */
    copy(other) {
        this.frame                    = other.frame;
        this.link                     = other.link;
        this.referenceElementId       = other.referenceElementId;
        this.outlineElementId         = other.outlineElementId;
        this.transitionTimingFunction = other.transitionTimingFunction;
        this.transitionRelativeZoom   = other.transitionRelativeZoom;
        this.transitionPathId         = other.transitionPathId;
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
     */
    toStorable() {
        return {
            link                    : this.link,
            referenceElementId      : this.referenceElementId,
            outlineElementId        : this.outlineElementId,
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom  : this.transitionRelativeZoom,
            transitionPathId        : this.transitionPathId
        };
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains only the properties needed by the Sozi player to
     * show and animate the presentation.
     *
     * @returns {object} - A plain object with the properties needed by the player.
     */
    toMinimalStorable() {
        return {
            transitionTimingFunction: this.transitionTimingFunction,
            transitionRelativeZoom  : this.transitionRelativeZoom,
            transitionPathId        : this.transitionPathId
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {object} storable - A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "link");
        copyIfSet(this, storable, "referenceElementId");
        copyIfSet(this, storable, "outlineElementId");
        copyIfSet(this, storable, "transitionTimingFunction");
        copyIfSet(this, storable, "transitionRelativeZoom");
        copyIfSet(this, storable, "transitionPathId");
    }

    /** The index of the current layer.
     *
     * @readonly
     * @type {number} */
    get index() {
        return this.frame.layerProperties.indexOf(this);
    }

    /** The reference SVG element of the current frame in the current layer.
     *
     * @readonly
     * @type {?SVGElement} */
    get referenceElement() {
        const elt = this.frame.presentation.document.root.getElementById(this.referenceElementId);
        return elt && hasReliableBoundaries(elt) ? elt : null;
    }

    /** The SVG element used to outline the current frame in the current layer.
     *
     * @readonly
     * @type {?SVGElement} */
    get outlineElement() {
        return this.frame.presentation.document.root.getElementById(this.outlineElementId);
    }

    /** The SVG path to follow in transitions to the current frame in the current layer.
     *
     * @readonly
     * @type {?SVGElement} */
    get transitionPath() {
        return this.frame.presentation.document.root.getElementById(this.transitionPathId);
    }

    /** Will the outline element be hidden when playing the presentation?
     *
     * @type {boolean}
     */
    get outlineElementHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.outlineElementId) >= 0;
    }

    set outlineElementHide(hide) {
        if (this.outlineElement === this.frame.presentation.document.root) {
            return;
        }
        const hidden = this.outlineElementHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.outlineElementId);
        }
        else if (!hide && hidden) {
            const index = this.frame.presentation.elementsToHide.indexOf(this.outlineElementId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.outlineElement) {
            this.outlineElement.style.visibility = hide ? "hidden" : "visible";
        }
    }

    /** Will the transition path be hidden when playing the presentation?
     *
     * @type {boolean}
     */
    get transitionPathHide() {
        return this.frame.presentation.elementsToHide.indexOf(this.transitionPathId) >= 0;
    }

    set transitionPathHide(hide) {
        const hidden = this.transitionPathHide;
        if (hide && !hidden) {
            this.frame.presentation.elementsToHide.push(this.transitionPathId);
        }
        else if (!hide && hidden) {
            const index = this.frame.presentation.elementsToHide.indexOf(this.transitionPathId);
            this.frame.presentation.elementsToHide.splice(index, 1);
        }
        if (this.transitionPath) {
            this.transitionPath.style.visibility = hide ? "hidden" : "visible";
        }
    }
}

/** A frame in a Sozi presentation. */
export class Frame {

    /** Initialize a new frame.
     *
     * If the argument is another frame, this constructor will create a copy of
     * of that frame.
     * If the argument is a {@linkcode module:model/Presentation.Presentation|Presentation} instance,
     * an object with default properties will be created.
     *
     * @param {(Frame|Presentation)} obj - A frame to copy, or a presentation.
     * @param {boolean} [preserveId=false] - If `obj` is another frame, create a copy with the same frame ID.
     */
    constructor(obj, preserveId=false) {
        if (obj instanceof Frame) {
            this.copy(obj, preserveId);
        }
        else {
            /** The presentation that contains this frame.
             *
             * @type {module:model/Presentation.Presentation} */
            this.presentation = obj;

            /** A unique identifier for this frame.
             *
             * @type {string} */
            this.frameId = obj.makeFrameId();

            /** The layer-specific properties of this frame.
             *
             * @type {module:model/Presentation.LayerProperties[]} */
            this.layerProperties = obj.layers.map(lp => new LayerProperties(this));

            /** The camera states of this frame for each layer.
             *
             * @type {module:model/Presentation.CameraState[]} */
            this.cameraStates = obj.layers.map(cs => new CameraState(obj.document.root));

            /** The title of this frame.
             *
             * @default
             * @type {string} */
            this.title = "New frame";

            /** The nesting level of the title of this frame in the frame list.
             *
             * @default
             * @type {number} */
            this.titleLevel = 0;

            /** The presenter's notes for this frame.
             *
             * @default
             * @type {string} */
            this.notes = "";

            /** The duration of this frame, in milliseconds.
             *
             * @default
             * @type {number} */
            this.timeoutMs = 0;

            /** Will the player move to the next frame automatically when the duration of this frame has elapsed?
             *
             * @default
             * @type {boolean} */
            this.timeoutEnable = false;

            /** The duration of the transition to this frame, in milliseconds.
             *
             * @default
             * @type {number} */
            this.transitionDurationMs = 1000;

            /** Will the player show the title of this frame in the table of contents?
             *
             * @default
             * @type {boolean} */
            this.showInFrameList = true;

            /** Will the player show the number of this frame?
             *
             * @default
             * @type {boolean} */
            this.showFrameNumber = true;
        }
    }

    /** Copy the properties of another frame into the current instance.
     *
     * This method will also construct copies of the layer properties and
     * camera states of the original frame.
     *
     * @param {module:model/Presentation.Frame} other - The frame to copy.
     * @param {boolean} preserveId - Create a copy with the same frame ID.
     */
    copy(other, preserveId) {
        this.presentation = other.presentation;
        if (!preserveId) {
            this.frameId = other.presentation.makeFrameId();
        }
        this.title                = other.title;
        this.titleLevel           = other.titleLevel;
        this.notes                = other.notes;
        this.timeoutMs            = other.timeoutMs;
        this.timeoutEnable        = other.timeoutEnable;
        this.transitionDurationMs = other.transitionDurationMs;
        this.showInFrameList      = other.showInFrameList;
        this.showFrameNumber      = other.showFrameNumber;
        this.layerProperties      = other.layerProperties.map(lp => new LayerProperties(lp));
        this.cameraStates         = other.cameraStates.map(cs => new CameraState(cs));
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
     */
    toStorable() {
        const layerProperties = {};
        const cameraStates = {};
        const cameraOffsets = {};

        this.presentation.layers.forEach((layer, index) => {
            const lp = this.layerProperties[index];
            const cs = this.cameraStates[index];
            const re = lp.referenceElement;

            const key = layer.groupId;
            layerProperties[key] = lp.toStorable();
            cameraStates[key] = cs.toStorable();
            if (re) {
                cameraOffsets[key] = this.cameraStates[index].offsetFromElement(re);
            }
        });

        return {
            frameId             : this.frameId,
            title               : this.title,
            titleLevel          : this.titleLevel,
            notes               : this.notes,
            timeoutMs           : this.timeoutMs,
            timeoutEnable       : this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList     : this.showInFrameList,
            showFrameNumber     : this.showFrameNumber,
            layerProperties,
            cameraStates,
            cameraOffsets
        };
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains only the properties needed by the Sozi player to
     * show and animate the presentation.
     *
     * @returns {object} - A plain object with the properties needed by the player.
     */
    toMinimalStorable() {
        const layerProperties = {};
        const cameraStates = {};

        this.presentation.layers.forEach((layer, index) => {
            const lp = this.layerProperties[index];
            const cs = this.cameraStates[index];

            const key = layer.groupId;
            layerProperties[key] = lp.toMinimalStorable();
            cameraStates[key] = cs.toMinimalStorable();
        });

        return {
            frameId: this.frameId,
            title: this.title,
            titleLevel: this.titleLevel,
            notes: this.notes,
            timeoutMs: this.timeoutMs,
            timeoutEnable: this.timeoutEnable,
            transitionDurationMs: this.transitionDurationMs,
            showInFrameList: this.showInFrameList,
            showFrameNumber: this.showFrameNumber,
            layerProperties,
            cameraStates
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {object} storable - A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "frameId");
        copyIfSet(this, storable, "title");
        copyIfSet(this, storable, "titleLevel");
        copyIfSet(this, storable, "notes");
        copyIfSet(this, storable, "timeoutMs");
        copyIfSet(this, storable, "timeoutEnable");
        copyIfSet(this, storable, "transitionDurationMs");
        copyIfSet(this, storable, "showInFrameList");
        copyIfSet(this, storable, "showFrameNumber");

        // TODO if storable.layerProperties has keys not in layers, create fake layers marked as "deleted"
        this.presentation.layers.forEach((layer, index) => {
            // If the current layer has been added to the SVG after the frame
            // was created, copy the properties of the "auto" layer.
            const key = layer.groupId in storable.layerProperties ? layer.groupId : "__sozi_auto__";
            if (key in storable.layerProperties) {
                const lp = this.layerProperties[index];
                lp.fromStorable(storable.layerProperties[key]);

                const cs = this.cameraStates[index];
                cs.fromStorable(storable.cameraStates[key]);

                const re = lp.referenceElement;
                if (re) {
                    const ofs = storable.cameraOffsets[key] || {};
                    cs.setAtElement(re, ofs.deltaX, ofs.deltaY,
                                    ofs.widthFactor, ofs.heightFactor,
                                    ofs.deltaAngle);
                    // TODO compare current camera state with stored camera state.
                    // If different, mark the current layer as "dirty".
                }
            }
        });
    }

    /** The index of this frame in the presentation.
     *
     * @readonly
     * @type {number}
     */
    get index() {
        return this.presentation.frames.indexOf(this);
    }

    /** Copy the given camera states into the current frame.
     *
     * @param {module:model/CameraState.CameraState[]} states - The states to copy.
     */
    setAtStates(states) {
        states.forEach((state, index) => {
            this.cameraStates[index].copy(state);
        });
    }

    /** Check whether the current frame is linked to the given frame in the layer at the given index.
     *
     * Considering two frames A and B where A comes before B in the presentation order,
     * A and B are linked if all frames in the sequence that starts after A and finishes at B
     * have their `link` attribute `true` in their layer properties at the given index.
     *
     * @param {Frame} frame - Another frame to check against the current frame.
     * @param {number} layerIndex - The index of a layer.
     * @returns {boolean} `true` if this frame is linked to the given other frame.
     */
    isLinkedTo(frame, layerIndex) {
        const [first, second] = this.index < frame.index ? [this, frame] : [frame, this];
        return second.layerProperties[layerIndex].link &&
               (second.index === first.index + 1 ||
                second.index > first.index &&
                this.presentation.frames[second.index - 1].isLinkedTo(first, layerIndex));
    }
}

/** A layer in an SVG document.
 *
 * The SVG standard does not define a notion of layer.
 * The implementation of layers depends on the software that was used to create
 * the SVG document.
 *
 * In Sozi, a layer is an SVG group that is a direct child of the SVG root element.
 * When Sozi opens an SVG document, elements that do not belong to a layer are
 * grouped automatically into *automatic* layers.
 */
export class Layer {
    /** Initialize a new layer.
     *
     * @param {module:model/Presentation.Presentation} presentation - The current Sozi presentation.
     * @param {string} label - The display name of this layer.
     * @param {boolean} auto - Was the layer created by Sozi to collect isolated elements?
     */
    constructor(presentation, label, auto) {
        /** The current presentation.
         *
         * @type {module:model/Presentation.Presentation} */
        this.presentation = presentation;

        /** The display name of this layer.
         *
         * @type {string} */
        this.label = label;

        /** Was the layer created by Sozi to collect isolated elements?
         *
         * @type {boolean} */
        this.auto = auto;

        /** The SVG element(s) that constitute this layer.
         *
         * If `auto` is `false`, this array will contain a single SVG group element.
         * If `auto` is `true`, this array can contain several groups that are
         * managed as a single layer in Sozi.
         *
         * @type {SVGElement[]} */
        this.svgNodes = [];
    }

    /** The identifier of the SVG group for this layer.
     *
     * If `auto` is `true`, the value of this property is `"__sozi_auto__"`.
     *
     * @type {string}
     */
    get groupId() {
        return this.auto ? "__sozi_auto__" : this.svgNodes[0].getAttribute("id");
    }

    /** The index of this layer.
     *
     * @type {number} */
    get index() {
        return this.presentation.layers.indexOf(this);
    }

    /** Is this layer visible?
     *
     * This property corresponds to the CSS `display` property of the SVG group
     * for this layer.
     *
     * @type {boolean}
     */
    get isVisible() {
        return this.svgNodes.some(node => window.getComputedStyle(node).display !== "none");
    }

    set isVisible(visible) {
        for (let node of this.svgNodes) {
            node.style.display = visible ? "inline" : "none";
        }
    }

    /** Does this layer contain the given SVG element?
     *
     * @param {SVGElement} svgElement - An element to check.
     * @returns {boolean} `true` if the given element is a child of the current layer.
     */
    contains(svgElement) {
        return this.svgNodes.some(node => node.contains(svgElement));
    }
}

/** Constant: the SVG namespace
 *
 * @type {string} */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Type for SVG documents.
 *
 * @external SVGDocument
 */

/** Sozi presentation.
 *
 * @extends EventEmitter
 */
export class Presentation extends EventEmitter {

    /** Initialize a Sozi document object. */
    constructor() {
        super();

        /** The SVG document attached to this presentation.
         *
         * Set it with {@linkcode module:model/Presentation.Presentation#setSVGDocument}.
         *
         * @default
         * @type {SVGDocument} */
        this.document = null;

        /** The sequence of frames in this presentation.
         *
         * @default
         * @type {module:model/Presentation.Frame[]} */
        this.frames = [];

        /** A representation of the layers of the SVG document.
         *
         * @default
         * @type {module:model/Presentation.Layer[]} */
        this.layers = [];

        /** The list of SVG elements to hide when playing the presentation.
         *
         * @default
         * @type {SVGElement[]} */
        this.elementsToHide = [];

        /** The custom CSS and JavaScript files to add to the generated HTML presentation.
         *
         * @default
         * @type {string[]} */
        this.customFiles = [];

        /** The width of the aspect ratio used in the editor for this presentation.
         *
         * @default
         * @type {number} */
        this.aspectWidth = 4;

        /** The height of the aspect ratio used in the editor for this presentation.
         *
         * @default
         * @type {number} */
        this.aspectHeight = 3;

        /** When playing the presentation, are the keyboard shortcuts for zoom-in and zoom-out enabled?
         *
         * @default
         * @type {boolean} */
        this.enableKeyboardZoom = true;

        /** When playing the presentation, are the keyboard shortcuts for rotation enabled?
         *
         * @default
         * @type {boolean} */
        this.enableKeyboardRotation = true;

        /** When playing the presentation, are the keyboard shortcuts for navigation enabled?
         *
         * @default
         * @type {boolean} */
        this.enableKeyboardNavigation = true;

        /** When playing the presentation, is the mouse gesture for translation enabled?
         *
         * @default
         * @type {boolean} */
        this.enableMouseTranslation = true;

        /** When playing the presentation, are the mouse gestures for zoom-in and zoom-out enabled?
         *
         * @default
         * @type {boolean} */
        this.enableMouseZoom = true;

        /** When playing the presentation, are the mouse gestures for rotation enabled?
         *
         * @default
         * @type {boolean} */
        this.enableMouseRotation = true;

        /** When playing the presentation, are the mouse gestures for navigation enabled?
         *
         * @default
         * @type {boolean} */
        this.enableMouseNavigation = true;

        /** When playing the presentation, does the URL change automatically on frame change?
         *
         * @default
         * @type {boolean} */
        this.updateURLOnFrameChange = true;

        /** The page size for PDF export.
         *
         * @default
         * @type {string} */
        this.exportToPdfPageSize = "A4";

        /** The page orientation for PDF export.
         *
         * @default
         * @type {string} */
        this.exportToPdfPageOrientation = "landscape";

        /** The list of frame numbers to include in the PDF export.
         *
         * @default
         * @type {string} */
        this.exportToPdfInclude = "";
        
        /** The list of frame numbers to exclude in the PDF export.
         *
         * @default
         * @type {string} */
        this.exportToPdfExclude = "";
    }

    /** Set the SVG document for this presentation.
     *
     * This method populates the {@linkcode module:model/Presentation.Presentation#layers} property of this instance.
     *
     * @param {SVGDocument} svgDocument - The SVG document to use.
     *
     * @fires module:model/Presentation.svgChange
     */
    setSVGDocument(svgDocument) {
        this.document = svgDocument;

        // Create an empty wrapper layer for elements that do not belong to a valid layer
        const autoLayer = new Layer(this, "auto", true);

        this.layers = [];
        for (let svgNode of this.document.root.childNodes) {
            if (svgNode instanceof SVGGElement) {
                const nodeId = svgNode.getAttribute("id");
                if (nodeId === null) {
                    autoLayer.svgNodes.push(svgNode);
                }
                else {
                    // Add the current node as a new layer.
                    const layer = new Layer(this,
                        this.document.handler.getLabel(svgNode) || ("#" + nodeId),
                        false);
                    layer.svgNodes.push(svgNode);
                    this.layers.push(layer);
                }
            }
        }

        this.layers.push(autoLayer);

        this.emit("svgChange");
    }

    /** Sets the initial state of all cameras to fit the bounding box of the SVG content. */
    setInitialCameraState() {
        /** The initial camera state.
         *
         * This property is initialized after the document has been loaded and displayed.
         *
         * @type {module:model/CameraState.CameraState} */
        this.initialCameraState = new CameraState(this.document.root);
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains all the properties needed by the editor to restore
     * the state of this instance.
     *
     * @returns {object} - A plain object with the properties needed by the editor.
     */
    toStorable() {
        return {
            aspectWidth               : this.aspectWidth,
            aspectHeight              : this.aspectHeight,
            enableKeyboardZoom        : this.enableKeyboardZoom,
            enableKeyboardRotation    : this.enableKeyboardRotation,
            enableKeyboardNavigation  : this.enableKeyboardNavigation,
            enableMouseTranslation    : this.enableMouseTranslation,
            enableMouseZoom           : this.enableMouseZoom,
            enableMouseRotation       : this.enableMouseRotation,
            enableMouseNavigation     : this.enableMouseNavigation,
            updateURLOnFrameChange    : this.updateURLOnFrameChange,
            exportToPdfPageSize       : this.exportToPdfPageSize,
            exportToPdfPageOrientation: this.exportToPdfPageOrientation,
            exportToPdfInclude        : this.exportToPdfInclude,
            exportToPdfExclude        : this.exportToPdfExclude,
            frames                    : this.frames.map(frame => frame.toStorable()),
            elementsToHide            : this.elementsToHide.slice(),
            customFiles               : this.customFiles.slice(),
        };
    }

    /** Convert this instance to a plain object that can be stored as JSON.
     *
     * The result contains only the properties needed by the Sozi player to
     * show and animate the presentation.
     *
     * @returns {object} - A plain object with the properties needed by the player.
     */
    toMinimalStorable() {
        return {
            enableKeyboardZoom      : this.enableKeyboardZoom,
            enableKeyboardRotation  : this.enableKeyboardRotation,
            enableKeyboardNavigation: this.enableKeyboardNavigation,
            enableMouseTranslation  : this.enableMouseTranslation,
            enableMouseZoom         : this.enableMouseZoom,
            enableMouseRotation     : this.enableMouseRotation,
            enableMouseNavigation   : this.enableMouseNavigation,
            updateURLOnFrameChange  : this.updateURLOnFrameChange,
            frames                  : this.frames.map(frame => frame.toMinimalStorable()),
            elementsToHide          : this.elementsToHide.slice()
        };
    }

    /** Copy the properties of the given object into this instance.
     *
     * @param {object} storable - A plain object with the properties to copy.
     */
    fromStorable(storable) {
        copyIfSet(this, storable, "aspectWidth");
        copyIfSet(this, storable, "aspectHeight");
        copyIfSet(this, storable, "enableKeyboardZoom");
        copyIfSet(this, storable, "enableKeyboardRotation");
        copyIfSet(this, storable, "enableKeyboardNavigation");
        copyIfSet(this, storable, "enableMouseTranslation");
        copyIfSet(this, storable, "enableMouseZoom");
        copyIfSet(this, storable, "enableMouseRotation");
        copyIfSet(this, storable, "enableMouseNavigation");
        copyIfSet(this, storable, "updateURLOnFrameChange");
        copyIfSet(this, storable, "exportToPdfPageSize");
        copyIfSet(this, storable, "exportToPdfPageOrientation");
        copyIfSet(this, storable, "exportToPdfInclude");
        copyIfSet(this, storable, "exportToPdfExclude");

        this.frames = storable.frames.map(f => {
            const res = new Frame(this);
            res.fromStorable(f);
            return res;
        });

        if (storable.elementsToHide) {
            this.elementsToHide = storable.elementsToHide.slice();
        }

        if (storable.customFiles) {
            this.customFiles = storable.customFiles.slice();
        }
    }

    /** The title of this presentation.
     *
     * This property is extracted from the `<title>` element of the SVG document.
     * Its default value is `"Untitled"`.
     *
     * @readonly
     * @type {string} */
    get title() {
        const svgTitles = this.document.root.getElementsByTagNameNS(SVG_NS, "title");
        return svgTitles.length ? svgTitles[0].firstChild.wholeText.trim() : "Untitled";
    }

    /** Create a new unique identifier for a frame in this presentation.
     *
     * @returns {string} - A new ID
     */
    makeFrameId() {
        const prefix = "frame";
        let suffix = Math.floor(1000 * (1 + 9 * Math.random()));
        let frameId;
        do {
            frameId = prefix + suffix;
            suffix ++;
        } while (this.frames.some(frame => frame.frameId === frameId));
        return frameId;
    }

    /** Get the frame with a given ID in the current presentation.
     *
     * @param {string} frameId - The ID of the frame to find.
     * @returns {?module:model/Presentation.Frame} - The frame with that ID.
     */
    getFrameWithId(frameId) {
        for (let frame of this.frames) {
            if (frame.frameId === frameId) {
                return frame;
            }
        }
        return null;
    }

    /** Get the layer with a given ID in the current presentation.
     *
     * @param {string} groupId - The ID of an SVG group that represents a layer.
     * @returns {?module:model/Presentation.Layer} - The layer that maps to a group with that ID.
     */
    getLayerWithId(groupId) {
        for (let layer of this.layers) {
            if (layer.groupId === groupId) {
                return layer;
            }
        }
        return null;
    }

    /** Update the camera states and layer properties of all linked layers in all frames.
     *
     * This method must be called to propagate the changes in some frames to
     * the frames that are linked to them.
     */
    updateLinkedLayers() {
        if (!this.frames.length) {
            return;
        }

        const firstCameraStates      = this.frames[0].cameraStates;
        const defaultCameraState     = firstCameraStates[firstCameraStates.length - 1];

        const firstLayerProperties   = this.frames[0].layerProperties;
        const defaultLayerProperties = firstLayerProperties[firstLayerProperties.length - 1];

        this.layers.forEach((layer, layerIndex) => {
            let cameraState     = defaultCameraState;
            let layerProperties = defaultLayerProperties;

            for (let frame of this.frames) {
                if (frame.layerProperties[layerIndex].link) {
                    frame.cameraStates[layerIndex].copy(cameraState);
                    frame.layerProperties[layerIndex].referenceElementId = layerProperties.referenceElementId;
                    frame.layerProperties[layerIndex].outlineElementId   = layerProperties.outlineElementId;
                }
                else {
                    cameraState     = frame.cameraStates[layerIndex];
                    layerProperties = frame.layerProperties[layerIndex];
                }
            }
        });
    }

    /** Get the custom files with the given extension.
     *
     * @param {string} ext - The file extension.
     * @returns {string[]} - The custom files that have that extension.
     */
    getCustomFiles(ext) {
        return this.customFiles.filter(path => path.endsWith(ext));
    }
}
