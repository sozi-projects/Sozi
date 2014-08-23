#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = u'Guillaume Savaton'
SITENAME = u'Sozi'
SITEURL = ''
GITHUB_URL = 'https://github.com/senshu/Sozi'
FLATTR_URL = 'http://sozi.baierouge.fr/'
PAYPAL_KEY = '-----BEGIN PKCS7-----MIIHPwYJKoZIhvcNAQcEoIIHMDCCBywCAQExggEwMIIBLAIBADCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwDQYJKoZIhvcNAQEBBQAEgYB0J/wHIVdPQIX3bRvzk7Hb7706Rv4CGLyIshB7HhgcrbUbOHEkYBGVEBfgnnM4e6bD4Nj/SMH3MXnAcPyg9focxRlEGNWQiB2GYxOnOZJkucmW0NiKAAlxwo0+rWCduXoNgIkSZnVzz2yiAmnThkTNMBZvZMs/Wfnqgmvyk/a4czELMAkGBSsOAwIaBQAwgbwGCSqGSIb3DQEHATAUBggqhkiG9w0DBwQIHZ5nVg0swXuAgZhWpPk9XxpINreT/ZORXg46r6gQkShaSzDf+J0ohLSsdgf6h6hZuRQgV5KXI/qwj/qvqfps2kPwR7PV8rwGsqdhD2IxGLxKzDjfADpcHPsbXHVfZiS/ap1CM+Uw5J1gkJJHs94rdoQvDwajMGjh4o0TJ7fF3yA2fUs7oDl0nYRpN2WQQ4EtZWUIvmp0bmiRwCvz/Sa/67uH26CCA4cwggODMIIC7KADAgECAgEAMA0GCSqGSIb3DQEBBQUAMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbTAeFw0wNDAyMTMxMDEzMTVaFw0zNTAyMTMxMDEzMTVaMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAwUdO3fxEzEtcnI7ZKZL412XvZPugoni7i7D7prCe0AtaHTc97CYgm7NsAtJyxNLixmhLV8pyIEaiHXWAh8fPKW+R017+EmXrr9EaquPmsVvTywAAE1PMNOKqo2kl4Gxiz9zZqIajOm1fZGWcGS0f5JQ2kBqNbvbg2/Za+GJ/qwUCAwEAAaOB7jCB6zAdBgNVHQ4EFgQUlp98u8ZvF71ZP1LXChvsENZklGswgbsGA1UdIwSBszCBsIAUlp98u8ZvF71ZP1LXChvsENZklGuhgZSkgZEwgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tggEAMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADgYEAgV86VpqAWuXvX6Oro4qJ1tYVIT5DgWpE692Ag422H7yRIr/9j/iKG4Thia/Oflx4TdL+IFJBAyPK9v6zZNZtBgPBynXb048hsP16l2vi0k5Q2JKiPDsEfBhGI+HnxLXEaUWAcVfCsQFvd2A1sxRr67ip5y2wwBelUecP3AjJ+YcxggGaMIIBlgIBATCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwCQYFKw4DAhoFAKBdMBgGCSqGSIb3DQEJAzELBgkqhkiG9w0BBwEwHAYJKoZIhvcNAQkFMQ8XDTE0MDgyMzE5MzI1M1owIwYJKoZIhvcNAQkEMRYEFJ8Sw4eTm2wp67ITfzvdncs8vL6sMA0GCSqGSIb3DQEBAQUABIGAupTlQZr5k+2Ssg3bxmlTz/B+F8XUDDMu7felYEhk5WPCC14AH3f+cbEf5eEmgMAdDnAA7hRkF+vlMS3okMr91Cp7TihSrKagHl2R/qS3RbS2he37z/BPNh8ZWynvJMLTXIIJfbXT9djqBfj7HnihPp0pfHqbWZzJjQHnfUj4vdQ=-----END PKCS7-----'
PIWIK_URL = 'http://baierouge.fr/piwik'
PIWIK_SITE = '2'
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
