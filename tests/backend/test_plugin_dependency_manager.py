import os

import pytest

from dashboard.backend.plugin_dependency_manager import (
    PluginDependencyError,
    evaluate_prerequisites,
    normalize_python_packages,
)


def test_normalize_python_packages_preferred_shape():
    deps = {
        "python": {
            "packages": {
                "python-docx": ">=1.1,<2",
                "pyyaml": ">=6.0",
            }
        }
    }

    assert normalize_python_packages(deps) == {
        "python-docx": ">=1.1,<2",
        "pyyaml": ">=6.0",
    }


def test_normalize_python_packages_flat_shape():
    assert normalize_python_packages({"python-docx": ">=1.1,<2"}) == {
        "python-docx": ">=1.1,<2"
    }


def test_normalize_python_packages_rejects_shell_like_spec():
    with pytest.raises(PluginDependencyError):
        normalize_python_packages({"python-docx": ">=1.1; rm -rf /"})


def test_evaluate_env_prerequisite(monkeypatch):
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    status = evaluate_prerequisites([
        {
            "id": "google-credentials",
            "type": "env",
            "key": "GOOGLE_APPLICATION_CREDENTIALS",
            "label": "Google credentials",
            "required": True,
        }
    ])

    assert status["status"] == "needs_attention"
    assert status["items"][0]["ok"] is False

    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", os.devnull)
    status = evaluate_prerequisites([
        {
            "id": "google-credentials",
            "type": "env",
            "key": "GOOGLE_APPLICATION_CREDENTIALS",
            "label": "Google credentials",
            "required": True,
        }
    ])

    assert status["status"] == "ok"
    assert status["items"][0]["ok"] is True
