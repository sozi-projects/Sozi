
# The version number is obtained from the current date and time
VERSION := $(shell date +%y.%m-%d%H%M%S)

# All source files of the Inkscape extensions
EDITOR_SRC := \
	$(wildcard editors/inkscape/*.py) \
	$(wildcard editors/inkscape/*.inx) \
	$(wildcard editors/inkscape/sozi/*.*)

# The translation files for the Inkscape extensions
EDITOR_PO := $(wildcard editors/inkscape/sozi/lang/*.po)

# The translatable source files of the Inkscape extensions
GETTEXT_SRC := \
	$(wildcard editors/inkscape/*.py) \
	$(wildcard editors/inkscape/sozi/*.py) \
	editors/inkscape/sozi/ui.glade

# The list of Javascript source files in the player and Sozi extras
PLAYER_JS := $(shell ./tools/utilities/depend.py player/js/sozi.js)
EXTRAS_JS := $(wildcard player/js/extras/*.js)

# Files of the player to be compiled
PLAYER_SRC := \
	player/js/sozi.js \
	player/css/sozi.css \
	$(EXTRAS_JS)

# The license files
DOC := $(wildcard doc/*license.txt)

# The list of files in the installation tree
TARGET := \
    $(subst editors/inkscape/,,$(EDITOR_SRC)) \
    $(patsubst editors/inkscape/sozi/lang/%.po,sozi/lang/%/LC_MESSAGES/sozi.mo,$(EDITOR_PO)) \
    $(addprefix sozi/,$(notdir $(PLAYER_SRC) $(DOC)))

# The list of files in the release tree
TARGET_RELEASE := $(addprefix release/, $(TARGET))

# The path of the installation folder for the current user
INSTALL_DIR := $(HOME)/.config/inkscape/extensions

# The release bundle
ZIP := release/sozi-release-$(VERSION).zip

# The minifier commands for Javascript and CSS
MINIFY_OPT += --compress
MINIFY_OPT += --mangle

#MINIFY_JS := cat
MINIFY_JS := ./node_modules/uglify-js/bin/uglifyjs

MINIFY_CSS := cat

# The Javascript linter command
LINT := ./node_modules/autolint/bin/autolint

# The message compiler command
MSGFMT := /usr/lib/python2.7/Tools/i18n/msgfmt.py

# The documentation generator command and options
JSDOC_OPT += --private
JSDOC_OPT += --recurse
# JSDOC_OPT += --template jsdoc-templates
JSDOC_OPT += --destination web/api

JSDOC := ./node_modules/jsdoc/jsdoc


.PHONY: all verify install tools doc clean

# Default rule: create a zip archive for installation
all: $(ZIP)

# Verify Javascript source files of the player
verify: $(PLAYER_JS) $(EXTRAS_JS)
	$(LINT) --once

# Install Sozi
install: $(TARGET_RELEASE)
	cd release ; cp --parents $(TARGET) $(INSTALL_DIR)

# Install the tools needed to build Sozi
tools:
	npm install uglify-js
	npm install autolint
	npm install git://github.com/jsdoc3/jsdoc.git

# Generate API documentation
doc: $(PLAYER_JS) $(EXTRAS_JS)
	$(JSDOC) $(JSDOC_OPT) player/js

# Generate a template file for translation
pot: $(GETTEXT_SRC)
	xgettext --package-name=Sozi --package-version=$(VERSION) --output=editors/inkscape/sozi/lang/sozi.pot $^

# Create a zip archive for installation
$(ZIP): $(TARGET_RELEASE)
	cd release ; zip $(notdir $@) $(TARGET)

# Concatenate and minify the Javascript source files of the player
release/sozi/sozi.js: $(PLAYER_JS)
	$(MINIFY_JS) $^ $(MINIFY_OPT) > $@ 

# Minify a CSS stylesheet of the player
release/sozi/%.css: player/css/%.css
	$(MINIFY_CSS) $^ > $@ 

# Minify a Javascript source file from Sozi-extras
release/sozi/%.js: player/js/extras/%.js
	$(MINIFY_JS) $^ $(MINIFY_OPT) > $@ 

# Compile a translation file for a given language
release/sozi/lang/%/LC_MESSAGES/sozi.mo: editors/inkscape/sozi/lang/%.po
	mkdir -p $(dir $@) ; $(MSGFMT) -o $@ $<

# Fill the version number in the Inkscape extensions
release/sozi/version.py:
	mkdir -p $(dir $@) ; sed "s/@SOZI_VERSION@/$(VERSION)/g" editors/inkscape/sozi/version.py > $@

# Copy a file from the Inkscape extensions
release/%: editors/inkscape/%
	mkdir -p $(dir $@) ; cp $< $@

# Copy a file from the documents folder
release/sozi/%: doc/%
	mkdir -p $(dir $@) ; cp $< $@

# Remove all temporary files from the release folder
clean:
	rm -f $(TARGET_RELEASE)

