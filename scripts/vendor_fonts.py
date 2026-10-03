"""Vendor the exact Pretendard version already used by the site, with its license."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/'
CSS_URL = BASE + 'dist/web/variable/pretendardvariable-dynamic-subset.min.css'
DEST = ROOT / 'asset/fonts'

def download(url, path):
    subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '60', url, '-o', str(path)], check=True)

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    css_path = DEST / 'pretendard.css'
    download(CSS_URL, css_path)
    css = css_path.read_text()
    urls = sorted(set(re.findall(r'url\(([^)]+)\)', css)))
    def vendor(value):
        url = urljoin(CSS_URL, value.strip('\"\''))
        if urlsplit(url).hostname != 'cdn.jsdelivr.net':
            raise ValueError('Unexpected font source')
        name = Path(urlsplit(url).path).name
        download(url, DEST / name)
        return value, name
    with ThreadPoolExecutor(max_workers=8) as pool:
        for old, name in pool.map(vendor, urls):
            css = css.replace('url(' + old + ')', 'url(' + name + ')')
    download(BASE + 'LICENSE', DEST / 'LICENSE.txt')
    css_path.write_text(css)
    print(f'Vendored {len(urls)} font subsets with license.')

if __name__ == '__main__':
    main()
