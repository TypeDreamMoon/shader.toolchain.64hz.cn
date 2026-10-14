"""Regression contracts for plugin-owned Chinese translations.

No API calls, real repositories, commits, or network access are used here.
"""
"""Regression tests for plugin-owned bilingual documentation."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import docs_sync as docs

REAL_GIT = docs.git


class PluginI18nTests(unittest.TestCase):
    def setUp(self):
        # Local migration fixtures must not inherit the runner's CI mode.
        # Tests for CI restrictions explicitly enable it within their scope.
        environment = patch.dict(os.environ, {'GITHUB_ACTIONS': '', 'DOCS_TRANSLATION_PREVIEW': ''})
        environment.start()
        self.addCleanup(environment.stop)
        scratch = docs.ROOT / '.docs-sync-tmp'
        scratch.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='plugin-i18n-', dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'site'
        self.plugin = Path(self.temp.name) / 'plugin'
        self.sha = 'a' * 40
        self.dirty = ''
        self.requests = []
        git = patch.object(docs, 'git', side_effect=self.fake_git)
        git.start()
        self.addCleanup(git.stop)
        process = patch.object(docs.subprocess, 'run', side_effect=self.fake_process)
        process.start()
        self.addCleanup(process.stop)
        self.cfg = {
            'version': 1, 'repository': 'example/plugin', 'branch': 'main',
            'pages': [{'id': 'guide', 'format': 'md', 'title': 'Website title',
                       'sources': [{'path': 'Docs/guide.md'}]}],
        }
        self.save_config()
        docs.write(self.plugin / 'Docs/guide.md',
                   '# Guide\n\nEnglish paragraph.\n\n```cpp\nvoid DoThing();\n```\n')
        docs.write(self.root / 'content/docs/guide.mdx',
                   '---\ntitle: "原有网站标题"\ndescription: "原有网站描述"\n---\n\n原有中文正文。\n')
        self.settings = {
            'base_url': 'https://custom.example/v1', 'api_key': 'test-secret',
            'model': 'configured-model', 'api_format': 'chat-completions',
            'json_mode': False, 'max_tokens': 1000, 'timeout': 10,
            'max_pages': 20, 'max_chars': 100000,
        }

    def fake_git(self, root, *args):
        return self.dirty if args[0] == 'status' else self.sha

    @staticmethod
    def fake_process(args, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout='', stderr='')

    def save_config(self):
        docs.write(self.root / 'docs-sync/config.json', docs.json_text(self.cfg))

    def fake_ai(self, prompt, settings):
        self.requests.append(prompt)
        body = prompt['NEW_SOURCE']['body']
        for english, chinese in (
            ('English paragraph.', '中文段落。'), ('Second paragraph.', '第二段中文。'),
            ('Changed paragraph.', '更新后的中文。'), ('Install instructions.', '安装说明。'),
            ('Run instructions.', '运行说明。'), ('Only the first group.', '只有第一组。'),
            ('Only the second group.', '只有第二组。'),
            ('# Guide', '# 指南'), ('# Second', '# 第二篇'),
            ('## Diagnostics', '## 诊断'), ('## Install', '## 安装'),
            ('## Runtime One', '## 运行一'), ('## Runtime Two', '## 运行二'),
        ):
            body = body.replace(english, chinese)
        return {'title': '指南', 'description': '中文说明', 'body': body,
                'attributes': prompt.get('ATTRIBUTES', {})}

    def translate(self, ids=None, request_fn=None):
        return docs.translate(self.root, self.settings, page_ids=ids,
                              request_fn=request_fn or self.fake_ai, plugin=self.plugin)

    def sync(self, **kwargs):
        return docs.sync(self.root, self.plugin, **kwargs)

    def record_path(self, relative='guide.md'):
        return self.plugin / 'Docs/zh-CN/.translations' / (relative + '.json')

    def translated_path(self, relative='guide.md'):
        return self.plugin / 'Docs/zh-CN' / relative

    def plugin_rows(self):
        return {row['id']: row for row in docs.plugin_statuses(self.plugin)}

    def page(self, page_id='guide'):
        return docs.load(self.root / 'docs-sync/source-lock.json')['pages'][page_id]

    def chinese(self, page_id='guide'):
        return docs.read(docs.translation_path(self.root, page_id))

    @staticmethod
    def snapshot(root):
        return {p.relative_to(root).as_posix(): p.read_bytes()
                for p in root.rglob('*') if p.is_file()}

    def write_reviewed(self, relative='guide.md', body='# 指南\n\n已审阅中文。\n', source_hash=True):
        source = docs.read(self.plugin / 'Docs' / relative)
        destination = self.translated_path(relative)
        docs.write(destination, body)
        docs.write(self.record_path(relative), docs.json_text({
            'sourceHash': docs.digest(source) if source_hash else None,
            'sourceRevision': self.sha, 'source': source,
            'translationHash': docs.digest(body),
            'translationFile': destination.relative_to(self.plugin).as_posix(),
        }))

    def test_source_statuses_and_imported_null_baseline(self):
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'missing')
        docs.write(self.translated_path(), '# 已导入的中文\n')
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'unreviewed')
        self.write_reviewed(source_hash=False)
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'unreviewed')
        self.write_reviewed()
        row = self.plugin_rows()['guide.md']
        self.assertEqual(row['path'], 'Docs/guide.md')
        self.assertEqual(row['status'], 'current')
        self.assertEqual(row['hash'], docs.digest(docs.read(self.plugin / 'Docs/guide.md')))
        docs.write(self.plugin / 'Docs/guide.md', '# Guide\n\nChanged paragraph.\n')
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'outdated')

    def test_chinese_tree_is_never_discovered_as_english(self):
        self.write_reviewed()
        docs.write(self.plugin / 'Docs/zh-CN/local-only.md', '# 中文补充\n')
        self.assertEqual(set(self.plugin_rows()), {'guide.md'})
        self.sync(adopt_existing=True)
        self.assertEqual(set(docs.load(self.root / 'docs-sync/source-lock.json')['pages']), {'guide'})

    def test_imported_chinese_without_baseline_remains_unreviewed_on_site(self):
        self.write_reviewed(source_hash=False)
        self.sync(adopt_existing=True)
        self.assertIn('已审阅中文。', self.chinese())
        self.assertEqual(self.page()['translation']['status'], 'unreviewed')
        self.assertEqual(docs.statuses(self.root)[0]['status'], 'unreviewed')

    def test_source_status_excludes_legacy_navigation_and_website_snapshot(self):
        for relative in ('DuiLanguage.md', 'FontsAndPackaging.md', 'Migration.md', 'Website/old.md'):
            docs.write(self.plugin / 'Docs' / relative, '# Compatibility navigation\n')
        self.assertEqual(set(self.plugin_rows()), {'guide.md'})

    def test_full_source_hash_normalizes_windows_newlines(self):
        self.write_reviewed()
        source_path = self.plugin / 'Docs/guide.md'
        source = docs.read(source_path)
        source_path.write_bytes(source.replace('\n', '\r\n').encode('utf-8'))
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'current')
        self.assertEqual(self.plugin_rows()['guide.md']['hash'], docs.digest(source))

    def test_translate_writes_only_plugin_files_with_source_baseline(self):
        self.sync()
        before = self.snapshot(self.root)
        source = docs.read(self.plugin / 'Docs/guide.md')
        self.translate(['guide.md'])
        self.assertEqual(self.snapshot(self.root), before)
        translated = docs.read(self.translated_path())
        self.assertIn('中文段落。', translated)
        self.assertIn('void DoThing();', translated)
        self.assertNotIn('/en/docs/', translated)
        self.assertNotIn('/docs/', translated)
        self.assertNotRegex(translated, r'\[#[^\]]+\]')
        record = docs.load(self.record_path())
        self.assertEqual(record['source'], source)
        self.assertEqual(record['sourceHash'], docs.digest(source))
        self.assertEqual(record['sourceRevision'], self.sha)
        self.assertEqual(record['translationHash'], docs.digest(translated))
        self.assertEqual(record['translationFile'], 'Docs/zh-CN/guide.md')

    def test_shared_source_is_translated_once_and_keeps_both_routes(self):
        self.cfg['pages'].append({'id': 'plugin/guide', 'format': 'md',
                                  'sources': [{'path': 'Docs/guide.md'}]})
        self.save_config()
        self.translate()
        self.assertEqual(len(self.requests), 1)
        self.sync(adopt_existing=True)
        for page_id in ('guide', 'plugin/guide'):
            self.assertIn('中文段落。', self.chinese(page_id))
            self.assertEqual(self.page(page_id)['translation']['status'], 'current')
        self.assertEqual(set(docs.load(self.root / 'docs-sync/source-lock.json')['pages']),
                         {'guide', 'plugin/guide'})

    def test_plugin_mirror_keeps_relative_documents_and_rebases_shared_images(self):
        docs.write(self.plugin / 'Docs/guide.md',
                   '# Guide\n\n[Topic](topic.md#details)\n\n![Image](images/shot.png)\n')
        docs.write(self.plugin / 'Docs/topic.md', '# Topic\n\n## Details\n\nEnglish paragraph.\n')
        docs.write(self.plugin / 'Docs/images/shot.png', 'test image fixture')
        self.translate()
        guide = docs.read(self.translated_path())
        self.assertIn('](topic.md#details)', guide)
        self.assertIn('](../images/shot.png)', guide)
        self.assertNotIn('/docs/', guide)

    def test_plugin_link_falls_back_to_english_until_target_is_translated(self):
        docs.write(self.plugin / 'Docs/guide.md', '# Guide\n\n[Topic](topic.md#details)\n')
        docs.write(self.plugin / 'Docs/topic.md', '# Topic\n\n## Details\n\nEnglish paragraph.\n')
        self.translate(['guide.md'])
        self.assertIn('](../topic.md#details)', docs.read(self.translated_path()))

    def test_chinese_only_commit_preserves_english_hash_and_translation_baseline(self):
        self.translate()
        self.sync(adopt_existing=True)
        before = docs.read(self.root / 'content/docs/guide.en.md')
        page = self.page()
        record = docs.load(self.record_path())
        self.sha = 'b' * 40
        self.write_reviewed(body='# 指南\n\n人工润色后的中文。\n')
        revised = docs.load(self.record_path())
        revised['sourceRevision'] = record['sourceRevision']
        docs.write(self.record_path(), docs.json_text(revised))
        self.sync()
        self.assertEqual(docs.read(self.root / 'content/docs/guide.en.md'), before)
        self.assertEqual(self.page()['hash'], page['hash'])
        self.assertEqual(self.page()['revision'], page['revision'])
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'current')
        calls = len(self.requests)
        self.translate()
        self.assertEqual(len(self.requests), calls)
        self.assertIn('人工润色后的中文。', self.chinese())

    def test_website_metadata_changes_do_not_enqueue_plugin_translation(self):
        self.translate()
        self.sync(adopt_existing=True)
        self.cfg['pages'][0]['title'] = 'New website title'
        self.cfg['pages'][0]['description'] = 'New website description'
        self.save_config()
        self.sync()
        self.assertEqual(self.plugin_rows()['guide.md']['status'], 'current')
        calls = len(self.requests)
        self.translate()
        self.assertEqual(len(self.requests), calls)

    def test_multisource_page_aggregates_translation_and_staleness(self):
        docs.write(self.plugin / 'Docs/second.md', '# Second\n\nSecond paragraph.\n')
        self.cfg['pages'][0]['sources'].append({'path': 'Docs/second.md'})
        self.save_config()
        self.translate()
        self.sync(adopt_existing=True)
        self.assertIn('中文段落。', self.chinese())
        self.assertIn('第二段中文。', self.chinese())
        self.assertEqual(self.page()['translation']['status'], 'current')
        before = self.chinese()
        docs.write(self.plugin / 'Docs/second.md', '# Second\n\nChanged paragraph.\n')
        self.sync()
        self.assertEqual(self.chinese(), before)
        self.assertEqual(self.page()['translation']['status'], 'outdated')

    def test_partial_multisource_translation_does_not_replace_complete_old_page(self):
        docs.write(self.plugin / 'Docs/second.md', '# Second\n\nSecond paragraph.\n')
        self.cfg['pages'][0]['sources'].append({'path': 'Docs/second.md'})
        self.save_config()
        before = self.chinese()
        self.translate(['guide.md'])
        self.sync(adopt_existing=True)
        self.assertEqual(self.chinese(), before)
        self.assertIn(self.page()['translation']['status'], ('missing', 'unreviewed'))

    def test_dui_groups_select_translated_heading_and_immutable_codes(self):
        docs.write(self.plugin / 'Docs/codes.md',
                   '## Diagnostics\n\n| Code | Name | Meaning |\n|---|---|---|\n'
                   '| DUI1001 | FirstName | Only the first group. |\n'
                   '| DUI2001 | SecondName | Only the second group. |\n')
        self.cfg['pages'] = [
            {'id': f'diagnostics/dui{number}xxx', 'format': 'md',
             'sources': [{'path': 'Docs/codes.md', 'heading': 'Diagnostics',
                          'diagnosticPrefix': f'DUI{number}'}]}
            for number in (1, 2)
        ]
        self.save_config()
        self.translate(['codes.md'])
        self.sync()
        first = self.chinese('diagnostics/dui1xxx')
        second = self.chinese('diagnostics/dui2xxx')
        self.assertIn('DUI1001', first)
        self.assertIn('只有第一组。', first)
        self.assertNotIn('DUI2001', first)
        self.assertIn('DUI2001', second)
        self.assertIn('只有第二组。', second)
        self.assertNotIn('DUI1001', second)

    def test_heading_and_prefix_selectors_do_not_match_translated_title_text(self):
        docs.write(self.plugin / 'Docs/guide.md',
                   '# Guide\n\n## Install\n\nInstall instructions.\n\n'
                   '## Runtime One\n\nRun instructions.\n\n'
                   '## Runtime Two\n\nSecond paragraph.\n')
        self.cfg['pages'] = [
            {'id': 'install', 'format': 'md',
             'sources': [{'path': 'Docs/guide.md', 'heading': 'Install'}]},
            {'id': 'run', 'format': 'md',
             'sources': [{'path': 'Docs/guide.md', 'headingPrefix': 'Runtime'}]},
        ]
        self.save_config()
        self.translate()
        self.sync()
        self.assertIn('安装说明。', self.chinese('install'))
        self.assertNotIn('运行说明。', self.chinese('install'))
        self.assertIn('运行说明。', self.chinese('run'))
        self.assertIn('第二段中文。', self.chinese('run'))
        self.assertNotIn('安装说明。', self.chinese('run'))

    def test_stale_section_uses_its_recorded_source_not_new_heading_positions(self):
        original = '# Guide\n\n## Install\n\nInstall instructions.\n'
        docs.write(self.plugin / 'Docs/guide.md', original)
        self.cfg['pages'][0]['sources'][0]['heading'] = 'Install'
        self.save_config()
        self.translate()
        self.sync(adopt_existing=True)
        before = self.chinese()
        docs.write(self.plugin / 'Docs/guide.md',
                   '# Guide\n\n## New section\n\nNew material.\n\n'
                   '## Install\n\nChanged instructions.\n')
        self.sync()
        self.assertEqual(self.chinese(), before)
        self.assertEqual(self.page()['translation']['status'], 'outdated')

    def test_site_notes_never_enter_plugin_or_ai_context(self):
        notes = '\n## 网站补充\n\n仅本站保存的私有讲解。\n'
        docs.write(self.root / 'content/docs/guide.mdx', '旧正文。\n' + docs.NOTES + notes)
        self.translate()
        self.assertNotIn('仅本站保存的私有讲解', json.dumps(self.requests, ensure_ascii=False))
        self.assertNotIn(docs.NOTES, docs.read(self.translated_path()))
        self.sync(adopt_existing=True)
        self.assertTrue(self.chinese().endswith(docs.NOTES + notes))

    def test_site_prose_edits_are_rejected_without_overwriting_anything(self):
        self.translate()
        self.sync(adopt_existing=True)
        path = docs.translation_path(self.root, 'guide')
        docs.write(path, self.chinese().replace('中文段落。', '网站手改正文。'))
        before = self.snapshot(self.root)
        with self.assertRaises(ValueError):
            self.sync()
        self.assertEqual(self.snapshot(self.root), before)

    def test_site_notes_can_change_without_generated_body_conflict(self):
        self.translate()
        self.sync(adopt_existing=True)
        path = docs.translation_path(self.root, 'guide')
        notes = '\n## 后加补充\n\n保留新笔记。\n'
        docs.write(path, self.chinese().rstrip() + '\n\n' + docs.NOTES + notes)
        self.write_reviewed(body='# 指南\n\n新插件中文。\n')
        self.sync()
        self.assertIn('新插件中文。', self.chinese())
        self.assertTrue(self.chinese().endswith(docs.NOTES + notes))

    def test_missing_plugin_translation_keeps_legacy_chinese_without_fake_baseline(self):
        before = self.chinese()
        self.sync()
        self.assertEqual(self.chinese(), before)
        self.assertIn(self.page()['translation']['status'], ('missing', 'unreviewed'))
        self.assertFalse(self.record_path().exists())

    def test_missing_translation_without_legacy_page_does_not_publish_english_as_chinese(self):
        (self.root / 'content/docs/guide.mdx').unlink()
        self.sync()
        self.assertFalse(docs.translation_path(self.root, 'guide').exists())
        self.assertEqual(self.page()['translation']['status'], 'missing')

    def test_late_ancestor_with_same_english_cannot_roll_back_newer_chinese(self):
        self.write_reviewed(body='# 指南\n\n较早中文。\n')
        old_record = docs.read(self.record_path())
        old_chinese = docs.read(self.translated_path())
        self.sync(adopt_existing=True)
        self.sha = 'b' * 40
        self.write_reviewed(body='# 指南\n\n最新中文。\n')
        self.sync()
        before = self.snapshot(self.root)
        self.sha = 'a' * 40
        docs.write(self.record_path(), old_record)
        docs.write(self.translated_path(), old_chinese)

        def ancestry(args, **kwargs):
            backwards = '--is-ancestor' in args and args[-2:] == ['b' * 40, 'a' * 40]
            return subprocess.CompletedProcess(args, 1 if backwards else 0, stdout='', stderr='')

        with patch.object(docs.subprocess, 'run', side_effect=ancestry):
            try:
                self.sync()
            except ValueError:
                pass
        self.assertEqual(self.snapshot(self.root), before)

    def test_preview_accepts_dirty_chinese_but_rejects_dirty_english(self):
        self.translate()
        self.sync(adopt_existing=True)
        self.dirty = ' M Docs/zh-CN/guide.md\n?? Docs/zh-CN/.translations/guide.md.json'
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'DOCS_TRANSLATION_PREVIEW': 'true'}):
            self.sync()
        self.assertIn('中文段落。', self.chinese())
        before = self.snapshot(self.root)
        self.dirty += '\n M Docs/guide.md'
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'DOCS_TRANSLATION_PREVIEW': 'true'}):
            with self.assertRaises(ValueError):
                self.sync()
        self.assertEqual(self.snapshot(self.root), before)

    def test_preview_preserves_real_git_porcelain_leading_space(self):
        self.translate()
        self.sync(adopt_existing=True)
        porcelain = ' M Docs/zh-CN/guide.md\n?? Docs/zh-CN/.translations/guide.md.json\n'

        def git_process(args, **kwargs):
            stdout = porcelain if args[3] == 'status' else self.sha + '\n'
            return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr='')

        with patch.object(docs, 'git', REAL_GIT), \
             patch.object(docs.subprocess, 'run', side_effect=git_process), \
             patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'DOCS_TRANSLATION_PREVIEW': 'true'}):
            self.assertEqual(docs.git(self.plugin, 'status', '--porcelain'), porcelain.rstrip('\n'))
            self.sync()
            docs.validate(self.root)
        self.assertTrue(docs.load(self.root / 'docs-sync/source-lock.json')['workingTree'])

    def test_inline_code_heading_has_real_plugin_anchor_after_translation(self):
        example = '```md\n## `Example` [#leave-code-alone]\n```\n'
        docs.write(self.plugin / 'Docs/guide.md',
                   '# Guide\n\n[Jump](#widget-configuration)\n\n'
                   '## `Widget` configuration\n\nEnglish paragraph.\n\n' + example)

        def translate_heading(prompt, settings):
            result = self.fake_ai(prompt, settings)
            result['body'] = result['body'].replace('configuration', '配置')
            return result

        self.translate(request_fn=translate_heading)
        translated = docs.read(self.translated_path())
        self.assertIn('<a id="widget-configuration"></a>\n\n## `Widget` 配置', translated)
        self.assertIn('[Jump](#widget-configuration)', translated)
        self.assertNotIn('配置 [#widget-configuration]', translated)
        self.assertIn(example, translated)

    def test_plugin_frontmatter_updates_generated_site_title_and_description(self):
        self.write_reviewed(body=docs.document('首版标题', '首版摘要', '# 指南\n\n原有正文。'))
        self.sync(adopt_existing=True)
        front, _ = docs.split_frontmatter(self.chinese())
        self.assertEqual(docs.field(front, 'title'), '首版标题')
        self.sha = 'b' * 40
        self.write_reviewed(body=docs.document('更新标题', '更新摘要', '# 指南\n\n修订正文。'))
        self.sync()
        front, _ = docs.split_frontmatter(self.chinese())
        self.assertEqual(docs.field(front, 'title'), '更新标题')
        self.assertEqual(docs.field(front, 'description'), '更新摘要')
        self.assertEqual(self.page()['translation']['status'], 'current')

    def test_reference_definition_urls_are_protected_from_ai_edits(self):
        for url in ('topic.md#details', '<topic.md?view=full#details>', '../README.md'):
            with self.subTest(url=url):
                source = '[Topic][target]\n\n[target]: ' + url + ' "English title"\n'
                masked, protected = docs.protect(source)
                self.assertNotIn(url, masked)
                translated = docs.restore(masked.replace('English title', '中文标题'), protected, masked)
                self.assertIn('[target]: ' + url + ' "中文标题"', translated)
                token = next(value for value in masked.split() if value.startswith('@@DOCS_KEEP_'))
                with self.assertRaisesRegex(ValueError, 'protected'):
                    docs.restore(masked.replace(token, 'changed.md#wrong', 1), protected, masked)

    def test_nonpreview_ci_rejects_dirty_translation(self):
        self.translate()
        self.dirty = ' M Docs/zh-CN/guide.md'
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true'}, clear=False):
            with patch.dict(os.environ, {'DOCS_TRANSLATION_PREVIEW': ''}):
                with self.assertRaises(ValueError):
                    self.sync(adopt_existing=True)

    def test_ci_rejects_first_adoption_even_in_translation_preview(self):
        self.translate()
        before = self.snapshot(self.root)
        for preview in ('', 'true'):
            with self.subTest(preview=preview), patch.dict(os.environ, {
                'GITHUB_ACTIONS': 'true', 'DOCS_TRANSLATION_PREVIEW': preview,
            }):
                with self.assertRaisesRegex(ValueError, 'CI cannot adopt'):
                    self.sync(adopt_existing=True)
            self.assertEqual(self.snapshot(self.root), before)

    def test_failed_ai_batch_leaves_plugin_and_site_unchanged(self):
        docs.write(self.plugin / 'Docs/second.md', '# Second\n\nSecond paragraph.\n')
        plugin_before = self.snapshot(self.plugin)
        site_before = self.snapshot(self.root)
        calls = []

        def fail_second(prompt, settings):
            calls.append(prompt)
            if len(calls) == 2:
                raise ValueError('provider unavailable')
            return self.fake_ai(prompt, settings)

        with self.assertRaisesRegex(ValueError, 'provider unavailable'):
            self.translate(request_fn=fail_second)
        self.assertEqual(self.snapshot(self.plugin), plugin_before)
        self.assertEqual(self.snapshot(self.root), site_before)


if __name__ == '__main__':
    unittest.main()
