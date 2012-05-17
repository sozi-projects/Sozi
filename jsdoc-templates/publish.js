
function publish(SymbolSet) {
    var outDir = JSDOC.opt.d || SYS.pwd + "../out/jsdoc/";
	var tmplDir = JSDOC.opt.t || SYS.pwd + "../templates/jsdoc/";
	var fonts = ["TeXGyreSchola", "Iwona"];
	
	IO.mkPath(outDir);
	
	var allSymbols = SymbolSet.toArray();
	
	var data = {};
	
	data.modules = allSymbols.filter(function (sym) {
	    return sym.isNamespace;
	});
	
	data.classes = allSymbols.filter(function (sym) {
	    return sym.isa === "CONSTRUCTOR";
	});
	
	publish.symbolSet = SymbolSet;
	publish.visibilityTmpl = new JSDOC.JsPlate(tmplDir + "visibility.tmpl");
	publish.fullNameTmpl = new JSDOC.JsPlate(tmplDir + "fullName.tmpl");
	publish.dataTypeTmpl = new JSDOC.JsPlate(tmplDir + "dataType.tmpl");
	publish.functionTmpl = new JSDOC.JsPlate(tmplDir + "function.tmpl");
	publish.variableTmpl = new JSDOC.JsPlate(tmplDir + "variable.tmpl");
	
	// Generate home page
    var indexTmpl = new JSDOC.JsPlate(tmplDir + "index.tmpl");
    var indexHtml = indexTmpl.process(data);
    IO.saveFile(outDir, "index.html", indexHtml);
    
    // Copy style sheets and fonts
    IO.copyFile(tmplDir + "normalize.css", outDir);
    IO.copyFile(tmplDir + "style.css", outDir);
    
    fonts.forEach(function (fontName) {
        IO.makeDir(outDir + fontName);
        IO.ls(tmplDir + fontName).forEach(function (fileName) {
            IO.copyFile(fileName, outDir + fontName);
        });
    });
}

function summarize(desc) {
    if (typeof desc != "undefined") {
        return desc.match(/([\w\W]+?\.)[^a-z0-9_$]/i)? RegExp.$1 : desc;
    }
}

function resolveLinks(str) {
    return str.replace(/\{@link ([^} ]+) ?\}/gi,
        function(match, symbolName) {
            var html = '<a href="#' + symbolName + '" ';
            var symbol = publish.symbolSet.getSymbol(symbolName);
            if (symbol) {
                html += '>';
                if (symbol.isInner) {
                    html += symbol.name;
                }
                else {
                    html += symbol.alias;
                }
                if (symbol.isa === "FUNCTION") {
                    html += "()";
                }
            }
            else {
                html += 'class="broken">' + symbolName;
            }
            html += '</a>'
            return html;
        }
    );
}

