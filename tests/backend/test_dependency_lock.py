from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[2]


def test_torch_uses_cpu_only_index():
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))

    sources = pyproject["tool"]["uv"]["sources"]
    indexes = {entry["name"]: entry for entry in pyproject["tool"]["uv"]["index"]}

    assert sources["torch"] == [{"index": "pytorch-cpu"}]
    assert indexes["pytorch-cpu"]["url"] == "https://download.pytorch.org/whl/cpu"
    assert indexes["pytorch-cpu"]["explicit"] is True


def test_lockfile_does_not_include_cuda_or_nvidia_packages():
    lock_text = (ROOT / "uv.lock").read_text(encoding="utf-8").lower()

    blocked_fragments = (
        'name = "cuda-',
        'name = "nvidia-',
        "nvidia-cublas",
        "nvidia-cuda",
        "nvidia-cudnn",
        "nvidia-cufft",
        "nvidia-curand",
        "nvidia-cusolver",
        "nvidia-cusparse",
        "nvidia-nccl",
        "nvidia-nvjitlink",
        "nvidia-nvtx",
    )

    assert not any(fragment in lock_text for fragment in blocked_fragments)
