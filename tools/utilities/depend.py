#!/usr/bin/python2

import os
import sys
import re

def usage():
    sys.stderr.write("Usage: depend.py filename\n")


DEP_RE = re.compile("@depend\s*([a-zA-Z0-9./_-]+)")

def collect(scores, stack, filename):
    try:
        # Open the current file and add it to the list of files being processed
        file = open(filename, "r")
        stack.append(filename)
        
        # Get the location of the current file.
        # This path will be used to compute the full paths of file names in @depend directives.
        dirname = os.path.dirname(filename)
        
        # Initialize the score of the current file as if it had no dependency
        scores[filename] = 0

        # Read the current file line by line
        for line in file:
            # Process all @depend directives on the current line
            for match in DEP_RE.finditer(line):
                # Compute the normalized full path of the target file
                depFilename = os.path.abspath(os.path.join(dirname, match.group(1)))
                # Check that the target file is not already being processed
                if depFilename in stack:
                    sys.stderr.write("Circular dependency on files: " + filename + " " + depFilename)
                else:
                    # If needed, collect the dependencies of the target file
                    if depFilename not in scores:
                        collect(scores, stack, depFilename)
                    if scores[depFilename] >= scores[filename]:
                        scores[filename] = scores[depFilename] + 1;
                    
        sys.stderr.write("Collected dependencies for file: " + filename + "\n")

        # Remove the current file name from the list of files being processed and close it
        stack.pop()
        file.close()
    except IOError:
        sys.stderr.write("I/O error on file: " + filename + "\n")            
    

# Collect all dependencies from a root file and print the resulting
# file list ordered according to their dependencies.
def run(rootFilename):
    # A dictionary where keys are file names and values
    # are the depth of each file in the dependency tree
    scores = {}

    # A stack of file names indicating which files are being processed
    stack = []
    
    # Collect dependencies from the given root file
    collect(scores, stack, rootFilename)

    # Print the file list, sorted according to their dependencies
    for filename, score in sorted(scores.iteritems(), key=lambda (k, v): (v, k)):
        print(filename)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        usage()
    else:
        run(os.path.abspath(sys.argv[1]))

