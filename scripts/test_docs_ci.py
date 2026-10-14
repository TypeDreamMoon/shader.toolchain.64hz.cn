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
        self.plugin = self.root/'plugin'
        self.plugin.mkdir()
        docs.write(self.root/'event.json',docs.json_text({'repository':{'default_branch':'main'}}))
        docs.write(self.root/'docs-sync/config.json',docs.json_text({'version':1,'repository':'example/plugin','branch':'main','pages':[]}))
        self.env = {'GITHUB_ACTIONS':'true','GITHUB_REF':'refs/heads/main','GITHUB_REPOSITORY':'example/site',
                    'GITHUB_EVENT_PATH':str(self.root/'event.json'),'GITHUB_OUTPUT':str(self.root/'output')}
        for mock in (patch.object(ci,'ROOT',self.root),patch.dict(os.environ,self.env,clear=True)):
            mock.start(); self.addCleanup(mock.stop)

    def invoke(self, command, plugin=True):
        arguments = ['--plugin',str(self.plugin)] if plugin else []
        with patch('sys.argv',['docs_ci.py',command,*arguments]):
            ci.main()

    def test_coordinator_refuses_local_invocation(self):
        with patch.dict(os.environ,{'GITHUB_ACTIONS':''}):
            with self.assertRaisesRegex(ValueError,'only inside GitHub'): self.invoke('event')

    def test_command_output_preserves_porcelain_status_columns(self):
        with patch.object(ci.subprocess,'run') as process:
            process.return_value.returncode=0
            process.return_value.stdout=' M content/docs/guide.md\n'
            self.assertEqual(ci.run('git','status'),' M content/docs/guide.md')

    def test_gh_failure_reports_reason_without_tokens(self):
        failed = ci.subprocess.CompletedProcess([], 1, '', 'noise\nHTTP 403: needs pull requests write (token plugin-token)\n')
        with patch.object(ci.subprocess, 'run', return_value=failed):
            with self.assertRaises(ValueError) as caught: ci.run('gh', 'pr', 'create', token='plugin-token')
        self.assertIn('HTTP 403: needs pull requests write', str(caught.exception))
        self.assertNotIn('plugin-token', str(caught.exception))
        with patch.object(ci.subprocess, 'run', return_value=failed):
            with self.assertRaises(ValueError) as caught: ci.run('git', 'push')
        self.assertNotIn('403', str(caught.exception))

    def test_whitespace_check_names_the_file(self):
        failed = ci.subprocess.CompletedProcess([], 2, 'Docs/zh-CN/guide.md:3: trailing whitespace.\n+text  \n', '')
        with patch.object(ci.subprocess, 'run', return_value=failed):
            with self.assertRaises(ValueError) as caught: ci.run('git', 'diff', '--staged', '--check')
        self.assertIn('Docs/zh-CN/guide.md:3: trailing whitespace.', str(caught.exception))
        self.assertNotIn('text', str(caught.exception))

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

    def test_translation_source_uses_current_branch_not_inherited_dispatch_sha(self):
        event={'repository':{'default_branch':'main'},'client_payload':{'repository':'example/plugin','sha':'a'*40}}
        docs.write(self.root/'event.json',docs.json_text(event))
        self.invoke('translation-source')
        self.assertEqual(docs.read(self.root/'output'),'repository=example/plugin\nplugin_branch=main\n')

    def test_existing_website_pr_prevents_ai_branch_or_commit(self):
        calls=[]
        def run(*args, **kwargs):
            calls.append(args)
            return json.dumps([{'headRefName':'docs-translation/existing','url':'https://example.test/pr/1'}])
        with patch.object(ci,'plugin_statuses',return_value=[{'status':'outdated'}]),patch.object(ci,'run',side_effect=run):
            self.invoke('prepare-translation')
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0][:3],('gh','pr','list'))
        self.assertIn('example/site',calls[0])
        self.assertIn('ready=false',docs.read(self.root/'output'))

    def test_existing_plugin_pr_preserves_human_edits(self):
        with patch.dict(os.environ,{'DOCS_PR_TOKEN':'plugin-token','DOCS_SITE_TOKEN':'site-token'}), \
             patch.object(ci,'plugin_statuses',return_value=[{'status':'outdated'}]), \
             patch.object(ci,'run',side_effect=['[]',json.dumps([{'headRefName':'docs-translation/review','url':'pr'}])]) as run:
            self.invoke('prepare-translation')
        self.assertEqual(run.call_count,2)
        self.assertIn('example/plugin',run.call_args.args)
        self.assertEqual(run.call_args.kwargs['token'],'plugin-token')
        self.assertIn('ready=false',docs.read(self.root/'output'))

    def test_current_plugin_skips_pr_queries_and_ai_configuration(self):
        with patch.object(ci,'plugin_statuses',return_value=[{'status':'current'}]),patch.object(ci,'run') as run:
            self.invoke('prepare-translation')
        run.assert_not_called()
        self.assertIn('ready=false',docs.read(self.root/'output'))

    def test_plugin_pr_requires_explicit_cross_repository_token(self):
        with patch.object(ci,'plugin_statuses',return_value=[{'status':'outdated'}]),patch.object(ci,'run',return_value='[]'):
            with self.assertRaisesRegex(ValueError,'DOCS_PR_TOKEN'):
                self.invoke('prepare-translation')

    def test_prepare_creates_branch_only_in_clean_plugin(self):
        def plugin_git(root,*args):
            self.assertEqual(root,self.plugin)
            return '' if args[0]=='status' else 'a'*40
        env={'DOCS_PR_TOKEN':'plugin-token','DOCS_AI_API_KEY':'test-key','DOCS_AI_MODEL':'model','GITHUB_RUN_ID':'42'}
        with patch.dict(os.environ,env),patch.object(ci,'plugin_statuses',return_value=[{'status':'outdated'}]), \
             patch.object(ci,'git',side_effect=plugin_git),patch.object(ci,'run',side_effect=['[]','[]','']) as run:
            self.invoke('prepare-translation')
        self.assertEqual(run.call_args.args[:3],('git','switch','-c'))
        self.assertEqual(run.call_args.kwargs,{'cwd':self.plugin})
        self.assertIn('ready=true',docs.read(self.root/'output'))

    def test_sync_commit_allowlist_excludes_chinese(self):
        docs.write(self.root/'content/docs/guide.en.md','English')
        docs.write(self.root/'content/docs/guide.md','Chinese user edit')
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text({'revision':'a'*40,'pages':{
            'guide':{'locale':'en','format':'md','output':'content/docs/guide.en.md','translation':{'status':'missing'}}}}))
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

    def test_sync_commit_includes_only_manifest_managed_translation_and_record(self):
        for name in ('content/docs/guide.en.md','content/docs/guide.md','content/docs/unmanaged.md','docs-sync/translations/guide.json'):
            docs.write(self.root/name,'{}')
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text({'revision':'a'*40,'pages':{
            'guide':{'locale':'en','format':'md','output':'content/docs/guide.en.md','translation':{
                'output':'content/docs/guide.md','record':'docs-sync/translations/guide.json'}}}}))
        def run(*args):
            if args==('git','ls-files'): return 'content/docs/guide.mdx\ncontent/docs/unmanaged.md'
            return ''
        with patch.object(ci,'validate'),patch.object(ci,'git',return_value='b'*40),patch.object(ci,'run',side_effect=run) as commands:
            self.invoke('commit-source')
        added=next(call.args for call in commands.call_args_list if call.args[:2]==('git','add'))
        for name in ('content/docs/guide.en.md','content/docs/guide.md','content/docs/guide.mdx','docs-sync/translations/guide.json'):
            self.assertIn(name,added)
        self.assertNotIn('content/docs/unmanaged.md',added)

    def test_sync_commit_refuses_preview_even_if_validate_accepts_it(self):
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text({'pages':{}}))
        with patch.dict(os.environ,{'DOCS_TRANSLATION_PREVIEW':'true'}),patch.object(ci,'validate'),patch.object(ci,'run') as run:
            with self.assertRaisesRegex(ValueError,'previews'):
                self.invoke('commit-source')
        run.assert_not_called()

    def test_sync_commit_refuses_dirty_plugin_snapshot(self):
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text({'workingTree':True,'pages':{}}))
        with patch.object(ci,'validate'),patch.object(ci,'run') as run:
            with self.assertRaisesRegex(ValueError,'dirty plugin snapshots'):
                self.invoke('commit-source')
        run.assert_not_called()

    def test_translation_refuses_english_file_change(self):
        with patch.dict(os.environ,{'DOCS_PR_TOKEN':'plugin-token'}),patch.object(ci,'run',return_value=' M Docs/guide.md\0'):
            with self.assertRaisesRegex(ValueError,'forbidden path'): self.invoke('open-pr')

    def test_translation_rename_cannot_hide_change_outside_chinese_tree(self):
        with patch.object(ci,'run',return_value='R  Docs/zh-CN/guide.md\0Docs/guide.md\0'):
            with self.assertRaisesRegex(ValueError,'forbidden path'): ci.translation_changes(self.plugin)

    def test_open_pr_commits_plugin_only_and_keeps_failed_preview_draft(self):
        record='Docs/zh-CN/.translations/language/guide.md.json'
        document='Docs/zh-CN/language/guide.md'
        docs.write(self.plugin/record,docs.json_text({'sourceRevision':'a'*40,'sourceHash':'b'*64}))
        docs.write(self.plugin/document,'# 中文\n')
        calls=[]
        def run(*args,**kwargs):
            calls.append((args,kwargs))
            if args[:2]==('git','status'): return f'?? {record}\0?? {document}\0'
            return 'https://example.test/plugin/pull/1' if args[:3]==('gh','pr','create') else ''
        with patch.dict(os.environ,{'DOCS_PR_TOKEN':'plugin-token','DOCS_DRAFT_VALIDATION':'failure'}), \
             patch.object(ci,'run',side_effect=run),patch.object(ci,'git',return_value='docs-translation/test'), \
             patch.object(ci.subprocess,'run') as process:
            process.return_value.returncode=1
            self.invoke('open-pr')
        for args,kwargs in calls:
            if args[0]=='git': self.assertEqual(kwargs['cwd'],self.plugin)
        created=next((args,kwargs) for args,kwargs in calls if args[:3]==('gh','pr','create'))
        self.assertIn('example/plugin',created[0])
        self.assertIn('--draft',created[0])
        self.assertEqual(created[1]['token'],'plugin-token')
        added=next(args for args,_ in calls if args[:2]==('git','add'))
        self.assertEqual(set(added[3:]),{record,document})
        pushed=next(kwargs for args,kwargs in calls if args==('git','push','origin','HEAD:refs/heads/docs-translation/test'))
        header=pushed['env']['GIT_CONFIG_VALUE_0']
        self.assertEqual(pushed['env']['GIT_CONFIG_KEY_0'],'http.https://github.com/.extraheader')
        self.assertEqual(ci.base64.b64decode(header.removeprefix('AUTHORIZATION: basic ')).decode(),'x-access-token:plugin-token')
        self.assertFalse(any('plugin-token' in str(a) for args,_ in calls for a in args))
        self.assertIn('插件中文翻译草稿',docs.read(self.root/'.docs-sync-tmp/translation-pr.md'))

    def test_status_issue_stays_on_website_and_links_plugin_source(self):
        rows=[{'id':'language/guide.md','path':'Docs/language/guide.md','status':'outdated','revision':'a'*40}]
        with patch.object(ci,'plugin_statuses',return_value=rows),patch.object(ci,'run',side_effect=['[]','']) as run:
            self.invoke('issue')
        self.assertIn('example/site',run.call_args.args)
        body=docs.read(self.root/'.docs-sync-tmp/translation-status.md')
        self.assertIn('https://github.com/example/plugin/blob/'+'a'*40+'/Docs/language/guide.md',body)

    def test_workflow_requires_translation_success_and_isolates_preview(self):
        workflow=docs.read(docs.ROOT/'.github/workflows/docs-translate.yml')
        self.assertIn("steps.translate.outcome == 'success'",workflow)
        self.assertEqual(workflow.count("DOCS_TRANSLATION_PREVIEW: 'true'"),1)
        self.assertNotIn('docs-sync/translations/**',workflow)
        self.assertIn('translate --plugin .docs-sync-tmp/plugin',workflow)
        self.assertNotIn('persist-credentials: true',workflow)


if __name__ == '__main__':
    unittest.main()
