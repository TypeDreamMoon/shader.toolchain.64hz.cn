#!/usr/bin/env python3
"""Deploy a Next.js static export from a Linux CI runner using rsync over SSH."""

import argparse
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import tempfile


PRESERVED = (".user.ini", ".htaccess", ".well-known")
ASKPASS = """#!/usr/bin/env python3
import os
import sys
prompt = sys.argv[1].lower()
if 'passphrase' in prompt:
    name = 'SFTP_PASSPHRASE'
elif 'password' in prompt:
    name = 'SFTP_PASSWORD'
else:
    sys.exit(1)
sys.stdout.write(os.environ.get(name, '') + '\\n')
"""


def validate_remote_dir(value):
    # Restrict both the configured path and the server's resolved path. Never
    # sync with deletion against the web-root parent, or through an escaping link.
    if (
        not re.fullmatch(r"/www/wwwroot/[A-Za-z0-9][A-Za-z0-9._/-]*", value)
        or any(part in (".", "..") for part in value.split("/"))
    ):
        raise ValueError("Remote directory must name a site under /www/wwwroot/")
    return str(PurePosixPath(value))


def configuration(default_remote, env):
    host = env.get("SFTP_HOST", "").strip() or "8.153.161.157"
    user = env.get("SFTP_USER", "").strip() or "root"
    port = env.get("SFTP_PORT", "").strip() or "22"
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", host):
        raise ValueError("SFTP_HOST must be an IPv4 address or DNS hostname")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*", user):
        raise ValueError("Invalid SFTP_USER")
    if not port.isdecimal() or not 1 <= int(port) <= 65535:
        raise ValueError("SFTP_PORT must be between 1 and 65535")
    if not env.get("SFTP_PASSWORD") and not env.get("SFTP_PRIVATE_KEY"):
        raise ValueError("Set SFTP_PASSWORD or SFTP_PRIVATE_KEY")
    return {
        "host": host,
        "user": user,
        "port": port,
        "remote": validate_remote_dir(env.get("SFTP_REMOTE_DIR", "").strip() or default_remote),
        "local": Path(env.get("SFTP_LOCAL_DIR", "").strip() or "out").resolve(),
        "env": dict(env),
    }


def deploy(config, dry_run=False):
    source = config["local"]
    index = source / "index.html"
    if not index.is_file() or index.stat().st_size == 0 or not (source / "_next").is_dir():
        raise ValueError("A complete Next.js export (index.html and _next/) is required")
    if source.is_symlink() or any(item.is_symlink() for item in source.rglob("*")):
        raise ValueError("Static exports must not contain symbolic links")
    for tool in ("ssh", "rsync"):
        if shutil.which(tool) is None:
            raise ValueError(f"{tool} is required on the CI runner")

    env = config["env"]
    with tempfile.TemporaryDirectory(prefix="docs-rsync-", dir=env.get("RUNNER_TEMP") or None) as directory:
        temporary = Path(directory)
        known_hosts = temporary / "known_hosts"
        pinned = env.get("SFTP_KNOWN_HOSTS", "").strip()
        if not pinned:
            pinned = Path(__file__).with_name("deploy_known_hosts").read_text(encoding="utf-8").strip()
        known_hosts.write_text(pinned + "\n", encoding="utf-8")
        known_hosts.chmod(0o600)

        askpass = temporary / "askpass"
        askpass.write_text(ASKPASS, encoding="utf-8", newline="\n")
        askpass.chmod(0o700)
        child_env = {
            **env,
            "SSH_ASKPASS": str(askpass),
            "SSH_ASKPASS_REQUIRE": "force",
            "DISPLAY": ":0",
            "LC_ALL": "C",
        }
        ssh = [
            "ssh", "-F", "/dev/null", "-T", "-p", config["port"],
            "-o", "StrictHostKeyChecking=yes",
            "-o", f"UserKnownHostsFile={known_hosts}",
            "-o", "GlobalKnownHostsFile=/dev/null",
            "-o", "ConnectTimeout=20",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=3",
            "-o", "NumberOfPasswordPrompts=1",
            "-o", "IdentitiesOnly=yes",
            "-o", "IdentityAgent=none",
        ]
        if env.get("SFTP_PRIVATE_KEY"):
            key = temporary / "identity"
            key.write_text(env["SFTP_PRIVATE_KEY"].replace("\\n", "\n").replace("\r\n", "\n").strip() + "\n", encoding="utf-8", newline="\n")
            key.chmod(0o600)
            ssh += ["-i", str(key)]

        destination = f"{config['user']}@{config['host']}"
        quoted_remote = shlex.quote(config["remote"])
        # Read-only even for --dry-run. An absent rsync or web root fails before
        # any transfer; server software and directories are never installed here.
        preflight = (
            "command -v rsync >/dev/null || { echo 'rsync is required on the server' >&2; exit 127; }; "
            f"test -d {quoted_remote} || {{ echo 'Remote web root does not exist' >&2; exit 1; }}; "
            f"readlink -f -- {quoted_remote}"
        )
        result = subprocess.run(
            [*ssh, destination, preflight], env=child_env, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, text=True, check=True, timeout=45,
        )
        remote = validate_remote_dir(result.stdout.strip())
        common = [
            "rsync", "--recursive", "--times", "--omit-dir-times",
            "--checksum", "--compress", "--delay-updates",
            "--itemize-changes", "--stats", "--human-readable", "--timeout=120",
            *(f"--exclude={name}" for name in PRESERVED),
            "--rsh", shlex.join(ssh),
        ]
        if dry_run:
            common.append("--dry-run")

        print("Comparing and uploading _next assets before publishing pages", flush=True)
        subprocess.run(
            [*common, "--", f"{source / '_next'}/", f"{destination}:{remote}/_next/"],
            env=child_env, check=True,
        )
        # A second checksum pass skips the assets just uploaded. Obsolete files
        # are removed at the end; exclusions protect panel and certificate files.
        # This is not a whole-site atomic release or an automatic rollback.
        print("Synchronizing the export; obsolete files are deleted at the end", flush=True)
        subprocess.run(
            [*common, "--delete-delay", "--", f"{source}/", f"{destination}:{remote}/"],
            env=child_env, check=True,
        )
        print("Dry run finished; no remote files changed." if dry_run else "Deployment finished.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--default-remote-dir", required=True)
    parser.add_argument("--dry-run", action="store_true", default=os.environ.get("DEPLOY_DRY_RUN") == "true")
    args = parser.parse_args()
    try:
        if sys.platform != "linux":
            raise ValueError("This deploy helper targets Linux CI runners")
        deploy(configuration(args.default_remote_dir, os.environ), args.dry_run)
    except (ValueError, OSError) as error:
        print(f"Deploy failed: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"Deploy failed: {error.cmd[0]} exited with code {error.returncode}", file=sys.stderr)
        return 1
    except subprocess.TimeoutExpired:
        print("Deploy failed: SSH prerequisite check timed out", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
