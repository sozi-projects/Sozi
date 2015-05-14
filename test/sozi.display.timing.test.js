window.addEventListener("load", function () {
    "use strict";

    var timingFunctions = {
        linear: "rgb(0, 0, 0)",
        ease: "rgb(255, 0, 0)",
        easeIn: "rgb(200, 100, 0)",
        easeInOut: "rgb(100, 0, 200)",
        easeOut: "rgb(0, 100, 200)",
        stepStart: "rgb(0, 200, 100)",
        stepEnd: "rgb(100, 200, 0)"
    };

    var canvas = document.querySelector("canvas");
    var ctx = canvas.getContext("2d");

    for (var name in timingFunctions) {
        var f = sozi.display.timing[name];

        ctx.strokeStyle = timingFunctions[name];
        ctx.beginPath();
        for (var x = 0; x < canvas.width; x ++) {
            ctx.lineTo(x, canvas.height * (1 - f(x / canvas.width)));
        }
        ctx.stroke();
    }
}, false);