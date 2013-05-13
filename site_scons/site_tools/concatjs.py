
import os
import sys
import re

from SCons.Builder import Builder
from SCons.Scanner import Scanner

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


def exists(env):
    return env.WhereIs("cat")


def generate(env):
    bld = Builder(
        action = "cat $SOURCES > $TARGET",
        suffix = ".cat.js",
        src_suffix=".js",
        emitter = emit_dependencies)
    scan = Scanner(function = scan_dependencies, skeys = ".js")
    env.Append(BUILDERS = { "ConcatJS": bld }, SCANNERS = scan)


