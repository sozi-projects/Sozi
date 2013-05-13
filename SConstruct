
import os
from datetime import datetime

user_prefix = os.environ["HOME"] + "/.local"
Export("user_prefix")

AddOption("--prefix",
          dest="prefix",
          type="string",
          nargs=1,
          action="store",
          metavar="DIR",
          default=user_prefix,
          help="Prefix directory for installation")

prefix = GetOption("prefix")
Export("prefix")

env = Environment(tools = ["default", "textfile"])


#
# Generate text file with Sozi version
#

sozi_version = datetime.utcnow().strftime("%y.%m-%d%H%M%S")
Export("sozi_version")

sozi_version_file = env.Textfile("build/sozi.version", sozi_version, variant_dir="build")
Export("sozi_version_file")

common_install = Install(prefix + "/share/sozi", sozi_version_file)


#
# Process license files
#

license_files = Glob("doc/*-license.txt")
Export("license_files")

common_install += Install(prefix + "/share/doc/sozi", license_files)
Alias("install-docs", prefix + "/share/doc/sozi")

Export("common_install")

#
# Build player
#

player_files = SConscript("player/SConscript", variant_dir="build/player")
Export("player_files")


#
# Build editor
#

SConscript("editors/SConscript", variant_dir="build/editors")

