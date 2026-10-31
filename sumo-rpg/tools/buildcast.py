import sys;sys.path.insert(0,'.')
from cast import *
def paper_sq(rgba,size=256,bgc=(243,234,214)):
    w,h=rgba.size;s=size/max(w,h);r=rgba.resize((round(w*s),round(h*s)),Image.LANCZOS)
    o=Image.new('RGBA',(size,size),bgc+(255,));o.alpha_composite(r,((size-r.size[0])//2,(size-r.size[1])//2));return o.convert('RGB')
def jpg(im):b=io.BytesIO();im.save(b,'JPEG',quality=86);return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
def build(n,name,files,mcol,build,skin):
    f0,fB,fC,fD=[U+f for f in files]
    s0=Image.open(f0).convert('RGB');chon=s0.crop((150,18,450,318)).resize((256,256),Image.LANCZOS)
    img=Image.open(fB).convert('RGB');fg=mask(img);fg[:60,:300]=False
    col=fg[150:900].sum(0).astype(float);cuts=[0]
    for g in [256*k for k in range(1,6)]:
        w=col[g-45:g+45];cuts.append(g-45+int(np.argmin(w)))
    cuts.append(img.size[0]);bodies=[]
    for i in range(6):
        x0,x1=cuts[i],cuts[i+1];sub=Image.fromarray(np.asarray(img)[:,x0:x1]);f=fg[:,x0:x1]
        al=Image.fromarray((f*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
        r=sub.convert('RGBA');r.putalpha(al);bodies.append(r.crop(r.getbbox()))
    def head(b):w,h=b.size;return paper_sq(b.crop((int(w*.2),0,int(w*.8),int(h*.27))))
    zan=head(bodies[0]);oicho=head(bodies[3])
    poses={}
    for tag,f in (('low',fC),('seki',fD)):
        o=extract(f);o.sort(key=lambda x:(x['cy']>560,x['cx']))
        o=[x for x in o if x['img'].size[1]>150][:7]
        base=max(x['bottom'] for x in o[:4]),max(x['bottom'] for x in o[4:])
        stand=o[0]['img'].size[1]
        poses[tag]=[dict(src=uri(x['img'].resize((max(1,x['img'].size[0]*300//stand),max(1,x['img'].size[1]*300//stand)),Image.LANCZOS)),
                         h=round(x['img'].size[1]/stand,3)) for x in o]
    return {'id':'n%d'%n,'name':name,'src':jpg(chon),'faces':{'chon':jpg(chon),'zan':jpg(zan),'oicho':jpg(oicho)},
            'bodies':[uri(b.resize((b.size[0]*600//b.size[1],600),Image.LANCZOS)) for b in bodies],
            'poses':poses,'mcol':mcol,'build':build,'skin':skin,'side':True,'cast':True}
if __name__=='__main__':
    c=build(1,'王道イケメン',['c395bb8c-image.png','2e5a2001-image.png','a3b2d4a3-image.png','69d938ad-image.png'],'#22305e','mid',0)
    js='/* new cast drawn by the owner with ChatGPT: per-rank faces, bodies and bout poses */\nwindow.AI_CAST=[ '+json.dumps(c,ensure_ascii=False)+' ];\n'
    open('/home/user/github-slideshow/sumo-rpg/cast.js','w').write(js);print(len(js)//1024,'KB',[p['h'] for p in c['poses']['low']])
    # preview
    def L(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
    pv=Image.new('RGBA',(14*150,520),(30,40,70,255))
    for i,p in enumerate(c['poses']['low']+c['poses']['seki']):
        im=L(p['src']);pv.alpha_composite(im.resize((im.size[0]*240//300,im.size[1]*240//300)),((i%7)*300,(i//7)*260))
    for i,k in enumerate(['chon','zan','oicho']):pv.alpha_composite(L(c['faces'][k]).resize((140,140)),(2100-160*(3-i),370))
    pv.save('n1prev.png')
