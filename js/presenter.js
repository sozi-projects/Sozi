
let currentFrameIndex = 0;
let previews = [
    { index:  0 },
    { index: -1 },
    { index:  1 }
];

let presWindow;

function updatePreview(p) {
    p.window.postMessage({name: "jumpToFrame", index: p.index}, "*");
}

function updateNotes() {
    const notes = "TODO"; //previews[1].sozi.player.currentFrame.notes;
    if (typeof notes === "string") {
        document.querySelector(".sozi-notes").innerHTML = notes;
    }
}

window.addEventListener("message", evt => {
    switch (evt.data.name) {
        case "loaded":
            const id = evt.data.id;
            if (id === "main") {
                evt.source.postMessage({name: "notifyOnFrameChange"}, "*");
            }
            else {
                evt.source.postMessage({name: "setPresenterMode"}, "*");
                updatePreview(previews[id]);
                if (id === 0) {
                    updateNotes();
                }
            }
            break;

        case "frameChange":
            previews[0].index = evt.data.index;
            previews[1].index = evt.data.index - 1;
            previews[2].index = evt.data.index + 1;
            previews.forEach(updatePreview);
            updateNotes();
    }
});

window.addEventListener("load", () => {
    const iframes = document.querySelectorAll("iframe");

    // Initialize the iframes that show the previous, current, and next frames.
    previews.forEach((p, i) => {
        p.window = iframes[i].contentWindow;
        p.window.postMessage({name: "notifyOnLoad", id: i}, "*");
    });

    // Open a new window for the main presentation view.
    presWindow = window.open(document.querySelector("iframe").src, "sozi-presentation", "width=600, height=400, scrollbars=yes");
    try {
        presWindow.focus();
        presWindow.postMessage({name: "notifyOnLoad", id: "main"}, "*");

        document.getElementById("sozi-previous-btn").addEventListener("click", () => {
            presWindow.postMessage({name: "moveToNext"}, "*");
        }, false);

        document.getElementById("sozi-next-btn").addEventListener("click", () => {
            presWindow.postMessage({name: "moveToPrevious"}, "*");
        }, false);
    }
    catch (e) {
        alert("Could not open presentation window. Please allow popups for this site and refresh this page.");
    }
}, false);
