import sys
from contextlib import nullcontext
from pathlib import Path
from types import SimpleNamespace

from flask import Flask


BACKEND_DIR = Path(__file__).resolve().parents[2] / "dashboard" / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from brain_repo import git_ops, job_runner  # noqa: E402
from routes import brain_repo as brain_repo_routes  # noqa: E402


class _Query:
    def __init__(self, config):
        self.config = config

    def filter_by(self, **_kwargs):
        return self

    def first(self):
        return self.config


def test_connect_existing_repo_enqueues_clone(monkeypatch):
    app = Flask(__name__)
    config = SimpleNamespace(
        github_token_encrypted=None,
        repo_url=None,
        repo_owner=None,
        repo_name=None,
        local_path="old/repo",
        sync_enabled=False,
        last_error="old error",
        to_dict=lambda: {"local_path": config.local_path},
    )
    calls = []

    monkeypatch.setattr(brain_repo_routes, "current_user", SimpleNamespace(id=7, username="daniel"))
    monkeypatch.setattr(brain_repo_routes, "_get_config", lambda: config)
    monkeypatch.setattr(brain_repo_routes, "_get_master_key", lambda: b"test-key")
    monkeypatch.setattr(brain_repo_routes.db.session, "commit", lambda: None)

    from brain_repo import github_api, github_oauth

    monkeypatch.setattr(github_api, "validate_pat_scopes", lambda _token: (True, ["repo"]))
    monkeypatch.setattr(
        github_api,
        "get_repo_info",
        lambda _token, _url: (True, {"owner": {"login": "dbadaniel"}, "name": "evo-brain"}),
    )
    monkeypatch.setattr(
        github_oauth,
        "PATAuthProvider",
        lambda token, _key: SimpleNamespace(encrypt_token=lambda: f"enc:{token}".encode()),
    )
    monkeypatch.setattr(
        job_runner,
        "enqueue_clone",
        lambda app_arg, user_id, **kwargs: calls.append((app_arg, user_id, kwargs)) or True,
    )

    with app.test_request_context(
        "/api/brain-repo/connect",
        method="POST",
        json={"token": "secret", "repo_url": "https://github.com/dbadaniel/evo-brain"},
    ):
        response = brain_repo_routes.connect.__wrapped__()

    assert response.get_json() == {"local_path": None}
    assert config.repo_name == "evo-brain"
    assert config.local_path is None
    assert calls[0][1:] == (
        7,
        {
            "token": "secret",
            "repo_url": "https://github.com/dbadaniel/evo-brain",
            "repo_name": "evo-brain",
        },
    )


def test_clone_pipeline_persists_local_path(monkeypatch, tmp_path):
    config = SimpleNamespace(local_path=None)
    fake_models = SimpleNamespace(
        BrainRepoConfig=SimpleNamespace(query=_Query(config)),
        db=SimpleNamespace(session=SimpleNamespace(commit=lambda: None)),
    )
    released = []
    follow_up = []

    monkeypatch.setitem(sys.modules, "models", fake_models)
    monkeypatch.setattr(job_runner, "_brain_repos_dir", lambda: tmp_path)
    monkeypatch.setattr(job_runner, "_check_cancel", lambda *_args: None)
    monkeypatch.setattr(
        job_runner,
        "_release_db_lock",
        lambda _app, _user_id, **kwargs: released.append(kwargs),
    )
    monkeypatch.setattr(
        job_runner,
        "enqueue_sync",
        lambda _app, user_id, **kwargs: follow_up.append((user_id, kwargs)) or True,
    )

    def fake_clone(_url, _token, target):
        target.mkdir()
        (target / ".git").mkdir()

    monkeypatch.setattr(git_ops, "clone", fake_clone)
    app = SimpleNamespace(app_context=lambda: nullcontext())

    job_runner.run_clone_pipeline(
        app,
        7,
        token="secret",
        repo_url="https://github.com/dbadaniel/evo-brain",
        repo_name="evo-brain",
        sync_after_clone={
            "workspace": tmp_path,
            "kind": job_runner.JOB_KIND_SYNC,
        },
    )

    assert config.local_path == str(tmp_path / "evo-brain")
    assert released == [{"success": True, "error": None}]
    assert follow_up == [(7, {"workspace": tmp_path, "kind": job_runner.JOB_KIND_SYNC})]


def test_sync_force_repairs_legacy_config_without_local_path(monkeypatch):
    app = Flask(__name__)
    config = SimpleNamespace(
        github_token_encrypted=b"encrypted",
        repo_url="https://github.com/dbadaniel/evo-brain",
        repo_name="evo-brain",
        local_path=None,
    )
    calls = []

    monkeypatch.setattr(brain_repo_routes, "current_user", SimpleNamespace(id=7))
    monkeypatch.setattr(brain_repo_routes, "_get_config", lambda: config)
    monkeypatch.setattr(brain_repo_routes, "_decrypt_token", lambda _config: "secret")
    monkeypatch.setattr(
        job_runner,
        "enqueue_clone",
        lambda app_arg, user_id, **kwargs: calls.append((app_arg, user_id, kwargs)) or True,
    )

    with app.test_request_context("/api/brain-repo/sync/force", method="POST"):
        response, status = brain_repo_routes.sync_force.__wrapped__()

    assert status == 202
    assert response.get_json()["repairing_clone"] is True
    assert calls[0][1] == 7
    assert calls[0][2]["repo_name"] == "evo-brain"
    assert calls[0][2]["sync_after_clone"]["kind"] == job_runner.JOB_KIND_SYNC


def test_git_clone_restores_clean_origin_url(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, cwd=None, timeout=git_ops.DEFAULT_TIMEOUT):
        calls.append((cmd, cwd, timeout))
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr(git_ops, "_run", fake_run)
    target = tmp_path / "repo"

    git_ops.clone("https://github.com/dbadaniel/evo-brain", "secret", target)

    assert calls[0][0] == [
        "git",
        "clone",
        "https://secret@github.com/dbadaniel/evo-brain",
        str(target),
    ]
    assert calls[1][:2] == (
        ["git", "remote", "set-url", "origin", "https://github.com/dbadaniel/evo-brain"],
        target,
    )


def test_git_identity_is_configured_only_when_missing(monkeypatch, tmp_path):
    calls = []
    responses = iter([
        SimpleNamespace(returncode=1, stdout="", stderr=""),
        SimpleNamespace(returncode=0, stdout="", stderr=""),
        SimpleNamespace(returncode=0, stdout="existing@example.com\n", stderr=""),
    ])

    def fake_run(cmd, cwd=None, timeout=git_ops.DEFAULT_TIMEOUT):
        calls.append((cmd, cwd, timeout))
        return next(responses)

    monkeypatch.setattr(git_ops, "_run", fake_run)
    git_ops.ensure_identity(tmp_path, "dbadaniel", "dbadaniel@users.noreply.github.com")

    assert calls[1][0] == ["git", "config", "user.name", "dbadaniel"]
    assert calls[2][0] == ["git", "config", "--get", "user.email"]
    assert len(calls) == 3
