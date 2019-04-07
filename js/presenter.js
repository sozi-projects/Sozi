
let currentFrameIndex = 0;
let previews = [
    { index: -1 },
    { index:  0 },
    { index:  1 }
]
let mainSozi;

function updatePreview(p) {
    if (p.index >= 0 && p.index < p.sozi.presentation.frames.length) {
        p.sozi.player.jumpToFrame(p.index);
    }
    else {
        p.sozi.player.enableBlankScreen();
    }
}

function updateNotes() {
    const notes = previews[1].sozi.player.currentFrame.notes;
    if (typeof notes === "string") {
        document.querySelector(".sozi-notes").innerHTML = notes;
    }
}

function onSoziLoaded(win, fn) {
    function checkSozi() {
        if (win.sozi) {
            fn(win.sozi);
        }
        else {
            setTimeout(checkSozi, 1);
        }
    }
    checkSozi();
}

function load(url) {
    const iframes = document.querySelectorAll("iframe");

    // Initialize the iframes that show the previous, current, and next frames.
    previews.forEach((p, i) => {
        onSoziLoaded(iframes[i].contentWindow, (sozi) => {
            p.sozi = sozi;
            
            sozi.player.disableMedia();
            sozi.player.pause();

            sozi.presentation.enableMouseTranslation =
            sozi.presentation.enableMouseNavigation =
            sozi.presentation.enableKeyboardZoom =
            sozi.presentation.enableKeyboardRotation =
            sozi.presentation.enableKeyboardNavigation = false;

            updatePreview(p);
            if (i === 1) {
                updateNotes();
            }
        });
    });

    // Open a new window for the main presentation view.
    const presWindow = window.open(url, "sozi-presentation", "width=600, height=400, scrollbars=yes");
    try {
        presWindow.focus();
        // When the presentation is fully loaded and initialized,
        // setup the "frameChange" handler.
        onSoziLoaded(presWindow, (sozi) => {
            mainSozi = sozi;
            sozi.player.addListener("frameChange", onFrameChange);
        });
    }
    catch (e) {
        alert("Could not open presentation window. Please allow popups for this site and refresh this page.")
    }
}

function onFrameChange() {
    previews[1].index = mainSozi.player.currentFrame.index;
    previews[0].index = previews[1].index - 1;
    previews[2].index = previews[1].index + 1;
    previews.forEach(updatePreview);
    updateNotes();
}

function next() {
    mainSozi.player.moveToNext();
}

function previous() {
    mainSozi.player.moveToPrevious();
}

window.addEventListener("load", () => {
    load(document.querySelector("iframe").src);
    document.getElementById("sozi-previous-btn").addEventListener("click", previous, false);
    document.getElementById("sozi-next-btn").addEventListener("click", next, false);
}, false);
