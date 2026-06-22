from pathlib import Path
from types import SimpleNamespace

import backup


ROOT = Path(__file__).resolve().parents[2]


def test_dashboard_images_include_backup_module():
    for dockerfile in ("Dockerfile.dashboard", "Dockerfile.swarm.dashboard"):
        contents = (ROOT / dockerfile).read_text(encoding="utf-8")
        assert "COPY backup.py" in contents


def test_collect_files_without_git_uses_persistent_data_roots(monkeypatch, tmp_path):
    expected = {
        "workspace/notes/today.md",
        "memory/index.md",
        "config/providers.json",
        "dashboard/data/evonexus.db",
        "ADWs/logs/run.jsonl",
        ".claude/agent-memory/nova/MEMORY.md",
    }
    for relative in expected:
        path = tmp_path / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("data", encoding="utf-8")

    monkeypatch.setattr(backup, "WORKSPACE", tmp_path)
    monkeypatch.setattr(
        backup.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(returncode=128, stdout="", stderr="not a git repository"),
    )

    assert set(backup.collect_files()) == expected


def test_swarm_stack_persists_local_backups():
    stack = (ROOT / "evonexus.stack.yml").read_text(encoding="utf-8")
    assert "evonexus_backups:/workspace/backups" in stack


def test_completed_backup_does_not_block_next_run():
    route = (ROOT / "dashboard/backend/routes/backups.py").read_text(encoding="utf-8")
    assert '_running_jobs.get("backup", {}).get("status") == "running"' in route
