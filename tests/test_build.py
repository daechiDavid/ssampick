"""Public artifact checks and release metadata regression coverage."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import importlib.util
import json
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.refs=[]; self.h1=0; self.duplicates=[];self.dialogs=[]
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        keys=[k for k,v in attrs]
        self.duplicates += [k for k,n in Counter(keys).items() if n>1]
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='dialog':self.dialogs.append(a['id'])
        for k in ('href','src','data-full'):
            if a.get(k):self.refs.append(a[k])
        for k in ('srcset','imagesrcset'):
            self.refs += [v.strip().split(' ')[0] for v in a.get(k,'').split(',') if v.strip()]

class BuildTests(unittest.TestCase):
    def test_public_pages_and_references(self):
        root=ROOT/'dist'
        pages={p.name:Page(p.read_text()) for p in root.glob('*.html')}
        self.assertEqual(len(pages),8)
        for name,page in pages.items():
            with self.subTest(page=name):
                self.assertEqual(page.h1,1)
                self.assertFalse(page.duplicates)
                self.assertEqual(len(page.ids),len(set(page.ids)))
                for ref in page.refs:
                    url=urlsplit(ref)
                    if url.scheme or url.netloc:continue
                    dest=unquote(url.path).lstrip('/') or name
                    self.assertTrue((root/dest).is_file(),(name,ref))
                    if url.fragment and dest in pages:self.assertIn(unquote(url.fragment),pages[dest].ids,(name,ref))
                if name.startswith('business-'):self.assertEqual(page.dialogs,['privacyPolicyDialog'])

    def test_distribution_excludes_private_sources(self):
        for path in (ROOT/'dist').rglob('*'):
            self.assertFalse(path.is_symlink())
            self.assertFalse(any(x in str(path.relative_to(ROOT/'dist')) for x in ('client-imgset','private-source','.kilo','.DS_Store','original','apps-script','fix-grok','fix-fable')))
        self.assertTrue((ROOT/'private-source/business-education-events-original-4.jpg').is_file())
        self.assertLess((ROOT/'dist/asset/img/business-education-events-4-blurred-1536.webp').stat().st_size,200_000)
        self.assertTrue((ROOT/'dist/asset/fonts/LICENSE.txt').is_file())
        self.assertNotIn('href="https://cdn.jsdelivr.net', (ROOT/'dist/index.html').read_text())

    def test_types_and_instructor_link(self):
        types=json.loads((ROOT/'site/data/inquiry-types.json').read_text())
        home=(ROOT/'dist/index.html').read_text()
        server=(ROOT/'apps-script/SiteSettings.gs').read_text()
        for value in types:self.assertIn('<option>'+value+'</option>',home);self.assertIn(value,server)
        programs=(ROOT/'dist/programs.html').read_text()
        self.assertIn('index.html?inquiry=%EA%B0%95%EC%82%AC%20%EC%84%AD%EC%99%B8#contact',programs)
        self.assertNotIn('rel="preload"',programs)

    def test_release_metadata_and_unknown_output_protection(self):
        spec=importlib.util.spec_from_file_location('build_site',ROOT/'scripts/build_site.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            for name in ('site','asset','apps-script'):shutil.copytree(ROOT/name,folder/name)
            module.ROOT=folder;module.SOURCE=folder/'site';module.DIST=folder/'dist'
            with self.assertRaises(ValueError):module.build('',True)
            with self.assertRaises(ValueError):module.build('https://example.org/path',True)
            outputs=module.build('https://example.org',True)
            self.assertIn('href="https://example.org/"',outputs['index.html'])
            self.assertIn('content="https://example.org/asset/img/og-image.jpg"',outputs['programs.html'])
            self.assertNotIn('404.html',(folder/'dist/sitemap.xml').read_text())
            self.assertIn('Sitemap: https://example.org/sitemap.xml',(folder/'dist/robots.txt').read_text())
            (folder/'dist/.ssampick-generated').unlink()
            with self.assertRaises(ValueError):module.build('https://example.org',True)

if __name__=='__main__':unittest.main()
