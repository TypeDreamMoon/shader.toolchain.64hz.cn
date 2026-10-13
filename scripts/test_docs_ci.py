import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import docs_ci as ci
import docs_sync as docs


class DocsCiTests(unittest.TestCase):
    def setUp(self):
        scratch = docs.ROOT / '.docs-sync-tmp'
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(prefix='ci-test-', dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        docs.write(self.root/'event.json',docs.json_text({'repository':{'default_branch':'main'}}))
        docs.write(self.root/'docs-sync/config.json',docs.json_text({'version':1,'repository':'example/plugin','branch':'main','pages':[]}))
        self.env = {'GITHUB_ACTIONS':'true','GITHUB_REF':'refs/heads/main',
                    'GITHUB_EVENT_PATH':str(self.root/'event.json'),'GITHUB_OUTPUT':str(self.root/'output')}
        for mock in (patch.object(ci,'ROOT',self.root),patch.dict(os.environ,self.env,clear=True)):
            mock.start(); self.addCleanup(mock.stop)

    def invoke(self, command):
        with patch('sys.argv',['docs_ci.py',command]):
            ci.main()

    def test_coordinator_refuses_local_invocation(self):
        with patch.dict(os.environ,{'GITHUB_ACTIONS':''}):
            with self.assertRaisesRegex(ValueError,'only inside GitHub'): self.invoke('event')

    def test_command_output_preserves_porcelain_status_columns(self):
        with patch.object(ci.subprocess,'run') as process:
            process.return_value.returncode=0
            process.return_value.stdout=' M content/docs/guide.md\n'
            self.assertEqual(ci.run('git','status'),' M content/docs/guide.md')

    def test_coordinator_refuses_non_default_branch(self):
        with patch.dict(os.environ,{'GITHUB_REF':'refs/heads/docs-translation/test'}):
            with self.assertRaisesRegex(ValueError,'default branch'): self.invoke('commit-source')

    def test_dispatch_validates_repository_and_exact_revision(self):
        event={'repository':{'default_branch':'main'},'client_payload':{'repository':'other/plugin','sha':'a'*40}}
        docs.write(self.root/'event.json',docs.json_text(event))
        with self.assertRaisesRegex(ValueError,'does not match'): self.invoke('event')
        event['client_payload']['repository']='example/plugin'
        docs.write(self.root/'event.json',docs.json_text(event))
        self.invoke('event')
        self.assertIn('plugin_ref='+'a'*40,docs.read(self.root/'output'))

    def test_existing_pr_prevents_ai_branch_or_commit(self):
        calls=[]
        def run(*args):
            calls.append(args)
            return json.dumps([{'headRefName':'docs-translation/existing','url':'https://example.test/pr/1'}])
        with patch.object(ci,'statuses',return_value=[{'status':'outdated'}]),patch.object(ci,'run',side_effect=run):
            self.invoke('prepare-translation')
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0][:3],('gh','pr','list'))
        self.assertIn('ready=false',docs.read(self.root/'output'))

    def test_sync_commit_allowlist_excludes_chinese(self):
        docs.write(self.root/'content/docs/guide.en.md','English')
        docs.write(self.root/'content/docs/guide.md','Chinese user edit')
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text({'revision':'a'*40,'pages':{
            'guide':{'locale':'en','format':'md','output':'content/docs/guide.en.md'}}}))
        calls=[]
        def run(*args):
            calls.append(args)
            if args==('git','ls-files'):return 'content/docs/guide.en.md\ncontent/docs/guide.md'
            if args==('git','diff','--staged','--name-only'):return 'content/docs/guide.en.md'
            return ''
        with patch.object(ci,'validate'),patch.object(ci,'git',return_value='b'*40),patch.object(ci,'run',side_effect=run):
            self.invoke('commit-source')
        added=next(c for c in calls if c[:2]==('git','add'))
        self.assertNotIn('content/docs/guide.md',added)
        self.assertIn(('git','push','origin','HEAD:refs/heads/main'),calls)
        self.assertFalse(any('--force' in c for c in calls))

    def test_translation_refuses_english_file_change(self):
        with patch.object(ci,'validate'),patch.object(ci,'run',return_value=' M content/docs/guide.en.md'):
            with self.assertRaisesRegex(ValueError,'forbidden path'): self.invoke('open-pr')


if __name__ == '__main__':
    unittest.main()
