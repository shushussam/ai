# web/src/app.html 에 문제 생성 엔진(engine.js)을 끼워 넣어 저장소 맨 위의 index.html(웹앱)을 만든다.
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'src', 'app.html'), encoding='utf-8').read()
eng = open(os.path.join(here, 'src', 'engine.js'), encoding='utf-8').read()
assert '/*@@ENGINE@@*/' in src
out = src.replace('/*@@ENGINE@@*/', eng.strip())
open(os.path.join(here, '..', 'index.html'), 'w', encoding='utf-8').write(out)
print('index.html 생성:', len(out), 'bytes')
