
namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = sozi.player.Viewport.create({

        init: function (pres, selection) {
            sozi.player.Viewport.init.call(this, pres);

            this.selection = selection;

            // Setup event handlers
            var resizeHandler = this.bind(function () {
                this.setAspectRatio(parseInt($("#aspect-num").val()), parseInt($("#aspect-den").val()));
            });

            $("#aspect-num, #aspect-den").change(resizeHandler);
            $(window).resize(resizeHandler).resize();

            selection.addListener("changed", this.selectionChanged, this);
            this.addListener("stateChanged", this);

            return this;
        },

        setAspectRatio: function (num, den) {
            if (num > 0 && den > 0) {
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

                this.fire("aspectRatioChanged", num, den);
            }
            return this;
        },

        selectionChanged: function (selection) {
            if (selection.currentFrame) {
                this.state = selection.currentFrame.state;
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
                frame.state = this.state;
            }
            // TODO choose reference SVG element for frame
            // getIntersectionList(SVGRect, SVGElement)
            // getEnclosureList(SVGRect, SVGElement)
        }
    });
});
