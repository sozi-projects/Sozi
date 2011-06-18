
VERSION := $(shell date +%y.%m-%d%H%M%S)

PLAYER_JS := $(wildcard player/*.js)
EXTRAS_JS := $(wildcard extras/*.js)

SRC := $(wildcard */*.py) \
	$(wildcard */*.inx) \
	$(wildcard doc/install*.html) \
	$(wildcard doc/*license.txt) \
	$(wildcard extras/*.js) \
	player/sozi.js \
	player/sozi.css

TARGET := $(addprefix release/, $(notdir $(SRC)))

INSTALL_DIR := $(HOME)/.config/inkscape/extensions

.PHONY: jslint verify minify zip install clean

verify: $(PLAYER_JS) $(EXTRAS_JS)
	juicer verify $^

minify: release/sozi.js release/sozi.css

zip: release/sozi-release-$(VERSION).zip

install: $(TARGET)
	cp release/*.inx $(INSTALL_DIR)
	cp release/*.py $(INSTALL_DIR)
	cp release/*.js $(INSTALL_DIR)
	cp release/*.css $(INSTALL_DIR)
	
release/sozi-release-$(VERSION).zip: $(TARGET)
	zip $@ $(TARGET)

release/sozi.js: $(PLAYER_JS)
	juicer merge --force --output $@ player/sozi.js

release/%.css: player/%.css
	juicer merge --force --output $@ $<

release/%.js: extras/%.js
	juicer merge --force --output $@ $<

release/%.py: editor/%.py
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%.py: extras/%.py
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%: doc/%
	cp $< $@

release/%.inx: editor/%.inx
	cp $< $@

release/%.inx: extras/%.inx
	cp $< $@

clean:
	rm -f $(TARGET)
