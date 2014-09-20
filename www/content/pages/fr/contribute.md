Title: Contribuer
Slug: 50-contribute
Lang: fr
Author: Guillaume Savaton, Vincent Garibal

Traduire le site web dans votre langue 
--------------------------------------

Le site web de Sozi est un site statique généré avec [Pelican](http://blog.getpelican.com/).
Il ne fournit pas d'éditeur en ligne où vous pourriez éditer, prévisualiser et publier vos contributions.

Les fichiers source du site sont des fichiers texte utilisant la syntaxe [Markdown](http://daringfireball.net/projects/markdown/syntax).
Ces fichiers sont hébergés dans le [dépôt GitHub de Sozi](https://github.com/senshu/Sozi), dans le dossier [www/content/](https://github.com/senshu/Sozi/tree/master/www/content).
Le dossier [www/content/pages](https://github.com/senshu/Sozi/tree/master/www/content/pages) contient
la documentation de Sozi.
Il est divisé en sous-dossiers pour chaque langue (``en`` pour l'anglais, ``fr`` pour le français, etc.)
contenant les fichiers Markdown.

Pour commencer à traduire, nous recommendons de suivre les étapes suivantes :

1. [Forker le dépôt](https://github.com/senshu/Sozi/fork).
2. Ajouter un sous-répertoire pour votre langue dans ``www/content/pages``, s'il n'existe pas déjà.
3. Si vous voulez traduire une page, trouvez la version originale en langue anglaise dans le répertoire ``en`` et créez un nouveau fichier avec le même nom dans votre répertoire.
4. Éditez le nouveau fichier.
5. De manière optionnelle, vous pouvez utiliser Pelican pour générer votre propre copie du site et prévisualiser vos modifications.
6. Quand vous êtes satisfait du résultat, commiter, envoyer vos changements vers votre dépôt GitHub et envoyer une demande d'intégration vers le dépôt officiel Sozi.

L'en-tête d'un fichier Markdown traduit devrait contenir les champs suivants :

* ``Title`` : le titre de la page originale, traduite dans votre langue.
* ``Author`` : une liste des auteurs et traducteurs originaux séparés par des virgules.
* ``Slug`` : identique au fichier original.
* ``Lang`` : le code de la langue de traduction.
* ``Translation`` : doit avoir la valeur ``true``.

