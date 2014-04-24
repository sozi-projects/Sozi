
namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = sozi.player.Viewport.create({

        init: function (pres, selection) {
            sozi.player.Viewport.init.call(this, pres);

            this.selection = selection;
            this.selectionChanged(selection);

            // Setup event handlers
            var resizeHandler = this.bind(function () {
                this.setAspectRatio(parseInt($("#sozi-editor-aspect-num").val()), parseInt($("#sozi-editor-aspect-den").val()));
            });

            $("#sozi-editor-aspect-num, #sozi-editor-aspect-den").change(resizeHandler);
            $(window).resize(resizeHandler).resize();

            selection.addListener("changed", this.selectionChanged, this);
            this.addListener("stateChanged", this);

            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
                var parent = $("#sozi-editor-view-preview").parent();
                var parentWidth  = parent.innerWidth();
                var parentHeight = parent.innerHeight();

                var maxWidth  = parentWidth  - 2 * PREVIEW_MARGIN;
                var maxHeight = parentHeight - 2 * PREVIEW_MARGIN;

                var width  = Math.min(maxWidth, maxHeight * num / den);
                var height = Math.min(maxHeight, maxWidth * den / num);

                $("#sozi-editor-view-preview").css({
                    left:   (parentWidth  - width)  / 2 + "px",
                    top:    (parentHeight - height) / 2 + "px",
                    width:  width + "px",
                    height: height + "px"
                });

                this.resize();

                this.fire("aspectRatioChanged", num, den);
            }
            return this;
        },

        selectionChanged: function (selection) {
            if (selection.currentFrame) {
                this.cameraStates = selection.currentFrame.cameraStates;
            }
            // A camera is selected if its layer belongs to the list of selected layers
            // or if its layer is not managed and the default layer is selected.
            this.cameras.forEach(function (camera) {
                camera.selected = selection.hasLayer(camera.layer);
            });
        },

        stateChanged: function () {
            var frame = this.selection.currentFrame;
            if (frame) {
                frame.cameraStates = this.cameraStates;
            }
            // TODO choose reference SVG element for frame
            // getIntersectionList(SVGRect, SVGElement)
            // getEnclosureList(SVGRect, SVGElement)
        }
    });
});
