
from SCons.Builder import Builder


def exists(env):
    return env.WhereIs("uglifyjs")


def generate(env):
    bld = Builder(action = "uglifyjs --no-copyright --output $TARGET $SOURCE", suffix = ".min.js", src_suffix = ".js")
    env.Append(BUILDERS = { "MinifyJS": bld })

