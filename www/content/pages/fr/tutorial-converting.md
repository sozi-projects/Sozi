Title: Convertir une présentation Sozi en PDF ou en vidéo
Slug: tutorial-converting
Lang: fr
Author: Guillaume Savaton
Status: hidden

Les outis de conversion en PDF ou vidéo sont disponibles dans le
[dépôt de code source](https://github.com/senshu/Sozi/tree/dev/tools)
du projet.
Ces outils sont des scripts Python utilisables en ligne de commande.
Ils n'ont été testés que sous GNU/Linux.

Convertir une présentation Sozi en PDF
--------------------------------------

Téléchargez les scripts
[sozi2pdf.py](https://github.com/senshu/Sozi/raw/dev/tools/sozi2pdf/sozi2pdf.py)
et [sozi2pdf.js](https://github.com/senshu/Sozi/raw/dev/tools/sozi2pdf/sozi2pdf.js).
Vous pouvez les installer où vous voulez, mais les deux scripts doivent être dans le même dossier.

``sozi2pdf`` dépend des logiciels suivants :

* [Python 2.7](http://python.org/download/)
* [PhantomJS](http://phantomjs.org/)
* [PDFjam](http://www2.warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/software/pdfjam), disponible dans la plupart des distributions GNU/Linux.

Pour convertir une présentation en un document PDF de format A4, lancez les commandes suivantes :

    :::sh
    python /path/to/sozi2pdf.py my_sozi_presentation.svg

Un nouveau document nommé ``my_sozi_presentation.pdf`` sera créé.

Si vous ne voulez convertir que certains calques de votre document, vous pouvez utilier les options ``-include`` et ``--exclude``.
Ces options acceptent une liste de numéros de calques séparés par des virgules :

    :::sh
    python /path/to/sozi2pdf.py \
        --include=3,5,6,7,8,10,12,14,16,18 \
        my_sozi_presentation.svg

De longues listes de numéros de calques peuvent être raccourcies à l'aide de deux points :

    :::sh
    python /path/to/sozi2pdf.py \
        --include=3,5:8,10:12:18 \
        my_sozi_presentation.svg

* ``5:8`` correspont à ``5,6,7,8``
* ``10:12:18`` correspond à ``10,12,14,16,18``

Une liste complète des options est disponible via la commande suivante :

    :::sh
    python /path/to/sozi2pdf.py --help

Convertir une présentation Sozi en vidéo
----------------------------------------

Téléchargez les scripts
[sozi2video.py](https://github.com/senshu/Sozi/raw/dev/tools/sozi2video/sozi2video.py)
et [sozi2video.js](https://github.com/senshu/Sozi/raw/dev/tools/sozi2video/sozi2video.js).
Vous pouvez les installer où vous voulez, mais les deux scripts doivent être dans le même dossier.

``sozi2video`` dépend des logiciels suivants:

* [Python 2.7](http://python.org/download/)
* [PhantomJS](http://phantomjs.org/)
* [FFmpeg](http://ffmpeg.org/) or [libav](https://libav.org/), disponible dans la plupart des distributions GNU/Linux.

Pour convertir une présentation en un fichier vidéo [Ogg](https://en.wikipedia.org/wiki/Ogg) de dimension 1024x768,
utilisez la commande suivante:

    :::sh
    python /path/to/sozi2video.py my_sozi_presentation.svg

Un nouveau fichier nommé ``my_sozi_presentation.ogv`` sera créé.

L'outil propose des options pour contrôler le format et les dimensions de la vidéo.
Cet exemple crée une vidéo 720p en MP4.

    :::sh
    python /path/to/sozi2video.py \
        --output=my_sozi_presentation.mp4 \
        --width=1280 --height=720 \
        my_sozi_presentation.svg

Une liste complète des options est disponible via la commande suivante :

    :::sh
    python /path/to/sozi2video.py --help

