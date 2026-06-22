"""Regression tests for encoded-payload scanner false positives."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from plugin_scanner import _PATTERN_DEFS, _scan_file


def _base64_findings(content: str):
    return [
        finding
        for finding in _scan_file("agents/example.md", content, _PATTERN_DEFS)
        if finding.category == "enc.base64_blob"
    ]


def test_human_readable_slash_list_is_not_base64_blob():
    content = "Plataformas: GHL/FullFunnel/WordPress/GreatPages/HTML puro"
    assert _base64_findings(content) == []


def test_long_raw_base64_blob_is_still_flagged():
    encoded = "QWxhZGRpbjpvcGVuIHNlc2FtZQ" * 4
    assert len(encoded) >= 80
    assert len(_base64_findings(encoded)) == 1


def test_explicit_base64_encoder_is_still_flagged():
    assert len(_base64_findings("payload = base64.b64encode(data)")) == 1
