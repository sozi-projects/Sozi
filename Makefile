
VERSION := $(shell date +%y.%m-%d%H%M%S)

PLAYER_JS := $(wildcard player/*.js)
EXTRAS_JS := $(wildcard extras/*.js)

#MINIFY_OPT += --nomunge

MINIFY := juicer merge --skip-verification --arguments "$(MINIFY_OPT)" --force

SRC := $(wildcard */*.py) \
	$(wildcard */*.inx) \
	$(wildcard doc/install*.html) \
	$(wildcard doc/*license.txt) \
	$(wildcard extras/*.js) \
	player/sozi.js \
	player/sozi.css

TARGET := $(addprefix release/, $(notdir $(SRC)))

INSTALL_DIR := $(HOME)/.config/inkscape/extensions

TIMESTAMP := release/sozi-timestamp-$(VERSION)

.PHONY: zip verify minify install timestamp clean

zip: release/sozi-release-$(VERSION).zip

verify: $(PLAYER_JS) $(EXTRAS_JS)
	juicer verify $^

minify: release/sozi.js release/sozi.css

install: $(TARGET)
	cp release/*.inx $(INSTALL_DIR)
	cp release/*.py $(INSTALL_DIR)
	cp release/*.js $(INSTALL_DIR)
	cp release/*.css $(INSTALL_DIR)

timestamp: release/sozi-timestamp-$(VERSION)

$(TIMESTAMP):
	touch $@
	
release/sozi-release-$(VERSION).zip: $(TARGET)
	zip $@ $(TARGET)

release/sozi.js: $(PLAYER_JS)
	$(MINIFY) --output $@ player/sozi.js

release/%.css: player/%.css
	$(MINIFY) --output $@ $<

release/%.js: extras/%.js
	$(MINIFY) --output $@ $<

release/%.py: editor/%.py $(TIMESTAMP)
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%.py: extras/%.py $(TIMESTAMP)
	sed "s/{{SOZI_VERSION}}/$(VERSION)/g" $< > $@

release/%: doc/%
	cp $< $@

release/%.inx: editor/%.inx
	cp $< $@

release/%.inx: extras/%.inx
	cp $< $@

clean:
	rm -f $(TARGET) release/sozi-timestamp-*
