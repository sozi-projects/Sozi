
from SCons.Builder import Builder
from SCons.Script import Copy


def exists(env):
    return True


def generate(env):
    if env.WhereIs("yui-compressor"):
        action = "yui-compressor -o $TARGET $SOURCE"
    else:
        action = Copy("$TARGET", "$SOURCE")
    bld = Builder(action = action, suffix = ".min.css", src_suffix = ".css")
    env.Append(BUILDERS = { "MinifyCSS": bld })

