
#
# Replacement for the Zip builder with relative path to root dir.
# http://stackoverflow.com/questions/10793259/how-to-make-scons-not-include-the-base-dir-in-zip-files
#

import SCons
import os.path
import zipfile


def zip_relative(target, source, env):
    # Open the zip file with appending, so multiple calls will add more files
    zf = zipfile.ZipFile(str(target[0]), 'a', zipfile.ZIP_DEFLATED)
    for s in source:
        # Find the path of the base file
        basedir = os.path.dirname(str(s))
        if s.isdir():
            # If the source is a directory, walk through its files
            for dirpath, dirnames, filenames in os.walk(str(s)):
                for fname in filenames:
                    path = os.path.join(dirpath, fname)
                    if os.path.isfile(path):
                        # If this is a file, write it with its relative path
                        zf.write(path, os.path.relpath(path, basedir))
        else:
            # Otherwise, just write it to the file
            flatname = os.path.basename(str(s))
            zf.write(str(s), flatname)
    zf.close()


def exists(env):
    return True


def generate(env):
    bld = env.Builder(action = zip_relative,
                      target_factory = SCons.Node.FS.default_fs.Entry,
                      source_factory = SCons.Node.FS.default_fs.Entry)
    env.Append(BUILDERS = {"ZipRelative" : bld})


