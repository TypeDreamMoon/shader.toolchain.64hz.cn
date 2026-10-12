"""Exercise deploy boundaries without contacting a server or running rsync."""

import contextlib
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import deploy_rsync


class DeployTests(unittest.TestCase):
    def setUp(self):
        # Keep test fixtures in the project, and clean only this test's directory.
        self.temporary = tempfile.TemporaryDirectory(prefix=".deploy-test-", dir=Path(__file__).parent)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.export = self.root / "out"
        (self.export / "_next").mkdir(parents=True)
        (self.export / "index.html").write_text("<html>test</html>", encoding="utf-8")
        (self.export / "_next" / "app.js").write_text("console.log('test');", encoding="utf-8")
        self.env = {
            **os.environ,
            "SFTP_HOST": "8.153.161.157", "SFTP_PORT": "22", "SFTP_USER": "root",
            "SFTP_PASSWORD": " test password ", "SFTP_PRIVATE_KEY": "",
            "SFTP_PASSPHRASE": "", "SFTP_KNOWN_HOSTS": "",
            "SFTP_REMOTE_DIR": "/www/wwwroot/example.test",
            "SFTP_LOCAL_DIR": str(self.export), "RUNNER_TEMP": str(self.root),
        }

    def config(self):
        return deploy_rsync.configuration("/www/wwwroot/default.test", self.env)

    def run_deploy(self, dry_run=False, fail_transfer=None, resolved=None):
        calls = []

        def run(command, **kwargs):
            calls.append((command, kwargs))
            # Authentication material is never inserted into a command line.
            self.assertNotIn(self.env["SFTP_PASSWORD"], " ".join(command))
            self.assertEqual(kwargs["env"]["SSH_ASKPASS_REQUIRE"], "force")
            self.assertTrue(Path(kwargs["env"]["SSH_ASKPASS"]).is_file())
            if command[0] == "ssh":
                return subprocess.CompletedProcess(command, 0, stdout=(resolved or self.env["SFTP_REMOTE_DIR"]) + "\n")
            transfers = sum(call[0][0] == "rsync" for call in calls)
            if transfers == fail_transfer:
                raise subprocess.CalledProcessError(23, command)
            return subprocess.CompletedProcess(command, 0)

        with patch.object(deploy_rsync.shutil, "which", return_value="available"), \
                patch.object(deploy_rsync.subprocess, "run", side_effect=run), \
                contextlib.redirect_stdout(io.StringIO()):
            deploy_rsync.deploy(self.config(), dry_run)
        return calls

    def test_only_final_pass_deletes_and_assets_arrive_first(self):
        calls = self.run_deploy()
        self.assertEqual([call[0][0] for call in calls], ["ssh", "rsync", "rsync"])
        self.assertTrue(calls[1][0][-1].endswith("/_next/"))
        self.assertNotIn("--delete-delay", calls[1][0])
        self.assertIn("--delete-delay", calls[2][0])
        for command, _ in calls[1:]:
            for option in ("--checksum", "--compress", "--delay-updates"):
                self.assertIn(option, command)
            for name in deploy_rsync.PRESERVED:
                self.assertIn(f"--exclude={name}", command)
            self.assertNotIn("--delete-excluded", command)
            self.assertNotIn("--inplace", command)

    def test_dry_run_applies_to_every_transfer(self):
        calls = self.run_deploy(dry_run=True)
        self.assertNotIn("mkdir", calls[0][0][-1])
        self.assertNotIn("rm ", calls[0][0][-1])
        for command, _ in calls[1:]:
            self.assertIn("--dry-run", command)

    def test_failed_asset_upload_does_not_publish_or_prune(self):
        calls = []

        def run(command, **kwargs):
            calls.append(command)
            if command[0] == "ssh":
                return subprocess.CompletedProcess(command, 0, stdout=self.env["SFTP_REMOTE_DIR"])
            raise subprocess.CalledProcessError(23, command)

        with patch.object(deploy_rsync.shutil, "which", return_value="available"), \
                patch.object(deploy_rsync.subprocess, "run", side_effect=run), \
                contextlib.redirect_stdout(io.StringIO()), \
                self.assertRaises(subprocess.CalledProcessError):
            deploy_rsync.deploy(self.config())
        self.assertEqual(len(calls), 2)
        self.assertNotIn("--delete-delay", calls[-1])
        self.assertEqual(list(self.root.glob("docs-rsync-*")), [])

    def test_missing_export_never_connects(self):
        (self.export / "index.html").unlink()
        with patch.object(deploy_rsync.subprocess, "run") as run, self.assertRaises(ValueError):
            deploy_rsync.deploy(self.config())
        run.assert_not_called()

    def test_rejects_unsafe_configured_paths(self):
        for target in ("/", "/www/wwwroot", "/www/wwwroot/", "/www/wwwroot/site/../", "/tmp/site", "/www/wwwroot/site;id"):
            with self.subTest(target=target), self.assertRaises(ValueError):
                deploy_rsync.validate_remote_dir(target)

    def test_rejects_symlink_escaping_web_root(self):
        with self.assertRaises(ValueError):
            self.run_deploy(resolved="/etc")

    def test_invalid_connection_settings_fail_before_connecting(self):
        for field, value in (("SFTP_HOST", "-oProxyCommand=id"), ("SFTP_USER", "root;id"), ("SFTP_PORT", "0"), ("SFTP_PORT", "65536")):
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                deploy_rsync.configuration("/www/wwwroot/site", {**self.env, field: value})
        with self.assertRaises(ValueError):
            deploy_rsync.configuration("/www/wwwroot/site", {**self.env, "SFTP_PASSWORD": ""})

    def test_empty_secrets_use_site_defaults(self):
        config = deploy_rsync.configuration("/www/wwwroot/default.test", {
            **self.env, "SFTP_HOST": "", "SFTP_USER": "", "SFTP_PORT": "", "SFTP_REMOTE_DIR": "",
        })
        self.assertEqual(config["remote"], "/www/wwwroot/default.test")
        self.assertEqual(config["host"], "8.153.161.157")
        self.assertEqual(config["port"], "22")

    def test_private_key_and_credentials_are_cleaned_after_failure(self):
        self.env["SFTP_PRIVATE_KEY"] = "dummy-key\\nsecond-line\\n"
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_deploy(fail_transfer=2)
        self.assertEqual(list(self.root.glob("docs-rsync-*")), [])

    def test_host_verification_is_required(self):
        calls = self.run_deploy()
        self.assertIn("StrictHostKeyChecking=yes", calls[0][0])
        self.assertEqual(list(self.root.glob("docs-rsync-*")), [])

    def test_askpass_preserves_password_and_selects_key_passphrase(self):
        helper = self.root / "askpass.py"
        helper.write_text(deploy_rsync.ASKPASS, encoding="utf-8")
        env = {**self.env, "SFTP_PASSPHRASE": " test passphrase "}
        for prompt, expected in (("root@server's password:", env["SFTP_PASSWORD"]), ("Enter passphrase for key:", env["SFTP_PASSPHRASE"])):
            result = subprocess.run([sys.executable, str(helper), prompt], env=env, capture_output=True, text=True, check=True)
            self.assertEqual(result.stdout, expected + "\n")
        result = subprocess.run([sys.executable, str(helper), "Are you sure you want to continue connecting?"], env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
