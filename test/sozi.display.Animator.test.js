window.addEventListener("load", function () {
    "use strict";

    var canvas = document.querySelector("canvas");
    var ctx = canvas.getContext("2d");

    var animatorDefs = [
        {durationMs: 800, startMs: 0, timingFunction: "linear", color: "red"},
        {durationMs: 800, startMs: 100, timingFunction: "ease", color: "blue"},
        {durationMs: 800, startMs: 200, timingFunction: "easeInOut", color: "magenta"},
        {durationMs: 800, startMs: 300, timingFunction: "easeIn", color: "orange"}
    ];

    var TIME_MAX = 1200;

    var perf = window.performance && window.performance.now ? window.performance : Date;

    var startTime = perf.now();

    animatorDefs.forEach(function (def, index) {
        var animator = sozi.display.Animator.create().init();

        window.setTimeout(function () {
            animator.start(def.durationMs, sozi.display.timing[def.timingFunction]);
        }, def.startMs);

        animator.addListener("step", function (self, progress) {
            var x = (perf.now() - startTime) * canvas.width / TIME_MAX;
            var y0 = (index + 1) * canvas.height / animatorDefs.length;
            var y1 = y0 - progress * 0.9 * canvas.height / animatorDefs.length;

            ctx.beginPath();
            ctx.strokeStyle = def.color;
            ctx.moveTo(x, y0);
            ctx.lineTo(x, y1);
            ctx.stroke();
        });

        animator.addListener("done", function () {
            var x = (perf.now() - startTime) * canvas.width / TIME_MAX;
            var y = (index + 0.1) * canvas.height / animatorDefs.length;
            ctx.beginPath();
            ctx.fillStyle = def.color;
            ctx.arc(x, y, 4 * canvas.width / TIME_MAX, 0, 2 * Math.PI, false);
            ctx.fill();
        });
    });
}, false);