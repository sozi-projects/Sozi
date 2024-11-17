
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
            if (evt.source === presWindow) {
                evt.source.postMessage({name: "notifyOnFrameChange"}, "*");
            }
            else {
                evt.source.postMessage({
                    name: "setPresenterMode",
                    isCurrent: evt.source === previews[0].window
                }, "*");
            }
            break;

        case "frameChange":
            previews[0].index = evt.data.index;
            previews[1].index = evt.data.index - 1;
            previews[2].index = evt.data.index + 1;
            previews.forEach(updatePreview);
            updateFrameData(evt.data);
            break;

        case "click":
            presWindow.postMessage({name: "click", id: evt.data.id}, "*");
            break;
    }
});

window.addEventListener("load", () => {
    const iframes = document.querySelectorAll("iframe");

    // Initialize the iframes that show the previous, current, and next frames.
    previews.forEach((p, i) => {
        p.window = iframes[i].contentWindow;
    });

    // Prevent the notes pane to change size when its content is updated.
    const preview = document.querySelector(".sozi-frame-preview");
    const notes = document.querySelector(".sozi-notes");
    new ResizeObserver(() => {
        notes.style.width = `calc(100vw - ${preview.offsetWidth}px`;
    }).observe(preview);

    // Open a new window for the main presentation view.
    presWindow = window.open(iframes[0].src, "sozi-presentation", "width=600, height=400, scrollbars=yes, toolbar=yes");
    try {
        presWindow.focus();

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

window.addEventListener("keydown", evt => {
    // Keys with Alt/Ctrl/Meta modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.keyCode) {
        case 36: // Home
            if (evt.shiftKey) {
                presWindow.postMessage({name: "jumpToFirst"}, "*");
            }
            else {
                presWindow.postMessage({name: "moveToFirst"}, "*");
            }
            break;

        case 35: // End
            if (evt.shiftKey) {
                presWindow.postMessage({name: "jumpToLast"}, "*");
            }
            else {
                presWindow.postMessage({name: "moveToLast"}, "*");
            }
            break;

        case 38: // Arrow up
        case 33: // Page up
        case 37: // Arrow left
            if (evt.shiftKey) {
                presWindow.postMessage({name: "jumpToPrevious"}, "*");
            }
            else {
                presWindow.postMessage({name: "moveToPrevious"}, "*");
            }
            break;

        case 40: // Arrow down
        case 34: // Page down
        case 39: // Arrow right
        case 13: // Enter
        case 32: // Space
            if (evt.shiftKey) {
                presWindow.postMessage({name: "jumpToNext"}, "*");
            }
            else {
                presWindow.postMessage({name: "moveToNext"}, "*");
            }
            break;

        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
});

window.addEventListener("keypress", evt => {
    // Keys with modifiers are ignored
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
        return;
    }

    switch (evt.charCode || evt.which) {
        case 46: // .
            presWindow.postMessage({name: "toggleBlankScreen"}, "*");
            break;

        default:
            return;
    }

    evt.stopPropagation();
    evt.preventDefault();
});
