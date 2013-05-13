
# The version number is obtained from the current date and time
VERSION := $(shell date +%y.%m-%d%H%M%S)

TIMESTAMP := release/timestamp-$(VERSION)

# All source files of the Inkscape extensions
EDITOR_SRC := \
	$(wildcard editors/inkscape/*.py) \
	$(wildcard editors/inkscape/*.inx) \
	$(wildcard editors/inkscape/sozi/*.*)

# The translation files for the Inkscape extensions
EDITOR_PO := $(wildcard editors/inkscape/sozi/lang/*/sozi.po)

# The translatable source files of the Inkscape extensions
GETTEXT_SRC := \
	$(wildcard editors/inkscape/*.py) \
	$(wildcard editors/inkscape/sozi/*.py) \
	editors/inkscape/sozi/ui.glade

# The list of Javascript source files in the player and Sozi extras
PLAYER_JS := $(shell ./tools/utilities/depend.py player/js/sozi.js)
EXTRAS_JS := $(wildcard player/js/extras/*.js)

# The license files
LICENSES := $(wildcard doc/*license.txt)

# The list of files in the installation tree
TARGET := \
    $(subst editors/inkscape/,,$(EDITOR_SRC)) \
    $(patsubst editors/inkscape/sozi/lang/%/sozi.po,sozi/lang/%/LC_MESSAGES/sozi.mo,$(EDITOR_PO)) \
    $(addprefix sozi/,sozi.js sozi.css $(notdir $(EXTRAS_JS) $(LICENSES)))

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

# Verify Javascript source files of the player
verify: $(PLAYER_JS) $(EXTRAS_JS)
	$(LINT) --once

# Install the tools needed to build Sozi
tools:
	npm install autolint
	npm install git://github.com/jsdoc3/jsdoc.git

# Generate API documentation
doc: $(PLAYER_JS) $(EXTRAS_JS)
	$(JSDOC) $(JSDOC_OPT) player/js

