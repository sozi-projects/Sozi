
import os

# These lines are only needed if you don't put the script directly into
# the installation directory
import sys
# Unix
sys.path.append('/usr/share/inkscape/extensions')
# OS X
sys.path.append('/Applications/Inkscape.app/Contents/Resources/extensions')
# Windows
sys.path.append('C:\Program Files\Inkscape\share\extensions')

# We will use the inkex module with the predefined Effect base class.
import inkex

class SoziInstall(inkex.Effect):
	def __init__(self):
		inkex.Effect.__init__(self)
		inkex.NSS[u"sozi"] = u"http://sozi.baierouge.fr"

	def effect(self):
		# Find and delete old script node
		for node in self.document.xpath("//svg:script[@id='sozi-script']", namespaces=inkex.NSS):
			node.getparent().remove(node)
	
		# Create new script node
		scriptElm = inkex.etree.Element(inkex.addNS("script", "svg"))
		scriptElm.text = open(os.path.join(os.path.dirname(__file__),	"sozi.js")).read()
		scriptElm.set("id","sozi-script")
		scriptElm.set("{" + inkex.NSS["sozi"] + "}version", "1.0")
		self.document.getroot().append(scriptElm)

# Create effect instance
effect = SoziInstall()
effect.affect()

