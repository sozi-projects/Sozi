#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = u'Guillaume Savaton'
SITENAME = u'Sozi'
SITEURL = ''

TIMEZONE = 'Europe/Paris'

DEFAULT_LANG = u'en'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None

# Blogroll
LINKS =  ( # ('Pelican', 'http://getpelican.com/'),
    )

# Social widget
SOCIAL = (
    ('Twitter', 'https://twitter.com/senshua'),
    ('Facebook', 'https://www.facebook.com/sozi.project'),
    ('Google+', 'https://plus.google.com/u/0/115225184510134342799'),
    ('Ohloh', 'https://www.ohloh.net/p/sozi')
)

DEFAULT_PAGINATION = 10

# Uncomment following line if you want document-relative URLs when developing
#RELATIVE_URLS = True

STATIC_PATHS = ['images', 'releases']
