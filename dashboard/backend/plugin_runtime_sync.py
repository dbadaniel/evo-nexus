"""Rebuild ephemeral Claude plugin resources from persistent plugin sources."""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from typing import Any

import yaml

from plugin_file_ops import RUNTIME_STATE_FILENAME, copy_with_manifest

log = logging.getLogger(__name__)
WORKSPACE = Path(__file__).resolve().parent.parent.parent
RESOURCE_TYPES = ("agents", "skills", "commands", "rules")


def _runtime_state(plugin_dir: Path) -> dict[str, Any]:
    path = plugin_dir / RUNTIME_STATE_FILENAME
    if not path.is_file():
        return {"enabled": True, "capabilities_disabled": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Ignoring invalid runtime state for %s: %s", plugin_dir.name, exc)
        return {"enabled": True, "capabilities_disabled": {}}
    return {
        "enabled": bool(data.get("enabled", True)),
        "capabilities_disabled": data.get("capabilities_disabled") or {},
    }


def _clean_namespaced_resources(workspace: Path) -> None:
    for resource_type in RESOURCE_TYPES:
        target = workspace / ".claude" / resource_type
        if not target.is_dir():
            continue
        for entry in target.glob("plugin-*"):
            if entry.is_dir():
                shutil.rmtree(entry)
            else:
                entry.unlink(missing_ok=True)


def _write_rules_index(workspace: Path, blocks: list[tuple[str, list[str]]]) -> None:
    index_path = workspace / ".claude" / "rules" / "_plugins-index.md"
    index_path.parent.mkdir(parents=True, exist_ok=True)
    existing = index_path.read_text(encoding="utf-8") if index_path.exists() else ""

    import re

    existing = re.sub(
        r"\n?<!-- PLUGIN:[^:]+:START -->.+?<!-- PLUGIN:[^:]+:END -->\n?",
        "\n",
        existing,
        flags=re.DOTALL,
    ).rstrip()
    rendered = []
    for slug, filenames in blocks:
        lines = "\n".join(f"@{name}" for name in sorted(filenames))
        rendered.append(
            f"<!-- PLUGIN:{slug}:START -->\n{lines}\n<!-- PLUGIN:{slug}:END -->"
        )
    content = "\n\n".join(part for part in (existing, *rendered) if part)
    index_path.write_text(content + ("\n" if content else ""), encoding="utf-8")


def sync_plugin_resources(workspace: Path = WORKSPACE) -> dict[str, Any]:
    plugins_dir = workspace / "plugins"
    _clean_namespaced_resources(workspace)
    rules_blocks: list[tuple[str, list[str]]] = []
    synced: list[str] = []
    errors: dict[str, str] = {}

    if not plugins_dir.is_dir():
        _write_rules_index(workspace, rules_blocks)
        return {"synced": synced, "errors": errors}

    for plugin_dir in sorted(plugins_dir.iterdir()):
        if not plugin_dir.is_dir() or plugin_dir.name.startswith("."):
            continue
        manifest_path = plugin_dir / "plugin.yaml"
        if not manifest_path.is_file():
            continue
        state = _runtime_state(plugin_dir)
        if not state["enabled"]:
            continue
        try:
            manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) or {}
            slug = str(manifest.get("id") or plugin_dir.name)
            if slug != plugin_dir.name:
                raise ValueError("plugin id must match its persistent directory name")
            disabled = state["capabilities_disabled"]

            for resource_type in RESOURCE_TYPES:
                source = plugin_dir / resource_type
                if not source.is_dir():
                    continue
                records: list[dict[str, Any]] = []
                copy_with_manifest(
                    source,
                    workspace / ".claude" / resource_type,
                    slug,
                    resource_type,
                    records,
                )
                disabled_ids = set(disabled.get(resource_type, []))
                if resource_type == "rules":
                    active = [
                        Path(record["dest"]).name
                        for record in records
                        if Path(record["dest"]).name not in disabled_ids
                        and Path(record["dest"]).stem not in disabled_ids
                    ]
                    if active:
                        rules_blocks.append((slug, active))
                else:
                    for record in records:
                        destination = Path(record["dest"])
                        stem = destination.stem if destination.is_file() else destination.name
                        if stem not in disabled_ids:
                            continue
                        destination.rename(destination.with_name(destination.name + ".disabled"))

            if manifest.get("mcp_servers"):
                from plugin_claude_config import add_mcp_servers

                add_mcp_servers(slug, manifest["mcp_servers"], workspace=workspace)
            synced.append(slug)
        except Exception as exc:
            errors[plugin_dir.name] = str(exc)
            log.exception("Could not sync plugin %s", plugin_dir.name)

    _write_rules_index(workspace, rules_blocks)
    return {"synced": synced, "errors": errors}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = sync_plugin_resources()
    log.info("Plugin runtime sync complete: %s", result)
