"""Tests for rebuilding plugin resources from the persistent plugin volume."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import plugin_runtime_sync as runtime_sync
from plugin_file_ops import write_runtime_state


def _write_plugin(workspace: Path, slug: str) -> Path:
    plugin = workspace / "plugins" / slug
    (plugin / "agents").mkdir(parents=True)
    (plugin / "skills" / "launch-plan").mkdir(parents=True)
    (plugin / "rules").mkdir(parents=True)
    (plugin / "agents" / "strategist.md").write_text(
        "---\nname: strategist\n---\nPlugin agent\n", encoding="utf-8"
    )
    (plugin / "skills" / "launch-plan" / "SKILL.md").write_text(
        "---\nname: launch-plan\n---\nPlugin skill\n", encoding="utf-8"
    )
    (plugin / "rules" / "paid-launch.md").write_text("Plugin rule\n", encoding="utf-8")
    (plugin / "plugin.yaml").write_text(
        f"id: {slug}\nname: Test Plugin\nmcp_servers: []\n", encoding="utf-8"
    )
    return plugin


def test_sync_preserves_native_resources_and_rehydrates_plugins(tmp_path):
    native = tmp_path / ".claude" / "agents" / "native-agent.md"
    native.parent.mkdir(parents=True)
    native.write_text("native\n", encoding="utf-8")
    plugin = _write_plugin(tmp_path, "paid-launch")
    write_runtime_state(
        plugin,
        enabled=True,
        capabilities_disabled={"skills": ["plugin-paid-launch-launch-plan"]},
    )
    result = runtime_sync.sync_plugin_resources(tmp_path)

    assert result == {"synced": ["paid-launch"], "errors": {}}
    assert native.read_text(encoding="utf-8") == "native\n"
    agent = tmp_path / ".claude" / "agents" / "plugin-paid-launch-strategist.md"
    assert agent.is_file()
    assert 'name: "plugin-paid-launch-strategist"' in agent.read_text(encoding="utf-8")
    assert (
        tmp_path / ".claude" / "skills" / "plugin-paid-launch-launch-plan.disabled"
    ).is_dir()
    rules_index = tmp_path / ".claude" / "rules" / "_plugins-index.md"
    assert "@plugin-paid-launch-paid-launch.md" in rules_index.read_text(encoding="utf-8")


def test_sync_skips_disabled_plugin_and_removes_stale_copy(tmp_path):
    plugin = _write_plugin(tmp_path, "paid-launch")
    write_runtime_state(plugin, enabled=False, capabilities_disabled={})
    stale = tmp_path / ".claude" / "agents" / "plugin-paid-launch-old.md"
    stale.parent.mkdir(parents=True)
    stale.write_text("stale\n", encoding="utf-8")
    result = runtime_sync.sync_plugin_resources(tmp_path)

    assert result == {"synced": [], "errors": {}}
    assert not stale.exists()
    assert not (tmp_path / ".claude" / "agents" / "plugin-paid-launch-strategist.md").exists()
