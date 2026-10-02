"""Original-source fixture inventory. Optional QA dependency: PyMuPDF.

Default verifies local bytes; --download-missing fetches only absent originals;
--render generates inspection previews without changing original documents.
"""
import argparse
import hashlib
import html
import json
from datetime import datetime, timezone
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'tests/fixtures/floorplans'
MANIFEST = ROOT / 'manifest.json'
MAX_BYTES = 50 * 1024 * 1024


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local(relative):
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError('Path outside corpus: ' + relative)
    return path


def download(sample):
    path = local(sample['original'])
    if path.exists():
        return
    request = urllib.request.Request(sample['downloadUrl'], headers={
        'User-Agent': 'Mozilla/5.0', 'Accept': 'application/pdf,image/*;q=0.9'})
    with urllib.request.urlopen(request, timeout=40) as response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('Source exceeds 50 MiB: ' + sample['id'])
        suffix = path.suffix
        valid = (suffix == '.pdf' and data.startswith(b'%PDF-')) or (
            suffix == '.jpg' and data.startswith(b'\xff\xd8')) or (
            suffix == '.png' and data.startswith(b'\x89PNG\r\n\x1a\n'))
        if not valid:
            raise ValueError('Unexpected file signature: ' + sample['id'])
        sample['resolvedDownloadUrl'] = response.url
        sample['contentType'] = response.headers.get('Content-Type')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    sample['retrievedAt'] = datetime.now(timezone.utc).isoformat()


def inspect(sample, render):
    import pymupdf
    path = local(sample['original'])
    digest = sha(path)
    if sample.get('sha256') and digest != sample['sha256']:
        raise ValueError('Original bytes changed: ' + sample['id'])
    sample.update(sha256=digest, bytes=path.stat().st_size)
    doc = pymupdf.open(path)
    if doc.is_encrypted:
        raise ValueError('Encrypted source: ' + sample['id'])
    sample['pageCount'] = len(doc)
    previews = []
    if path.suffix != '.pdf':
        pix = pymupdf.Pixmap(path)
        sample['imageDimensions'] = [pix.width, pix.height]
        sample['preview'] = sample['original']
        sample['previewDetails'] = [{'path': sample['original'], 'format': path.suffix[1:]}]
    else:
        for number in sample['previewPages']:
            if not 1 <= number <= len(doc):
                raise ValueError('Invalid preview page: ' + sample['id'])
            page = doc[number - 1]
            relative = f'previews/{sample["id"]}/page-{number}.png'
            output = local(relative)
            if render:
                output.parent.mkdir(parents=True, exist_ok=True)
                zoom = min(2, 1600 / max(page.rect.width, page.rect.height))
                page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(output)
                text = ''.join(line.rstrip()+'\n' for line in page.get_text().splitlines())
                output.with_suffix('.txt').write_text(text, encoding='utf-8')
            if not output.exists():
                raise ValueError('Missing preview; run --render: ' + sample['id'])
            previews.append({'path': relative, 'page': number,
                             'rotation': page.rotation,
                             'pageSizePt': [page.rect.width, page.rect.height],
                             'textCharacters': len(page.get_text()),
                             'embeddedImages': len(page.get_images())})
        sample['preview'] = previews[0]['path']
        sample['previewDetails'] = previews
    doc.close()
    sample['inspection'] = 'file-integrity-and-render-checked'
    return {'id': sample['id'], 'passed': True, 'sha256': digest,
            'bytes': sample['bytes'], 'pageCount': sample['pageCount']}


def gallery(samples):
    esc = html.escape
    cards = []
    for s in samples:
        state = '已验收单层手工模型' if s['acceptanceStatus'].startswith('accepted') else '待产品深测'
        cards.append(f'''<article data-search="{esc(' '.join([s['title'], s['provider'], s['scenario'], *s['tags']]).lower())}" data-status="{esc(s['acceptanceStatus'])}">
<a class="picture" href="{esc(s['preview'])}"><img loading="lazy" src="{esc(s['preview'])}" alt="{esc(s['title'])}"></a>
<div class="info"><span class="badge">{state}</span><h2>{esc(s['title'])}</h2>
<p>{esc(s['provider'])} · {esc(s['country'])} · {s['pageCount']} 页 · {s['bytes']/1024/1024:.2f} MiB</p>
<p class="tags">{esc(' · '.join(s['tags']))}</p>
<nav><a href="{esc(s['original'])}">原文件</a><a href="{esc(s['preview'])}">预览</a><a href="{esc(s['sourcePage'])}" target="_blank" rel="noopener">来源</a></nav></div></article>''')
    page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>户型测试素材库</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f5f2;color:#21342e;font:15px/1.6 system-ui,sans-serif}header{padding:28px max(24px,calc((100vw - 1320px)/2));background:#fff;border-bottom:1px solid #d5ddd7}h1{margin:0;font-size:28px}header p{max-width:900px;color:#5a6862}.controls{display:flex;gap:12px;flex-wrap:wrap}input,select{padding:10px 12px;border:1px solid #bdcbc2;border-radius:8px;font:inherit}input{min-width:260px}main{max-width:1368px;margin:auto;padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}article{background:white;border:1px solid #dce3de;border-radius:12px;overflow:hidden}article[hidden]{display:none}.picture{height:270px;display:flex;align-items:center;justify-content:center;background:#fff;border-bottom:1px solid #e4eae5}.picture img{max-width:100%;max-height:100%;object-fit:contain}.info{padding:18px}h2{font-size:18px;margin:12px 0 4px}.info p{font-size:13px;color:#596b61;margin:8px 0}.tags{min-height:42px}.badge{display:inline-block;background:#e9f1e9;font-size:12px;padding:2px 8px;border-radius:6px}nav{display:flex;gap:18px;margin-top:14px}a{color:#216b50}#count{align-self:center;font-size:13px}</style>
<header><h1>户型测试素材库</h1><p>18 份原始资料，保留完整 PDF / JPG / PNG。预览为源文件页面渲染。前四套已有单层手工模型验收，新增资料仅完成采集和素材检查；斜墙、多层、缺少尺寸等特征供后续深入测试。</p><div class="controls"><input id="search" type="search" placeholder="搜索：studio / garage / metric / provider" aria-label="搜索素材"><select id="state" aria-label="验收状态"><option value="">全部素材</option><option value="accepted">已有模型验收</option><option value="collected">新增待深测</option></select><span id="count"></span></div><p><a href="README.md">使用说明与测试顺序</a> · <a href="manifest.json">完整来源清单</a></p></header><main>''' + ''.join(cards) + '''</main>
<script>const cards=[...document.querySelectorAll('article')],search=document.querySelector('#search'),state=document.querySelector('#state');function filter(){const q=search.value.trim().toLowerCase();for(const c of cards)c.hidden=!c.dataset.search.includes(q)||(state.value&&!c.dataset.status.startsWith(state.value));document.querySelector('#count').textContent=cards.filter(c=>!c.hidden).length+' / '+cards.length+' 份';}search.addEventListener('input',filter);state.addEventListener('change',filter);filter();</script></html>'''
    (ROOT / 'gallery.html').write_text(page.replace('18 份原始资料', str(len(samples))+' 份原始资料'), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download-missing', action='store_true')
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    results = []
    for sample in manifest['samples']:
        if args.download_missing:
            download(sample)
        result = inspect(sample, args.render)
        results.append(result)
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        source = local(sample['original']).parent / 'source.json'
        source.write_text(json.dumps(sample, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(sample['id'] + ' PASS', flush=True)
    gallery(manifest['samples'])
    (ROOT / 'integrity-results.json').write_text(json.dumps({
        'passed': True, 'timestamp': datetime.now(timezone.utc).isoformat(),
        'scope': 'Original source bytes, PDF/image parse, selected-page render existence; not product acceptance',
        'samples': results}, indent=2)+'\n')
    print(f'{len(results)} originals verified; gallery generated', flush=True)


if __name__ == '__main__':
    main()
