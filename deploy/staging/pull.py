#!/usr/bin/env python3
"""Poll a public manifest; never execute code or Compose files from the release."""
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request

ROOT = Path("/opt/padloc-staging")
URL = "https://api.github.com/repos/padloc/padloc/releases/tags/padloc-staging-channel"

def validate(manifest):
    if manifest.get("schema") != 1 or type(manifest.get("sequence")) is not int or manifest["sequence"] < 1:
        raise ValueError("Invalid manifest schema or sequence")
    if not re.fullmatch(r"staging-[A-Za-z0-9._-]+", manifest.get("tag", "")):
        raise ValueError("Invalid staging tag")
    if not re.fullmatch(r"[0-9a-f]{40}", manifest.get("sha", "")):
        raise ValueError("Invalid commit SHA")
    for component in ("server", "pwa"):
        pattern = r"ghcr\.io/padloc/padloc-staging-" + component + r"@sha256:[0-9a-f]{64}"
        if not re.fullmatch(pattern, manifest.get(component + "_image", "")):
            raise ValueError("Invalid image reference")
    return manifest

def save(path, manifest):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, indent=2) + "\n")
    temporary.replace(path)

def main():
    os.chdir(ROOT)
    with open(ROOT / ".pull.lock", "w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        request = urllib.request.Request(URL, headers={"Accept": "application/vnd.github+json",
                                                     "User-Agent": "padloc-staging-puller"})
        with urllib.request.urlopen(request, timeout=30) as response:
            release = json.load(response)
        if release.get("draft") or not release.get("body"):
            return
        manifest = validate(json.loads(release["body"]))
        for filename in ("deployed.json", "failed.json"):
            path = ROOT / filename
            if path.exists() and json.loads(path.read_text())["sequence"] >= manifest["sequence"]:
                return
        with tempfile.NamedTemporaryFile(mode="w", dir=ROOT, prefix=".candidate-", delete=False) as output:
            output.write("SERVER_IMAGE=" + manifest["server_image"] + "\n")
            output.write("PWA_IMAGE=" + manifest["pwa_image"] + "\n")
            output.write("STAGING_HOST=staging.padloc.app\n")
            candidate = Path(output.name)
        try:
            print("Deploying " + manifest["tag"] + " at " + manifest["sha"], flush=True)
            result = subprocess.run(["bash", "/usr/local/lib/padloc-staging/deploy.sh", str(candidate)])
            if result.returncode == 0:
                save(ROOT / "deployed.json", manifest)
                (ROOT / "failed.json").unlink(missing_ok=True)
            elif result.returncode == 10:
                save(ROOT / "failed.json", manifest)
                raise SystemExit("Staging health checks failed; release blocked until a new tag or manual retry.")
            else:
                raise SystemExit(result.returncode)
        finally:
            candidate.unlink(missing_ok=True)

if __name__ == "__main__":
    main()
