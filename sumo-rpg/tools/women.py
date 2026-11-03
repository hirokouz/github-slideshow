# Cut the women sheets (P1: 4x3 expressions, P2: six scene outfits) into a women.js asset file.
import sys, json, numpy as np
from PIL import Image, ImageFilter
from collections import deque
sys.path.insert(0,'.');from cast import components, uri
SRC=sys.argv[1] if __name__=="__main__" else None;OUT=sys.argv[2] if __name__=="__main__" else None
IDS=['osana','reijo','eiyo','imouto','deshi']
EX=['normal','smile','shy','joycry','worry','sulk','angry','sad','closed','surprise','wink','serious']
SC=['casual','date','yukata','shiromuku','dress','baby']
def wmask(img):
    a=np.asarray(img).astype(float);H,W,_=a.shape
    paper=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3),a[:,:4].reshape(-1,3),a[:,-4:].reshape(-1,3)]),0)
    prb=paper[0]-paper[2]
    # paper is warm beige; pure white cloth has no warm tint, so require the tint
    near=(np.abs(a-paper).sum(2)<34)&((a[...,0]-a[...,2])>prb*.45)
    bg=np.zeros((H,W),bool);q=deque()
    for x in range(W):
        for y in (0,H-1):
            if near[y,x] and not bg[y,x]:bg[y,x]=True;q.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if near[y,x] and not bg[y,x]:bg[y,x]=True;q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<H and 0<=nx<W and not bg[ny,nx] and near[ny,nx]:bg[ny,nx]=True;q.append((ny,nx))
    return ~bg
def cut(img,fg,cid,lab,s,box):
    """hard object mask from the component, then a soft, colour-decontaminated edge so no paper fringe is left"""
    m=np.kron(lab==cid,np.ones((s,s),bool))[:fg.shape[0],:fg.shape[1]]
    near=np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(9)))>0
    hard=near&fg
    a=np.asarray(img.convert('RGB')).astype(float)
    paper=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3),a[:,:4].reshape(-1,3),a[:,-4:].reshape(-1,3)]),0)
    H8=Image.fromarray((hard*255).astype('uint8'))
    inner=np.asarray(H8.filter(ImageFilter.MinFilter(5)))>0
    outer=(np.asarray(H8.filter(ImageFilter.MaxFilter(3)))>0)&near
    d=np.abs(a-paper).sum(2)
    soft=np.clip((d-14)/(70-14),0,1)
    al=np.where(inner,1.0,np.where(outer,soft,0.0))
    al=np.asarray(Image.fromarray((al*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.5))).astype(float)/255
    al[inner]=1.0
    A=al[...,None];C=np.clip((a-(1-A)*paper)/np.maximum(A,.08),0,255)
    rgba=np.dstack([C,al*255]).astype('uint8')
    r=Image.fromarray(rgba,'RGBA');c=r.crop(box);bb=c.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox();return c.crop(bb)
if __name__=="__main__":
    out={}
    for i,pid in enumerate(IDS):
        n=f'{SRC}/0{i+1}'
        P1=Image.open(n+'-P1.png').convert('RGB');W,H=P1.size;ex={}
        for k,name in enumerate(EX):
            cx,cy=k%4,k//4;cell=P1.crop((cx*W//4,cy*H//3,(cx+1)*W//4,(cy+1)*H//3))
            fg=wmask(cell);comps,lab,s=components(fg,3000);c=max(comps,key=lambda t:t[5])
            im=cut(cell,fg,c[0],lab,s,(0,0)+cell.size);im=im.resize((300,round(300*im.size[1]/im.size[0])),Image.LANCZOS)
            ex[name]=uri(im,84)
        P2=Image.open(n+'-P2.png').convert('RGB');fg=wmask(P2);comps,lab,s=components(fg,8000)
        comps=sorted(sorted(comps,key=lambda t:-t[5])[:6],key=lambda t:t[2])
        assert len(comps)==6,(pid,len(comps))
        sc={}
        for name,c in zip(SC,comps):
            im=cut(P2,fg,c[0],lab,s,(max(0,c[2]-4),max(0,c[1]-4),c[4]+4,c[3]+4))
            hh=min(760,im.size[1]);im=im.resize((round(hh*im.size[0]/im.size[1]),hh),Image.LANCZOS);sc[name]=uri(im,84)
            im.save(f'{SRC}/../cut_{pid}_{name}.png')
        out[pid]={'exprs':ex,'looks':sc}
        print(pid,'ok')
    open(OUT,'w').write('window.AI_WOMEN='+json.dumps(out,separators=(',',':'))+';\n')
