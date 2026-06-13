"""Marker model download management (ADR-002).

Called by POST /api/knowledge/parsers/install when the user activates
the Knowledge Base and wants to use the default Marker parser.

Model download is NOT triggered automatically — the UI explicitly asks
the user to install parser models (one-time, ~500MB Surya models).

Sentinel file: ~/.cache/evonexus/marker_installed.ok
    Present → models cached; install endpoint returns "already_installed".
    Absent → download needed.
"""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


_SENTINEL = Path.home() / ".cache" / "evonexus" / "marker_installed.ok"
_JOB_LOCK = threading.Lock()
_JOB: Dict[str, Any] = {
    "state": "idle",
    "stage": None,
    "progress": 0.0,
    "error": None,
    "started_at": None,
    "finished_at": None,
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_job(**updates: Any) -> None:
    with _JOB_LOCK:
        _JOB.update(updates)


def get_parser_status() -> Dict[str, Any]:
    """Return current parser installation status.

    Returns:
        {
            "marker_installed": bool,
            "models_cached": list[str],
            "cached_at": iso_timestamp | None,
            "install_state": "idle" | "installing" | "installed" | "error",
        }
    """
    installed = _SENTINEL.exists()
    cached_at = _SENTINEL.read_text().strip() if installed else None

    models_cached: List[str] = []
    if installed:
        # Best-effort: list HuggingFace cache entries for Surya/Marker models
        hf_cache = Path.home() / ".cache" / "huggingface" / "hub"
        if hf_cache.exists():
            models_cached = [
                d.name for d in hf_cache.iterdir()
                if d.is_dir() and ("surya" in d.name.lower() or "marker" in d.name.lower())
            ]

    with _JOB_LOCK:
        job = dict(_JOB)

    install_state = "installed" if installed else job.get("state", "idle")

    return {
        "marker_installed": installed,
        "models_cached": models_cached,
        "cached_at": cached_at,
        "install_state": install_state,
        "install_stage": job.get("stage"),
        "install_progress": job.get("progress", 0.0),
        "install_error": job.get("error"),
        "install_started_at": job.get("started_at"),
        "install_finished_at": job.get("finished_at"),
    }


def start_marker_model_install() -> Dict[str, Any]:
    """Start Marker model installation in the background.

    The download/model warm-up can take longer than reverse-proxy request
    timeouts. Keep the HTTP request short and expose progress through
    ``get_parser_status``.
    """
    if _SENTINEL.exists():
        return {
            "status": "already_installed",
            "cached_at": _SENTINEL.read_text().strip(),
        }

    with _JOB_LOCK:
        if _JOB.get("state") == "installing":
            return {"status": "installing", "progress": _JOB.get("progress", 0.0)}
        _JOB.update(
            {
                "state": "installing",
                "stage": "queued",
                "progress": 0.0,
                "error": None,
                "started_at": _utc_now(),
                "finished_at": None,
            }
        )

    def progress(stage: str, value: float) -> None:
        _set_job(stage=stage, progress=value)

    def worker() -> None:
        try:
            result = download_marker_models(progress)
            _set_job(
                state="installed",
                stage="done",
                progress=1.0,
                error=None,
                finished_at=result.get("cached_at") or _utc_now(),
            )
        except Exception as exc:
            _set_job(
                state="error",
                stage="error",
                error=str(exc),
                finished_at=_utc_now(),
            )

    thread = threading.Thread(target=worker, name="marker-model-install", daemon=True)
    thread.start()
    return {"status": "installing", "progress": 0.0}


def download_marker_models(
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> Dict[str, Any]:
    """Download and cache Marker/Surya models.

    Delegates to ``marker_parser.download_marker_models``.

    Args:
        progress_callback: optional callable(stage: str, progress: float 0.0-1.0)

    Returns:
        {"status": "ok" | "already_installed", "cached_at": iso_timestamp}

    Raises:
        MarkerNotInstalledError: if marker-pdf is not installed.
    """
    from knowledge.parsers.marker_parser import download_marker_models as _download
    return _download(progress_callback)
