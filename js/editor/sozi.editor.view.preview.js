
namespace("sozi.editor.view", function (exports) {
    "use strict";

    var PREVIEW_MARGIN = 15;

    exports.preview = sozi.model.Object.create({

        init: function (svgRoot) {
            sozi.model.Object.init.call(this);

            this.viewPort = sozi.display.ViewPort.create().init(svgRoot);

            // Setup event handlers
            var aspectChangeHandler = this.bind(this.onAspectChange);
            document.querySelector("#aspect-num").addEventListener("change", aspectChangeHandler, false);
            document.querySelector("#aspect-den").addEventListener("change", aspectChangeHandler, false);
            window.addEventListener("resize", aspectChangeHandler, false);

            this.onAspectChange();

            return this;
        },

        onAspectChange: function () {
            var num = parseInt(document.querySelector("#aspect-num").value);
            var den = parseInt(document.querySelector("#aspect-den").value);
            if (num > 0 && den > 0) {
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

                this.viewPort.resize();
            }
        }
    });
});
