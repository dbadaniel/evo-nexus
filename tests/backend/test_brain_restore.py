import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2] / "dashboard" / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from brain_repo.restore import _replace_directory_tree  # noqa: E402


def test_replace_directory_tree_preserves_existing_destination_root(tmp_path):
    src = tmp_path / "src"
    dest = tmp_path / "dest"
    src.mkdir()
    dest.mkdir()

    original_dest_stat = dest.stat()
    (dest / "old.txt").write_text("old", encoding="utf-8")
    (src / "new.txt").write_text("new", encoding="utf-8")
    (src / "nested").mkdir()
    (src / "nested" / "child.txt").write_text("child", encoding="utf-8")

    _replace_directory_tree(src, dest)

    assert dest.exists()
    assert dest.stat().st_ino == original_dest_stat.st_ino
    assert not (dest / "old.txt").exists()
    assert (dest / "new.txt").read_text(encoding="utf-8") == "new"
    assert (dest / "nested" / "child.txt").read_text(encoding="utf-8") == "child"
