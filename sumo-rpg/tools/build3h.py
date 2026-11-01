import sys;sys.path.insert(0,'.')
from cast import *
from PIL import ImageDraw
I='/tmp/claude-0/-home-user-github-slideshow/c91d9805-8082-50d9-a1f6-f1711bc10942/images/'
def jpg(im):b=io.BytesIO();im.save(b,'JPEG',quality=86);return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
def poses10(path):
    o=extract(path);o.sort(key=lambda x:(x['cy']>540,x['cx']));o=[x for x in o if x['img'].size[1]>150]
    stand=o[0]['img'].size[1]
    return [dict(src=uri(x['img'].resize((max(1,x['img'].size[0]*300//stand),max(1,x['img'].size[1]*300//stand)),Image.LANCZOS)),h=round(x['img'].size[1]/stand,3)) for x in o]
def bodies6(path):
    img=Image.open(path).convert('RGB');fg=mask(img);fg[:60,:320]=False;fg[880:]=False
    col=fg[150:860].sum(0).astype(float);cuts=[0]
    for g in [256*k for k in range(1,6)]:
        w=col[g-45:g+45];cuts.append(g-45+int(np.argmin(w)))
    cuts.append(img.size[0]);out=[]
    for i in range(6):
        x0,x1=cuts[i],cuts[i+1];sub=Image.fromarray(np.asarray(img)[:,x0:x1]);f=fg[:,x0:x1]
        al=Image.fromarray((f*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
        r=sub.convert('RGBA');r.putalpha(al);out.append(r.crop(r.getbbox()))
    return out
def exprsA(path,cols,rows):
    A=Image.open(path).convert('RGB');ImageDraw.Draw(A).rectangle((0,0,200,50),fill=A.getpixel((700,10)))
    def cell(r,c):x=cols[c];y=rows[r];return A.crop((x-150,y,x+150,y+300)).resize((256,256),Image.LANCZOS)
    ex={'chon':{'normal':cell(0,0),'strain':cell(0,1),'happy':cell(0,2),'lose':cell(0,3),'blink':cell(2,1),'surprise':cell(2,3)},
        'oicho':{'normal':cell(1,0),'strain':cell(1,1),'happy':cell(1,2),'lose':cell(1,3),'blink':cell(2,2)},'zan':{'normal':cell(2,0)}}
    return ex
