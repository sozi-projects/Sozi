#!/usr/bin/python2

import os
import sys
import re

def usage():
    sys.stderr.write("Usage: depend.py filename\n")


DEP_RE = re.compile("@depend\s*([a-zA-Z0-9./_-]+)")

def collect(deps, stack, filename):
    try:
        # Open the current file and add it to the list of files being processed
        file = open(filename, "r")
        stack.append(filename)
        
        # Get the location of the current file.
        # This path will be used to compute the full paths of file names in @depend directives.
        dirname = os.path.dirname(filename)
        
        # Initialize the dependencies of the current file as an empty set
        deps[filename] = set()
                
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
                    if depFilename not in deps:
                        collect(deps, stack, depFilename)
                    # Add the target file and its dependencies to the dependencies of the current file
                    deps[filename].add(depFilename)
                    deps[filename].update(deps[depFilename])
                    
        sys.stderr.write("Collected dependencies for file: " + filename + "\n")
        for d in deps[filename]:
            sys.stderr.write("  " + d + "\n")

        # Remove the current file name from the list of files being processed and close it
        stack.pop()
        file.close()
    except IOError:
        sys.stderr.write("I/O error on file: " + filename + "\n")            
    

# This function is used for sorting two file names according to their dependencies.
#   - If f depends from g, g will come first.
#   - If g depends from f, f will come first.
#   - If f and g have no dependency relationship, no ordering will be specified.    
def depends(deps, f, g):
    if g in deps[f]:
        return 1
    elif f in deps[g]:
        return -1
    else:
        return 0


# Collect all dependencies from a root file and print the resulting
# file list ordered according to their dependencies.
def run(rootFilename):
    # A dictionary where keys are file names and values are sets
    # of file names.
    deps = {}
    
    # A stack of file names indicating which files are being processed
    stack = []
    
    # Collect dependencies from the given root file
    collect(deps, stack, rootFilename)

    # Print the file list, sorted according to their dependencies
    fileList = sorted(deps.keys(), lambda f,g: depends(deps, f, g))
    for f in fileList:
        print(f)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        usage()
    else:
        run(os.path.abspath(sys.argv[1]))

