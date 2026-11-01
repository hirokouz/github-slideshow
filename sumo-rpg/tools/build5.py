import sys;sys.path.insert(0,'.')
from cast import *
import build3h as B3;poses10,bodies6,jpg=B3.poses10,B3.bodies6,B3.jpg
D=__import__('os').path.dirname(__file__) or '.'
SH='/tmp/claude-0/-home-user-github-slideshow/c91d9805-8082-50d9-a1f6-f1711bc10942/scratchpad/docx/sheets/'
def exprsA(path):
    A=Image.open(path).convert('RGB');a0=np.asarray(A).astype(float);paper=np.median(a0[-5:].reshape(-1,3),0)
    from PIL import ImageDraw;ImageDraw.Draw(A).rectangle((0,0,170,52),fill=tuple(int(v) for v in paper));a=np.asarray(A).astype(float)
    fg=(np.abs(a-paper).sum(2)>45);fg[:55,:260]=False
    def cell(r,c):
        x0,x1,y0,y1=c*384,(c+1)*384,r*341,(r+1)*341
        sub=fg[y0:y1,x0:x1];ys=np.where(sub.any(1))[0];xs=np.where(sub.any(0))[0]
        top=y0+ys.min();cx=x0+(xs.min()+xs.max())//2;S=300
        return A.crop((cx-S//2,max(0,top-10),cx+S//2,max(0,top-10)+S)).resize((256,256),Image.LANCZOS)
    return {'chon':{'normal':cell(0,0),'strain':cell(0,1),'happy':cell(0,2),'lose':cell(0,3),'blink':cell(2,1),'surprise':cell(2,3)},
            'oicho':{'normal':cell(1,0),'strain':cell(1,1),'happy':cell(1,2),'lose':cell(1,3),'blink':cell(2,2)},'zan':{'normal':cell(2,0)}}
def build(cid,name,num,mcol,build,skin,kgs):
    ex=exprsA(SH+num+'-A.png');bs=bodies6(SH+num+'-B.png')
    P={'slim':poses10(SH+num+'-C1.png'),'mid':poses10(SH+num+'-C2.png')}
    import os
    if os.path.exists(SH+num+'-D.png'):P['seki']=poses10(SH+num+'-D.png')
    print(cid,{k:len(v) for k,v in P.items()})
    exprs={h:{e:jpg(v) for e,v in d.items()} for h,d in ex.items()}
    pv=Image.new('RGB',(12*130,130));k=0
    for h in ex:
        for e in ex[h]:pv.paste(ex[h][e].resize((128,128)),(k*130,0));k+=1
    pv.save('pv_%s.png'%cid)
    return {'id':cid,'name':name,'src':exprs['chon']['normal'],'faces':{k:exprs[k]['normal'] for k in exprs},'exprs':exprs,
            'bodies':[uri(b.resize((b.size[0]*600//b.size[1],600),Image.LANCZOS)) for b in bs],'poses':P,'kgs':kgs,'mcol':mcol,'build':build,'skin':skin,'side':True,'cast':True}
C=[build('n2','爽やか系','02','#1f6f78','mid',1,[90,110,128]),build('n3','クール系','03','#202024','slim',0,[95,115,135]),
   build('n4','甘い系','04','#d48aa6','slim',0,[85,100,118]),build('n5','ワイルド系','05','#7a1f2a','heavy',2,[110,135,155])]
p='/home/user/github-slideshow/sumo-rpg/cast.js';js=open(p).read();i=js.index('[');arr=json.loads(js[i:js.rindex(']')+1])
ids={c['id'] for c in C};n1=[a for a in arr if a['id']=='n1'];rest=[a for a in arr if a['id'] not in ids and a['id']!='n1']
arr=n1+C+rest;open(p,'w').write(js[:i]+json.dumps(arr,ensure_ascii=False)+';\n');print(len(open(p).read())//1024,'KB',[a['id'] for a in arr])
