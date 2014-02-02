namespace(this, "sozi", function (exports, window) {

  exports.getCurrentFrame = function() {
  	var frameIndex = context.sozi.location.getFrameIndex();
  	var frame = context.sozi.document.frames[frameIndex];

	return frame;
  }
  exports.getCurrentFrameSVG = function() {
  	var frame = exports.getCurrentFrame();
  	
	return frame.svg;
  }
  exports.getCurrentFrameNotes = function() {
  	var frameSVG = exports.getCurrentFrameSVG();
	if(frameSVG.description != null) 
		return frameSVG.description.text;

	return "";
  }
});

/*
    @depend framenumber.js
    @depend framelist.js
    @depend actions.js
    @depend player.js
    @depend display.js
    @depend document.js
    @depend location.js
    @depend links.js
*/
