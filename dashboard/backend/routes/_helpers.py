"""Shared helpers for route modules."""

import json
import re
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent


def parse_frontmatter(text: str) -> dict:
    """Extract key-value pairs from YAML-style --- frontmatter."""
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    result = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            result[key.strip()] = val.strip().strip('"').strip("'")
    return result


def safe_read(path: Path, encoding: str = "utf-8") -> str | None:
    """Read file content safely, returning None on error."""
    try:
        return path.read_text(encoding=encoding, errors="replace")
    except Exception:
        return None


def file_info(path: Path, base: Path | None = None) -> dict:
    """Build a basic info dict for a file."""
    info = {
        "name": path.name,
        "path": str(path.relative_to(base)) if base else str(path),
        "extension": path.suffix,
        "size": path.stat().st_size if path.exists() else 0,
    }
    try:
        info["modified"] = path.stat().st_mtime
    except Exception:
        pass
    return info


def load_terminal_chat_sessions() -> list[dict]:
    """Load persisted terminal-server chat sessions, if available."""
    candidate_paths = [
        WORKSPACE / ".claude-code-web" / "sessions.json",
        Path.home() / ".claude-code-web" / "sessions.json",
    ]
    for sessions_file in candidate_paths:
        content = safe_read(sessions_file)
        if not content:
            continue
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            continue
        sessions = data.get("sessions")
        if isinstance(sessions, list):
            return sessions
    return []


def summarize_terminal_chat_usage() -> dict:
    """Aggregate chat usage/cost metrics from terminal-server persisted sessions."""
    total_cost = 0.0
    total_requests = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_cache_tokens = 0
    total_sessions = 0
    by_agent = {}
    by_day = {}

    for session in load_terminal_chat_sessions():
        usage = session.get("sessionUsage") or {}
        cost = float(usage.get("totalCost", 0) or 0)
        requests = int(usage.get("requests", 0) or 0)
        input_tokens = int(usage.get("inputTokens", 0) or 0)
        output_tokens = int(usage.get("outputTokens", 0) or 0)
        cache_tokens = int(usage.get("cacheTokens", 0) or 0)
        agent = session.get("agentName") or "chat"
        created = str(session.get("created") or "")[:10]

        if cost <= 0 and requests <= 0 and input_tokens <= 0 and output_tokens <= 0 and cache_tokens <= 0:
            continue

        total_sessions += 1
        total_cost += cost
        total_requests += requests
        total_input_tokens += input_tokens
        total_output_tokens += output_tokens
        total_cache_tokens += cache_tokens

        if agent not in by_agent:
            by_agent[agent] = {
                "agent": agent,
                "cost": 0.0,
                "requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_tokens": 0,
                "sessions": 0,
            }

        by_agent[agent]["cost"] += cost
        by_agent[agent]["requests"] += requests
        by_agent[agent]["input_tokens"] += input_tokens
        by_agent[agent]["output_tokens"] += output_tokens
        by_agent[agent]["cache_tokens"] += cache_tokens
        by_agent[agent]["sessions"] += 1

        if created:
            by_day[created] = by_day.get(created, 0.0) + cost

    return {
        "total_cost": round(total_cost, 4),
        "requests": total_requests,
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
        "cache_tokens": total_cache_tokens,
        "total_tokens": total_input_tokens + total_output_tokens,
        "sessions": total_sessions,
        "by_agent": sorted(by_agent.values(), key=lambda item: item["cost"], reverse=True),
        "by_day": by_day,
    }


def agent_supports_persistent_memory(agent_name: str) -> bool:
    """Infer whether an agent is documented as having persistent memory."""
    agent_path = WORKSPACE / ".claude" / "agents" / f"{agent_name}.md"
    content = safe_read(agent_path)
    if not content:
        return False

    lowered = content.lower()
    if "no persistent agent memory" in lowered:
        return False

    return (
        ".claude/agent-memory/" in content
        or "always read your memory folder first" in lowered
        or "persistent, file-based memory system" in lowered
        or "## memory" in lowered
    )


def count_agent_memory_entries(agent_name: str) -> int:
    """Count effective memory entries for an agent, respecting MEMORY.md semantics."""
    if not agent_supports_persistent_memory(agent_name):
        return 0

    mem_dir = WORKSPACE / ".claude" / "agent-memory" / agent_name
    if not mem_dir.is_dir():
        return 0

    memory_index = mem_dir / "MEMORY.md"
    content = safe_read(memory_index)
    if content:
        lines = [
            line.strip()
            for line in content.splitlines()
            if line.strip().startswith("- ")
        ]
        return len(lines)

    fallback_files = [
        f for f in mem_dir.iterdir()
        if f.is_file() and f.name not in {"MEMORY.md", "_improvements.md"}
    ]
    return len(fallback_files)


# ── Dynamic routine discovery ─────────────────────────

# Agent name mapping: lowercase variations found in docstrings → canonical name
_AGENT_ALIASES = {
    "clawdia": "clawdia", "pulse": "pulse", "flux": "flux",
    "atlas": "atlas", "kai": "kai", "sage": "sage",
    "pixel": "pixel", "nex": "nex", "mentor": "mentor",
}


def _extract_agent_from_script(path: Path) -> str:
    """Extract agent name from script docstring (pattern: 'via AgentName')."""
    try:
        # Read only first 5 lines to find docstring
        with open(path) as f:
            head = "".join(f.readline() for _ in range(5))
        m = re.search(r"via\s+(\w+)", head, re.IGNORECASE)
        if m:
            name = m.group(1).lower()
            return _AGENT_ALIASES.get(name, name)
    except Exception:
        pass
    return ""


def _script_to_make_id(script_path: str) -> str:
    """Convert script path to a make-friendly ID: custom/financial_pulse.py → fin-pulse."""
    name = script_path.replace("custom/", "").replace(".py", "")
    # Common abbreviation patterns
    _ID_MAP = {
        "good_morning": "morning", "sync_meetings": "sync", "email_triage": "triage",
        "review_todoist": "review", "memory_sync": "memory", "memory_lint": "memory-lint",
        "end_of_day": "eod", "weekly_review": "weekly",
        "financial_pulse": "fin-pulse", "financial_weekly": "fin-weekly",
        "monthly_close": "fin-close", "social_analytics": "social",
        "licensing_daily": "licensing", "licensing_weekly": "licensing-weekly",
        "licensing_monthly": "licensing-month", "community_daily": "community",
        "community_weekly": "community-week", "community_monthly": "community-month",
        "health_checkin": "health", "strategy_digest": "strategy",
        "github_review": "github", "linear_review": "linear",
        "faq_sync": "faq", "trends": "trends", "dashboard": "dashboard",
        "instagram_report": "instagram", "linkedin_report": "linkedin",
        "youtube_report": "youtube", "backup": "backup",
    }
    return _ID_MAP.get(name, name.replace("_", "-"))


def discover_routines() -> dict:
    """Scan ADWs/routines/ and config/routines.yaml to build routine registry.

    Returns dict keyed by make-id:
        {
            "morning": {"script": "good_morning.py", "agent": "clawdia", "name": "Good Morning", "custom": False},
            "fin-pulse": {"script": "custom/financial_pulse.py", "agent": "flux", "name": "Financial Pulse", "custom": True},
            ...
        }
    """
    routines_dir = WORKSPACE / "ADWs" / "routines"
    registry = {}

    # 1. Scan core scripts (ADWs/routines/*.py)
    for py in sorted(routines_dir.glob("*.py")):
        if py.name.startswith("_"):
            continue
        script_key = py.stem  # e.g. "good_morning"
        make_id = _script_to_make_id(py.name)
        agent = _extract_agent_from_script(py)
        name = py.stem.replace("_", " ").title()
        # Extract better name from docstring
        doc_name = _extract_name_from_script(py)
        registry[make_id] = {
            "script": py.name,
            "agent": agent,
            "name": doc_name or name,
            "custom": False,
            "script_key": script_key,
        }

    # 2. Scan custom scripts (ADWs/routines/custom/*.py)
    custom_dir = routines_dir / "custom"
    if custom_dir.is_dir():
        for py in sorted(custom_dir.glob("*.py")):
            if py.name.startswith("_"):
                continue
            script_key = py.stem
            make_id = _script_to_make_id(f"custom/{py.name}")
            agent = _extract_agent_from_script(py)
            name = py.stem.replace("_", " ").title()
            doc_name = _extract_name_from_script(py)
            registry[make_id] = {
                "script": f"custom/{py.name}",
                "agent": agent,
                "name": doc_name or name,
                "custom": True,
                "script_key": script_key,
            }

    return registry


def _extract_name_from_script(path: Path) -> str:
    """Extract human name from docstring (pattern: 'ADW: Name —')."""
    try:
        with open(path) as f:
            head = "".join(f.readline() for _ in range(5))
        m = re.search(r'ADW:\s*(.+?)\s*[—–-]', head)
        if m:
            return m.group(1).strip()
    except Exception:
        pass
    return ""


def get_script_agents() -> dict:
    """Build script_key → agent mapping dynamically (replaces hardcoded SCRIPT_AGENTS)."""
    registry = discover_routines()
    return {r["script_key"]: r["agent"] for r in registry.values()}


def get_routine_scripts() -> dict:
    """Build make_id → script_path mapping dynamically (replaces hardcoded ROUTINE_SCRIPTS)."""
    registry = discover_routines()
    return {make_id: r["script"] for make_id, r in registry.items()}
