"""Regression tests for texts2paths.py.

These tests exercise the script as a real subprocess (not by importing it,
since it only runs its logic under `if __name__ == '__main__'`). A fake
`inkscape` executable is placed first on PATH so no real Inkscape install
is required; it just records the argv it was called with and exits with a
configurable status code.
"""

import os
import re
import stat
import subprocess
import sys
import textwrap

import pytest

SCRIPT = os.path.join(os.path.dirname(__file__), "texts2paths.py")

SVG_TEMPLATE = """<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <text id="{text_id}">hello</text>
</svg>
"""


def make_svg(path, text_id):
    path.write_text(SVG_TEMPLATE.format(text_id=text_id))


def make_fake_inkscape(bin_dir, log_path, exit_code=0):
    fake = bin_dir / "inkscape"
    fake.write_text(textwrap.dedent(f"""\
        #!/bin/sh
        printf '%s\\n' "$*" >> "{log_path}"
        exit {exit_code}
        """))
    fake.chmod(fake.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return fake


def run_script(tmp_path, args, inkscape_exit_code=0):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    log_path = tmp_path / "inkscape_calls.log"
    make_fake_inkscape(bin_dir, log_path, exit_code=inkscape_exit_code)

    env = dict(os.environ)
    env["PATH"] = str(bin_dir) + os.pathsep + env.get("PATH", "")

    result = subprocess.run(
        [sys.executable, "-I", SCRIPT] + args,
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
    )
    calls = log_path.read_text().splitlines() if log_path.exists() else []
    return result, calls


def test_ordinary_svg_converts_successfully(tmp_path):
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id="t1")

    result, calls = run_script(tmp_path, [str(svg)])

    assert result.returncode == 0, result.stderr
    assert len(calls) == 1
    assert "select-by-id:t1" in calls[0]


def test_output_filename_with_spaces_succeeds(tmp_path):
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id="t1")
    out = tmp_path / "my output file.svg"

    result, calls = run_script(tmp_path, [str(svg), "-o", str(out)])

    assert result.returncode == 0, result.stderr
    assert len(calls) == 1
    assert out.exists()


def test_output_filename_with_parentheses_succeeds(tmp_path):
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id="t1")
    out = tmp_path / "output (copy).svg"

    result, calls = run_script(tmp_path, [str(svg), "-o", str(out)])

    assert result.returncode == 0, result.stderr
    assert len(calls) == 1
    assert out.exists()


def test_element_id_with_action_delimiter_is_rejected(tmp_path):
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id="foo;bar")

    result, calls = run_script(tmp_path, [str(svg)])

    assert result.returncode != 0
    assert "Invalid or unsafe element id" in result.stderr
    assert calls == []  # inkscape must never be invoked with the bad id


def test_malicious_id_cannot_inject_an_extra_inkscape_action(tmp_path):
    malicious_id = "x;FileSave:/tmp/pwned.txt"

    # (a) Prove the injection surface: reproduce the *unvalidated* join
    # logic from the original vulnerable code and show the attacker's
    # payload becomes a standalone action in the --actions= string.
    actions = ["FileVacuum", "EditDeselect", "select-by-id:" + malicious_id, "ObjectToPath", "FileSave"]
    unvalidated_actions_string = ";".join(actions)
    assert "FileSave:/tmp/pwned.txt" in unvalidated_actions_string.split(";")

    # (b) Confirm the fixed script rejects this id and never invokes inkscape.
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id=malicious_id)

    result, calls = run_script(tmp_path, [str(svg)])

    assert result.returncode != 0
    assert "Invalid or unsafe element id" in result.stderr
    assert calls == []


def test_inkscape_failure_is_reported(tmp_path):
    svg = tmp_path / "input.svg"
    make_svg(svg, text_id="t1")

    result, calls = run_script(tmp_path, [str(svg)], inkscape_exit_code=1)

    assert len(calls) == 1  # inkscape was invoked
    assert result.returncode != 0  # but its failure must not be swallowed
    assert "CalledProcessError" in result.stderr
