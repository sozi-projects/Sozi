#
# Glob with exclusion lists
# http://stackoverflow.com/questions/12518715/how-do-i-filter-an-scons-glob-result
#

import os.path

def filtered_glob(env, pattern, omit=[], ondisk=True, source=False, strings=False):
    return filter(
        lambda f: os.path.basename(f.path) not in omit,
        env.Glob(pattern))


def exists(env):
    return True


def generate(env):
    env.AddMethod(filtered_glob, "FilteredGlob");


