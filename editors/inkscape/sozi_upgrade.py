
import os
import sys
import inkex

# Replaced automatically by the version number during the build process
SOZI_VERSION = "{{SOZI_VERSION}}"


def upgrade_or_install(context):
    upgrade_or_install_element(context, "script")
    upgrade_or_install_element(context, "style")
    upgrade_document(context)
    

def upgrade_or_install_element(context, tag):
    """
    Upgrade or install a script or a style sheet into the document.
        - tag: "script" or "style"
    Depending on the argument, the content of file "sozi.js" or "sozi.css"
    will be copied to the script or style element.
    """
    # Check version and remove older versions
    latest_version_found = False
    for elt in context.document.xpath("//svg:" + tag + "[@id='sozi-" + tag + "']", namespaces=inkex.NSS):
        version = elt.attrib[inkex.addNS("version", "sozi")]
        if version == SOZI_VERSION:
            latest_version_found = True
        elif version < SOZI_VERSION:
            elt.getparent().remove(elt)
        else:
            sys.stderr.write("Document has been created using a higher version of Sozi. Please upgrade the Inkscape plugin.\n")
            exit()
  
    # Create new element if needed
    if not latest_version_found:
        ext = "js" if tag == "script" else "css"
        elt = inkex.etree.Element(inkex.addNS(tag, "svg"))
        elt.text = open(os.path.join(os.path.dirname(__file__), "sozi." + ext)).read()
        elt.set("id","sozi-" + tag)
        elt.set(inkex.addNS("version", "sozi"), SOZI_VERSION)
        context.document.getroot().append(elt)


def upgrade_document(context):
    """
    Upgrade the Sozi-specific elements of the document to follow the evolutions of the document format.
    """
    # Upgrade from 10.x

    SOZI_ATTR = ["title", "sequence", "hide", "clip", "timeout-enable", "timeout-ms",
                 "transition-duration-ms", "transition-zoom-percent", "transition-profile"]
                 
    # FIXME allow multiple classes in element
    for elt in context.document.xpath("//svg:*[@class='sozi-frame']", namespaces=inkex.NSS):
        del elt.attrib["class"]

        # Create a new frame element
        f = inkex.etree.Element(inkex.addNS("frame", "sozi"))
        f.set(inkex.addNS("refid", "sozi"), elt.attrib["id"]) # TODO check namespace for id?
        context.document.getroot().append(f)

        # Move all Sozi-specific attributes from the original element to the frame element
        for attr in SOZI_ATTR:
            ns_attr = inkex.addNS(attr, "sozi")
            if ns_attr in elt.attrib:
                f.set(ns_attr, elt.attrib[ns_attr])
                del elt.attrib[ns_attr]
  
    # Upgrade from 11.10
    sequence_attr = inkex.addNS("sequence", "sozi")
    for i, elt in enumerate(context.document.xpath("//sozi:frame", namespaces=inkex.NSS)):
        if sequence_attr not in elt.attrib:
            elt.set(sequence_attr, unicode(i + 1))
        if "id" not in elt.attrib:
            elt.set("id", context.uniqueId("frame" + elt.attrib[sequence_attr]))

  
