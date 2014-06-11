Title: Contribute
Slug: 50-contribute
Lang: en
Author: Guillaume Savaton

Translate the web site to your native language
----------------------------------------------

The web site of Sozi is a static site generated with [Pelican](http://blog.getpelican.com/).
It does not provide an online editor where you could edit, preview and publish your contributions.

The source files of the site are text files using the [Markdown](http://daringfireball.net/projects/markdown/syntax) syntax.
These files are hosted in the [source repository of Sozi at GitHub](https://github.com/senshu/Sozi), in the
[www/content/](https://github.com/senshu/Sozi/tree/master/www/content) folder.
The [www/content/pages](https://github.com/senshu/Sozi/tree/master/www/content/pages) folder contains
the documentation of Sozi.
It is divided into language subfolders (``en`` for English, ``fr`` for French, etc)
containing Markdown files.

To start translating, we recommend following these steps:

1. [Fork the repository](https://github.com/senshu/Sozi/fork).
2. Add a subfolder for your language in ``www/content/pages``, if it does not already exist.
3. If you want to translate a page, find the original English version in the ``en`` folder and create a new file with the same name in your language folder.
4. Edit the new file.
5. Optionally, you can use Pelican to generate your own copy of the site and preview your modifications.
6. When you are satisfied with the result, commit and push your changes to your GitHub repository and send a pull request to the official Sozi repository.

The header of a translated Markdown file should contain the following fields:

* ``Title``: the title of the original page, translated to your language.
* ``Author``: comma-separated list of original authors and translators.
* ``Slug``: same as the original file.
* ``Lang``: the language code of the translation.
* ``Translation``: must be set to ``true``.
