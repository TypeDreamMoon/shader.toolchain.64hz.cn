import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import docs_sync as docs


class DocsSyncTests(unittest.TestCase):
    def setUp(self):
        scratch = docs.ROOT / '.docs-sync-tmp'
        scratch.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='test-', dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'site'
        self.plugin = Path(self.temp.name) / 'plugin'
        self.sha = 'a' * 40
        self.git = patch.object(docs, 'git', side_effect=lambda root, *args: '' if args[0] == 'status' else self.sha)
        self.git.start(); self.addCleanup(self.git.stop)
        self.cfg = {'version':1, 'repository':'example/plugin', 'branch':'main', 'pages':[
            {'id':'guide', 'format':'md', 'sources':[{'path':'Docs/guide.md'}]}]}
        docs.write(self.root/'docs-sync/config.json', docs.json_text(self.cfg))
        docs.write(self.plugin/'Docs/guide.md', '# Guide\n\nEnglish paragraph.\n\n```cpp\nvoid DoThing();\n```\n')
        docs.write(self.root/'content/docs/guide.mdx', '中文原有内容\n')
        self.settings = {'base_url':'https://custom.example/api/v1/', 'api_key':'test-secret', 'model':'configured-model',
                         'api_format':'chat-completions','json_mode':False,'max_tokens':1000,'timeout':10,
                         'max_pages':5,'max_chars':100000}

    def fake_ai(self, prompt, settings):
        return {'title':'指南','description':'中文说明','body':prompt['NEW_SOURCE']['body'].replace('English paragraph.', '中文段落。'),
                'attributes':prompt.get('ATTRIBUTES',{})}

    def sync(self):
        return docs.sync(self.root,self.plugin)

    def translate_and_import(self, request_fn=None):
        docs.translate(self.root,self.settings,request_fn=request_fn or self.fake_ai,plugin=self.plugin)
        return docs.sync(self.root,self.plugin,adopt_existing=True)

    def test_sync_without_plugin_translation_keeps_legacy_chinese(self):
        self.sync()
        self.assertEqual(docs.read(self.root/'content/docs/guide.mdx'),'中文原有内容\n')
        self.assertIn('English paragraph.',docs.read(self.root/'content/docs/guide.en.md'))
        self.assertEqual(docs.statuses(self.root)[0]['status'],'missing')

    def test_check_is_read_only_and_sync_is_idempotent(self):
        changes=docs.sync(self.root,self.plugin,check=True)
        self.assertTrue(changes)
        self.assertFalse((self.root/'docs-sync/source-lock.json').exists())
        self.sync()
        self.assertEqual(self.sync(),[])

    def test_detects_source_changes_even_with_same_commit(self):
        self.sync()
        self.translate_and_import()
        self.assertEqual(docs.statuses(self.root)[0]['status'],'current')
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\nChanged source.\n')
        self.sync()
        self.assertEqual(docs.statuses(self.root)[0]['status'],'outdated')

    def test_translation_keeps_its_actual_baseline_after_later_sync(self):
        self.sync()
        self.translate_and_import()
        baseline_path=self.plugin/'Docs/zh-CN/.translations/guide.md.json'
        baseline=docs.read(baseline_path)
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\nVersion B\n'); self.sync()
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\nVersion C\n'); self.sync()
        self.assertEqual(docs.read(baseline_path),baseline)
        projection=docs.load(self.root/'docs-sync/translations/guide.json')
        self.assertIsNone(projection['sourceHash'])
        self.assertEqual(projection['sources'][0]['sourceHash'],json.loads(baseline)['sourceHash'])
        self.assertEqual(docs.statuses(self.root)[0]['status'],'outdated')

    def test_no_baseline_created_by_sync(self):
        self.sync()
        self.assertFalse((self.root/'docs-sync/translations').exists())
        self.assertFalse((self.plugin/'Docs/zh-CN/.translations').exists())

    def test_local_generated_edits_are_not_overwritten(self):
        self.sync()
        docs.write(self.root/'content/docs/guide.en.md','Hand edited\n')
        with self.assertRaisesRegex(ValueError,'edited locally'):
            self.sync()
        self.assertEqual(docs.read(self.root/'content/docs/guide.en.md'),'Hand edited\n')

    def test_missing_source_fails_before_any_output(self):
        self.cfg['pages'].append({'id':'missing','sources':[{'path':'Docs/missing.md'}]})
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        with self.assertRaises(FileNotFoundError): self.sync()
        self.assertFalse((self.root/'content/docs/guide.en.md').exists())

    def test_source_case_mismatch_fails_on_every_platform(self):
        self.cfg['pages'][0]['sources'][0]['path'] = 'Docs/Guide.md'
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        with self.assertRaisesRegex(ValueError, 'case mismatch'):
            self.sync()
        self.assertFalse((self.root/'content/docs/guide.en.md').exists())

    def test_directory_case_mismatch_fails_before_output(self):
        self.cfg['pages'][0]['sources'][0]['path'] = 'docs/guide.md'
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        with self.assertRaisesRegex(ValueError, 'case mismatch'):
            self.sync()
        self.assertFalse((self.root/'docs-sync/source-lock.json').exists())

    def test_english_source_replaces_legacy_snapshot_not_chinese(self):
        self.cfg['pages'][0]['locale'] = 'zh'
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        self.sync()
        snapshot = self.root/'docs-sync/sources/guide.md'
        self.assertTrue(snapshot.exists())
        self.cfg['pages'][0]['locale'] = 'en'
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        self.sync()
        self.assertFalse(snapshot.exists())
        self.assertTrue((self.root/'content/docs/guide.en.md').exists())
        self.assertEqual(docs.read(self.root/'content/docs/guide.mdx'),'中文原有内容\n')

    def test_multiple_whole_sources_share_the_public_route(self):
        docs.write(self.plugin/'Docs/history.md','# Historical diagnostic\n\nDetails.\n')
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\n[Details](history.md#historical-diagnostic)\n')
        self.cfg['pages'][0]['sources'].append({'path':'Docs/history.md'})
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        self.sync()
        self.assertIn('[Details](/en/docs/guide#historical-diagnostic)',docs.read(self.root/'content/docs/guide.en.md'))

    def test_squash_merge_with_identical_sources_can_advance_revision(self):
        self.sync()
        lock = docs.load(self.root/'docs-sync/source-lock.json')
        lock['revision'] = 'b' * 40
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text(lock))
        with patch.object(docs.subprocess,'run') as run:
            run.return_value.returncode = 1
            self.sync()
        self.assertEqual(docs.load(self.root/'docs-sync/source-lock.json')['revision'],self.sha)

    def test_unrelated_revision_with_changed_sources_is_rejected(self):
        self.sync()
        lock = docs.load(self.root/'docs-sync/source-lock.json')
        lock['revision'] = 'b' * 40
        docs.write(self.root/'docs-sync/source-lock.json',docs.json_text(lock))
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\nOlder or unrelated text.\n')
        with patch.object(docs.subprocess,'run') as run:
            run.return_value.returncode = 1
            with self.assertRaisesRegex(ValueError,'different documentation'):
                self.sync()
        self.assertIn('English paragraph.',docs.read(self.root/'content/docs/guide.en.md'))

    def test_path_traversal_rejected(self):
        for path in ['../outside.md','/outside.md','C:/outside.md','..\\outside.md']:
            with self.assertRaises(ValueError): docs.within(self.root,path)

    def test_sections_ignore_code_fence_headings(self):
        text='# Intro\n\n## Part\n```md\n## Fake\n```\ntext\n## Next\nend\n'
        self.assertEqual(docs.excerpt(text,'Part'),'## Part\n```md\n## Fake\n```\ntext\n')
        with self.assertRaises(ValueError): docs.excerpt(text,'Fake')

    def test_new_doc_is_discovered(self):
        self.sync()
        docs.write(self.plugin/'Docs/new.md','# New\n\nNew text\n')
        self.sync()
        self.assertTrue((self.root/'content/docs/plugin/new.en.md').exists())

    def test_removed_source_blocks_instead_of_deleting_translation(self):
        self.sync()
        (self.plugin/'Docs/guide.md').unlink()
        with self.assertRaises(FileNotFoundError): self.sync()
        self.assertTrue((self.root/'content/docs/guide.mdx').exists())

    def test_protected_code_and_links_round_trip(self):
        body='Text `API_Name` [link](/en/docs/guide) DUI1001.\n\n````cpp\n``` literal\nDoThing();\n````\n\n<Callout type="info">Text</Callout>\n'
        masked, values=docs.protect(body)
        self.assertEqual(docs.restore(masked,values,masked),body)
        with self.assertRaises(ValueError): docs.restore(masked.replace('@@DOCS_KEEP_00000@@',''),values,masked)

    def test_notes_remain_exact(self):
        notes='\n## 我的网站补充\n\n保持这个说明。\n'
        docs.write(self.root/'content/docs/guide.mdx','正文\n'+docs.NOTES+notes)
        self.sync()
        self.translate_and_import()
        self.assertTrue(docs.read(self.root/'content/docs/guide.md').endswith(docs.NOTES+notes))

    def test_translation_batch_links_use_final_chinese_pages_and_hashes(self):
        self.cfg['pages'] += [
            {'id':'topic/index', 'format':'md', 'sources':[{'path':'Docs/topic.md'}]},
            {'id':'index', 'format':'md', 'sources':[{'path':'Docs/index.md'}]},
        ]
        docs.write(self.root/'docs-sync/config.json',docs.json_text(self.cfg))
        docs.write(self.plugin/'Docs/guide.md',
                   '# Guide\n\n[Next](topic.md?view=full#details)\n\n[Home](index.md)\n')
        docs.write(self.plugin/'Docs/topic.md','# Topic\n\n## Details\n\n[Back](guide.md#guide)\n')
        docs.write(self.plugin/'Docs/index.md','# Home\n\n[Guide](guide.md)\n')
        self.sync()
        original = docs.read(self.root/'content/docs/guide.en.md')
        lock = docs.load(self.root/'docs-sync/source-lock.json')
        self.translate_and_import()
        guide = docs.read(self.root/'content/docs/guide.md')
        self.assertIn('[Next](/docs/topic?view=full#details)',guide)
        self.assertIn('[Home](/docs/)',guide)
        self.assertIn('[Back](/docs/guide#guide)',docs.read(self.root/'content/docs/topic/index.md'))
        for page_id,source_id in (('guide','guide.md'),('topic/index','topic.md'),('index','index.md')):
            record = docs.load(self.root/f'docs-sync/translations/{page_id}.json')
            self.assertEqual(record['translationHash'],docs.digest(docs.read(self.root/record['translationFile'])))
            self.assertEqual(record['sourceHash'],lock['pages'][page_id]['hash'])
            self.assertNotIn('source',record)
            plugin_record=docs.load(self.plugin/f'Docs/zh-CN/.translations/{source_id}.json')
            source=docs.read(self.plugin/f'Docs/{source_id}')
            self.assertEqual(plugin_record['source'],source)
            self.assertEqual(plugin_record['sourceHash'],docs.digest(source))
            self.assertEqual(plugin_record['translationHash'],docs.digest(docs.read(self.plugin/plugin_record['translationFile'])))
            self.assertEqual(record['sources'][0]['sourceHash'],plugin_record['sourceHash'])
        self.assertEqual(docs.read(self.root/'content/docs/guide.en.md'),original)

    def test_translation_links_check_existing_pages_and_anchors(self):
        docs.write(self.root/'content/docs/existing/index.mdx',
                   '# 中文页面\n\n## Details\n\n## Details\n\n## Details 1 [#details-1]\n'
                   '\n## Details-1\n\n## 中文标题 [#stable]\n\n<span id="named" />\n')
        docs.write(self.root/'content/docs/index.md','# 首页\n')
        docs.write(self.root/'content/docs/english-only.en.md','# English only\n')
        guide=self.root/'content/docs/guide.mdx'
        planned={guide: '''# Guide

[Plain](/en/docs/existing)
[Angle](</en/docs/existing/?view=full#stable> "Title")
[Implicit](/en/docs/existing#details)
[Duplicate](/en/docs/existing#details-1-1)
[Encoded](/en/docs/existing#%E4%B8%AD%E6%96%87%E9%A1%B5%E9%9D%A2)
[Referenced][target]
[target]: /en/docs/existing?view=full#stable "Reference title"
<Card title="Existing" href="/en/docs/existing#named" />
<a href='/en/docs/existing#details-1'>Single</a>
<a href={"/en/docs?view=full#首页"}>Home</a>
[Missing page](/en/docs/missing)
[English only](/en/docs/english-only)
[Missing anchor](/en/docs/existing#absent)
'''}
        docs.localize_translation_links(self.root,planned,[])
        result = planned[guide]
        for expected in ('[Plain](/docs/existing)',
                         '(</docs/existing/?view=full#stable> "Title")',
                         '](/docs/existing#details)',
                         '](/docs/existing#details-1-1)',
                         '](/docs/existing#%E4%B8%AD%E6%96%87%E9%A1%B5%E9%9D%A2)',
                         '[target]: /docs/existing?view=full#stable "Reference title"',
                         'href="/docs/existing#named"',
                         "href='/docs/existing#details-1'",
                         'href={"/docs?view=full#首页"}',
                         '[Missing page](/en/docs/missing)',
                         '[English only](/en/docs/english-only)',
                         '[Missing anchor](/en/docs/existing#absent)'):
            self.assertIn(expected,result)

    def test_translation_link_rewrite_preserves_notes_code_and_external_urls(self):
        notes = '\n[My notes](/en/docs/guide#guide)\n'
        docs.write(self.root/'content/docs/guide.mdx','旧中文\n'+docs.NOTES+notes)
        preserved = '''`[Inline](/en/docs/guide#guide)`

```md
[Code](/en/docs/guide#guide)
## Pretend
```

    [Indented](/en/docs/guide#guide)

[External](https://example.com/en/docs/guide#guide)
[Protocol relative](//example.com/en/docs/guide#guide)
'''
        guide=self.root/'content/docs/guide.md'
        planned={guide:'# Guide\n\n[Self](/en/docs/guide#guide)\n\n'+preserved+
                 '\n[Code is not an anchor](/en/docs/guide#pretend)\n'+docs.NOTES+notes}
        docs.localize_translation_links(self.root,planned,[self.root/'content/docs/guide.mdx'])
        result = planned[guide]
        self.assertIn('[Self](/docs/guide#guide)',result)
        self.assertIn(preserved,result)
        self.assertIn('[Code is not an anchor](/en/docs/guide#pretend)',result)
        self.assertTrue(result.endswith(docs.NOTES+notes))

    def test_translation_links_ignore_replaced_files_and_uncertain_legacy_anchors(self):
        docs.write(self.root/'content/docs/topic.mdx','## Old [#old]\n')
        docs.write(self.root/'content/docs/legacy.md','## **Formatted**\n\n## Later\n\n## Stable [#stable]\n')
        guide = self.root/'content/docs/guide.md'
        planned = {
            guide: '[Old](/en/docs/topic#old) [New](/en/docs/topic#new)\n'
                   '[Uncertain](/en/docs/legacy#later) [Stable](/en/docs/legacy#stable)\n',
            self.root/'content/docs/topic.md': '## New [#new]\n',
        }
        docs.localize_translation_links(self.root,planned,[self.root/'content/docs/topic.mdx'])
        self.assertEqual(planned[guide],
                         '[Old](/en/docs/topic#old) [New](/docs/topic#new)\n'
                         '[Uncertain](/en/docs/legacy#later) [Stable](/docs/legacy#stable)\n')

    def test_ai_failure_leaves_entire_batch_unchanged(self):
        self.sync()
        def fail(prompt,settings): raise ValueError('provider unavailable')
        with self.assertRaises(ValueError): docs.translate(self.root,self.settings,request_fn=fail,plugin=self.plugin)
        self.assertEqual(docs.read(self.root/'content/docs/guide.mdx'),'中文原有内容\n')
        self.assertFalse((self.root/'docs-sync/translations/guide.json').exists())
        self.assertFalse((self.plugin/'Docs/zh-CN').exists())

    def test_ai_injected_jsx_is_rejected(self):
        self.sync()
        def unsafe(prompt,settings):
            return {'title':'test','description':'test','body':prompt['NEW_SOURCE']['body']+'\n<script>alert(1)</script>'}
        with self.assertRaisesRegex(ValueError,'executable markup'):
            docs.translate(self.root,self.settings,request_fn=unsafe,plugin=self.plugin)
        self.assertFalse((self.plugin/'Docs/zh-CN').exists())

    def test_custom_endpoint_key_and_model(self):
        class Opener:
            def open(inner,request,timeout):
                self.assertEqual(request.full_url,'https://custom.example/api/v1/chat/completions')
                self.assertEqual(request.get_header('Authorization'),'Bearer test-secret')
                payload=json.loads(request.data)
                self.assertEqual(payload['model'],'configured-model')
                self.assertNotIn('response_format',payload)
                return io.BytesIO(json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'title':'t','description':'d','body':'b'})}}]}).encode())
        self.assertEqual(docs.ai_request({},self.settings,Opener())['body'],'b')

    def test_responses_endpoint(self):
        self.settings['api_format']='responses'
        class Opener:
            def open(inner,request,timeout):
                self.assertTrue(request.full_url.endswith('/responses'))
                self.assertFalse(json.loads(request.data)['store'])
                return io.BytesIO(json.dumps({'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps({'title':'t','description':'d','body':'b'})}]}]}).encode())
        self.assertEqual(docs.ai_request({},self.settings,Opener())['title'],'t')

    def test_truncated_api_response_rejected(self):
        class Opener:
            def open(inner,request,timeout):
                return io.BytesIO(json.dumps({'choices':[{'finish_reason':'length','message':{'content':'{}'}}]}).encode())
        with self.assertRaisesRegex(ValueError,'incomplete'): docs.ai_request({},self.settings,Opener())

    def test_invalid_endpoint_credentials_rejected(self):
        self.settings['base_url']='https://user:password@example.com/v1'
        with self.assertRaisesRegex(ValueError,'Base_URL|BASE_URL'): docs.ai_request({},self.settings)

    def test_english_revision_does_not_churn_for_unrelated_commit(self):
        self.sync()
        before=docs.read(self.root/'content/docs/guide.en.md')
        self.sha='b'*40
        with patch.object(docs.subprocess,'run') as process:
            process.return_value.returncode=0
            self.sync()
        self.assertEqual(docs.read(self.root/'content/docs/guide.en.md'),before)

    def test_relative_image_uses_raw_commit_url(self):
        body='![Image](images/shot.png) [Page](other.md)\n'
        result=docs.rewrite_links(body,'Docs/guide.md','example/plugin',self.sha,{'Docs/other.md':'/en/docs/other'})
        self.assertIn(f'https://raw.githubusercontent.com/example/plugin/{self.sha}/Docs/images/shot.png',result)
        self.assertIn('](/en/docs/other)',result)

    def test_html_anchor_adapted_without_touching_code_example(self):
        source='<a id="stable"></a>\n\n## Title\n\n```md\n<a id="code"></a>\n## Example\n```\n'
        adapted=docs.source_anchors(source)
        self.assertEqual(adapted,{'stable':'title'})
        result=docs.rewrite_links(source+'[go](#stable)','Docs/guide.md','example/plugin',self.sha,{},anchors={'Docs/guide.md':adapted})
        self.assertIn('](#title)',result)
        self.assertIn('<a id="code"></a>\n## Example',result)

    def test_long_page_chunks_keep_tables_and_protected_code(self):
        body='# Guide\n\n| Key | Meaning |\n| --- | --- |\n'+''.join(f'| {i} | English paragraph. |\n' for i in range(120))
        body+='\n```cpp\nvoid DoThing();\n```\n'
        docs.write(self.plugin/'Docs/guide.md',body)
        self.sync()
        self.settings['chunk_chars']=600
        calls=[]
        def fake(prompt,settings):
            calls.append(prompt)
            return self.fake_ai(prompt,settings)
        self.translate_and_import(request_fn=fake)
        result=docs.read(self.plugin/'Docs/zh-CN/guide.md')
        self.assertGreater(len(calls),1)
        self.assertIn('| 20 | 中文段落。 |\n| 21 | 中文段落。 |',result)
        self.assertEqual(result.count('void DoThing();'),1)
        self.assertIn('| 20 | 中文段落。 |\n| 21 | 中文段落。 |',docs.read(self.root/'content/docs/guide.md'))

    def test_later_chunk_failure_does_not_replace_chinese(self):
        docs.write(self.plugin/'Docs/guide.md','# Guide\n\n'+('English paragraph.\n\n'*100))
        self.sync()
        self.settings['chunk_chars']=600
        def fail_later(prompt,settings):
            if prompt['CHUNK']['index']==2: raise ValueError('provider unavailable')
            return self.fake_ai(prompt,settings)
        with self.assertRaises(ValueError): docs.translate(self.root,self.settings,request_fn=fail_later,plugin=self.plugin)
        self.assertEqual(docs.read(self.root/'content/docs/guide.mdx'),'中文原有内容\n')
        self.assertFalse((self.plugin/'Docs/zh-CN').exists())

    def test_component_text_translated_but_markup_escaped(self):
        source='<Card title="English" href="/en/docs/guide" />\n'
        masked,protected=docs.protect(source)
        attributes,locations=docs.component_attributes(masked,protected)
        self.assertEqual(list(attributes.values()),['English'])
        translated={'attributes':{key:'中文 "标题" <script>' for key in attributes}}
        docs.restore_attributes(translated,attributes,locations,protected)
        result=docs.restore(masked,protected,masked)
        self.assertIn('title="中文 &quot;标题&quot; &lt;script&gt;"',result)
        self.assertIn('href="/en/docs/guide"',result)
        self.assertTrue(result.startswith('<Card '))


if __name__=='__main__': unittest.main()
