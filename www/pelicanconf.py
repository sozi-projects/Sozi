#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = u'Guillaume Savaton'
SITENAME = u'Sozi'
SITEURL = ''
GITHUB_URL = 'https://github.com/senshu/Sozi'
FLATTR_URL = 'http://sozi.baierouge.fr/'
TIMEZONE = 'Europe/Paris'

DEFAULT_LANG = u'en'

# Feed generation is usually not desired when developing
# FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None

# Blogroll
LINKS =  (
    ('Inkscape', 'http://inkscape.org/'),
    ('Awwation', 'http://awwation.com/'),
    ('Ext-Sozi', 'http://asyazwan.github.io/ext-sozi/'),
    ('luapresent', 'https://github.com/karottenreibe/luakit/tree/luapresent'),
)

# Social widget
SOCIAL = (
    ('Twitter', 'https://twitter.com/senshua'),
    ('Facebook', 'https://www.facebook.com/sozi.project'),
    ('Google+', 'https://plus.google.com/u/0/115225184510134342799'),
    ('Ohloh', 'https://www.ohloh.net/p/sozi'),
    # TODO add YouTube
)

DEFAULT_PAGINATION = 10

# Uncomment following line if you want document-relative URLs when developing
RELATIVE_URLS = True

THEME = 'themes/sozi'

STATIC_PATHS = ['images', 'releases']

FILES_TO_COPY = (
    ('extra/favicon.ico', 'favicon.ico'),
    ('wiki/index.html', 'wiki/index.html'),
)

DEFAULT_DATE_FORMAT = "%Y-%m-%d"
