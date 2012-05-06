
VERSION := $(shell date +%y.%m-%d%H%M%S)

PLAYER_JS := $(wildcard player/js/*.js)
EXTRAS_JS := $(wildcard player/extras/*.js)

#MINIFY_OPT += --nomunge

JUICER_OPT += --force
JUICER_OPT += --skip-verification
 JUICER_OPT += --minifyer none

MINIFY := juicer merge $(JUICER_OPT) --arguments "$(MINIFY_OPT)"

AUTOLINT := ./node_modules/autolint/bin/autolint

SRC := \
	$(wildcard editors/inkscape/*.py) \
	$(wildcard editors/inkscape/extras/*.py) \
	$(wildcard editors/inkscape/*.inx) \
	$(wildcard editors/inkscape/*.svg) \
	$(wildcard editors/inkscape/extras/*.inx) \
	$(wildcard doc/install*.html) \
	$(wildcard doc/*license.txt) \
	$(wildcard player/js/extras/*.js) \
	player/js/sozi.js \
	player/css/sozi.css

TARGET := $(addprefix release/, $(notdir $(SRC)))

INSTALL_DIR := $(HOME)/.config/inkscape/extensions

TIMESTAMP := release/sozi-timestamp-$(VERSION)

.PHONY: zip verify minify install doc timestamp clean

all: zip

zip: release/sozi-release-$(VERSION).zip

verify: $(PLAYER_JS) $(EXTRAS_JS)
	$(AUTOLINT) --once

minify: release/sozi.js release/sozi.css

install: $(TARGET)
	cp release/sozi* $(INSTALL_DIR)

timestamp: release/sozi-timestamp-$(VERSION)

doc: $(PLAYER_JS) $(EXTRAS_JS)
	jsdoc --directory=doc/api --recurse=1 \
		--allfunctions --private \
		--template=jsdoc-templates \
		player/js

$(TIMESTAMP):
	touch $@
	
release/sozi-release-$(VERSION).zip: $(TARGET)
	cd release ; zip $(notdir $@) $(notdir $^)

release/sozi.js: $(PLAYER_JS)
	$(MINIFY) --output $@ player/js/sozi.js

release/%.css: player/css/%.css
	$(MINIFY) --output $@ $<

release/%.js: player/js/extras/%.js
	$(MINIFY) --output $@ $<

release/%.py: editors/inkscape/%.py $(TIMESTAMP)
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%.py: editors/inkscape/extras/%.py $(TIMESTAMP)
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%.inx: editors/inkscape/%.inx
	cp $< $@

release/%.inx: editors/inkscape/extras/%.inx
	cp $< $@
	
release/%.svg: editors/inkscape/%.svg
	cp $< $@

release/%: doc/%
	cp $< $@

clean:
	rm -f $(TARGET) release/sozi-timestamp-*
