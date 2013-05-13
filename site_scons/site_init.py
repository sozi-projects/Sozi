
import os
import sys
import re


DEP_RE = re.compile("@depend\s*([a-zA-Z0-9./_-]+)")


def collect_dependencies(scores, stack, node, env):
    # Open the current file and add it to the list of files being processed
    filename = str(node)
    stack.append(filename)
    
    # Get the location of the current file.
    # This path will be used to compute the full paths of file names in @depend directives.
    dirname = os.path.dirname(filename)
    
    # Initialize the score of the current file as if it had no dependency
    scores[filename] = 0

    # Process all @depend directives in the source file
    for match in DEP_RE.findall(node.get_text_contents()):
        # Compute the name of the target file
        depFilename = os.path.join(dirname, match)
        # Check that the target file is not already being processed
        if depFilename in stack:
            sys.stderr.write("Circular dependency on files: " + filename + " " + depFilename)
        else:
            # If needed, collect the dependencies of the target file
            if depFilename not in scores:
                collect_dependencies(scores, stack, env.File(depFilename), env)
            if scores[depFilename] >= scores[filename]:
                scores[filename] = scores[depFilename] + 1;
                
    # Remove the current file name from the list of files being processed and close it
    stack.pop()


def scan_dependencies(node, env, path):
    # A dictionary where keys are file names and values
    # are the depth of each file in the dependency tree
    scores = {}

    # A stack of file names indicating which files are being processed
    stack = []
    
    # Collect dependencies from the given root file
    collect_dependencies(scores, stack, node, env)

    # Return the source file list, sorted according to their dependencies
    return [ env.File(filename) for filename, score in sorted(scores.iteritems(), key=lambda (k, v): (v, k)) ]


def emit_dependencies(target, source, env):
    return target, scan_dependencies(source[0], env, source[0].path)


def CONCATENATE_JS(env):
    scan = Scanner(function = scan_dependencies, skeys = ".js")
    bld = Builder(action = "cat $SOURCES > $TARGET", suffix = ".js", emitter = emit_dependencies)
    env.Append(BUILDERS = { "ConcatenateJS": bld }, SCANNERS = scan)


def UGLIFY_JS(env):
    bld = Builder(action = "uglifyjs --no-copyright --output $TARGET $SOURCE", suffix = ".js")
    env.Append(BUILDERS = { "UglifyJS": bld })


#
# Replacement for the Zip builder with relative path to root dir.
# http://stackoverflow.com/questions/10793259/how-to-make-scons-not-include-the-base-dir-in-zip-files
#

import os.path
import zipfile

def zipbetter(target, source, env):
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


def ZIP_BETTER(env):
    # Make a builder using the zipbetter function, that takes SCons files
    zipbetter_bld = Builder(action = zipbetter,
                            target_factory = SCons.Node.FS.default_fs.Entry,
                            source_factory = SCons.Node.FS.default_fs.Entry)

    # Add the builder to the environment
    env.Append(BUILDERS = {'ZipBetter' : zipbetter_bld})

#
# Glob with exclusion lists
# http://stackoverflow.com/questions/12518715/how-do-i-filter-an-scons-glob-result
#

import os.path

def filtered_glob(env, pattern, omit=[],
  ondisk=True, source=False, strings=False):
    return filter(
      lambda f: os.path.basename(f.path) not in omit,
      env.Glob(pattern))

def FILTERED_GLOB(env):
    env.AddMethod(filtered_glob, "FilteredGlob");

