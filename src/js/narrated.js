
window.addEventListener("load", () => {
    const narrative = document.getElementById("narrative")

    const timeToSlide = (() => {
        const timeToSlide = new Map()
        let prevSlide = 0
        for (const x of narrative.dataset.timeToSlide.split(",")) {
            const [time, slide] = x.split(":")
            prevSlide = parseInt((slide === undefined) ? prevSlide+1 : slide)
            timeToSlide.set(parseInt(time), prevSlide - 1)
        }
        return timeToSlide
    })()
    const slideToTimeIntervals = (() => {
        const slideToTimeIntervals = new Map()
        const process = (start, end, slide) => {
            let timeIntervals = slideToTimeIntervals.get(slide)
            if (timeIntervals === undefined) {
                timeIntervals = []
                slideToTimeIntervals.set(slide, timeIntervals)
            }
            timeIntervals.push([start, end])
        }
        let start, slide
        for (const [end, nextSlide] of timeToSlide) {
            if (start === undefined) {
                start = end
                slide = nextSlide
                continue
            }
            process(start, end, slide)
            start = end
            slide = nextSlide
        }
        if (start !== undefined) {
            process(start, Number.POSITIVE_INFINITY, slide)
        }
        return slideToTimeIntervals
    })()

    let currentSlide = 0

    const updateAudio = (newSlide) => {
        currentSlide = newSlide
        const timeIntervals = slideToTimeIntervals.get(newSlide)
        if (timeIntervals === undefined) {
            narrative.pause()
            return
        }
        const t = narrative.currentTime
        let nearestTime
        for (const [start, end] of timeIntervals) {
            if (start <= t && t < end) {
                return
            }
            if (nearestTime === undefined || start <= t) {
                nearestTime = start
            }
        }
        narrative.currentTime = nearestTime
    }
    const updateSlide = (target) => {
        const t = narrative.currentTime
        let targetSlide = 0
        for (const [time, slide] of timeToSlide) {
            if (time <= t) {
                targetSlide = slide
            }
        }
        if (targetSlide !== currentSlide) {
            currentSlide = targetSlide
            target.postMessage({name:"moveToFrame", args: [currentSlide]},"*")
        }
    }
    window.addEventListener("message", (e) => {
        switch(e.data.name) {
            case "loaded":
                const target = e.source
                target.postMessage({name:"notifyOnFrameChange"},"*")
                const frame = document.querySelector("iframe")
                setInterval(() => {
                    frame.focus()
                }, 1000)
                narrative.ontimeupdate = () => {
                    updateSlide(target)
                }
                break
            case "frameChange":
                updateAudio(e.data.index)
                break
        }
    })
}, false)
