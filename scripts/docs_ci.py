"""GitHub-only coordination; local docs_sync commands never invoke this implicitly."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from docs_sync import ROOT, config, git, load, read, report, statuses, validate, write


def run(*args):
    result = subprocess.run(list(args), cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        # Never echo subprocess input, auth-bearing errors or provider responses.
        raise ValueError(f"{args[0]} {args[1]} failed (exit {result.returncode})")
    # Porcelain status has significant leading spaces in its two-column status code.
    return result.stdout.rstrip("\r\n")


def output(name, value):
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
        stream.write(f"{name}={value}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["event", "commit-source", "prepare-translation", "open-pr", "issue"])
    args = parser.parse_args()
    if not os.environ.get("GITHUB_ACTIONS"):
        raise ValueError("This coordinator runs only inside GitHub Actions")
    cfg = config(ROOT)
    event = load(os.environ["GITHUB_EVENT_PATH"])
    default_branch = event["repository"]["default_branch"]
    if os.environ.get("GITHUB_REF") != f"refs/heads/{default_branch}":
        raise ValueError("Docs automation must run from the website default branch")
    if args.command == "event":
        payload = event.get("client_payload", {})
        if payload and payload.get("repository") != cfg["repository"]:
            raise ValueError("Dispatch source does not match the configured plugin")
        sha = payload.get("sha") or os.environ.get("DOCS_SOURCE_SHA", "")
        if sha and not re.fullmatch(r"[a-f0-9]{40,64}", sha):
            raise ValueError("Invalid plugin SHA")
        output("repository", cfg["repository"])
        output("plugin_ref", sha or cfg["branch"])
        output("plugin_branch", cfg["branch"])
        output("site_branch", default_branch)
    elif args.command == "commit-source":
        validate(ROOT)
        lock = load(ROOT / "docs-sync/source-lock.json")
        # Exact allowlist: never stage Chinese, scripts, configs or unrelated worktree edits.
        allowed = ["docs-sync/source-lock.json", "docs-sync/sources"]
        for page in lock["pages"].values():
            if page["locale"] == "en":
                allowed.append(page["output"])
                allowed.append(page["output"].rsplit(".", 1)[0] + (".mdx" if page["format"] == "md" else ".md"))
        tracked = set(run("git", "ls-files").splitlines())
        paths = [p for p in allowed if (ROOT / p).exists() or p in tracked]
        if paths:
            run("git", "add", "--", *paths)
        run("git", "diff", "--staged", "--check")
        if run("git", "diff", "--staged", "--name-only"):
            run("git", "-c", "user.name=docs-sync[bot]", "-c", "user.email=docs-sync[bot]@users.noreply.github.com",
                "commit", "-m", f"docs: sync plugin {lock['revision'][:12]}")
            # Non-fast-forward failure is intentional; rerun from fresh main, never force push.
            run("git", "push", "origin", f"HEAD:refs/heads/{default_branch}")
        output("sha", git(ROOT, "rev-parse", "HEAD"))
    elif args.command == "prepare-translation":
        pending = [r for r in statuses(ROOT) if r["status"] != "current"]
        if not pending:
            output("ready", "false")
            return
        prs = json.loads(run("gh", "pr", "list", "--state", "open", "--base", default_branch,
                             "--limit", "100", "--json", "headRefName,url"))
        if any(pr["headRefName"].startswith("docs-translation/") for pr in prs):
            print("An existing translation PR awaits review; its human edits are preserved.")
            output("ready", "false")
            return
        if not os.environ.get("DOCS_AI_API_KEY") or not os.environ.get("DOCS_AI_MODEL"):
            raise ValueError("Set the DOCS_AI_API_KEY secret and DOCS_AI_MODEL variable before generating translations")
        branch = f"docs-translation/{git(ROOT, 'rev-parse', '--short', 'HEAD')}-{os.environ['GITHUB_RUN_ID']}-{os.environ.get('GITHUB_RUN_ATTEMPT', '1')}"
        run("git", "switch", "-c", branch)
        output("ready", "true")
    elif args.command == "open-pr":
        validate(ROOT)
        changed = run("git", "status", "--porcelain", "--untracked-files=all").splitlines()
        allowed = []
        for line in changed:
            name = line[3:].strip('"')
            if name.startswith("docs-sync/translations/") or (name.startswith("content/docs/") and ".en." not in name and name.endswith((".md", ".mdx"))):
                allowed.append(name)
            elif name.startswith((".docs-sync-tmp/", "out/", ".next/", ".source/")) or name.endswith(".tsbuildinfo"):
                continue
            else:
                raise ValueError("Translation job changed a forbidden path: " + name)
        if not allowed:
            print("No translation changes")
            return
        run("git", "add", "--", *allowed)
        run("git", "diff", "--staged", "--check")
        run("git", "-c", "user.name=docs-translation[bot]", "-c", "user.email=docs-translation[bot]@users.noreply.github.com",
            "commit", "-m", "docs: draft Chinese translation updates")
        branch = git(ROOT, "branch", "--show-current")
        run("git", "push", "origin", f"HEAD:refs/heads/{branch}")
        records = [name for name in allowed if name.startswith("docs-sync/translations/")]
        verified = os.environ.get("DOCS_DRAFT_VALIDATION") == "success"
        validation = ("已通过文档校验、类型检查、构建及链接检查。" if verified else
                      "自动检查未通过，此 PR 保持 Draft；请修复 Actions 中报告的问题后再合并。")
        body = ["中文翻译草稿；确认内容后手动合并。此分支不会部署到生产站。", "",
                validation + "代码、链接和标识符由同步工具保护；翻译语义需要人工审阅。", "",
                "| 页面 | 原文版本 | 差异 |", "| --- | --- | --- |"]
        repo = cfg["repository"]
        for name in records:
            record = load(ROOT / name)
            page_id = name.removeprefix("docs-sync/translations/").removesuffix(".json")
            # source baseline is committed with the translation, never advanced on main before merge.
            old = subprocess.run(["git", "show", f"origin/{default_branch}:{name}"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            previous = json.loads(old.stdout).get("sourceRevision") if old.returncode == 0 else None
            revision = record["sourceRevision"]
            url = f"https://github.com/{repo}/compare/{previous}...{revision}" if previous else f"https://github.com/{repo}/tree/{revision}/Docs"
            body.append(f"| `{page_id}` | `{revision[:12]}` | [查看原文]({url}) |")
        body += ["", "如果原文在审阅期间再次更新，合并后仍会提示落后，并在下一批 PR 中继续更新。", ""]
        body_path = ROOT / ".docs-sync-tmp/translation-pr.md"
        write(body_path, "\n".join(body))
        options = [] if verified else ["--draft"]
        print(run("gh", "pr", "create", "--base", default_branch, "--head", branch,
                  "--title", f"docs: 更新 {len(records)} 页中文翻译", "--body-file", str(body_path), *options))
    else:
        title = "中文翻译待更新"
        issues = json.loads(run("gh", "issue", "list", "--state", "open", "--search", f'"{title}" in:title',
                                "--json", "number,title,body"))
        existing = next((item for item in issues if item["title"] == title), None)
        body = report(ROOT)
        if not any(r["status"] != "current" for r in statuses(ROOT)):
            if existing:
                run("gh", "issue", "close", str(existing["number"]))
        elif not existing or existing["body"].strip() != body.strip():
            body_path = ROOT / ".docs-sync-tmp/translation-status.md"
            write(body_path, body)
            if existing:
                run("gh", "issue", "edit", str(existing["number"]), "--body-file", str(body_path))
            else:
                run("gh", "issue", "create", "--title", title, "--body-file", str(body_path))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print(f"docs-ci: {error}", file=sys.stderr)
        sys.exit(1)
