"""Agents endpoint — list agents, their config and memory."""

import json
import sqlite3
from pathlib import Path

from flask import Blueprint, jsonify, abort, Response
from flask_login import login_required, current_user
from routes._helpers import WORKSPACE, safe_read, parse_frontmatter, file_info
from models import has_agent_access

bp = Blueprint("agents", __name__)

AGENTS_DIR = WORKSPACE / ".claude" / "agents"
AGENT_MEMORY_DIR = WORKSPACE / ".claude" / "agent-memory"
DB_PATH = WORKSPACE / "dashboard" / "data" / "evonexus.db"


def _count_memory(name: str) -> int:
    mem_dir = AGENT_MEMORY_DIR / name
    if not mem_dir.is_dir():
        return 0
    return sum(1 for f in mem_dir.iterdir() if f.is_file())


def _format_agent_label(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-") if part)


def _plugin_agent_metadata() -> dict[str, dict]:
    """Return UI metadata for agents declared by active plugins."""
    if not DB_PATH.exists():
        return {}
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT slug, name, manifest_json FROM plugins_installed "
            "WHERE enabled = 1 AND status = 'active'"
        ).fetchall()
        conn.close()
    except Exception:
        return {}

    meta: dict[str, dict] = {}
    for row in rows:
        plugin_slug = row["slug"]
        plugin_name = row["name"] or plugin_slug
        try:
            manifest = json.loads(row["manifest_json"] or "{}")
        except Exception:
            continue
        for agent_entry in manifest.get("agents") or []:
            file_path = agent_entry.get("file") or ""
            if not file_path:
                continue
            agent_file_slug = Path(file_path).stem
            agent_name = f"plugin-{plugin_slug}-{agent_file_slug}"
            display_name = (
                agent_entry.get("display_name")
                or agent_entry.get("label")
                or _format_agent_label(agent_file_slug)
            )
            entry = {
                "plugin_slug": plugin_slug,
                "display_name": display_name,
                "category": agent_entry.get("category") or f"plugin-{plugin_slug}",
                "category_label": agent_entry.get("category_label") or plugin_name,
            }
            for key in ("icon", "color"):
                if agent_entry.get(key):
                    entry[key] = agent_entry[key]
            meta[agent_name] = entry
    return meta


@bp.route("/api/agents")
@login_required
def list_agents():
    if not AGENTS_DIR.is_dir():
        return jsonify([])
    agents = []
    role = current_user.role if current_user.is_authenticated else "viewer"
    plugin_meta = _plugin_agent_metadata()
    for f in sorted(AGENTS_DIR.iterdir()):
        if f.suffix.lower() == ".md" and f.is_file():
            content = safe_read(f) or ""
            fm = parse_frontmatter(content)
            name = f.stem
            entry = {
                "name": name,
                "description": fm.get("description", ""),
                "memory_count": _count_memory(name),
                "custom": name.startswith("custom-"),
                "locked": not has_agent_access(role, name),
            }
            if fm.get("color"):
                entry["color"] = fm["color"]
            if fm.get("model"):
                entry["model"] = fm["model"]
            if name in plugin_meta:
                entry.update(plugin_meta[name])
            agents.append(entry)
    return jsonify(agents)


@bp.route("/api/agents/<name>")
def get_agent(name):
    path = (AGENTS_DIR / f"{name}.md").resolve()
    try:
        path.relative_to(AGENTS_DIR.resolve())
    except ValueError:
        abort(403, description="Access denied")
    if not path.is_file():
        abort(404, description="Agent not found")
    return Response(safe_read(path) or "", mimetype="text/markdown")


@bp.route("/api/agents/<name>/memory")
def list_agent_memory(name):
    mem_dir = (AGENT_MEMORY_DIR / name).resolve()
    try:
        mem_dir.relative_to(AGENT_MEMORY_DIR.resolve())
    except ValueError:
        abort(403, description="Access denied")
    if not mem_dir.is_dir():
        return jsonify([])
    files = []
    for f in sorted(mem_dir.iterdir()):
        if f.is_file():
            files.append(file_info(f, mem_dir))
    return jsonify(files)


@bp.route("/api/agents/<name>/memory/<file>")
def get_agent_memory_file(name, file):
    path = (AGENT_MEMORY_DIR / name / file).resolve()
    try:
        path.relative_to(AGENT_MEMORY_DIR.resolve())
    except ValueError:
        abort(403, description="Access denied")
    if not path.is_file():
        abort(404, description="Memory file not found")
    content = safe_read(path)
    if content is None:
        abort(500, description="Could not read file")
    mime = "text/markdown" if path.suffix.lower() == ".md" else "text/plain"
    return Response(content, mimetype=mime)
