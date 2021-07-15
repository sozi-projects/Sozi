/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {h} from "inferno-hyperscript";
import {VirtualDOMView} from "./VirtualDOMView";
import {getLanguages} from "./languages";

/** Type for Virtual DOM nodes.
 *
 * @external VNode
 */

/** Convert a value into an array.
 *
 * If the argument is already an array, it is returned as is.
 * If it is not, wrap it in an array.
 *
 * @param {any} v - A value to convert.
 * @returns {any[]} - An array.
 */
function asArray(v) {
    return v instanceof Array ? v : [v];
}

/** Signals that the mode of the properties view has changed.
 *
 * @event module:view/Properties.modeChange
 */

/** Properties pane of the presentation editor.
 *
 * @extends module:view/VirtualDOMView.VirtualDOMView
 */
export class Properties extends VirtualDOMView {

    /** Initialize a new properties view.
     *
     * @param {HTMLElement} container - The HTML element that will contain this preview area.
     * @param {module:model/Selection.Selection} selection -
     * @param {module:Controller.Controller} controller - The controller that manages the current editor.
     */
    constructor(container, selection, controller) {
        super(container, controller);

        /** The object that manages the frame and layer selection.
         *
         * @type {module:model/Selection.Selection}
         */
        this.selection = selection;

        /** What the properties view shows.
         *
         * Acceptable values are: `"default"`, `"preferences"` and `"export"`.
         *
         * @default
         * @type {string}
         */
        this.mode = "default";
    }

    /** Toggle between presentation properties and preferences or export mode.
     *
     * @param {string} mode - The mode to toggle (`"preferences"`, `"export"`).
     *
     * @fires module:view/Properties.modeChange
     */
    toggleMode(mode) {
        this.mode = this.mode === mode ? "default" : mode;
        this.emit("modeChange");
        this.repaint();
    }

    /** @inheritdoc */
    render() {
        switch (this.mode) {
            case "preferences": return this.renderPreferences();
            case "narration":   return this.renderNarrationProperties();
            case "export":      return this.renderExportTool();
            default:            return this.renderPresentationProperties();
        }
    }

    /** Render the properties view to edit the editor preferences.
     *
     * @returns {VNode} - A virtual DOM tree.
     */
    renderPreferences() {
        const controller = this.controller;
        const _ = controller.gettext;

        const ACTION_LABELS = {
            autoselectOutlineElement: _("Autoselect outline element"),
            resetLayer              : _("Reset layer geometry"),
            addFrame                : _("Create a new frame"),
            save                    : _("Save the presentation"),
            redo                    : _("Redo"),
            undo                    : _("Undo"),
            focusTitleField         : _("Focus the frame title"),
            reload                  : _("Reload the SVG document"),
            toggleFullscreen        : _("Toggle full-screen mode"),
            toggleDevTools          : _("Toggle the developer tools")
        };

        let shortcuts = [];
        for (let action in ACTION_LABELS) {
            shortcuts.push(h("label", {for: `field-${action}`}, ACTION_LABELS[action]));
            shortcuts.push(this.renderTextField(action, false, controller.getShortcut, controller.setShortcut, true));
        }

        const toDefaultMode = () => this.toggleMode("default");

        return h("div.properties", [
            h("div.back", {
                title: _("Back to presentation properties"),
                onClick() { toDefaultMode(); }
            }, h("i.fa.fa-arrow-left", )),

            h("h1", _("User interface")),

            h("label", {for: "field-language"}, _("Language")),
            this.renderSelectField("language", controller.getPreference, controller.setPreference, getLanguages(_)),

            h("label", {for: "field-fontSize"}, _("Font size")),
            this.renderNumberField("fontSize", false, controller.getPreference, controller.setPreference, false, 1, 1),

            h("label.side-by-side", {for: "field-enableNotifications"}, [
                _("Enable notifications on save and reload"),
                this.renderToggleField(h("i.fa.fa-info"), _("Enable notifications"), "enableNotifications", controller.getPreference, controller.setPreference)
            ]),

            h("label", {for: "field-saveMode"}, _("Save the presentation")),
            this.renderSelectField("saveMode", controller.getPreference, controller.setPreference, {
                onblur: _("When Sozi loses the focus"),
                manual: _("Manually")
            }),

            h("label", {for: "field-reloadMode"}, _("Reload the SVG document")),
            this.renderSelectField("reloadMode", controller.getPreference, controller.setPreference, {
                auto:    _("Automatically"),
                onfocus: _("When Sozi gets the focus"),
                manual:  _("Manually")
            }),

            h("h1", _("Behavior")),

            h("label.side-by-side", {for: "field-animateTransitions"}, [
                _("Preview transition animations"),
                this.renderToggleField(h("i.fa.fa-film"), _("Enable animated transitions"), "animateTransitions", controller.getPreference, controller.setPreference)
            ]),

            h("h1", _("Keyboard shortcuts")),

            shortcuts,

            h("h1", _("Rendering")),

            h("label.side-by-side", {for: "field-enableHardwareAcceleration"}, [
                _("Hardware acceleration"),
                this.renderToggleField(h("i.fa.fa-microchip"), _("Enable hardware acceleration (effective after restarting the application)"), "enableHardwareAcceleration", controller.getAppSetting, controller.setAppSetting)
            ]),

            h("label.side-by-side", {for: "field-enableColorCorrectRendering"}, [
                _("Color correct rendering"),
                this.renderToggleField(h("i.fa.fa-paint-brush"), _("Enable color correct rendering (effective after restarting the application)"), "enableColorCorrectRendering", controller.getAppSetting, controller.setAppSetting)
            ]),

        ]);
    }

    /** Render the properties view to edit the presentation properties.
     *
     * @returns {VNode} - A virtual DOM tree.
     */
    renderPresentationProperties() {
        const controller = this.controller;
        const _ = controller.gettext;

        const NOTES_HELP = [
            _("Basic formatting supported:"),
            "",
            _("Ctrl+B: Bold"),
            _("Ctrl+I: Italic"),
            _("Ctrl+U: Underline"),
            _("Ctrl+0: Paragraph"),
            _("Ctrl+1: Big heading"),
            _("Ctrl+2: Medium heading"),
            _("Ctrl+3: Small heading"),
            _("Ctrl+L: List"),
            _("Ctrl+N: Numbered list")
        ].join("<br>");

        const timeoutMsDisabled = controller.getFrameProperty("timeoutEnable").every(value => !value);
        const showInFrameListDisabled = controller.getFrameProperty("showInFrameList").every(value => !value);

        const layersToCopy = {
            __select_a_layer__: _("Select a layer to copy")
        };
        if (this.controller.hasDefaultLayer) {
            layersToCopy.__default__ = _("Default");
        }
        for (let layer of this.controller.editableLayers) {
            layersToCopy[layer.groupId] = layer.label;
        }

        return h("div.properties", [
            h("h1", _("Frame")),

            h("div.btn-group", [
                    this.renderToggleField(h("i.fa.fa-list"), _("Show in frame list"), "showInFrameList", controller.getFrameProperty, controller.setFrameProperty),
                    this.renderToggleField(h("i.fa.fa-hashtag"), _("Show frame number"), "showFrameNumber", controller.getFrameProperty, controller.setFrameProperty)
            ]),

            h("label", {for: "field-title"}, _("Title")),
            this.renderTextField("title", false, controller.getFrameProperty, controller.setFrameProperty, true),

            h("label", {for: "field-titleLevel"}, _("Title level in frame list")),
            this.renderRangeField("titleLevel", showInFrameListDisabled, controller.getFrameProperty, controller.setFrameProperty, 0, 4, 1),

            h("label", {for: "field-frameId"}, _("Id")),
            this.renderTextField("frameId", false, controller.getFrameProperty, controller.setFrameProperty, false),

            h("label.side-by-side", {for: "field-timeoutMs"}, [
                _("Timeout (seconds)"),
                this.renderToggleField(h("i.fa.fa-clock-o"), _("Timeout enable"), "timeoutEnable", controller.getFrameProperty, controller.setFrameProperty)
            ]),
            this.renderNumberField("timeoutMs", timeoutMsDisabled, controller.getFrameProperty, controller.setFrameProperty, false, 0.1, 1000),

            h("h1", _("Layer")),

            h("div.btn-group", [
                this.renderToggleField(h("i.fa.fa-link"), _("Link to previous frame"), "link", controller.getLayerProperty, controller.setLayerProperty),
                this.renderToggleField(h("i.fa.fa-crop"), _("Clip"), "clipped", controller.getCameraProperty, controller.setCameraProperty),
                h("button", {
                    title: _("Reset layer geometry"),
                    onclick() { controller.resetLayer(); }
                }, h("i.fa.fa-eraser"))
            ]),

            h("label", {for: "field-layerToCopy"}, _("Copy layer")),
            this.renderSelectField("layerToCopy", () => "__select_a_layer__", (prop, groupId) => {
                controller.copyLayer(groupId);
                document.getElementById("field-layerToCopy").firstChild.selected = true;
            }, layersToCopy),

            h("label.side-by-side", {for: "field-outlineElementId"}, [
                _("Outline element Id"),
                h("span.btn-group", [
                    h("button", {
                        title: _("Autoselect element"),
                        onclick() { controller.autoselectOutlineElement(); }
                    }, h("i.fa.fa-magic")),
                    this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide element"), "outlineElementHide", controller.getLayerProperty, controller.setLayerProperty),
                    h("button", {
                        title: _("Fit to element"),
                        onclick() { controller.fitElement(); }
                    }, h("i.fa.fa-arrows-alt")),
                ])
            ]),
            this.renderTextField("outlineElementId", false, controller.getLayerProperty, controller.setLayerProperty, true),

            h("label", {for: "field-opacity"}, _("Layer opacity")),
            this.renderRangeField("opacity", false, controller.getCameraProperty, controller.setCameraProperty, 0, 1, 0.1),

            h("h1", [_("Transition"), this.renderHelp(_("Configure the animation when moving to the selected frames."))]),

            h("label", {for: "field-transitionDurationMs"}, _("Duration (seconds)")),
            this.renderNumberField("transitionDurationMs", false, controller.getFrameProperty, controller.setFrameProperty, false, 0.1, 1000),

            h("label", {for: "field-transitionTimingFunction"}, _("Timing function")),
            this.renderSelectField("transitionTimingFunction", controller.getLayerProperty, controller.setLayerProperty, {
                "linear":     _("Linear"),
                "ease":       _("Ease"),
                "easeIn":     _("Ease in"),
                "easeOut":    _("Ease out"),
                "easeInOut":  _("Ease in-out"),
                "stepStart":  _("Step start"),
                "stepEnd":    _("Step end"),
                "stepMiddle": _("Step middle")
            }),

            h("label", {for: "field-transitionRelativeZoom"}, _("Relative zoom (%)")),
            this.renderNumberField("transitionRelativeZoom", false, controller.getLayerProperty, controller.setLayerProperty, true, 1, 0.01),

            h("label.side-by-side", {for: "field-transitionPathId"}, [
                _("Path Id"),
                this.renderToggleField(h("i.fa.fa-eye-slash"), _("Hide path"), "transitionPathHide", controller.getLayerProperty, controller.setLayerProperty)
            ]),
            this.renderTextField("transitionPathId", false, controller.getLayerProperty, controller.setLayerProperty, true),

            h("h1", [_("Notes"), this.renderHelp(_("Edit presenter notes. Click here to show the list of formatting shortcuts."), () => controller.info(NOTES_HELP, true))]),

            this.renderRichTextField("notes", false, controller.getFrameProperty, controller.setFrameProperty, true),

            h("h1", _("Custom stylesheets and scripts")),

            h("input.custom-css-js", {
                type: "file",
                accept: "text/css, text/javascript",
                onChange(evt) {
                    if (evt.target.files.length) {
                        controller.addCustomFile(evt.target.files[0].path);
                    }
                }
            }),
            h("table.custom-css-js", [
                h("tr", [
                    h("th", controller.getCustomFiles().length ? _("CSS or JS file names") : _("Add CSS or JS files")),
                    h("td", [
                        h("button", {
                            title: _("Add a file"),
                            onClick() {
                                // Open the file chooser.
                                document.querySelector(".properties input.custom-css-js").dispatchEvent(new MouseEvent("click"));
                            }
                        }, h("i.fa.fa-plus"))
                    ])
                ]),
                controller.getCustomFiles().map((name, index) =>
                    h("tr", [
                        h("td", name),
                        h("td", [
                            h("button", {
                                title: _("Remove this file"),
                                onClick() { controller.removeCustomFile(index); }
                            }, h("i.fa.fa-trash"))
                        ])
                    ])
                )
            ]),

            h("h1", _("Player")),

            h("div.side-by-side", [
                _("Support the browser's \"Back\" button to move to the previous frame"),
                this.renderToggleField(h("i.fa.fa-arrow-circle-left"), _("Moving from one frame to another will change the content of the location bar automatically."), "updateURLOnFrameChange", controller.getPresentationProperty, controller.setPresentationProperty)
            ]),

            h("div.side-by-side", [
                _("Allow to control the presentation"),
                h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseNavigation", controller.getPresentationProperty, controller.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardNavigation", controller.getPresentationProperty, controller.setPresentationProperty)
                ])
            ]),

            h("div.side-by-side", [
                _("Allow to move the camera"),
                this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseTranslation", controller.getPresentationProperty, controller.setPresentationProperty)
            ]),

            h("div.side-by-side", [
                _("Allow to rotate the camera"),
                h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseRotation", controller.getPresentationProperty, controller.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardRotation", controller.getPresentationProperty, controller.setPresentationProperty)
                ])
            ]),

            h("div.side-by-side", [
                _("Allow to zoom"),
                h("span.btn-group", [
                    this.renderToggleField(h("i.fa.fa-mouse-pointer"), _("using the mouse"), "enableMouseZoom", controller.getPresentationProperty, controller.setPresentationProperty),
                    this.renderToggleField(h("i.fa.fa-keyboard-o"), _("using the keyboard"), "enableKeyboardZoom", controller.getPresentationProperty, controller.setPresentationProperty)
                ])
            ])
        ]);
    }

    /** Render the properties view for a presentation-wide narrative.
     *
     * Three properties will be configured:
     *   1. narrativeType: the audio tag type; this field is a hint to
     *      guide user in selection of an appropriate format, although
     *      the browser can automatically detect the correct type by
     *      itself. If this value is set to "none", narration will be
     *      disabled. If it is set to flac or ogg, the corresponding
     *      mimetype will be set for the <audio> type:
     *        audio/flac or audio/ogg
     *   2. narrativeFile: the name (or relative path) of the narrative
     *      file which must be available in side of the HTML file.
     *   3. narrativeTimeToSlide: the time-to-slide data value
     *      Check the {narrativeTimeToSlideHelp} for details.
     *
     * @returns {VNode} - A virtual DOM tree.
     */
    renderNarrationProperties() {
        const controller = this.controller;
        const _ = controller.gettext;
        const disabled = controller.presentation.narrativeType === "none";
        const toDefaultMode = () => this.toggleMode("default");

        return h("div.properties", [
            h("div.back", {
                title: _("Back to presentation properties"),
                onClick() { toDefaultMode(); }
            }, h("i.fa.fa-arrow-left", )),

            h("h1", _("Narration")),

            h("label", {for: "field-narrativeType"}, _("Narrative file type")),
            this.renderSelectField("narrativeType", controller.getPresentationProperty, controller.setPresentationProperty, {
                none: _("None (disable narration)"),
                flac: _("Free Lossless Audio Codec (FLAC)"),
                ogg:  _("Ogg (a container for Vorbis or Opus)"),
            }),

            h("label.side-by-side", {for: "field-narrativeFile"}, [
                _("Narrative file name"),
                this.renderHelp(_("Name or path of the narrative file"),
                  () => controller.info(
                    _("Name or path of the narrative file (relative to the HTML file location)"),
                    true
                  )
                )
            ]),
            this.renderTextField("narrativeFile", disabled, controller.getPresentationProperty, controller.setPresentationProperty, false),

            h("label.side-by-side", {for: "field-narrativeTimeToSlide"}, [
                _("Time to frame number mapping"),
                this.renderHelp(_("Click here to see the syntax for this field"), () => controller.info(this.narrativeTimeToSlideHelp, true))
            ]),
            this.renderTextField("narrativeTimeToSlide", disabled, controller.getPresentationProperty, controller.setPresentationProperty, false)
        ]);
    }

    /** The HTML of the help message for time-to-slide data.
     *
     * @readonly
     * @type {string}
     */
    get narrativeTimeToSlideHelp() {
        const _ = this.controller.gettext;
        return [
            _("Format of the narrative time-to-slide data:"),
            "<ul><li>" + [
                _("A string of comma-separated descriptors"),
                _("Each descriptor specifies the time instant (in seconds) which should trigger a slide transition"),
                _("Descriptor can specify the target slide number (counting from one); for this purpose the time and slide index must be separated by a colon"),
            ].join("<li>") + "</ul>",
            _("Examples:"),
            "<ul><li>" + [
                _("\"0\": Switch to the first slide when narrative is at zero second without any other slide transition"),
                _("\"0,5,7\": Switch to the 1st, 2nd, and 3rd slides at 0, 5, and 7 seconds of narrative"),
                _("\"0,5,7:1,10:4\": At time 7s, return to the 1st slide and at 10s resume to the 4th slide"),
            ].join("<li>") + "</ul>",
        ].join("<br>");
    }

    /** The HTML of the help message for include/exclude lists in export.
     *
     * @readonly
     * @type {string}
     */
    get exportListHelp() {
        const _ = this.controller.gettext;
        return [
            _("Examples of frame lists to include/exclude in export"),
            "",
            _("Select frames 2, 5, and 12: \"2, 5, 12\""),
            _("Select frames 5 to 8: \"5:8\""),
            _("Select frames 5, 8, 11, 14, and 17: \"5:8:17\""),
            _("Select frames 2, 5, and 10 to 15: \"2, 5, 10:15\"")
        ].join("<br>");
    }

    /** Render the properties view with the export tool.
     *
     * @returns {VNode} - A virtual DOM tree.
     */
    renderExportTool() {
        const controller = this.controller;
        const _ = controller.gettext;

        let exportFields, exportFn;
        switch (controller.presentation.exportType) {
            case "pdf":
                exportFields = this.renderPDFExportFields();
                exportFn     = controller.exportToPDF;
                break;
            case "pptx":
                exportFields = this.renderPPTXExportFields();
                exportFn     = controller.exportToPPTX;
                break;
            case "video":
                exportFields = this.renderVideoExportFields();
                exportFn     = controller.exportToVideo;
                break;
            default:
                exportFields = [];
                exportFn     = () => {}
        }

        const toDefaultMode = () => this.toggleMode("default");

        return h("div.properties", [
            h("div.back", {
                title: _("Back to presentation properties"),
                onClick() { toDefaultMode(); }
            }, h("i.fa.fa-arrow-left", )),

            h("h1", _("Export")),

            h("label", {for: "field-exportType"}, _("Document type")),
            this.renderSelectField("exportType", controller.getPresentationProperty, controller.setPresentationProperty, {
                pdf: _("Portable Document Format (PDF)"),
                pptx: _("Microsoft PowerPoint (PPTX)"),
                video: _("Video")
            }),

            exportFields,

            h("div.btn-group", [
                h("button", {
                    title: _("Export the presentation"),
                    disabled: controller.exporting,
                    onClick() { exportFn.call(controller); }
                }, [_("Export"), controller.exporting ? h("span.spinner") : null])
            ])
        ]);
    }

    /** Render the fields of the PDF export tool.
     *
     * @returns {VNode[]} - Virtual DOM nodes with the PDF-specific fields of the export tool.
     */
    renderPDFExportFields() {
        const controller = this.controller;
        const _ = controller.gettext;

        return [
            h("label", {for: "field-exportToPDFPageSize"}, _("Page size")),
            this.renderSelectField("exportToPDFPageSize", controller.getPresentationProperty, controller.setPresentationProperty, {
                A3     : _("A3"),
                A4     : _("A4"),
                A5     : _("A5"),
                Legal  : _("Legal"),
                Letter : _("Letter"),
                Tabloid: _("Tabloid")
            }),

            h("label", {for: "field-exportToPDFPageOrientation"}, _("Page orientation")),
            this.renderSelectField("exportToPDFPageOrientation", controller.getPresentationProperty, controller.setPresentationProperty, {
                landscape: _("Landscape"),
                portrait: _("Portrait")
            }),

            h("label.side-by-side", {for: "field-exportToPDFInclude"}, [
                _("List of frames to include"),
                this.renderHelp(_("Click here to see the syntax for this field"), () => controller.info(this.exportListHelp, true))
            ]),
            this.renderTextField("exportToPDFInclude", false, controller.getPresentationProperty, controller.setPresentationProperty, true),

            h("label.side-by-side", {for: "field-exportToPDFExclude"}, [
                _("List of frames to exclude"),
                this.renderHelp(_("Click here to see the syntax for this field"), () => controller.info(this.exportListHelp, true))
            ]),
            this.renderTextField("exportToPDFExclude", false, controller.getPresentationProperty, controller.setPresentationProperty, true)
        ];
    }

    /** Render the fields of the PPTX export tool.
     *
     * @returns {VNode[]} - Virtual DOM nodes with the PPTX-specific fields of the export tool.
     */
    renderPPTXExportFields() {
        const controller = this.controller;
        const _ = controller.gettext;
        return [
            h("label", {for: "field-exportToPPTXSlideSize"}, _("Slide size")),
            this.renderSelectField("exportToPPTXSlideSize", controller.getPresentationProperty, controller.setPresentationProperty, {
                "35mm"     : _("35 mm"),
                A3         : _("A3"),
                A4         : _("A4"),
                B4ISO      : _("B4 (ISO)"),
                B4JIS      : _("B4 (JIS)"),
                B5ISO      : _("B5 (ISO)"),
                B5JIS      : _("B5 (JIS)"),
                banner     : _("Banner"),
                hagakiCard : _("Hagaki Card"),
                ledger     : _("Tabloid"),
                letter     : _("Letter"),
                overhead   : _("Overhead"),
                screen16x10: _("Screen 16:10"),
                screen16x9 : _("Screen 16:9"),
                screen4x3  : _("Screen 4:3")
            }),

            h("label.side-by-side", {for: "field-exportToPPTXInclude"}, [
                _("List of frames to include"),
                this.renderHelp(_("Click here to see the syntax for this field"), () => controller.info(this.exportListHelp, true))
            ]),
            this.renderTextField("exportToPPTXInclude", false, controller.getPresentationProperty, controller.setPresentationProperty, true),

            h("label.side-by-side", {for: "field-exportToPPTXExclude"}, [
                _("List of frames to exclude"),
                this.renderHelp(_("Click here to see the syntax for this field"), () => controller.info(this.exportListHelp, true))
            ]),
            this.renderTextField("exportToPPTXExclude", false, controller.getPresentationProperty, controller.setPresentationProperty, true)
        ];
    }

    /** Render the fields of the video export tool.
     *
     * @returns {VNode[]} - Virtual DOM nodes with the video-specific fields of the export tool.
     */
    renderVideoExportFields() {
        const controller = this.controller;
        const _ = controller.gettext;

        return [
            h("label", {for: "field-exportToVideoFormat"}, _("Format")),
            this.renderSelectField("exportToVideoFormat", controller.getPresentationProperty, controller.setPresentationProperty, {
                mp4  : _("MPEG-4 (.mp4)"),
                ogv  : _("Ogg Vorbis (.ogv)"),
                webm : _("WebM (.webm)"),
                wmv  : _("Windows Media Video (.wmv)"),
                png  : _("Image sequence (.png)")
            }),

            h("label", {for: "field-exportToVideoWidth"}, _("Width (pixels)")),
            this.renderNumberField("exportToVideoWidth", false, controller.getPresentationProperty, controller.setPresentationProperty, false, 1, 1),

            h("label", {for: "field-exportToVideoHeight"}, _("Height (pixels)")),
            this.renderNumberField("exportToVideoHeight", false, controller.getPresentationProperty, controller.setPresentationProperty, false, 1, 1),

            h("label", {for: "field-exportToVideoFrameRate"}, _("Frame rate (frames/sec)")),
            this.renderNumberField("exportToVideoFrameRate", false, controller.getPresentationProperty, controller.setPresentationProperty, false, 1, 1),

            h("label", {for: "field-exportToVideoBitRate"}, _("Bit rate (kbits/sec)")),
            this.renderNumberField("exportToVideoBitRate", false, controller.getPresentationProperty, controller.setPresentationProperty, false, 1, 1000),
        ];
    }

    /** Create a help widget.
     *
     * @param {string} text - The tooltip text to show.
     * @param {Function} onclick - An event handler for click events.
     * @returns {VNode} - A virtual DOM tree.
     */
    renderHelp(text, onclick) {
        return h("span.help", {title: text, onclick}, h("i.fa.fa-question-circle"));
    }

    /** Create a text input field.
     *
     * A text field will render as a simple HTML input element.
     *
     * @param {string} property - The name of a property of the model.
     * @param {boolean} disabled - Is this field disabled?
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @param {boolean} acceptsEmpty - Is an empty field a valid entry?
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderTextField(property, disabled, getter, setter, acceptsEmpty) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] : ""};

        return h("input", {
            id: "field-" + property,
            type: "text",
            className,
            disabled,
            onchange() {
                const value = this.value;
                if (acceptsEmpty || value.length) {
                    setter.call(controller, property, value);
                }
            }
        });
    }

    /** Create a rich text input field.
     *
     * A rich text field will render as a content-editable HTML element
     * supporting basic formatting via keyboard shortcuts.
     *
     * @param {string} property - The name of a property of the model.
     * @param {boolean} disabled - Is this field disabled?
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @param {boolean} acceptsEmpty - Is an empty field a valid entry?
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderRichTextField(property, disabled, getter, setter, acceptsEmpty) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {innerHTML: values.length >= 1 ? values[values.length - 1] : ""};

        return h("section", {
            id: "field-" + property,
            contentEditable: true,
            className,
            disabled,
            onblur() {
                const value = this.innerHTML;
                if (acceptsEmpty || value.length) {
                    setter.call(controller, property, value);
                }
            },
            onkeydown(evt) {
                if (evt.ctrlKey) {
                    switch(evt.keyCode) {
                        case 48: // Ctrl+0
                            document.execCommand("formatBlock", false, "<P>");
                            break;
                        case 49: // Ctrl+1
                            document.execCommand("formatBlock", false, "<H1>");
                            break;
                        case 50: // Ctrl+2
                            document.execCommand("formatBlock", false, "<H2>");
                            break;
                        case 51: // Ctrl+3
                            document.execCommand("formatBlock", false, "<H3>");
                            break;
                        case 76: // Ctrl+L
                            document.execCommand("insertUnorderedList", false, null);
                            break;
                        case 78: // Ctrl+N
                            document.execCommand("insertOrderedList", false, null);
                            break;
                        default:
                            return;
                        // Natively supported shortcuts:
                        // Ctrl+B|I|U : Bold, Italic, Underline
                        // Ctrl+A     : Select all
                        // Ctrl+C|X|V : Copy, Cut, Paste
                    }
                    evt.stopPropagation();
                }
            }
        });
    }

    /** Create a number input field.
     *
     * @param {string} property - The name of a property of the model.
     * @param {boolean} disabled - Is this field disabled?
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @param {boolean} signed - Does this field acccept negative values?
     * @param {number} step - The step between consecutive values.
     * @param {number} factor - A conversion factor between field value and model property value.
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderNumberField(property, disabled, getter, setter, signed, step, factor) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] / factor : 0}; // TODO use default value

        return h("input", {
            id: "field-" + property,
            type: "number",
            className,
            disabled,
            min: signed ? undefined : 0,
            step,
            pattern: "[+-]?\\d+(\\.\\d+)?",
            onchange() {
                const value = parseFloat(this.value);
                if (!isNaN(value) && (signed || value >= 0)) {
                    setter.call(controller, property, value * factor);
                }
            }
        });
    }

    /** Create a range input field.
     *
     * @param {string} property - The name of a property of the model.
     * @param {boolean} disabled - Is this field disabled?
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @param {number} min - The minimum supported value.
     * @param {number} max - The maximum supported value.
     * @param {number} step - The step between consecutive values.
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderRangeField(property, disabled, getter, setter, min, max, step) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        const className = values.length > 1 ? "multiple" : undefined;
        this.state[property] = {value: values.length >= 1 ? values[values.length - 1] : (min + max) / 2}; // TODO use default value

        return h("input", {
            id: "field-" + property,
            type: "range",
            title: this.state[property].value,
            min,
            max,
            step,
            className,
            disabled,
            onchange() {
                const value = parseFloat(this.value);
                if (!isNaN(value) && value >= min && value <= max) {
                    setter.call(controller, property, value);
                }
            }
        });
    }

    /** Create a toggle button.
     *
     * @param {string} label - The label to show next to the button.
     * @param {string} title - A tooltip for the button.
     * @param {string} property - The name of a property of the model.
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderToggleField(label, title, property, getter, setter) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        let className = values.length > 1 ? "multiple" : "";
        const value = values.length >= 1 ? values[values.length - 1] : false; // TODO use default value
        if (value) {
            className += " active";
        }

        return h("button", {
            className,
            title,
            onclick() {
                setter.call(controller, property, !value);
            }
        }, label);
    }

    /** Create a drop-down list.
     *
     * @param {string} property - The name of a property of the model.
     * @param {Function} getter - A function that returns the current value of the property in the model.
     * @param {Function} setter - A function that updates the value of the property in the model.
     * @param {object} options - An object that maps option keys to option labels.
     * @returns {VNode} - A virtuel DOM tree.
     */
    renderSelectField(property, getter, setter, options) {
        const controller = this.controller;

        const values = asArray(getter.call(controller, property));
        const className = values.length > 1 ? "multiple" : undefined;
        const value = values.length >= 1 ? values[values.length - 1] : options[0];

        return h("select", {
                id: "field-" + property,
                className,
                onchange() {
                    setter.call(controller, property, this.value);
                }
            }, Object.keys(options).map(optionValue => h("option", {
                    value: optionValue,
                    selected: value === optionValue
                }, options[optionValue])
            )
        );
    }
}
