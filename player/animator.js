/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2011 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 * 
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

var sozi = sozi || {};

sozi.Animator = function (timeStepMs, onStep, onDone) {
    this.timeStepMs = timeStepMs || 40;
    this.onStep = onStep;
    this.onDone = onDone;

    this.durationMs = 0;
    this.data = {};
    this.initialTime = 0;
    this.started = false;
    this.timer = 0;
};

sozi.Animator.prototype.start = function (durationMs, data) {
    this.durationMs = durationMs;
    this.data = data;

    this.initialTime = Date.now();
    this.onStep(0, this.data);

    if (!this.started) {
        this.started = true;
        this.timer = window.setInterval(this.step.bind(this), this.timeStepMs);
    }
};

sozi.Animator.prototype.stop = function () {
    if (this.started) {
        window.clearInterval(this.timer);
        this.started = false;
    }
};

sozi.Animator.prototype.step = function () {
    var elapsedTime = Date.now() - this.initialTime;
    if (elapsedTime >= this.durationMs) {
        this.stop();
        this.onStep(1, this.data);
        this.onDone();
    } else {
        this.onStep(elapsedTime / this.durationMs, this.data);
    }
};

