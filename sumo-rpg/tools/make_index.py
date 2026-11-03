# Make the stand-alone index.html from game.html. Asset links get ?v=<content hash> so phones fetch
# a new copy whenever an art file changes (hosts cache .js files for a day).
import os, hashlib, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g=open(os.path.join(ROOT,'game.html'),encoding='utf-8').read()
i=g.index('</style>')+len('</style>')
head,body=g[:i],g[i:].lstrip('\n')
for f in ['faces.js','cast.js','women.js','tani.js','title.webp']:
    h=hashlib.sha256(open(os.path.join(ROOT,f),'rb').read()).hexdigest()[:10]
    body,n=re.subn(r'(["\'(])'+re.escape(f)+r'(?:\?v=[0-9a-f]+)?(["\')])',r'\g<1>'+f+'?v='+h+r'\g<2>',body)
    assert n>=1,(f,n)
out='<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+head+'\n</head>\n<body>\n'+body+('' if body.endswith('\n') else '\n')+'</body>\n</html>\n'
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(out);print('index.html written')
