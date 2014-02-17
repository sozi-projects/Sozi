
namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.Preview = sozi.player.Viewport.create({

        init: function (editor) {
            sozi.player.Viewport.init.call(this, editor.presentation);

            // Setup event handlers
            function onAspectChange() {
                var num = parseInt(document.querySelector("#aspect-num").value);
                var den = parseInt(document.querySelector("#aspect-den").value);
                editor.setAspectRatio(num, den);
            }

            var onResize = this.bind(function () {
                this.aspectRatioChanged(editor, editor.aspect.num, editor.aspect.den);
            });

            document.querySelector("#aspect-num").addEventListener("change", onAspectChange, false);
            document.querySelector("#aspect-den").addEventListener("change", onAspectChange, false);
            window.addEventListener("resize", onResize, false);

            editor.addListener("aspectRatioChanged", this);
            editor.addListener("selectionChanged", this);

            onResize();

            return this;
        },

        aspectRatioChanged: function (editor, num, den) {
            var top = document.querySelector("#top");
            var maxWidth = top.clientWidth - 2 * PREVIEW_MARGIN;
            var maxHeight = top.clientHeight - 2 * PREVIEW_MARGIN;

            var width = Math.min(maxWidth, maxHeight * num / den);
            var height = Math.min(maxHeight, maxWidth * den / num);

            var previewStyle = document.querySelector("#preview").style;
            previewStyle.left = (top.clientWidth - width) / 2 + "px";
            previewStyle.width = width + "px";
            previewStyle.top = (top.clientHeight - height) / 2 + "px";
            previewStyle.height = height + "px";

            this.resize();
        },

        selectionChanged: function (editor, defaultLayerSelected, selectedLayers, selectedFrames) {
            // TODO select active layers in viewport
            if (selectedFrames.length) {
                this.state = selectedFrames[selectedFrames.length - 1].state;
            }
        }
    });
});
