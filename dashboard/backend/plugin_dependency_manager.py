"""Runtime dependency and prerequisite handling for EvoNexus plugins."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

WORKSPACE = Path(__file__).resolve().parent.parent.parent
CLAUDE_JSON = Path.home() / ".claude.json"

_PACKAGE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SPEC_RE = re.compile(r"^[A-Za-z0-9!._,*<>=~+\-]+$")


class PluginDependencyError(RuntimeError):
    """Raised when an auto-installable plugin dependency cannot be installed."""


def normalize_python_packages(dependencies: Any) -> dict[str, str]:
    """Return ``{package: version_spec}`` from supported dependency shapes."""

    if not isinstance(dependencies, dict) or not dependencies:
        return {}

    packages: Any = None
    python_block = dependencies.get("python")
    if isinstance(python_block, dict):
        packages = python_block.get("packages")
    elif "packages" in dependencies and isinstance(dependencies.get("packages"), dict):
        packages = dependencies.get("packages")
    else:
        # Backward-compatible flat form:
        # dependencies:
        #   python-docx: ">=1.1,<2"
        if all(isinstance(k, str) and isinstance(v, str) for k, v in dependencies.items()):
            packages = dependencies

    if packages is None:
        return {}

    if isinstance(packages, list):
        normalized = {}
        for item in packages:
            if isinstance(item, str):
                normalized[item] = ""
            elif isinstance(item, dict):
                name = item.get("name")
                if isinstance(name, str):
                    normalized[name] = str(item.get("version") or item.get("specifier") or "")
        packages = normalized

    if not isinstance(packages, dict):
        raise PluginDependencyError("dependencies.python.packages must be a mapping or list")

    result: dict[str, str] = {}
    for name, spec in packages.items():
        if not isinstance(name, str) or not _PACKAGE_RE.match(name):
            raise PluginDependencyError(f"Invalid Python package name: {name!r}")
        spec_text = "" if spec is None else str(spec).strip()
        if spec_text and spec_text != "*" and not _SPEC_RE.match(spec_text):
            raise PluginDependencyError(f"Invalid version spec for {name}: {spec_text!r}")
        result[name] = spec_text
    return result


def _requirement(name: str, spec: str) -> str:
    spec = (spec or "").strip()
    if not spec or spec == "*":
        return name
    if spec.startswith(("=", "!", "<", ">", "~")):
        return f"{name}{spec}"
    return f"{name}=={spec}"


def install_python_dependencies(
    slug: str,
    dependencies: Any,
    *,
    timeout_seconds: int = 300,
) -> dict[str, Any]:
    """Install declared Python packages into the current runtime environment."""

    packages = normalize_python_packages(dependencies)
    if not packages:
        return {"status": "skipped", "python": {"packages": [], "installer": None}}

    requirements = [_requirement(name, spec) for name, spec in packages.items()]
    uv = shutil.which("uv")
    if uv:
        cmd = [uv, "pip", "install", "--python", sys.executable, *requirements]
        installer = "uv"
    else:
        cmd = [sys.executable, "-m", "pip", "install", *requirements]
        installer = "pip"

    log.info("Installing Python dependencies for plugin %s: %s", slug, requirements)
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(WORKSPACE),
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            check=False,
        )
    except Exception as exc:
        raise PluginDependencyError(f"Python dependency install failed: {exc}") from exc

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise PluginDependencyError(
            f"Python dependency install failed for {slug}: {detail[:2000]}"
        )

    return {
        "status": "installed",
        "python": {
            "packages": [{"name": name, "specifier": spec} for name, spec in packages.items()],
            "requirements": requirements,
            "installer": installer,
        },
    }


def _configured_mcp_names(workspace: Path = WORKSPACE) -> set[str]:
    if not CLAUDE_JSON.is_file():
        return set()
    try:
        data = json.loads(CLAUDE_JSON.read_text(encoding="utf-8"))
    except Exception:
        return set()

    names: set[str] = set()
    top = data.get("mcpServers")
    if isinstance(top, dict):
        names.update(str(k) for k in top)

    projects = data.get("projects")
    if isinstance(projects, dict):
        for key in (str(workspace.resolve()), str(workspace)):
            project = projects.get(key)
            if isinstance(project, dict) and isinstance(project.get("mcpServers"), dict):
                names.update(str(k) for k in project["mcpServers"])
    return names


def evaluate_prerequisites(prerequisites: Any, *, workspace: Path = WORKSPACE) -> dict[str, Any]:
    """Best-effort prerequisite status for UI/operator visibility."""

    if not isinstance(prerequisites, list) or not prerequisites:
        return {"status": "ok", "items": []}

    mcp_names: set[str] | None = None
    items: list[dict[str, Any]] = []
    missing_required = False

    for raw in prerequisites:
        if not isinstance(raw, dict):
            continue
        ptype = str(raw.get("type") or "manual")
        required = bool(raw.get("required", True))
        ok = False
        detail = ""

        if ptype == "env":
            key = str(raw.get("key") or "")
            ok = bool(key and os.environ.get(key))
            detail = f"Environment variable {key} is {'set' if ok else 'not set'}"
        elif ptype == "cli":
            name = str(raw.get("name") or "")
            ok = bool(name and shutil.which(name))
            detail = f"CLI {name} is {'available' if ok else 'not available'}"
        elif ptype in {"mcp", "external_mcp"}:
            if mcp_names is None:
                mcp_names = _configured_mcp_names(workspace)
            name = str(raw.get("name") or "")
            ok = name in mcp_names
            detail = f"MCP {name} is {'configured' if ok else 'not configured'}"
        else:
            ok = not required
            detail = "Manual prerequisite"

        if required and not ok:
            missing_required = True

        items.append({
            "id": raw.get("id"),
            "type": ptype,
            "label": raw.get("label") or raw.get("id"),
            "required": required,
            "ok": ok,
            "detail": detail,
            "instructions": raw.get("instructions"),
        })

    return {"status": "needs_attention" if missing_required else "ok", "items": items}


def reconcile_plugin_runtime(slug: str, manifest: dict[str, Any]) -> dict[str, Any]:
    """Install dependencies and evaluate prerequisites for an installed plugin."""

    dependency_status = install_python_dependencies(slug, manifest.get("dependencies") or {})
    prerequisite_status = evaluate_prerequisites(manifest.get("prerequisites") or [])
    return {
        "dependencies": dependency_status,
        "prerequisites": prerequisite_status,
    }
