namespace("sozi.editor.view", function (exports) {

    exports.Properties = sozi.model.Object.create({

        init: function (pres, selection) {
            sozi.model.Object.init.call(this);

            this.selection = selection;

            pres.addListener("frameChanged", this.render, this);
            selection.addListener("changed", this.render, this);

            return this;
        },

        render: function () {
            $("#right #frame-title").removeClass("multiple").prop("disabled", false).val("");

            if (this.selection.selectedFrames.length) {
                var title = null;
                this.selection.selectedFrames.forEach(function (frame, index) {
                    if (!index) {
                        title = frame.title;
                    }
                    else if (title !== frame.title) {
                        title = null;
                    }
                });
                if (title) {
                    $("#right #frame-title").val(title);
                }
                else {
                    $("#right #frame-title").addClass("multiple");
                }
            }
            else {
                $("#right #frame-title").prop("disabled", true);
            }
        }
    });
});
