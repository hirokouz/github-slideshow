# Add the extra outfit sheet (one image per heroine: everyday / going-out / autumn-winter) to women.js
import sys, json, re
from PIL import Image
sys.path.insert(0,'.')
from cast import components, uri
from women import wmask, cut, IDS
SRC=sys.argv[1];JS=sys.argv[2];KEYS=['fudan','odekake','fuyu']
s=open(JS).read();data=json.loads(s[s.index('=')+1:s.rindex(';')])
for i,pid in enumerate(IDS):
    im=Image.open(f'{SRC}/image{i+1}.png').convert('RGB');fg=wmask(im);comps,lab,sc=components(fg,8000)
    comps=sorted(sorted(comps,key=lambda t:-t[5])[:3],key=lambda t:t[2]);assert len(comps)==3,(pid,len(comps))
    for k,c in zip(KEYS,comps):
        o=cut(im,fg,c[0],lab,sc,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4));hh=min(760,o.size[1]);o=o.resize((round(hh*o.size[0]/o.size[1]),hh),Image.LANCZOS)
        data[pid]['looks'][k]=uri(o,84);o.save(f'{SRC}/../x_{pid}_{k}.png')
    print(pid,'ok',[c[5] for c in comps])
open(JS,'w').write('window.AI_WOMEN='+json.dumps(data,separators=(',',':'))+';\n')
