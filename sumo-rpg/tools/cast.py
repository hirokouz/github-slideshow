from PIL import Image, ImageFilter
import numpy as np, base64, io, json, sys
from collections import deque
U='/root/.claude/uploads/c91d9805-8082-50d9-a1f6-f1711bc10942/'
def mask(img):
    a=np.asarray(img).astype(float);mx=a.max(2);mn=a.min(2);sat=(mx-mn)/(mx+1e-6)
    paper=np.median(np.concatenate([a[-5:].reshape(-1,3),a[:,-5:].reshape(-1,3)]),0)
    near=(np.abs(a-paper).sum(2)<40)|((a.mean(2)>215)&(sat<.13))
    H,W=near.shape;bg=np.zeros((H,W),bool);q=deque()
    for x in range(W):
        for y in (0,H-1):
            if near[y,x]:bg[y,x]=True;q.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if near[y,x] and not bg[y,x]:bg[y,x]=True;q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<H and 0<=nx<W and not bg[ny,nx] and near[ny,nx]:bg[ny,nx]=True;q.append((ny,nx))
    tight=np.abs(a-paper).sum(2)<24
    hole=tight&~bg;h2,w2=hole.shape;seen=np.zeros_like(hole)
    for y in range(0,h2):
        for x in range(0,w2):
            if hole[y,x] and not seen[y,x]:
                q=deque([(y,x)]);seen[y,x]=True;pts=[]
                while q:
                    cy,cx=q.popleft();pts.append((cy,cx))
                    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<h2 and 0<=nx<w2 and hole[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((ny,nx))
                if len(pts)>150:
                    for p in pts:bg[p]=True
    return ~bg
def components(fg,minarea):
    H,W=fg.shape;s=4;small=fg[::s,::s];h,w=small.shape
    lab=np.zeros((h,w),int);comps=[];cur=0
    for y in range(h):
        for x in range(w):
            if small[y,x] and not lab[y,x]:
                cur+=1;q=deque([(y,x)]);lab[y,x]=cur;pts=[]
                while q:
                    cy,cx=q.popleft();pts.append((cy,cx))
                    for dy in(-1,0,1):
                        for dx in(-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<h and 0<=nx<w and small[ny,nx] and not lab[ny,nx]:lab[ny,nx]=cur;q.append((ny,nx))
                if len(pts)*s*s>=minarea:
                    ys=[p[0] for p in pts];xs=[p[1] for p in pts]
                    comps.append((cur,min(ys)*s,min(xs)*s,(max(ys)+1)*s,(max(xs)+1)*s,len(pts)))
    return comps,lab,s
def extract(path,minarea=6000):
    img=Image.open(path).convert('RGB');fg=mask(img);comps,lab,s=components(fg,minarea)
    out=[]
    for cid,y0,x0,y1,x1,n in comps:
        m=np.kron(lab==cid,np.ones((s,s),bool))[:fg.shape[0],:fg.shape[1]]
        # grow the coarse mask a little, then intersect with the fine foreground
        mm=Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(9))
        fine=np.asarray(mm)>0
        al=(fine&fg)*255
        al=Image.fromarray(al.astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
        rgba=img.convert('RGBA');rgba.putalpha(al)
        pad=4;box=(max(0,x0-pad),max(0,y0-pad),min(img.size[0],x1+pad),min(img.size[1],y1+pad))
        c=rgba.crop(box);c=c.crop(c.getbbox())
        out.append(dict(img=c,box=box,cy=(y0+y1)/2,cx=(x0+x1)/2,bottom=box[1]+c.size[1]))
    return out
def uri(im,q=84):b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
