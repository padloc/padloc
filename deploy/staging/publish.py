#!/usr/bin/env python3
"""Publish the staging channel only after both images are pushed."""
import json
import os
import re
import subprocess
import urllib.request

REPO = "padloc/padloc"
CHANNEL = "padloc-staging-channel"

def api(path, data=None, method=None):
    request = urllib.request.Request(
        "https://api.github.com/repos/" + REPO + "/" + path,
        data=json.dumps(data).encode() if data is not None else None,
        method=method,
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"],
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)

def main():
    run = api("actions/runs/" + os.environ["GITHUB_RUN_ID"])
    runs = api("actions/workflows/" + str(run["workflow_id"]) + "/runs?event=push&per_page=100")
    newest = max(item["run_number"] for item in runs["workflow_runs"])
    if run["run_number"] != newest:
        raise SystemExit("A newer staging tag has been requested; refusing to publish this run.")
    release = api("releases/tags/" + CHANNEL)
    old = json.loads(release["body"]) if release.get("body") else {}
    if old.get("sequence", 0) > run["run_number"]:
        raise SystemExit("Refusing to replace a newer published staging.")
    manifest = {"schema": 1, "sequence": run["run_number"],
                "tag": os.environ["GITHUB_REF_NAME"], "sha": os.environ["GITHUB_SHA"]}
    for component in ("server", "pwa"):
        image = "ghcr.io/padloc/padloc-staging-" + component
        inspection = json.loads(subprocess.check_output(
            ["docker", "image", "inspect", image + ":" + manifest["sha"]]))[0]
        digest = next(value for value in inspection["RepoDigests"] if value.startswith(image + "@"))
        if not re.fullmatch(re.escape(image) + r"@sha256:[0-9a-f]{64}", digest):
            raise SystemExit("Invalid image digest")
        manifest[component + "_image"] = digest
    api("releases/" + str(release["id"]),
        {"body": json.dumps(manifest, indent=2), "prerelease": True, "make_latest": "false"}, "PATCH")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as output:
        output.write("Published staging: " + manifest["tag"] + " (" + manifest["sha"] + ")\n")
        output.write("The droplet will pull this release at https://staging.padloc.app.\n")

if __name__ == "__main__":
    main()
