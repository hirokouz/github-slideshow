# Cut the tanimachi sheets (T0: 4 faces + casual/formal/dining bodies, T1: ryotei scene + gift bust) into tani.js
import sys, json, numpy as np
from PIL import Image
sys.path.insert(0,'.')
from cast import components, uri
from women import wmask, cut
SRC=sys.argv[1];OUT=sys.argv[2]
IDS=['taisho','shacho','okami','wakashacho']
out={}
for i,tid in enumerate(IDS):
    T0=Image.open(f'{SRC}/0{i+1}-T0.png').convert('RGB');fg=wmask(T0);comps,lab,s=components(fg,4000)
    comps=sorted(comps,key=lambda c:-c[5])[:7]
    top=sorted([c for c in comps if (c[1]+c[3])/2<T0.size[1]*.25],key=lambda c:c[2])
    rest=sorted([c for c in comps if (c[1]+c[3])/2>=T0.size[1]*.25],key=lambda c:c[2])
    assert len(top)==4 and len(rest)==3,(tid,len(top),len(rest))
    o={'faces':{},'looks':{}}
    for name,c in zip(['normal','smile','angry','kanpai'],top):
        im=cut(T0,fg,c[0],lab,s,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4));im=im.resize((200,round(200*im.size[1]/im.size[0])),Image.LANCZOS);o['faces'][name]=uri(im,82)
    for name,c in zip(['casual','formal','dining'],rest):
        im=cut(T0,fg,c[0],lab,s,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4));im=im.resize((round(360*im.size[0]/im.size[1]),360),Image.LANCZOS);o['looks'][name]=uri(im,82)
    T1=Image.open(f'{SRC}/0{i+1}-T1.png').convert('RGB');fg=wmask(T1);H=T1.size[1]
    # the ryotei room is a full painted rectangle in the upper half
    ys,xs=np.where(fg[:int(H*.5)]);box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
    sc=T1.crop(box);sc=sc.resize((720,round(720*sc.size[1]/sc.size[0])),Image.LANCZOS);o['scene']=uri(sc,80)
    lower=fg.copy();lower[:int(H*.5)]=False;comps,lab,s=components(lower,4000);c=max(comps,key=lambda c:c[5])
    im=cut(T1,lower,c[0],lab,s,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4));im=im.resize((240,round(240*im.size[1]/im.size[0])),Image.LANCZOS);o['gift']=uri(im,82)
    im.save(f'{SRC}/../cut_{tid}_gift.png');sc.save(f'{SRC}/../cut_{tid}_scene.png')
    out[tid]=o;print(tid,'ok',box)
open(OUT,'w').write('window.AI_TANI='+json.dumps(out,separators=(',',':'))+';\n')
