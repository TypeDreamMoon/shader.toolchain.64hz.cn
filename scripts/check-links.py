"""Validate rendered document links and fragments in the static export, in both locales."""
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links = set(), []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])


def main():
    export = ROOT / 'out'
    if not export.is_dir():
        raise SystemExit('No out/; build the site first')
    pages = {}
    for file in export.rglob('*.html'):
        relative = file.relative_to(export).as_posix()
        route = '/' + relative.removesuffix('index.html').removesuffix('.html').rstrip('/')
        page = Page()
        page.feed(file.read_text(encoding='utf-8'))
        pages[route] = page
    problems = set()
    for origin, page in pages.items():
        for link in page.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            target = unquote(parsed.path).rstrip('/') or origin
            if not target.startswith(('/docs', '/en/docs')):
                continue
            if target not in pages:
                problems.add(f'{origin} -> {link}: missing page')
            elif parsed.fragment and unquote(parsed.fragment) not in pages[target].ids:
                problems.add(f'{origin} -> {link}: missing anchor')
    for problem in sorted(problems):
        print(problem)
    print(f'{len(pages)} exported pages, {len(problems)} broken document links')
    return bool(problems)


if __name__ == '__main__':
    sys.exit(main())
