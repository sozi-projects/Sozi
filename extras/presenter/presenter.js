
let currentFrameIndex = 0;
let previews = {
    "previous": { index: -1 },
    "current":  { index:  0 },
    "next":     { index:  1 }
};
let mainSozi;

function updatePreview(key) {
    if (previews[key].index >= 0 && previews[key].index < previews[key].sozi.presentation.frames.length) {
        previews[key].sozi.player.jumpToFrame(previews[key].index);
    }
    else {
        previews[key].sozi.player.enableBlankScreen();
    }

    if (key === "current") {
        updateNotes();
    }
}

function updateNotes() {
    document.getElementById("sozi-notes").innerHTML = previews.current.sozi.player.currentFrame.notes;
}

function updateAll() {
    for (let key of Object.keys(previews)) {
        updatePreview(key);
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
    // Initialize the iframes that show the previous, current, and next frames.
    for (let key of Object.keys(previews)) {
        const iframe = document.getElementById(`sozi-${key}-frame`);
        iframe.style.display = "inline";
        iframe.src = url;

        onSoziLoaded(iframe.contentWindow, (sozi) => {
            previews[key].sozi = sozi;
            sozi.player.pause();
            sozi.viewport.svgRoot.addEventListener("mousedown", (evt) => {
                evt.stopPropagation();
            }, true);
            updatePreview(key);
        });
    }

    // Hide the file button and show the iframes.
    document.getElementById("sozi-file-chooser").style.display = "none";
    document.getElementById("sozi-presenter").style.display    = "block";

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
    previews.current.index  = mainSozi.player.currentFrame.index;
    previews.previous.index = previews.current.index - 1;
    previews.next.index     = previews.current.index + 1;
    updateAll();
}

function next() {
    mainSozi.player.moveToNext();
}

function previous() {
    mainSozi.player.moveToPrevious();
}

window.addEventListener("load", () => {
    document.querySelector("#sozi-file-chooser input").addEventListener("change", (evt) => {
        load(window.URL.createObjectURL(evt.target.files[0]));
    }, false);
    document.getElementById("sozi-previous-btn").addEventListener("click", previous, false);
    document.getElementById("sozi-next-btn").addEventListener("click", next, false);
}, false);
