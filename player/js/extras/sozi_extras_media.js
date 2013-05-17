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

this.addEventListener("load", function () {
	var	svgNs = "http://www.w3.org/2000/svg",
	    soziNs = "http://sozi.baierouge.fr",
		xhtmlNs = "http://www.w3.org/1999/xhtml",
		window = this,
		document = window.document,
		mediaSources = [],
		mediaList, i, j, k, rect, foreignObject,
		html, htmlMedia, htmlSource;
	
    function clickHandler(evt) {
        evt.stopPropagation();
    }
    
    function registerFrameChangeHandler(htmlMedia, startFrame, stopFrame) {
        sozi.events.listen("sozi.player.framechange", function(index) {
            var frameId = sozi.document.frames[index].id;
		    if (frameId === startFrame) {
		        htmlMedia.play();
			}
            else if (frameId === stopFrame) {
                htmlMedia.pause();
            }
		});
    }
    
	mediaSources.push(document.getElementsByTagNameNS(soziNs, "video"));
	mediaSources.push(document.getElementsByTagNameNS(soziNs, "audio"));

	mediaList = [];
	for (k = 0; k < mediaSources.length; k += 1) {
	    for (i = 0; i < mediaSources[k].length; i += 1) {
		    rect = mediaSources[k][i].parentNode;
	
		    // Create HTML media source element
		    htmlSource = document.createElementNS(xhtmlNs, "source");
		    htmlSource.setAttribute("type", mediaSources[k][i].getAttributeNS(soziNs, "type"));
		    htmlSource.setAttribute("src", mediaSources[k][i].getAttributeNS(soziNs, "src"));

		    for (j = 0; j < mediaList.length; j += 1) {
			    if (mediaList[j].rect === rect) {
				    break;
			    }
		    }
	
		    if (j === mediaList.length) {
		        rect.setAttribute("visibility", "hidden");
		        
			    // Create HTML media element
			    htmlMedia = document.createElementNS(xhtmlNs, mediaSources[k][i].localName);
			    htmlMedia.setAttribute("controls", "controls");
			    if (mediaSources[k][i].localName === "video") {
			        htmlMedia.setAttribute("width", rect.getAttribute("width"));
			        htmlMedia.setAttribute("height", rect.getAttribute("height"));
			    }
		        htmlMedia.addEventListener("click", clickHandler, false);
		        htmlMedia.addEventListener("contextmenu", clickHandler, false);
		        
			    // Create HTML root element
			    html = document.createElementNS(xhtmlNs, "html");
			    html.appendChild(htmlMedia);
		
			    // Create SVG foreign object
			    foreignObject = document.createElementNS(svgNs, "foreignObject");
			    foreignObject.setAttribute("x", rect.getAttribute("x"));
			    foreignObject.setAttribute("y", rect.getAttribute("y"));
			    foreignObject.setAttribute("width", rect.getAttribute("width"));
			    foreignObject.setAttribute("height", rect.getAttribute("height"));
			    foreignObject.appendChild(html);
				
			    rect.parentNode.insertBefore(foreignObject, rect.nextSibling);
			
			    if (mediaSources[k][i].hasAttributeNS(soziNs, "start-frame")) {
			        registerFrameChangeHandler(htmlMedia,
			            mediaSources[k][i].getAttributeNS(soziNs, "start-frame"),
			            mediaSources[k][i].getAttributeNS(soziNs, "stop-frame")
			         );
			    }
			
			    mediaList.push({
				    rect: mediaSources[k][i].parentNode,
				    htmlMedia: htmlMedia
			    });
		    }
	    
    		// Append HTML source element to current HTML media element
    		mediaList[j].htmlMedia.appendChild(htmlSource);
	    }
	}				
}, false);
