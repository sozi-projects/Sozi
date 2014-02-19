
namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = sozi.player.Viewport.create({

        init: function (editor) {
            sozi.player.Viewport.init.call(this, editor.presentation);

            this.editor = editor;

            // Setup event handlers
            $("#aspect-num, #aspect-den").change(function () {
                var num = parseInt($("#aspect-num").val());
                var den = parseInt($("#aspect-den").val());
                editor.setAspectRatio(num, den);
            });

            $(window).resize(this.bind(function () {
                this.aspectRatioChanged(editor, editor.aspect.num, editor.aspect.den);
            })).resize();

            editor.addListener("aspectRatioChanged", this);
            editor.addListener("selectionChanged", this);
            this.addListener("stateChanged", this);

            return this;
        },

        aspectRatioChanged: function (editor, num, den) {
            var top = $("#top");
            var topWidth  = top.innerWidth();
            var topHeight = top.innerHeight();

            var maxWidth  = topWidth  - 2 * PREVIEW_MARGIN;
            var maxHeight = topHeight - 2 * PREVIEW_MARGIN;

            var width  = Math.min(maxWidth, maxHeight * num / den);
            var height = Math.min(maxHeight, maxWidth * den / num);

            var previewStyle = $("#preview").css({
                left:   (topWidth  - width)  / 2 + "px",
                top:    (topHeight - height) / 2 + "px",
                width:  width + "px",
                height: height + "px"
            });

            this.resize();
        },

        selectionChanged: function (editor) {
            if (editor.currentFrame) {
                this.state = editor.currentFrame.state;
            }
            // A camera is selected if its layer belongs to the list of selected layers
            // or if its layer is not managed and the default layer is selected.
            this.cameras.forEach(function (camera) {
                camera.selected = editor.layerIsSelected(camera.layer) ||
                    editor.layerIsSelected("default") && editor.layers.indexOf(camera.layer) < 0;
            });
        },

        stateChanged: function () {
            var frame = this.editor.currentFrame;
            if (frame) {
                frame.state = this.state;
            }
            // TODO choose reference SVG element for frame
            // getIntersectionList(SVGRect, SVGElement)
            // getEnclosureList(SVGRect, SVGElement)
        }
    });
});
