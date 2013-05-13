
from datetime import datetime

env = Environment(tools = ["default", "textfile"])

sozi_version = datetime.utcnow().strftime("%y.%m-%d%H%M%S")
Export("sozi_version")

sozi_version_file = env.Textfile("build/sozi.version", sozi_version, variant_dir="build")
Export("sozi_version_file")

license_files = Glob("doc/*-license.txt")
Export("license_files")

player_files = SConscript("player/SConscript", variant_dir="build/player")
Export("player_files")

SConscript("editors/SConscript", variant_dir="build/editors")

