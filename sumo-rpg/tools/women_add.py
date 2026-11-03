# Add one new heroine to women.js from her sheets: P1 (4x3 expressions), P2 (six scene outfits), X (3 everyday outfits)
import sys, json
from PIL import Image
sys.path.insert(0,'.')
from cast import components, uri
from women import wmask, cut, EX, SC
PID,P1F,P2F,XF,JS=sys.argv[1:6]
s=open(JS).read();data=json.loads(s[s.index('=')+1:s.rindex(';')]);o={'exprs':{},'looks':{}}
P1=Image.open(P1F).convert('RGB');W,H=P1.size
for k,name in enumerate(EX):
    cx,cy=k%4,k//4;cell=P1.crop((cx*W//4,cy*H//3,(cx+1)*W//4,(cy+1)*H//3))
    fg=wmask(cell);comps,lab,sc=components(fg,3000);c=max(comps,key=lambda t:t[5])
    im=cut(cell,fg,c[0],lab,sc,(0,0)+cell.size);im=im.resize((300,round(300*im.size[1]/im.size[0])),Image.LANCZOS);o['exprs'][name]=uri(im,84)
def bodies(f,keys):
    im=Image.open(f).convert('RGB');fg=wmask(im);comps,lab,sc=components(fg,8000)
    comps=sorted(sorted(comps,key=lambda t:-t[5])[:len(keys)],key=lambda t:t[2]);assert len(comps)==len(keys),(f,len(comps))
    for k,c in zip(keys,comps):
        x=cut(im,fg,c[0],lab,sc,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4));hh=min(760,x.size[1]);x=x.resize((round(hh*x.size[0]/x.size[1]),hh),Image.LANCZOS)
        o['looks'][k]=uri(x,84);x.save(f'{f}.{k}.png')
bodies(P2F,SC);bodies(XF,['fudan','odekake','fuyu'])
data[PID]=o;open(JS,'w').write('window.AI_WOMEN='+json.dumps(data,separators=(',',':'))+';\n');print(PID,'ok')
