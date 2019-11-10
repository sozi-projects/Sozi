
let previews = [
    { index:  0 },
    { index: -1 },
    { index:  1 }
];

let presWindow;
let presLength = 0;

function updatePreview(p) {
    if (p.index >= 0 && p.index < presLength) {
        p.window.postMessage({name: "jumpToFrame", args: [p.index]}, "*");
    }
    else {
        p.window.postMessage({name: "enableBlankScreen"}, "*");
    }
}

function updateFrameData({index, title, notes}) {
    document.querySelector(".sozi-current-index").innerHTML = index + 1;
    document.querySelector(".sozi-presentation-length").innerHTML = presLength;
    document.querySelector(".sozi-notes-title").innerHTML = title;
    if (typeof notes === "string") {
        document.querySelector(".sozi-notes-body").innerHTML = notes;
    }
}

window.addEventListener("message", evt => {
    switch (evt.data.name) {
        case "loaded":
            presLength = evt.data.length;
            evt.source.postMessage({
                name: evt.source === presWindow ?
                    "notifyOnFrameChange" :
                    "setPresenterMode"
            }, "*");
            break;

        case "frameChange":
            previews[0].index = evt.data.index;
            previews[1].index = evt.data.index - 1;
            previews[2].index = evt.data.index + 1;
            previews.forEach(updatePreview);
            updateFrameData(evt.data);
    }
});

window.addEventListener("load", () => {
    const iframes = document.querySelectorAll("iframe");

    // Initialize the iframes that show the previous, current, and next frames.
    previews.forEach((p, i) => {
        p.window = iframes[i].contentWindow;
        p.window.postMessage({name: "notifyOnLoad"}, "*");
    });

    // Open a new window for the main presentation view.
    presWindow = window.open(document.querySelector("iframe").src, "sozi-presentation", "width=600, height=400, scrollbars=yes");
    try {
        presWindow.focus();
        presWindow.postMessage({name: "notifyOnLoad"}, "*");

        document.getElementById("sozi-previous-btn").addEventListener("click", () => {
            presWindow.postMessage({name: "moveToPrevious"}, "*");
        }, false);

        document.getElementById("sozi-next-btn").addEventListener("click", () => {
            presWindow.postMessage({name: "moveToNext"}, "*");
        }, false);
    }
    catch (e) {
        alert("Could not open presentation window. Please allow popups for this site and refresh this page.");
    }
}, false);
