import sys;sys.path.insert(0,'.')
from cast import *
from PIL import ImageDraw
def jpg(im):b=io.BytesIO();im.save(b,'JPEG',quality=86);return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
def build(cid,name,fA,fB,fC,fD,mcol,build,skin,acols,arows):
    img=Image.open(U+fB).convert('RGB');fg=mask(img);fg[:60,:320]=False;fg[760:]=False
    col=fg[150:740].sum(0).astype(float);cuts=[0]
    for g in [256*k for k in range(1,6)]:
        w=col[g-45:g+45];cuts.append(g-45+int(np.argmin(w)))
    cuts.append(img.size[0]);bodies=[]
    for i in range(6):
        x0,x1=cuts[i],cuts[i+1];sub=Image.fromarray(np.asarray(img)[:,x0:x1]);f=fg[:,x0:x1]
        al=Image.fromarray((f*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
        r=sub.convert('RGBA');r.putalpha(al);bodies.append(r.crop(r.getbbox()))
    poses={}
    for tag,f in (('low',fC),('seki',fD)):
        o=extract(U+f);o.sort(key=lambda x:(x['cy']>560,x['cx']));o=[x for x in o if x['img'].size[1]>150][:7]
        stand=o[0]['img'].size[1]
        poses[tag]=[dict(src=uri(x['img'].resize((max(1,x['img'].size[0]*300//stand),max(1,x['img'].size[1]*300//stand)),Image.LANCZOS)),h=round(x['img'].size[1]/stand,3)) for x in o]
    A=Image.open(U+fA).convert('RGB');ImageDraw.Draw(A).rectangle((0,0,200,50),fill=A.getpixel((700,10)))
    def cell(r,c):x=acols[c];y=arows[r];return A.crop((x-136,y,x+136,y+272)).resize((256,256),Image.LANCZOS)
    ex={'chon':{'normal':cell(0,0),'strain':cell(0,1),'happy':cell(0,2),'lose':cell(0,3),'blink':cell(2,1),'surprise':cell(2,3)},
        'oicho':{'normal':cell(1,0),'strain':cell(1,1),'happy':cell(1,2),'lose':cell(1,3),'blink':cell(2,2)},'zan':{'normal':cell(2,0)}}
    exprs={h:{e:jpg(v) for e,v in d.items()} for h,d in ex.items()}
    pv=Image.new('RGBA',(12*130+7*130,560),(30,40,70,255));k=0
    for h in ex:
        for e in ex[h]:pv.paste(ex[h][e].resize((128,128)),(k*130,0));k+=1
    for i,b in enumerate(bodies):pv.alpha_composite(b.resize((b.size[0]*200//b.size[1],200)),(i*130,140))
    def L(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
    for i,p in enumerate(poses['low']+poses['seki']):im=L(p['src']);pv.alpha_composite(im.resize((im.size[0]*180//300,im.size[1]*180//300)),((i%7)*190+800,(i//7)*190+150 if i<7 else 360))
    pv.save('prev_%s.png'%cid)
    return {'id':cid,'name':name,'src':exprs['chon']['normal'],'faces':{k:exprs[k]['normal'] for k in exprs},'exprs':exprs,
            'bodies':[uri(b.resize((b.size[0]*600//b.size[1],600),Image.LANCZOS)) for b in bodies],'poses':poses,'mcol':mcol,'build':build,'skin':skin,'side':True,'cast':True}
c=build('n2','爽やか系','6f49af1c-image.png','a4655418-image.png','fb017702-image.png','0fbf4f25-image.png','#1f6f78','mid',1,
        [215,585,949,1320],[22,338,655])
p='/home/user/github-slideshow/sumo-rpg/cast.js';js=open(p).read();i=js.index('[');arr=json.loads(js[i:js.rindex(']')+1])
arr=[a for a in arr if a['id']!='n2']+[c];open(p,'w').write(js[:i]+json.dumps(arr,ensure_ascii=False)+';\n');print(len(open(p).read())//1024,'KB')
