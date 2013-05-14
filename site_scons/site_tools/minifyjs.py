
from SCons.Builder import Builder
from SCons.Script import Copy


def exists(env):
    return True


def generate(env):
    if env.WhereIs("uglifyjs"):
        action = "uglifyjs --no-copyright --output $TARGET $SOURCE"
    elif env.WhereIs("yui-compressor"):
        action = "yui-compressor -o $TARGET $SOURCE"
    else:
        action = Copy("$TARGET", "$SOURCE")
    bld = Builder(action = action, suffix = ".min.js", src_suffix = ".js")
    env.Append(BUILDERS = { "MinifyJS": bld })

