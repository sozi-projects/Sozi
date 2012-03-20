/*
 * sozi.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Ahmad Syazwan
 *
 */
//@ sourceURL=extensions/sozi/sozi.js
// Constants

var SVGNS = 'http://www.w3.org/2000/svg';
var SOZINS = 'http://sozi.baierouge.fr';
var XLINKNS = 'http://www.w3.org/1999/xlink';
var XMLNS = "http://www.w3.org/2000/xmlns/"; //inkscape-sozi uses SVGNS for both xmlns and xmlns:svg

var Sozi = (function() {
	var Sozi_ = (function() {

		return {

			VERSION : "11.10-08184441", //Use sozi player's version
			NSNAME  : "sozi", //Probably want short strings for production unless we gzip
			EXTPATH : "extensions/sozi/", //Location of sozi player and css

			ATTRIBUTES : [  //refid not included as that is assigned automatically
						  "title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
						  "transition-duration-ms", "transition-zoom-percent", "transition-profile"
						 ],

			PROFILES :  [   //Transition profiles
							"linear",
							"accelerate", "strong-accelerate",
							"decelerate", "strong-decelerate",
							"accelerate-decelerate", "strong-accelerate-decelerate",
							"decelerate-accelerate", "strong-decelerate-accelerate"
						],

			EMBED : true,

			_NS : function(ns, attr) {
				return ns + ':' + attr;
			},

			_addSoziNS : function(attr) {
				return this.NSNAME + ':' + attr;
			},

			generateSVGTag : function() {
				var svg = document.createElementNS(SVGNS, 'svg');
				svg.setAttribute('xmlns', XMLNS);
				svg.setAttributeNS(XMLNS, 'xmlns:svg', SVGNS);
				svg.setAttributeNS(XMLNS, 'xmlns:xlink', XLINKNS);
				svg.setAttributeNS(XMLNS, this._NS('xmlns', this.NSNAME), SOZINS);
				svg.id = 'svg-' + Math.floor(Math.random() * 0xBEEF);

				return svg;
			},

			init : function(svg){
				this.frames = [];
				this.doc = $(svg).clone(false)[0];
			},

			exec : function() {
				this.upgrade_or_install("script");
				this.upgrade_or_install("style");
				this.upgrade_document();
				this.analyze_document();
			},

			upgrade_or_install : function (tag) {
				var latest_version_found = false;
				var attr = ("version");

				$elements = $(tag, "svg").filter(function(){ return this.id.match(/^sozi-(script|style)$/); });

				var sozi = this;
				$.each($elements, function(i, e) {
					var version = e.getAttributeNS(SOZINS, attr);
					version = version.toString().split('-')[0];
					var version2 = sozi.VERSION.split('-')[0];

					if(version == version2) {
						latest_version_found = true;
					}
					else if(version < version2) {
						$(sozi.doc).remove(e);
					}
					else {
						alert("Document has been created using a higher version of Sozi. Please upgrade.");
						return false;
					}
				});

				//create / update script or style
				if(! latest_version_found) {
					var ext = (tag == "script") ? ".js" : ".css";
					var path = this.EXTPATH + "player" + ext;

					//Create:
					//<script id="sozi-script" sozi:version="X">...</script>
					//or
					//<style id="sozi-style" sozi:version="X">...</style>
					//Commented below is an example of the (symantically) wrong way to do this.
					//It will create HTMLScriptElement instead of SVGScriptElement. It'll still work though.
			//      $e = $('<'+tag+' id="sozi-'+tag+'" ' +
			//              this._addSoziNS('version') + '="' + this.VERSION + '" ' +
			//              'xlink:href="' + path +
			//              '"/>');
					var e = document.createElementNS(SVGNS, tag);
					e.id = this.NSNAME + '-' + tag;
					e.setAttributeNS(XMLNS, 'xmlns:' + this.NSNAME, SOZINS);
					e.setAttributeNS(SOZINS, this.NSNAME + ':version', this.VERSION);

					if(this.EMBED === false) e.setAttributeNS(XLINKNS, 'xlink:href', path);
					else {
						$.ajax({
							url: path,
							async: false,
							dataType: 'text',
							success: function(data, txtStatus, xmlreq) {
								e.textContent = data;
							},
						});
					}

					this.doc.appendChild(e);
				}

				//Done!
			},

			upgrade_document : function() {
				//get designated frames, strip them all out and put into a newly created sozi:frame

				$frames = $(this.doc.getElementsByClassName('sozi-frame')).removeAttr('class');

				var frame = "";
				var sozi = this;
				$.each($frames, function(i, o){
					//create our frame:
					//<sozi:frame ... />
					frame = document.createElementNS(SOZINS, 'frame');
					frame.setAttributeNS(SOZINS, sozi.NSNAME + ':refid', $frames[i].id);
					sozi.doc.appendChild(frame);

					//transfer sozi attributes from placeholder element to frame
					$.each(sozi.ATTRIBUTES, function(j, attr) {
						aVal = o.getAttributeNS(SOZINS, attr);

						if(aVal !== null) {
							o.removeAttributeNS(SOZINS, attr);
							frame.setAttributeNS(SOZINS, sozi._NS(sozi.NSNAME, attr), aVal);
						}
					});

				});

				//Done!

			},

			// Analyze the document and collect information about the presentation.
			// Frames with no corresponding SVG element are removed.
			// Frames numbers are updated if needed.
			analyze_document : function() {
			//    var $frames = $(this.NSNAME + '\\:frame'); //not sure if this selector works on jQ > 1.4
				$frames = this.doc.getElementsByTagNameNS(SOZINS, 'frame');
				this.frames = [];

				var sozi = this;
				var toRemove = [];
				$.each($frames, function(i, f) {
					if(! f.hasAttributeNS(SOZINS, 'refid')) {
						toRemove.push(f);  //mark for removal of orphan frame, no refid
					}
					else {
						var refid = f.getAttributeNS(SOZINS, 'refid');
						sozi.frames.push({
							"frame_element": f,
							"svg_element": refid
						});
					}
				});

				for(var i = 0; i < toRemove.length; i++)
					sozi.doc.removeChild(toRemove[i]);

			//      # Sort frames by sequence attribute
			//      sequence_attr = inkex.addNS("sequence", "sozi")
			//      self.frames = sorted(self.frames, key=lambda f:
			//          int(f["frame_element"].attrib[sequence_attr]) if sequence_attr in f["frame_element"].attrib else len(self.frames))
				//We can skip sequence sorting as it's only important in UI and should probably be done there?
				//TODO: this.frames sorting

			//      # Renumber frames
			//      for i, f in enumerate(self.frames):
			//          f["frame_element"].set(inkex.addNS("sequence", "sozi"), unicode(i+1))
				//Renumber - do we actually need to?
				//TODO: Renumber sequence

			},

			// Swap frames with the given indices.
			swap_frames : function(first, second) {
				//Swap sequence
				this.frames[first]["frame_element"].setAttributeNS(SOZINS, this.NSNAME + ':sequence', second + 1);
				this.frames[second]["frame_element"].setAttributeNS(SOZINS, this.NSNAME + ':sequence', first + 1);

				//Swap frames
				var tmp = this.frames[first];
				this.frames[first] = this.frames[second];
				this.frames[second] = tmp;
			},

			// Create a new frame using the SVG element of the frame at the given index.
			// The new frame is not added to the document.
			create_new_frame : function(index) {
				var svgEle;
				if(index >= 0 && index < this.frames.length) svgEle = this.frames[index]['svg_element'];
				else return;

				var frameEle = document.createElementNS(SOZINS, 'frame');
				frameEle.setAttributeNS(SOZINS, this.NSNAME + ':refid', svgEle.id);
				frameEle.setAttributeNS(SOZINS, this.NSNAME + ':sequence', this.frames.length);

				var frame = {
					"frame_element" : frameEle,
					"svg_element"   : svgEle
				}

				return frame;
			},

			// Add the given frame to the document.
			add_frame : function(frame) {
				this.doc.appendChild(frame["frame_element"]);
				this.frames.push(frame);
			},

			// Insert the given frame at the given index.
			insert_frame : function(index, frame) {
				this.doc.appendChild(frame["frame_element"]);
				this.frames.splice(index, 0, frame);
				this.renumber_from_index(index);
			},

			// Remove the frame at the given index from the document.
			delete_frame : function(index) {
				this.doc.removeChild(this.frames[index]["frame_element"]);
				this.frames.splice(index, 1);
				this.renumber_from_index(index);
			},

			// Renumber sozi sequence from given index. Only used internally
			renumber_from_index : function(index) {
				if(index <= 0) return;

				var range = this.frames.length - index;

				for(var i = index; i <= range; i++) {
					this.frames[i]["frame_element"].setAttributeNS(SOZINS, this.NSNAME + ':sequence', i + 1);
				}
			},

			apply_to_svg_element : function(ele, attrs) {
				var sozi = this;

				$.each(attrs, function(k, v) {
					if(sozi.ATTRIBUTES.indexOf(k) >= 0) {
						ele.setAttributeNS(SOZINS, sozi._NS(sozi.NSNAME, k), v);
					}
				});

				ele.setAttribute('class', 'sozi-frame');
			},

			strip_sozi_from_element : function(ele) {
				var sozi = this;

				$.each(sozi.ATTRIBUTES, function(i, attr) {
					ele.removeAttributeNS(SOZINS, attr);
				});

				ele.removeAttributeNS(SOZINS, 'refid');
				ele.removeAttribute('class');
			}

		}

	})();

	return function() { return Sozi_; }

})();

/*vim: tabstop=8:softtabstop=8:shiftwidth=8:noexpandtab */
