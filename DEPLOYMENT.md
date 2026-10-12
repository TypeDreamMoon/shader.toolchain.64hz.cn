# Deploying the static site

GitHub Actions builds the complete Next.js export and runs `scripts/deploy_rsync.py`
on Linux. It keeps the existing `SFTP_*` repository secrets, but transfers using
**rsync over SSH**, not SFTP. The server account must allow SSH command execution,
have `rsync` and `readlink` available, and have write access to the existing web root.
The helper checks these prerequisites before transferring; it does not install
server software or create the web root.

## Transfer behavior

- `--checksum` compares content instead of relying on fresh build timestamps.
- `--compress` compresses transferred data; rsync can reuse matching blocks in
  existing files. The old site is never cleared before uploading.
- `_next/` assets are uploaded first, then the full export. The second checksum
  pass skips assets that were just uploaded.
- `--delay-updates` stages changed files and renames them near the end of each
  pass. `--delete-delay` removes obsolete files at the end of the final pass.
- `.user.ini`, `.htaccess` and `.well-known` are excluded at every depth. Their
  remote contents are protected from both replacement and deletion.
- Deployment logs include changed paths and rsync transfer statistics. Unchanged
  content still incurs directory scanning and checksum reads, but no file-data upload.

This is not a whole-site atomic release or a rollback system. Old hashed assets
are removed by the final sync, so already-open clients may need a refresh after
a deployment. A failed run is reported as failed and can be rerun; completing
some file replacements does not guarantee a complete new site.

## Credentials and destination

| Secret | Purpose |
| --- | --- |
| `SFTP_HOST` | SSH host; defaults to the existing server `8.153.161.157` |
| `SFTP_PORT` | SSH port; defaults to `22` |
| `SFTP_USER` | SSH user; defaults to `root` |
| `SFTP_PASSWORD` | Login password; either this or a private key is required |
| `SFTP_PRIVATE_KEY` | Optional private key; multiline or literal `\n` separators |
| `SFTP_PASSPHRASE` | Passphrase for an encrypted private key |
| `SFTP_REMOTE_DIR` | Existing site directory under `/www/wwwroot/`; overrides the workflow's fallback |
| `SFTP_KNOWN_HOSTS` | Optional replacement known-hosts entries for a custom host/port or rotated host key |

The workflow retains this site's previous fallback directory. In particular,
Shader keeps `/www/wwwroot/lang.64hz.cn` as its fallback; the existing
`SFTP_REMOTE_DIR` secret remains authoritative when it points at the newer domain.

`scripts/deploy_known_hosts` contains the current server's **public** SSH host key,
matched against existing local SSH trust. It contains no login credentials.
Host verification is mandatory. For a different host or key rotation, verify the
new host key independently and update that file or set `SFTP_KNOWN_HOSTS` to the
verified entries (use `[hostname]:port` for a non-default port). The helper does
not silently accept a new key.

Passwords and passphrases are passed through the environment to an SSH askpass
helper, not command-line arguments. Temporary credential files are removed when
the helper exits normally or reports an error.

## Concurrency and preview

All publishing branches in this repository share one concurrency group. A new
push waits for an active deployment to finish, rather than cancelling it during
upload. GitHub may replace an older pending run with a newer one. FX/GUI pull
requests still only build and check; they do not receive deployment credentials.

In **Actions → Run workflow**, select **dry_run** to build and compare without
changing server files. This still requires SSH access and rsync on the server.
In a dry run the second pass may report assets again because the first pass did
not actually transfer them.

The helper tests run in CI before the site build. To run them locally:

```text
python -B -m unittest discover -s scripts -p test_deploy_rsync.py
```

These tests simulate SSH/rsync process calls; they do not measure network speed
or validate a live server deployment.

## Local SFTP fallback

`npm run upload` and `npm run deploy:sftp` still use the existing `upload.js` and
local `.env` configuration. GitHub Actions no longer invokes that uploader.
The FX/GUI local uploader still clears old files before uploading; the new rsync
behavior applies to CI. The rsync helper consumes environment variables directly
and requires Linux, Python 3, OpenSSH and rsync.
