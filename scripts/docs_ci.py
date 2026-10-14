"""GitHub-only coordination; local docs_sync commands never invoke this implicitly."""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse

from docs_sync import ROOT, config, git, load, plugin_statuses, validate, within, write


SECRET_ENV = ("GH_TOKEN", "DOCS_PR_TOKEN", "DOCS_SITE_TOKEN", "DOCS_AI_API_KEY", "GIT_CONFIG_VALUE_0")


def run(*args, cwd=None, token=None, env=None):
    extra = {**({"GH_TOKEN": token} if token is not None else {}), **(env or {})}
    env = {**os.environ, **extra} if extra else None
    result = subprocess.run(list(args), cwd=cwd or ROOT, env=env, capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        # Never echo subprocess input, auth-bearing errors or provider responses. gh is the
        # exception: its last stderr line is GitHub's reason (a missing permission, a rule),
        # and every token this process knows is cut out of it first.
        detail = ""
        if args[0] == "gh" and result.stderr.strip():
            detail = result.stderr.strip().splitlines()[-1][:300]
            for name in SECRET_ENV:
                value = (env or os.environ).get(name)
                if value:
                    detail = detail.replace(value, "***")
            detail = ": " + detail
        raise ValueError(f"{args[0]} {args[1]} failed (exit {result.returncode}){detail}")
    # Porcelain status has significant leading spaces in its two-column status code.
    return result.stdout.rstrip("\r\n")


def output(name, value):
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
        stream.write(f"{name}={value}\n")


def plugin_token():
    token = os.environ.get("DOCS_PR_TOKEN")
    if not token:
        raise ValueError("Set DOCS_PR_TOKEN with Contents and Pull requests write access to the plugin repository")
    return token


def push_plugin(plugin, branch, token):
    # The plugin checkout keeps no credentials, so npm and the build that run in it
    # never see the write token. It reaches git for this one push, through the
    # environment rather than the command line.
    basic = base64.b64encode(f"x-access-token:{token}".encode()).decode()
    run("git", "push", "origin", f"HEAD:refs/heads/{branch}", cwd=plugin, env={
        "GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
        "GIT_CONFIG_VALUE_0": f"AUTHORIZATION: basic {basic}"})


def open_translation_pr(repository, branch, token):
    # Query the translation branch prefix directly, so unrelated open PRs cannot
    # hide an existing translation behind the first page of results.
    prs = json.loads(run("gh", "pr", "list", "--repo", repository, "--state", "open", "--base", branch,
                         "--search", "head:docs-translation/", "--limit", "100", "--json", "headRefName,url", token=token))
    return next((pr for pr in prs if pr["headRefName"].startswith("docs-translation/")), None)


def translation_changes(plugin):
    changed = run("git", "status", "--porcelain=v1", "-z", "--untracked-files=all", cwd=plugin)
    entries, paths = iter(changed.split("\0")), set()
    for entry in entries:
        if not entry:
            continue
        status, name = entry[:2], entry[3:]
        candidates = [name]
        if "R" in status or "C" in status:
            candidates.append(next(entries, ""))
        for name in candidates:
            within(plugin, name)
            if not name.startswith("Docs/zh-CN/"):
                raise ValueError("Translation job changed a forbidden path: " + name)
            paths.add(name)
    return sorted(paths)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["event", "translation-source", "commit-source", "prepare-translation", "open-pr", "issue"])
    parser.add_argument("--plugin")
    args = parser.parse_args()
    if not os.environ.get("GITHUB_ACTIONS"):
        raise ValueError("This coordinator runs only inside GitHub Actions")
    cfg = config(ROOT)
    event = load(os.environ["GITHUB_EVENT_PATH"])
    default_branch = event["repository"]["default_branch"]
    if os.environ.get("GITHUB_REF") != f"refs/heads/{default_branch}":
        raise ValueError("Docs automation must run from the website default branch")
    website = os.environ.get("GITHUB_REPOSITORY", "")
    plugin = Path(args.plugin).resolve() if args.plugin else None
    if args.command in ("prepare-translation", "open-pr", "issue") and not plugin:
        raise ValueError("Pass --plugin with the checked-out plugin repository")
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
    elif args.command == "translation-source":
        # A reused workflow inherits the dispatch event; drafts must instead
        # start from today's publishing branch, including merged translations.
        output("repository", cfg["repository"])
        output("plugin_branch", cfg["branch"])
    elif args.command == "commit-source":
        validate(ROOT)
        lock = load(ROOT / "docs-sync/source-lock.json")
        if os.environ.get("DOCS_TRANSLATION_PREVIEW") == "true" or lock.get("workingTree"):
            raise ValueError("Translation previews and dirty plugin snapshots cannot be committed to the website")
        tracked = set(run("git", "ls-files").splitlines())
        # Both locales are generated from merged plugin documents. Notes remain
        # site-owned; sync verifies the generated body before preserving them.
        allowed = {"docs-sync/source-lock.json"}
        allowed.update(name for name in tracked if name.startswith("docs-sync/sources/"))
        snapshots = ROOT / "docs-sync/sources"
        if snapshots.exists():
            allowed.update(path.relative_to(ROOT).as_posix() for path in snapshots.rglob("*") if path.is_file())
        for page in lock["pages"].values():
            if page["locale"] == "en":
                allowed.add(page["output"])
                allowed.add(page["output"].rsplit(".", 1)[0] + (".mdx" if page["format"] == "md" else ".md"))
            translation = page.get("translation")
            if translation and translation.get("output"):
                name = translation["output"]
                allowed.update((name, name.rsplit(".", 1)[0] + (".mdx" if name.endswith(".md") else ".md"), translation["record"]))
        paths = sorted(p for p in allowed if within(ROOT, p).exists() or p in tracked)
        if paths:
            run("git", "add", "--", *paths)
        run("git", "diff", "--staged", "--check")
        staged = set(run("git", "diff", "--staged", "--name-only").splitlines())
        if staged - allowed:
            raise ValueError("Sync staging contains paths outside the generated documentation allowlist")
        if staged:
            run("git", "-c", "user.name=docs-sync[bot]", "-c", "user.email=docs-sync[bot]@users.noreply.github.com",
                "commit", "-m", f"docs: sync plugin {lock['revision'][:12]}")
            # Non-fast-forward failure is intentional; rerun from fresh main, never force push.
            run("git", "push", "origin", f"HEAD:refs/heads/{default_branch}")
        output("sha", git(ROOT, "rev-parse", "HEAD"))
    elif args.command == "prepare-translation":
        pending = [r for r in plugin_statuses(plugin) if r["status"] != "current"]
        if not pending:
            output("ready", "false")
            return
        if open_translation_pr(website, default_branch, os.environ.get("DOCS_SITE_TOKEN", "")):
            print("A legacy website translation PR awaits review; migrate or finish it before drafting a plugin PR.")
            output("ready", "false")
            return
        token = plugin_token()
        if open_translation_pr(cfg["repository"], cfg["branch"], token):
            print("An existing plugin translation PR awaits review; its human edits are preserved.")
            output("ready", "false")
            return
        if not os.environ.get("DOCS_AI_API_KEY") or not os.environ.get("DOCS_AI_MODEL"):
            raise ValueError("Set the DOCS_AI_API_KEY secret and DOCS_AI_MODEL variable before generating translations")
        if git(plugin, "status", "--porcelain"):
            raise ValueError("Translation drafts require a clean plugin checkout")
        if git(plugin, "rev-parse", "HEAD") != git(plugin, "rev-parse", f"origin/{cfg['branch']}"):
            raise ValueError("Translation drafts must start at the plugin publishing branch")
        branch = f"docs-translation/{git(plugin, 'rev-parse', '--short', 'HEAD')}-{os.environ['GITHUB_RUN_ID']}-{os.environ.get('GITHUB_RUN_ATTEMPT', '1')}"
        run("git", "switch", "-c", branch, cwd=plugin)
        output("ready", "true")
    elif args.command == "open-pr":
        token = plugin_token()
        allowed = translation_changes(plugin)
        if not allowed:
            print("No translation changes")
            return
        branch = git(plugin, "branch", "--show-current")
        if not branch.startswith("docs-translation/"):
            raise ValueError("Translation commits require a docs-translation/ plugin branch")
        records = [name for name in allowed if name.startswith("Docs/zh-CN/.translations/") and name.endswith(".json")]
        verified = os.environ.get("DOCS_DRAFT_VALIDATION") == "success"
        validation = ("已通过文档校验、类型检查、构建及链接检查。" if verified else
                      "自动检查未通过，此 PR 保持 Draft；请修复 Actions 中报告的问题后再合并。")
        body = ["插件中文翻译草稿；确认内容后手动合并。合并到插件发布分支后，文档站才同步并发布中文。", "",
                validation + "代码、链接和标识符由同步工具保护；翻译语义需要人工审阅。", "",
                "| 插件原文 | 原文版本 | 差异 |", "| --- | --- | --- |"]
        repo = cfg["repository"]
        for name in records:
            record = load(plugin / name)
            if record is None:  # A removed metadata file has no new source baseline.
                continue
            page_id = name.removeprefix("Docs/zh-CN/.translations/").removesuffix(".json")
            # source baseline is committed with the translation, never advanced on main before merge.
            old = subprocess.run(["git", "show", f"origin/{cfg['branch']}:{name}"], cwd=plugin, capture_output=True, text=True, encoding="utf-8")
            previous = json.loads(old.stdout).get("sourceRevision") if old.returncode == 0 else None
            revision = record["sourceRevision"]
            if not re.fullmatch(r"[a-f0-9]{40,64}", revision):
                raise ValueError("Translation metadata requires an exact sourceRevision")
            url = f"https://github.com/{repo}/compare/{previous}...{revision}" if previous else f"https://github.com/{repo}/tree/{revision}/Docs"
            body.append(f"| `{page_id}` | `{revision[:12]}` | [查看原文]({url}) |")
        body += ["", "网站独立补充未写入本 PR。如果英文原文在审阅期间更新，合并后会继续提示待更新，并生成下一批 PR。", ""]
        body_path = ROOT / ".docs-sync-tmp/translation-pr.md"
        write(body_path, "\n".join(body))
        run("git", "add", "--", *allowed, cwd=plugin)
        run("git", "diff", "--staged", "--check", cwd=plugin)
        run("git", "-c", "user.name=docs-translation[bot]", "-c", "user.email=docs-translation[bot]@users.noreply.github.com",
            "commit", "-m", "docs: draft Chinese translation updates", cwd=plugin)
        push_plugin(plugin, branch, token)
        options = [] if verified else ["--draft"]
        print(run("gh", "pr", "create", "--repo", repo, "--base", cfg["branch"], "--head", branch,
                  "--title", f"docs: 更新 {len(records)} 篇插件中文文档", "--body-file", str(body_path), *options, token=token))
    else:
        title = "中文翻译待更新"
        issues = json.loads(run("gh", "issue", "list", "--repo", website, "--state", "open", "--search", f'"{title}" in:title',
                                "--json", "number,title,body"))
        existing = next((item for item in issues if item["title"] == title), None)
        pending = [row for row in plugin_statuses(plugin) if row["status"] != "current"]
        lines = ["# 插件中文翻译待更新", "", "AI 草稿在插件仓库开 PR，人工合并后网站才同步。网站独立补充不进入插件。", "",
                 "| 插件英文文档 | 状态 | 英文版本 |", "| --- | --- | --- |"]
        for row in pending:
            url = f"https://github.com/{cfg['repository']}/blob/{row['revision']}/{urllib.parse.quote(row['path'], safe='/')}"
            lines.append(f"| [{row['id']}]({url}) | {row['status']} | `{row['revision'][:12]}` |")
        body = "\n".join(lines + ["", f"{len(pending)} 篇待更新。", ""])
        if not pending:
            if existing:
                run("gh", "issue", "close", str(existing["number"]), "--repo", website)
        elif not existing or existing["body"].strip() != body.strip():
            body_path = ROOT / ".docs-sync-tmp/translation-status.md"
            write(body_path, body)
            if existing:
                run("gh", "issue", "edit", str(existing["number"]), "--repo", website, "--body-file", str(body_path))
            else:
                run("gh", "issue", "create", "--repo", website, "--title", title, "--body-file", str(body_path))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print(f"docs-ci: {error}", file=sys.stderr)
        sys.exit(1)
