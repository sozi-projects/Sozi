/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

namespace("sozi.document", function (exports) {
    "use strict";

    exports.Frame = sozi.model.Object.create({

        init: function (pres, state) {
            sozi.model.Object.init.call(this);

            this.presentation = pres;
            this.state = state;

            this.frameId = "frame" + this.id;
            this.title = "New frame";
            this.selected = false;

            return this;
        }
    });

    exports.Presentation = sozi.model.Object.create({

        /*
         * Initialize a Sozi document object.
         *
         * Returns:
         *    - The current presentation object.
         */
        init: function () {
            sozi.model.Object.init.call(this);

            this.frames = [];

            return this;
        },

        /*
         * Mark all frames as selected.
         *
         * Fires:
         *    - selectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        selectAllFrames: function () {
            for (var frameIndex = 0; frameIndex < this.frames.length; frameIndex ++) {
                this.selectFrame(frameIndex);
            }
            return this;
        },

        /*
         * Mark all frames as deselected.
         *
         * Fires:
         *    - deselectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        deselectAllFrames: function () {
            for (var frameIndex = 0; frameIndex < this.frames.length; frameIndex ++) {
                this.deselectFrame(frameIndex);
            }
            return this;
        },

        /*
         * Mark a frame as selected.
         *
         * Parameters:
         *    - frameIndex: The index of the frame to select
         *
         * Fires:
         *    - selectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        selectFrame: function (frameIndex) {
            this.frames[frameIndex].selected = true;
            this.fire("selectFrame", frameIndex);
            return this;
        },

        /*
         * Mark a frame as deselected.
         *
         * Parameters:
         *    - frameIndex: The index of the frame to deselect
         *
         * Fires:
         *    - deselectFrame(frameIndex)
         *
         * Returns:
         *    - The current object.
         */
        deselectFrame: function (frameIndex) {
            this.frames[frameIndex].selected = false;
            this.fire("deselectFrame", frameIndex);
            return this;
        },

        addFrame: function (state) {
            var frame = sozi.document.Frame.create().init(this, state);
            for (var frameIndex = this.frames.length - 1; frameIndex >= 0; frameIndex --) {
                if (this.frames[frameIndex].selected) {
                    this.frames.splice(frameIndex + 1, 0, frame);
                    break;
                }
            }
            if (frameIndex === -1) {
                frameIndex = this.frames.length;
                this.frames.push(frame);
            }
            this.fire("addFrame", frame, frameIndex);
            this.deselectAllFrames();
            this.selectFrame(frameIndex);
            return frame;
        }
    });
});
