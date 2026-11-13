# 웹앱(../index.html)을 exe용 app 폴더로 옮기고, 글꼴(Jua, Noto Sans KR)을 내장한다.
import os, re, shutil
here = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(here, '..', 'index.html')
APP = os.path.join(here, 'app')
NM = os.path.join(here, 'node_modules', '@fontsource')
if os.path.isdir(APP):
    shutil.rmtree(APP)
os.makedirs(APP)
links = []
def copy_font(pkg, weight):
    out = os.path.join(APP, 'fonts', pkg)
    os.makedirs(os.path.join(out, 'files'), exist_ok=True)
    css = open(os.path.join(NM, pkg, f'{weight}.css'), encoding='utf-8').read()
    css = re.sub(r", url\(\./files/[^)]+\.woff\) format\('woff'\)", '', css)
    for f in re.findall(r'url\(\./files/([^)]+\.woff2)\)', css):
        shutil.copy(os.path.join(NM, pkg, 'files', f), os.path.join(out, 'files', f))
    open(os.path.join(out, f'{weight}.css'), 'w', encoding='utf-8').write(css)
    links.append(f'<link rel="stylesheet" href="fonts/{pkg}/{weight}.css">')
copy_font('jua', '400')
for w in ('400', '500', '700', '900'):
    copy_font('noto-sans-kr', w)
html = open(SRC, encoding='utf-8').read()
old = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">"""
assert html.count(old) == 1, '글꼴 링크를 찾지 못했습니다'
html = html.replace(old, '\n'.join(links))
open(os.path.join(APP, 'index.html'), 'w', encoding='utf-8').write(html)
shutil.copy(os.path.join(here, 'build', 'icon.png'), os.path.join(APP, 'icon.png'))
print('app 폴더 준비 완료')
