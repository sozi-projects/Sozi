/*
 * ext-sozi.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Ahmad Syazwan (syazwan.mdsani@24mas.com | asyazwan@gmail.com)
 *
 */
//@ sourceURL=extensions/sozi/ext-sozi.js

// Dependencies:
// 1) jQuery
// 2) sozi.js
svgEditor.addExtension("sozi_mode", function(obj) {
	//obj contains these properties:
	//  svgroot	 - editor root, we probably will never care about this
	//  svgcontent  - our canvas
	//  nonce	   - random ID assigned to this image
	//  selectorManager - selection information
	var sozi;
	var getContent = function() { return svgCanvas.getContentElem(); }
	var canvas;
	var getDrawing = function() { return svgCanvas.getCurrentDrawing(); }

	function getCheckboxBool(s) {
		if(typeof s === "string") {
			return (s === "" || s === "false") ? false : true;
		}
		//undefined returned by jq
		return false;
	}

	function getSoziAttr(svgEle, attribute, defaultValue) {
		return svgEle.getAttributeNS(SOZINS, attribute) || defaultValue;
	}

	function showSoziContext(show) {
		if(show) $("#sozi_panel").show();
		else	 $("#sozi_panel").hide();
	}

	function updateSoziAttributesUI(svgEle) {
		//TODO: The logic of extracting attr should be moved to sozi.js
		$('#framelist option:selected').text(getSoziAttr(svgEle, 'title', 'Frame'));
		$('#framelist option:selected').val(getSoziAttr(svgEle, 'sequence', 0));
		$('#sozihide')[0].checked = getCheckboxBool(getSoziAttr(svgEle, 'hide'));
		$('#soziclip')[0].checked = getCheckboxBool(getSoziAttr(svgEle, 'clip'));
		$('#sozitimeoutenabled').eq(0).attr('checked', getCheckboxBool(getSoziAttr(svgEle, 'timeout-enable')) ).change();
		$('#sozitimeout').val(getSoziAttr(svgEle, 'timeout-ms', 5000));
		$('#profilelist').val(getSoziAttr(svgEle, 'transition-profile', 'linear'));
		$('#soziprofile #soziduration').val(getSoziAttr(svgEle, 'transition-duration-ms', 1000));
		$('#soziprofile #sozizoom').val(getSoziAttr(svgEle, 'transition-zoom-percent', 0));
	}

	function updateSoziMarkerUI(htmlFrame) {
		var frame = $(canvas.getContentElem().getElementsByClassName('sozi-frame')).filter(function(i, o) {
			return o.getAttributeNS(SOZINS, 'frameid') == htmlFrame.id;
		}).eq(0);

		if(!frame) console.warn("Frame not found. This should not have happened!");
		frame = frame[0];
		var marker = document.getElementById(frame.id + '-marker');
		if(!marker) return; //Happens at frame creation
		marker.textContent = htmlFrame.value + ': ' + htmlFrame.text;
	}

	function injectHTML() {
		$('<link rel="stylesheet" type="text/css" href="extensions/sozi/editor.css">').appendTo('head');

		var html = '\
			<div id="soziframepanel">\
				<h3 id="soziframesLabel">Sozi Frames</h3>\
				<div id="soziframebuttons">\
					<div id="soziframe_new" class="soziframe_button"  title="New Frame"></div>\
					<div id="soziframe_delete" class="soziframe_button"  title="Delete Frame"></div>\
					<div id="soziframe_rename" class="soziframe_button"  title="Rename Frame"></div>\
					<div id="soziframe_up" class="soziframe_button"  title="Move Frame Up"></div>\
					<div id="soziframe_down" class="soziframe_button"  title="Move Frame Down"></div>\
					<div id="soziframe_options" class="soziframe_button"  title="Options"></div>\
				</div>\
				<select id="framelist" size="10">\
				</select>\
				<div id="soziprofile">\
					<label for="profilelist">Animation:</label>\
					<select id="profilelist" name="profilelist">\
						<option value="linear" selected="selected">linear</option>\
						<option value="accelerate">accelerate</option>\
						<option value="strong-accelerate">strong-accelerate</option>\
						<option value="decelerate">decelerate</option>\
						<option value="strong-decelerate">strong-decelerate</option>\
						<option value="accelerate-decelerate">accelerate-decelerate</option>\
						<option value="strong-accelerate-decelerate">strong-accelerate-decelerate</option>\
						<option value="decelerate-accelerate">decelerate-accelerate</option>\
						<option value="strong-decelerate-accelerate">strong-decelerate-accelerate</option>\
					</select>\
					<label for="soziduration">Duration (ms):</label>\
					<input type="text" id="soziduration" name="soziduration" value="1000"/>\
					<label for="sozizoom">Zoom (%):</label>\
					<input type="text" id="sozizoom" name="sozizoom" value="0"/>\
				</div>\
			</div>';
		$(html).insertAfter('#layerpanel');

		html = '\
			<div id="sozioptions" style="display: none;">\
				<fieldset>\
					<legend style="font-weight: bold; font-size: 1.1em; text-align: left;">Frame Options</legend>\
					<label title="For visual aid, create text markers that will attach itself to sozi frames. All markers will not be saved." for="optmarker">Create Frame Markers<input type="checkbox" id="optmarker" name="optmarker"/></label>\
					<label title="For visual aid, assign random fill colors to frames." for="optrandcolor">Randomize Frame Color<input type="checkbox" id="optrandcolor" name="optrandcolor"/></label>\
					<fieldset>\
					<legend style="font-weight: bold; font-size: 1.1em; text-align: left;">Rect &amp; Magic Frames</legend>\
					<label title="Use dashed outline for frames." for="optdashed">Dashed Frame Outline<input type="checkbox" id="optdashed" name="optdashed"/></label>\
					<label title="Use this fill color as default (random color must be off)." for="optfill">Default Fill <input type="text" size="5" maxlength="7" id="optfill" name="optfill"/></label>\
					<label title="Use this opacity as default." for="optopacity">Default Opacity <input type="text" size="1" maxlength="4" id="optopacity" name="optopacity"/></label>\
					</fieldset>\
				</fieldset>\
				<button id="optapply">Apply</button>\
			</div>\
			   ';
		var _offset = $('#soziframe_options').offset();
		var $soziOpts = $(html);
		$('#svg_editor').append($soziOpts);

		$('#optapply').click(function(){
			$soziOpts.hide();
			svgEditor.curConfig.sozi.marker = $('#optmarker')[0].checked;
			svgEditor.curConfig.sozi.random = $('#optrandcolor')[0].checked;
			svgEditor.curConfig.sozi.dashed = $('#optdashed')[0].checked;
			var fill = $('#optfill').val();
			if(fill.match(/^#(?:[a-f0-9]{3}){1,2}$/i) !== null) {
				svgEditor.curConfig.sozi.fill = fill;
			}
			var opac = parseFloat($('#optopacity').val());
			if(! isNaN(opac) && opac >= 0.0 && opac <= 1.0) {
				svgEditor.curConfig.sozi.opacity = opac;
			}
		});

		$('#soziframepanel')
			.append($('#sozi_apply'))
			.append($('#sozi_preview'));
	}

	//TODO: cleanup html injections
	function initExtension() {
		//Default configs
		svgEditor.curConfig.sozi = {
			marker: true,
			random: false,
			dashed: false,
			fill: '#000000',
			opacity: 0.3,
		};

		injectHTML();
		canvas = svgCanvas;

		$.ajaxSettings.async = false;
		$.getScript('extensions/sozi/sozi.js');
		$.ajaxSettings.async = true;

		sozi = new Sozi();
		sozi._frameLayerName = "Sozi Frames";
		sozi._markerLayerName = "Sozi Markers";

		$('#sozi_drawframe').hide().insertAfter('#tool_select');
		$('#sozi_magicframe').hide().insertAfter('#sozi_drawframe');

		//When frame is selected, find svg element associated with it and select the element if available
		$("#framelist").on('click', 'option', function() {
			var fid = this.id;

			getDrawing().setCurrentLayer(sozi._frameLayerName);
			//Currently selected Layer in the UI will not be updated. Do it manually
			if($("#layerlist .layersel .layername").text() === getDrawing().getCurrentLayerName())
			{
				$("#layerlist tr.layer")
					.removeClass("layersel")
					.filter(function(i, e){ return $(".layername", e)[0].innerHTML == getDrawing().getCurrentLayerName(); })
					.addClass("layersel");
			}

			var $svgElements = $(getContent().getElementsByClassName('sozi-frame'));

			for(var i = 0, len = $svgElements.length; i < len; i++) {
				var ele = $svgElements[i];
				if(ele.getAttributeNS(SOZINS, 'frameid') == fid) {
					canvas.selectOnly([ele]);

					//Scroll frame into view
					//Chrome 17 scrollIntoView is unreliable, sometimes it works, other times it keeps locking into 1 element only
					//FF 10 doesn't support scrollIntoView for SVG elements
					var _w = $('#workarea')[0];
					var _wWidth  = $(_w).width();
					var _wHeight = $(_w).height();
					var _wPos    = $(_w).offset();
					var _ePos    = $(ele).offset();

					if(_ePos.left > _wWidth / 2 || _ePos.left < 0) {
						_w.scrollLeft += _ePos.left - 100;
					}
					if(_ePos.top > _wHeight / 2 || _ePos.top < 0) {
						_w.scrollTop += _ePos.top - 100;
					}

					break;
				}
			};

			showSoziContext(true);
		}).on('dblclick', 'option', function() {
			$("#soziframe_rename").click();
		});

		//Initialize top context tools
		$("#tools_top").append('<div id="sozi_panel"><div class="tool_sep"></div></div>');
		$("#sozi_panel").append('<label for="sozihide">Hide:<input type="checkbox" id="sozihide" name="sozihide"/></label>');
		$("#sozi_panel").append('<label for="soziclip">Clip:<input type="checkbox" id="soziclip" name="soziclip"/></label>');
		$("#sozi_panel").append('<label for="sozitimeoutenabled">Enable timeout:<input type="checkbox" id="sozitimeoutenabled" name="sozitimeoutenabled"/></label>');
		$("#sozi_panel").append('<label for="sozitimeout">Timeout (ms):<input type="text" id="sozitimeout" name="sozitimeout" value="5000"/></label>');
		$("#sozitimeoutenabled").change(function(){
			$("#sozitimeout")[0].disabled = this.checked ? false : true;
		});

		$("#svg_editor").append('<div id="soziloadsvg" style="color: #CCC; background-color: #555; border: 3px dashed #000; padding: 10px; padding-top: 80px; display: none; position: absolute; left: 100px; top: 150px; width: 400px; height: 140px; text-align: center; border-radius: 20px">Drag &amp; drop sozi-enabled SVG file here<br/><input type="button" onclick="this.parentElement.style.display = \'none\'" value="Cancel" style="margin-top: 100px"/></div>');

		var originalBg = $(document.body).css('background-color');
		//Using jQs bind() doesn't work, do it manually since it's trivial anyway
		var dndBox = document.getElementById("soziloadsvg");
		var doNothing = function(evt) { evt.stopPropagation(); evt.preventDefault(); }

		dndBox.addEventListener("dragenter", function(evt){
			doNothing(evt);
			$("#soziloadsvg").css("background-color", "#000");
		}, false);

		dndBox.addEventListener("dragover",  doNothing, false);

		dndBox.addEventListener("dragexit",  function(evt){
			doNothing(evt);
			$("#soziloadsvg").css('cursor', 'progress').css("background-color", "#555");
		}, false);

		dndBox.addEventListener("drop", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();

			$(document.body).css("background-color", "#111");
			$("#workarea").css("cursor", "progress");

			var files = evt.dataTransfer.files; // FileList object.

			if(files.length !== 1) { $.alert("Only 1 file is expected. Received " + files.length + " instead. Try again."); return; }
			var f = files[0];
			if(f.type.toLowerCase() !== "image/svg+xml") { $.alert("Expecting *.svg file. Try again."); return; }

			var reader = new FileReader();
			reader.onload	= function(e) { readHandler(e); }
			reader.onloadend = function(e) { readEndHandler(e); }

			//Reader onload handler -- the heavy-lifting is done inside. TODO: Improve wherever possible
			var readHandler = function(e) {
				//Strip sozi script and style
				var text = e.target.result
					.replace(/<script[\s\S]*<\/script>\n?/i,'')
					.replace(/<style[\s\S]*<\/style>\n?/i,'')
					.replace(/class="sozi-layer">/, ">Sozi Frames");

				var parser = new DOMParser();
				var doc = parser.parseFromString(text, "application/xml"); //image/svg+xml will not work on FF
				var extObj = canvas.runExtensions("onSoziLoadStart", { xmlStr : text, svg : doc });

				canvas.clear();
				$("#framelist").children().remove();
				canvas.setResolution(svgEditor.curConfig.dimensions[0] || 9999, svgEditor.curConfig.dimensions[1] || 9999);
				canvas.setSvgString(text);

				//One thing left to do. Add Sozi frames in pre-generated format

				var frames = Array.prototype.slice.call(doc.getElementsByTagNameNS(SOZINS, 'frame'), 0);
				var framesEle = [];
				if(getDrawing().setCurrentLayer(sozi._frameLayerName)) {
					//1st ele always title, so we discard
					framesEle = Array.prototype.slice.call(getDrawing().getCurrentLayer().childNodes, 1);

					$.each(framesEle, function(i, e) {
						//Create new HTML frame list
						$("#soziframe_new").click()[0];

						//Import the id
						var framelistItem = $("#framelist :selected")[0];
						framelistItem.id = e.getAttributeNS(SOZINS, 'frameid');

						var importFrame = e; //Fake frame with default value which should only have sozi:frameid

						//Get imported frame by matching refid with svg-ele frame id
						var _len = frames.length;
						for(var j = 0; j < _len; j++) {
							var f = frames[j];
							if(f === undefined) continue;
							if(f.hasAttributeNS(SOZINS, 'refid') && f.getAttributeNS(SOZINS, 'refid') == e.id) {
								importFrame = f; //Found the real frame, reassign
								framelistItem.text = importFrame.getAttributeNS(SOZINS, 'title') || "Frame " + (i + 1);
								delete frames[j]; //Effort to optimize in cases of large frames[]
								break;
							}
						}

						var attrs = {
							"title"	 : importFrame.getAttributeNS(SOZINS, 'title') || framelistItem.text,
							"sequence"  : importFrame.getAttributeNS(SOZINS, 'sequence'), //Should be always present
							"hide"	  : getCheckboxBool( importFrame.getAttributeNS(SOZINS, 'hide') ),
							"clip"	  : getCheckboxBool( importFrame.getAttributeNS(SOZINS, 'clip') ),
							"timeout-enable"		 : getCheckboxBool( importFrame.getAttributeNS(SOZINS, 'timeout-enable') ),
							"timeout-ms"			 : importFrame.getAttributeNS(SOZINS, 'timeout-ms') || 5000,
							"transition-profile"	 : importFrame.getAttributeNS(SOZINS, 'transition-profile') || "linear",
							"transition-duration-ms" : importFrame.getAttributeNS(SOZINS, 'transition-duration-ms') || 1000,
							"transition-zoom-percent": importFrame.getAttributeNS(SOZINS, 'transition-zoom-percent') || 0
						}

						sozi.apply_to_svg_element(e, attrs);
						canvas.call('changed', [e]);
					});
				}
				else {
					$.alert("Failed to detect Sozi Frames layer! Existing frames will not be treated as Sozi's.");
					return;
				}

				canvas.runExtensions("onSoziLoadDone", { extObj : extObj, sozi: sozi });
				populateLayers();
			}

			//Handles UI / visual-feedback clean-up
			var readEndHandler = function(e) {
				$("#soziloadsvg").css('cursor', 'auto').css('background-color', '#555').hide();
				$(document.body).css('background-color', originalBg);

				//Currently selected Layer in the UI will not be updated. Do it manually
				$("#layerlist tr.layer")
					.removeClass("layersel")
					.filter(function(i, e){ return $(".layername", e)[0].innerHTML == getDrawing().getCurrentLayerName(); })
					.addClass("layersel");

				//Shortcut to add frame to selection
				$("#framelist :selected").click();

				//Shortcut to zoom out/in all content
				$("#fit_to_all").trigger('mousedown').trigger('mouseup');
			}

			//Do the read
			reader.readAsText(f);

		}, false);

		canvas.undoMgr.resetUndoStack();
		$('#tool_undo').addClass('disabled');
		$('#tool_redo').addClass('disabled');
	};

	function execSoziPreview() {
		sozi.doc.setAttributeNS(XMLNS, 'xmlns:svg', SVGNS);
		sozi.doc.setAttributeNS(XMLNS, 'xmlns:' + sozi.NSNAME, SOZINS);

		sozi.exec();

		var xmlStr = new XMLSerializer().serializeToString(sozi.doc);
		if(svgedit.browser.isChrome()) {
			//Hack to work around this bug which is namespace issue
			//http://code.google.com/p/chromium/issues/detail?id=88295
			if(xmlStr.match(' xmlns="') === null) xmlStr = xmlStr.replace('<svg ', '<svg xmlns="' + SVGNS + '" ');
			if(xmlStr.match(' se="http://svg-edit.googlecode.com"') !== null) xmlStr = xmlStr.replace(' se="http:', ' xmlns:se="http:');
			if(xmlStr.match(' xlink="' + XLINKNS) !== null) xmlStr = xmlStr.replace(' xlink="', ' xmlns:xlink="');
			if(xmlStr.match(' svg="' + SVGNS) !== null) xmlStr = xmlStr.replace(' svg="', ' xmlns:svg="');
			xmlStr = xmlStr.replace(/ href=/ig, " xlink:href=")
				.replace(/<frame/ig, "<sozi:frame")
				.replace(/<\/frame/ig, "</sozi:frame")
				.replace(/ sozi="/ig, " xmlns:sozi=\"")
				.replace(" version=\"" + sozi.VERSION, " sozi:version=\"" + sozi.VERSION)
				.replace(" version=\"" + sozi.VERSION, " sozi:version=\"" + sozi.VERSION)
				.replace(/ frameid=/ig, " sozi:frameid=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )refid=/ig, "$1sozi:refid=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )title=/ig, "$1sozi:title=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )sequence=/ig, "$1sozi:sequence=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )hide=/ig, "$1sozi:hide=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )clip=/ig, "$1sozi:clip=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )timeout-enable=/ig, "$1sozi:timeout-enable=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )timeout-ms=/ig, "$1sozi:timeout-ms=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-duration-ms=/ig, "$1sozi:transition-duration-ms=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-zoom-percent=/ig, "$1sozi:transition-zoom-percent=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-profile=/ig, "$1sozi:transition-profile=");
		}
		window.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.BlobBuilder;
		window.URL = window.webkitURL || window.URL;
		var bb = new BlobBuilder();
		bb.append(xmlStr);

		var f = bb.getBlob("application/xml;charset=UTF-8");
		var oURL = window.URL || window.webkitURL || null;

		var $iframe = $("#sozi_preview_iframe");
		if($iframe.length === 0) {
			var _w = $(window).width() * 0.96;
			var _h = $(window).height() * 0.84;
			var _ttip =  '.ttip { border-bottom: 1px dotted #000; color: #000; outline: none; cursor: help; text-decoration: none; position: relative;} .ttip span {margin-left: -999em; position: absolute; padding: 5px; background: #EA9;} .ttip:hover span {border-radius: 5px 5px; -moz-border-radius: 5px; -webkit-border-radius: 5px; box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.1); -webkit-box-shadow: 5px 5px rgba(0, 0, 0, 0.1); -moz-box-shadow: 5px 5px rgba(0, 0, 0, 0.1);font-family: Calibri, Tahoma, Geneva, sans-serif;position: absolute; left: 1em; top: 2em; z-index: 99;margin-left: 0; width: 500px;}';
			var _instructions = [
				'Instructions:',
				'Table of contents:  MiddleMouse, T',
				'Show Everything:  F',
				'Next frame with animation:  LeftClick, RightArrow, PageDown, Enter, Space',
				'Prev frame with animation:  RightClick, LeftArrow, PageUp',
				'Next frame without animation:  DownArrow',
				'Prev frame without animation:  UpArrow',
				'Go to first/last frame:  Home, End',
				'Rotate:  Shift+R, R',
				'Zoom in/out:  -, +, MouseWheel',
				'Free navigation:  Click and drag',
				'Move to current frame:  =',
				'* Frames may not be hidden correctly. This is a known preview-only bug.',
				].join('<br/>');

			$('<div id="sozi_preview_area" style="width: ' + _w + 'px; height: ' + _h + 'px;"></div>')
				.append('<button id="sozi_preview_close">Close</button>')
				.append('<style>' + _ttip + '</style>')
				.append('<div id="sozi_preview_desc" style="font-size: small; display: inline-block; padding: 4px 0;"><a href="#" class="ttip">Mouse over for instruction<span>' + _instructions + '</span></a></div>')
				.append('<iframe id="sozi_preview_iframe" style="width: 100%; height: 100%"></iframe>')
				.appendTo('body');
			$iframe = $("#sozi_preview_iframe");
			$('#sozi_preview_close').click(function() {
				$('#sozi_preview_area').hide()
				$('#sozi_preview_iframe')[0].src = 'about:blank';
				$('#svg_editor').show();
				oURL.revokeObjectURL(f);
				$("#fit_to_all").trigger('mousedown').trigger('mouseup');
			});
		}
		$iframe[0].src = oURL.createObjectURL(f);


		$('#sozi_preview_area').show();
		$('#sozi_preview_iframe').focus();
		$('#svg_editor').hide();
	};

	function execSoziSave() {
		sozi.doc.setAttributeNS(XMLNS, 'xmlns:svg', SVGNS);
		sozi.doc.setAttributeNS(XMLNS, 'xmlns:' + sozi.NSNAME, SOZINS);

		sozi.exec();

		var xmlStr = new XMLSerializer().serializeToString(sozi.doc);
		xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlStr;

		extStr = canvas.runExtensions("onSoziSaveBefore", { sozi: sozi, xml: xmlStr }, true);

		if(extStr.length > 0 && extStr[0]) xmlStr = extStr[0];

		//For chrome use FileSaver API so we can avoid flash
		if(svgedit.browser.isChrome()) { //Since we will declare FF + Chrome support, no need Safari detection
			if(!window.saveAs) {
				$.ajaxSettings.async = false;
				$.getScript('extensions/sozi/saveas.min.js');
				$.ajaxSettings.async = true;
			}

			//Hack to work around this bug which is namespace issue
			//http://code.google.com/p/chromium/issues/detail?id=88295
			if(xmlStr.match(' xmlns="') === null) xmlStr = xmlStr.replace('<svg ', '<svg xmlns="' + SVGNS + '" ');
			if(xmlStr.match(' se="http://svg-edit.googlecode.com"') !== null) xmlStr = xmlStr.replace(' se="http:', ' xmlns:se="http:');
			if(xmlStr.match(' xlink="' + XLINKNS) !== null) xmlStr = xmlStr.replace(' xlink="', ' xmlns:xlink="');
			if(xmlStr.match(' svg="' + SVGNS) !== null) xmlStr = xmlStr.replace(' svg="', ' xmlns:svg="');
			xmlStr = xmlStr.replace(/ href=/ig, " xlink:href=")
				.replace(/<frame/ig, "<sozi:frame")
				.replace(/<\/frame/ig, "</sozi:frame")
				.replace(/ sozi="/ig, " xmlns:sozi=\"")
				.replace(" version=\"" + sozi.VERSION, " sozi:version=\"" + sozi.VERSION)
				.replace(" version=\"" + sozi.VERSION, " sozi:version=\"" + sozi.VERSION)
				.replace(/ frameid=/ig, " sozi:frameid=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )refid=/ig, "$1sozi:refid=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )title=/ig, "$1sozi:title=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )sequence=/ig, "$1sozi:sequence=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )hide=/ig, "$1sozi:hide=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )clip=/ig, "$1sozi:clip=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )timeout-enable=/ig, "$1sozi:timeout-enable=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )timeout-ms=/ig, "$1sozi:timeout-ms=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-duration-ms=/ig, "$1sozi:transition-duration-ms=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-zoom-percent=/ig, "$1sozi:transition-zoom-percent=")
				.replace(/(<sozi:frame[a-z0-9=:"_' -]* )transition-profile=/ig, "$1sozi:transition-profile=");

			var bb = new BlobBuilder();
			bb.append(xmlStr);

			var b = bb.getBlob("application/xml;charset=UTF-8");
			$.prompt("Save file as:", "Reader.svg", function(name) {
				saveAs(b, name, function(e) { $.alert("Saved to your download folder. Chrome may prompt you to 'Keep' or 'Discard'."); });
			});
		}
		else {
			//Init Downloadify for first time
			if(!window.Downloadify) {
				$.ajaxSettings.async = false;
				$.getScript('extensions/sozi/swfobject.js');
				$.getScript('extensions/sozi/downloadify.min.js');
				$.ajaxSettings.async = true;
			}

			$.alert('File generated!<br/><div id="sozisavesvg" style="text-align: center;"></div>');

			$('#sozisavesvg').downloadify({
				swf	   :   'extensions/sozi/downloadify.swf',
				downloadImage :   'extensions/sozi/download.png',
				width	 :   100,
				height	:   30,
				filename  :   'Reader.svg',
				data	  :   function(){ return xmlStr; },
				dataType  :   'string',
				append	:  false,
				transparent:  true,
				onComplete : function(){ alert('Your File Has Been Saved!'); },
				onCancel   : function(){ alert('You have cancelled the saving of this file.'); },
				onError	: function(){ alert('You must put something in the File Contents or there will be nothing to save!'); },

			});
		}
	};

	function generateSozi(isPreview) {
		//After this point sozi will be using deep-cloned copy of our svg
		//hence there should be no jquery $() write-operation as that
		//will modify HTML document instead of our clone
		sozi.init(getContent()); //Clone

		//remove all markers
		var markers = sozi.doc.getElementsByClassName("sozi-marker");
		if(markers.length > 0) sozi.doc.removeChild(markers[0].parentNode);

		//remove sozi layer <title> as it will show when user mouse over SVG, which I doubt anyone want
		var titles = sozi.doc.getElementsByTagNameNS(SVGNS, 'title');
		if(titles.length > 0) {
			$.each(titles, function(i, t) {
				if(t.textContent == sozi._frameLayerName) {
					//Put a class for re-construction when loading sozi svg
					t.setAttributeNS(null, 'class', 'sozi-layer');
					t.textContent = '';
				}
			});
		}

		//Expecting a nested array of Deferred objects:
		//e.g. [[Deferred], [Deferred, Deferred], [Deferred]]
		var aDeferred = canvas.runExtensions(isPreview ? "onSoziGeneratePreviewBefore" : "onSoziGenerateBefore", sozi, true);

		if(aDeferred.length > 0) {
			//Flatten array
			aDeferred = aDeferred.reduce(function(a,b) { return a.concat(b); });
		}

		canvas.runExtensions(isPreview ? "onSoziGeneratePreviewAfter" : "onSoziGenerateAfter", sozi);

		return aDeferred;
	}

	function toggleUI() {
		var sidepanel = $('#soziframepanel').toggle();
		//if panel layer is not opened by default, we open it
		if(!svgEditor.curConfig.showlayers) $('#sidepanel_handle').mouseup();

		//Hide canvas background: basecamp todo_items: 119672553
		if(svgEditor.curConfig.sozi_mode === true) $("#canvasBackground").hide();
		else $("#canvasBackground").show();

		$("#sozi_drawframe").toggle();
		$("#sozi_magicframe").toggle();
	}

	//For #soziframe_xxx buttons
	function initButtons() {
		var buttons = ['new', 'delete', 'up', 'down', 'rename', 'options'];

		//Assign click event if not yet assigned
		$.each(buttons, function(i, name) {

			var eleName = '#soziframe_' + name;
			var $fl = $('#framelist');

			if($(eleName).data('events') == undefined) {
				var fn = function(){};

				switch(name) {
					case 'new':
						fn = function() {
							//Assign frame index smartly
							var i = $fl.children().length == 0 ? 1 : parseInt($fl.children().sort(function(j,k){return parseInt(k.value) - parseInt(j.value); })[0].value) + 1;
							var randId = Math.floor(Math.random() * 0xFFFF);
							$fl.append('<option id="' + randId + '"class="soziframename" value="' + i + '">Frame ' + i + '</option>');
							$fl.children().last()[0].selected = true;

							$('#profilelist').val('linear');
							$('#sozihide')[0].checked = true;
							$('#soziclip')[0].checked = true;
							$('#sozitimeoutenabled')[0].checked = false;
							$('#sozitimeout').val('5000')[0].disabled = true;
							showSoziContext(true);
						}

						break;

					case 'delete':
						fn = function() {
							var $e = $fl.children(':selected');
							if($e.length === 0) return;

							var $svgElements = $(getContent().getElementsByClassName('sozi-frame'));

							$.each($svgElements, function(i, ele) {
								if(ele.getAttributeNS(SOZINS, 'frameid') == $e[0].id) {
									ele.removeAttributeNS(SOZINS, 'frameid');
									sozi.strip_sozi_from_element(ele);
								}
							});

							$e[0].parentNode.removeChild($e[0]);

							if($fl.children().length === 0) showSoziContext(false);
						}
						break;

					case 'rename':
						fn = function() {
							var $o = $fl.children(':selected');
							if($o.length === 0) return; //No framelist selected

							$.prompt('Enter new frame name', $o[0].text, function(newName) {
								if(newName === false) return;
								newName = newName.trim();
								if(newName != "") {
									var opt = $o[0];
									opt.text = newName;
									$("#sozi_apply").click();
									updateSoziMarkerUI(opt);
								}
							});

						}
						break;

					case 'up':
					case 'down':
						fn = function() {
							var $opts = $fl.children();
							var $o = $opts.filter(':selected');
							if($o.length === 0) return;

							var idx = $opts.index($o[0]);
							if(idx === -1) return; //Not found
							if(name == 'up' && idx === 0) return; //Already at top
							if(name == 'down' && idx === $opts.length - 1) return; //Already at bottom

							var o1 = name == 'up' ? $opts[idx-1] : $opts[idx];
							var o2 = name == 'up' ? $opts[idx]   : $opts[idx+1];
							var pNode = $fl[0];

							pNode.insertBefore(o1, o2);
							pNode.insertBefore(o2, o1);

							var _tmp = o2.value;
							o2.value = o1.value;
							o1.value = _tmp;
							updateSoziMarkerUI(o1);
							updateSoziMarkerUI(o2);

							//Update svg frame DOM so the layering looks correct
							var $frames = $(canvas.getContentElem().getElementsByClassName('sozi-frame')).filter(function(i, o) {
								var fid = o.getAttributeNS(SOZINS, 'frameid');
								return (fid == o1.id || fid == o2.id);
							});

							function prevSibling(e) {
								do {
									e = e.previousSibling;
								} while(e && e.nodeType != 1); //for 1st child prev will return nodeType 3. prev for that returns null
								return e;
							}

							var _parent = $frames[0].parentNode;
							var _f1 = $frames[0];
							var _f2 = $frames[1];
							_parent.insertBefore(_f1, prevSibling(_f1));
							_parent.insertBefore(_f2, prevSibling(_f2));

							$("#sozi_apply").click();
						}
						break;

					case 'options' :
						fn = function() {
							$('#optmarker')[0].checked = svgEditor.curConfig.sozi.marker;
							$('#optrandcolor')[0].checked = svgEditor.curConfig.sozi.random;
							$('#optdashed')[0].checked = svgEditor.curConfig.sozi.dashed;
							$('#optfill').val(svgEditor.curConfig.sozi.fill);
							$('#optopacity').val(svgEditor.curConfig.sozi.opacity);
							var _offset = $('#soziframe_options').offset();
							$('#sozioptions').show().css({
								position: 'absolute',
								left: (_offset.left - $('#sozioptions').width()) + 'px',
								top : (_offset.top) + 'px',
							});
						}
						break;

					default:
						break;
				}

				$(eleName).click(fn);
			}
		});
	};

	function useLayer(layerName) {
		if(! getDrawing().hasLayer(layerName)) {
			getDrawing().createLayer(layerName);
			canvas.identifyLayers();
		}
		else if(getDrawing().getCurrentLayerName() !== layerName) {
			getDrawing().setCurrentLayer(layerName);
		}
		populateLayers();
	};

	//Borrowed from svg-edit.js (no UI API)
	function populateLayers() {
		var layerlist = $('#layerlist tbody');
		var selLayerNames = $('#selLayerNames');
		layerlist.empty();
		selLayerNames.empty();
		var currentLayerName = getDrawing().getCurrentLayerName();
		var layer = getDrawing().getNumLayers();
		var icon = $.getSvgIcon('eye');
		// we get the layers in the reverse z-order (the layer rendered on top is listed first)
		while (layer--) {
			var name = getDrawing().getLayerName(layer);
			// contenteditable=\"true\"
			var appendstr = "<tr class=\"layer";
			if (name == currentLayerName) {
				appendstr += " layersel"
			}
			appendstr += "\">";

			if (getDrawing().getLayerVisibility(name)) {
				appendstr += "<td class=\"layervis\"/><td class=\"layername\" >" + name + "</td></tr>";
			}
			else {
				appendstr += "<td class=\"layervis layerinvis\"/><td class=\"layername\" >" + name + "</td></tr>";
			}
			layerlist.append(appendstr);
			selLayerNames.append("<option value=\"" + name + "\">" + name + "</option>");
		}
		if(icon !== undefined) {
			var copy = icon.clone();
			$('td.layervis',layerlist).append(icon.clone());
			$.resizeSvgIcons({'td.layervis .svg_icon':14});
		}

		// this function highlights the layer passed in (by fading out the other layers)
		// if no layer is passed in, this function restores the other layers
		var toggleHighlightLayer = toggleHighlightLayer || function(layerNameToHighlight) {
			var curNames = new Array(getDrawing().getNumLayers());
			for (var i = 0; i < curNames.length; ++i) { curNames[i] = getDrawing().getLayerName(i); }

			if (layerNameToHighlight) {
				for (var i = 0; i < curNames.length; ++i) {
					if (curNames[i] != layerNameToHighlight) {
						getDrawing().setLayerOpacity(curNames[i], 0.5);
					}
				}
			}
			else {
				for (var i = 0; i < curNames.length; ++i) {
					getDrawing().setLayerOpacity(curNames[i], 1.0);
				}
			}
		};
		// handle selection of layer
		$('#layerlist td.layername')
			.mouseup(function(evt){
				$('#layerlist tr.layer').removeClass("layersel");
				var row = $(this.parentNode);
				row.addClass("layersel");
				canvas.setCurrentLayer(this.textContent);
				evt.preventDefault();
			})
			.mouseover(function(evt){
				$(this).css({"font-style": "italic", "color":"blue"});
				toggleHighlightLayer(this.textContent);
			})
			.mouseout(function(evt){
				$(this).css({"font-style": "normal", "color":"black"});
				toggleHighlightLayer();
			});
		$('#layerlist td.layervis').click(function(evt){
			var row = $(this.parentNode).prevAll().length;
			var name = $('#layerlist tr.layer:eq(' + row + ') td.layername').text();
			var vis = $(this).hasClass('layerinvis');
			canvas.setLayerVisibility(name, vis);
			if (vis) {
				$(this).removeClass('layerinvis');
			}
			else {
				$(this).addClass('layerinvis');
			}
		});

		// if there were too few rows, let's add a few to make it not so lonely
		var num = 5 - $('#layerlist tr.layer').size();
		while (num-- > 0) {
			// FIXME: there must a better way to do this
			layerlist.append("<tr><td style=\"color:white\">_</td><td/></tr>");
		}
	};

	return {
		name: "sozi_mode",
		svgicons: "extensions/sozi/icons.xml",

		callback: function() {
			initExtension();
			canvas.runExtensions("onSoziModeInit", null);
		},

		buttons: [
			{
				id: "sozi_mode", //must be same as icon id
				type: "context", //context or mode. Mode will appear on the left (Mode panel)
				panel: "editor_panel", //relevant only for 'context' type, the panel ID for button
				title: "Enable Sozi mode",

				events: {
					'click': function() {

						var canvas = svgCanvas;
						if ( ! $('#sozi_mode').hasClass('push_button_pressed') ) {
							svgEditor.curConfig.sozi_mode = sozi_mode = true;
							$('#sozi_mode').addClass('push_button_pressed').removeClass('tool_button');
							canvas.runExtensions("onSoziModeOn", null);
							initButtons();
							toggleUI();
						}
						else {
							svgEditor.curConfig.sozi_mode = sozi_mode = false;
							$('#sozi_mode').removeClass('push_button_pressed').addClass('tool_button');
							canvas.runExtensions("onSoziModeOff", null);
							toggleUI();
						}
					}
				}
			},
			{
				id: "sozi_apply",
				type: "context",
				panel: "soziframepanel",
				title: "Apply to element",

				events: {
					'click': function() {
						var svgElement = canvas.getSelectedElems();
						if(svgElement[0] == null) { $.alert("No elements selected"); return; }
						svgElement = svgElement[0];

						var frameOpt = $("#framelist option:selected")[0];
						if(frameOpt == undefined) { $.alert("No frame selected"); return; }

						//TODO: I really think frameid should use html5 data- since it's not part of sozi namespace
						svgElement.setAttributeNS(SOZINS, sozi.NSNAME + ':frameid', frameOpt.id);

						//Set sozi attributes to selected svg element
						var attrs = {
							"title"	 : $("#framelist option:selected").text() || "Frame",
							"sequence"  : $("#framelist option:selected").val(), //Should be always present
							"hide"	  : getCheckboxBool( $("#sozihide").eq(0).attr('checked') ),
							"clip"	  : getCheckboxBool( $("#soziclip").eq(0).attr('checked') ),
							"timeout-enable"	 : getCheckboxBool( $("#sozitimeoutenabled").eq(0).attr('checked') ),
							"timeout-ms"		 : $("#sozitimeout").val() || 5000,
							"transition-profile"	 : $("#profilelist option:selected").val() || "linear",
							"transition-duration-ms" : $("#soziprofile #soziduration").val() || 1000,
							"transition-zoom-percent": $("#soziprofile #sozizoom").val() || 0
						}
						sozi.apply_to_svg_element(svgElement, attrs);
						//Create frame layer if necessary (for supported modes other than rectframe & magicframe
						if(canvas.getMode() != 'rectframe' && canvas.getMode() != 'magicframe') {
							var _tmpLayer = getDrawing().getCurrentLayerName();
							var _soziLayer = sozi._frameLayerName;
							if(_tmpLayer != _soziLayer) {
								useLayer(_soziLayer);
								canvas.selectOnly([svgElement]);
								canvas.moveSelectedToLayer(_soziLayer);
								canvas.call('changed', [svgElement]);
								useLayer(_tmpLayer);
								showSoziContext(false);
								$('#tool_select').click();
							}
						}
						updateSoziMarkerUI(frameOpt);
					}
				}
			},
			{
				id: "sozi_preview",
				type: "context",
				panel: "soziframepanel",
				title: "Preview Sozi",

				events: {
					'click': function() {
						var aDeferred = generateSozi(true);

						$.when.apply(null, aDeferred)
							.done(execSoziPreview)
							.fail(function() { $.alert("Aborted"); });
					}
				}
			},
			{
				id: "sozi_generate",
				type: "app_menu",
				title: "Generate Sozi",

				events: {
					'click': function() {
						var aDeferred = generateSozi();

						$.when.apply(null, aDeferred)
							.done(execSoziSave)
							.fail(function() { $.alert("Aborted"); });
					}
				}
			},
			{
				id: "sozi_loadsvg",
				type: "app_menu",
				title: "Load Sozi-enabled SVG",

				events: {
					'click': function() {
						$("#soziloadsvg").toggle();
					}
				}
			},
			{
				id: "sozi_drawframe",
				type: "mode",
				title: "Draw a Sozi frame",

				events: {
					'click': function() {
						canvas.setMode('rectframe');
					}
				}
			},
			{
				id: "sozi_magicframe",
				type: "mode",
				title: "Draw a magic Sozi frame that guesses its element by selection",

				events: {
					'mouseup': function() {
						var curr = $('.tool_button_current');
						if(curr.length && curr[0].id !== 'sozi_magicframe') {
							curr.removeClass('tool_button_current').addClass('tool_button');
							$('#sozi_magicframe').addClass('tool_button_current').removeClass('tool_button');
						}
						canvas.setMode('magicframe');
					}
				}
			},
		],

		mouseDown : function(o) { //o.event, o.start_x, o.start_y, o.selectedElements
			//For rect frame borrow SE's rect functionality
			if(canvas.getMode() == 'rectframe') {
				canvas.clearSelection(true);
				canvas.setMode('rect');
				var e = new $.Event('mousedown', o.event);
				$("#svgcanvas").trigger(e);
				sozi._drawing = true;
			}
			//Handle magic frame
			if(canvas.getMode() == 'magicframe') {
				var ele = canvas.getMouseTarget(o.event);
				if(!ele) return; //Needed?
				//For our workarea, ignore
				if(ele.id == 'svgroot') {
					$.alert("Invalid element selected. Make sure you selected the right layer");
					return;
				}

				var _currentLayerName = getDrawing().getCurrentLayerName();
				if(_currentLayerName == sozi._markerLayerName || _currentLayerName == sozi._frameLayerName) {
					$.alert("Cannot magic-frame a sozi-frame or sozi-marker");
					return;
				}

				var bbox = canvas.getBBox(ele);

				var frameEle = canvas.addSvgElementFromJson({
					"element": "rect",
					"curStyles": true,
					"attr": {
						"x": bbox.x,
						"y": bbox.y,
						"width": bbox.width,
						"height": bbox.height,
						"id": canvas.getNextId()
					}
				});

				//select to trigger selectedChanged event where the magic happens
				canvas.selectOnly([frameEle]);
				//Restore layer
				useLayer(_currentLayerName);
			}
		},

		mouseMove : function(o) {
		},

		mouseUp : function(o) {
			//For rect frame borrow SE's rect functionality
			if(canvas.getMode() == 'rect' && sozi._drawing) {
				var e = new $.Event('mouseup', o.event);
				$("#svgcanvas").trigger(e);
				canvas.setMode('rectframe');
				sozi._drawing = false;
			}
		},

		onNewDocument : function() {
			$('#framelist option').remove();
			$('#profilelist').val('linear');
			$('#sozihide')[0].checked = true;
			$('#soziclip')[0].checked = true;
			$('#sozitimeoutenabled')[0].checked = false;
			$('#sozitimeout').val('5000')[0].disabled = true;
		},

		selectedChanged: function(s) { //s.elems, s.selectedElement, s.multiselected
			if(! svgEditor.curConfig.sozi_mode) return;

			//Unselect frame if multiple elements are selected, as frames are assigned only to 1 element
			if(s.multiselected) $("#framelist option:selected").eq(0).attr('selected', false);
			else {
				//Select frame assigned to this selected element
				if(s.selectedElement === null) {
					showSoziContext(false);
					return;
				}

				var e = s.selectedElement;
				if(!e) {
					showSoziContext(false);
					return;
				}

				if(! e.hasAttributeNS(SOZINS, 'frameid')) {
					//Element has no associated frame
					//If we're creating sozi frame, auto-add new frame
					//otherwise unselect frame
					if(canvas.getMode() == 'rectframe' || canvas.getMode() == 'magicframe') {
						showSoziContext(true);
						$('#soziframe_new').click();
						$('#sozi_apply').click();

						//Set random fill color to new rect for clarity
						if(svgEditor.curConfig.sozi.random) {
							var randColor = (function(h){return '#000000'.substr(0,7-h.length)+h})((~~(Math.random()*(1<<24))).toString(16));
							canvas.setColor('fill', randColor, true); //can't undo
						}
						else {
							var fill = svgEditor.curConfig.sozi.fill;
							e.setAttributeNS(null, 'fill', fill);
						}
						e.setAttributeNS(null, 'opacity', svgEditor.curConfig.sozi.opacity);

						if(svgEditor.curConfig.sozi.dashed) {
							e.setAttributeNS(null, 'stroke-dasharray', '5,2,2,2,2,2');
						}

						//Move to sozi layer
						var layerName = sozi._frameLayerName;
						useLayer(layerName);

						var pos = getDrawing().getNumLayers() - (getDrawing().hasLayer(sozi._markerLayerName) ? 2 : 1);
						canvas.setCurrentLayerPosition(pos);

						//Re-select manually because most layer-related functions will clear selection
						canvas.selectOnly([e]);
						//We don't want this to be undoable so avoid using svgCanvas moveSelectedToLayer() which doesn't the option
						getDrawing().getCurrentLayer().appendChild(e);

						//For magicframe trigger changed event to ceate text marker if necessary
						if(canvas.getMode() == 'magicframe') canvas.call('changed', [e]);

						//Broadcast SVG element
						canvas.runExtensions("onSoziFrameCreated", e);
					}
					else {
						$('#framelist option:selected').eq(0).attr('selected', false);
						showSoziContext(false);
						return;
					}
				}

				var fid = e.getAttributeNS(SOZINS, 'frameid');

				$('#framelist option#' + fid).eq(0).attr('selected', true);
				updateSoziAttributesUI(e);
				showSoziContext(true);
			}
		},

		elementChanged : function(o) {
			var elems = o.elems || [];
			if(! svgEditor.curConfig.sozi_mode) return;
			if(elems.length === 0) return;

			//TODO: Detect grouped sozi elements (maybe use Array.reduce*)
			$.each(elems, function(i, e) {
				if(e.parentNode === null) { //Element deleted
					if(e.hasAttributeNS(SOZINS, 'frameid')) {
						var eid = e.getAttributeNS(SOZINS, 'frameid');
						var $o = $("#framelist option").filter(function(i, frame){
							return frame.id.toString() === eid.toString();
						});

						var txt = document.evaluate('//svg:text[@id="' + e.id + '-marker"]', getContent(), function(){return SVGNS}, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null ).iterateNext();
						if(txt) txt.parentNode.removeChild(txt);

						if($o.length === 0) return; //Orphaned
						$("#framelist")[0].removeChild($o[0]);
					}
				}
			});

			//Handle text marker
			if(!svgEditor.curConfig.sozi.marker) return;
			for(var i = 0, _len = elems.length; i < _len; i++) {
				var e = elems[i];
				if(e.hasAttributeNS(null, 'class') && e.getAttributeNS(null, 'class') == 'sozi-frame') {
					var txt = document.evaluate('//svg:text[@id="' + e.id + '-marker"]', getContent(), function(){return SVGNS}, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null ).iterateNext();

					if(e.parentNode === null) { //Element deleted, marker orphaned
						continue;
					}

					var _xType = 'x';
					var _yType = 'y';
					if(e.toString().match(/SVGRect/i) === null) {
						_xType = 'cx';
						_yType = 'cy';
					}

					if(!txt) {
						var _supported = e.toString().match(/(SVGRect|SVGEllipse|SVGCircle)/i);
						if(_supported === null) continue;

						//Create text marker to link with this frame
						useLayer(sozi._markerLayerName);

						canvas.setCurrentLayerPosition(getDrawing().getNumLayers() - 1);

						var g = getDrawing().getCurrentLayer();

						txt = document.createElementNS(SVGNS, 'text');
						txt.textContent = e.getAttributeNS(SOZINS, 'sequence') + ': ' + e.getAttributeNS(SOZINS, 'title');
						txt.id = e.id + '-marker';
						txt.setAttributeNS(null, 'class', 'sozi-marker');

						//This is tricky... what is the best way to guess good font-size?
						var fontSize;
						fontSize = 1.2 - canvas.getResolution().zoom;
						if(fontSize <= 0.1) fontSize = 0.1;
						else if(fontSize >= 2) fontSize = 2;
						fontSize *= 100;
						txt.setAttributeNS(null, 'x', 0);
						txt.setAttributeNS(null, 'y', 0);
						txt.setAttributeNS(null, 'font-size', fontSize);
						txt.setAttributeNS(null, 'font-family', 'cursive');
						txt.setAttributeNS(null, 'dominant-baseline', 'middle');

						g.appendChild(txt);
						svgCanvas.identifyLayers();

						useLayer(sozi._frameLayerName);
					}

					//Update marker position
					var _x = +e.getAttributeNS(null, _xType) + 30;
					var _y = +e.getAttributeNS(null, _yType) + (_yType === 'y' ? 30 : -10);
					var _fontSize = fontSize || +txt.getAttributeNS(null, 'font-size') >> 0;
					var _eX = +e.getAttributeNS(null, _xType) >> 0;
					_x >>= 0; _y >>= 0;

					//Special adjustment - size bigger than some threshold will be too tall and get out of frame
					if(_yType === 'y') {
						if(_fontSize === 0) _y += 10;
						if(_fontSize >= 30) _y += _fontSize;
						if(_fontSize >= 75) _y += _fontSize;
					}
					txt.setAttributeNS(null, 'x', _x >> 0);
					txt.setAttributeNS(null, 'y', _y >> 0);

					//Handle undo/redo - add back frame to framelist panel
					if(e.hasAttributeNS(SOZINS, 'frameid')) {
						var fid = e.getAttributeNS(SOZINS, 'frameid');
						var $f = $('#framelist option#' + fid);
						var seq = e.getAttributeNS(SOZINS, 'sequence');
						var title = e.getAttributeNS(SOZINS, 'title');
						if($f.length === 0) {
							$f = $('<option id="' + fid + '"class="soziframename" value="' + seq + '">' + title + '</option>');
							$('#framelist').append($f);
						}
					}

				}
			}
		},

		zoomChanged : function(zoom) {
			if(!svgEditor.curConfig.sozi.marker) return;
			var markers = document.getElementsByClassName('sozi-marker');
			if(markers.length > 0) {
				$.each(markers, function(i, txt) {
					//This is tricky... what is the best way to guess good font-size?
					var fontSize;
					fontSize = 1.2 - zoom;
					if(fontSize <= 0.1) fontSize = 0.1;
					else if(fontSize >= 1.5) fontSize = 1.5;

					fontSize *= 100;
					fontSize >>= 0;
					txt.setAttributeNS(null, 'font-size', fontSize);

					var _y = +txt.getAttributeNS(null, 'y') >> 0;
					var e = document.evaluate('//*[@id="' + txt.id.substr(0, txt.id.indexOf('-marker')) + '"]', getContent(), function(){return SVGNS}, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null ).iterateNext();
					if(!e) return;
					var _eY = +e.getAttributeNS(null, 'y');
					txt.setAttributeNS(null, 'y', (_eY + fontSize) >> 0);
				});
			}
		},

	};
});

/*vim: tabstop=8:softtabstop=8:shiftwidth=8:noexpandtab */
