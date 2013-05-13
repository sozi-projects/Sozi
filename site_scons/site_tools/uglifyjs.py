
from SCons.Builder import Builder


def exists(env):
    return env.WhereIs("uglifyjs")


def generate(env):
    bld = Builder(action = "uglifyjs --no-copyright --output $TARGET $SOURCE", suffix = ".js")
    env.Append(BUILDERS = { "UglifyJS": bld })

