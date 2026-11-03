# Wrap the story/UI string literals of game.html in Tj('...') so English mode can swap them (dictionary in en2.js).
# Data tables (names, kimarite, prefectures, partners, ...) are left alone: their values are stored in saves and
# compared in the code; the on-screen layer in en.js translates them when shown.
# usage: python3 tools/i18n_wrap.py [--list out.json]
import re, sys, json, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));P=os.path.join(ROOT,'game.html')
s=open(P,encoding='utf8').read();i=s.index('<script>\n(()=>{');head,js=s[:i],s[i:]
J=re.compile('[぀-ヿ一-鿿]')
SKIP={'KM','HIWAZA','NAMES','OP_A','OP_B','PREFS','BASHO','VENUE','DIVS','SAN','KAN','STYLE','FACE_OPTS','INJ_PARTS','INJ_SEV','PARTNERS','TANIS','CARDS','ACH','ACTS','BANZUKE_GUIDE','DV','SHAPES','SKIN','MONTH','CAPS','KGMAX','START','AGE_START','RATES','TL','READY','FACE_FIT','EXMAP','GRADE_T','AUTO_LAB','AUTO_DEF','REC_T','AGE_DESC','TYPE_DESC','TANI_ACT','DATE_ACT','FAMILY_ACT','TANI_BYE','PERSONA','CG_LAB','OLD_DIVS','V2_DIVS','DSTART','STAT_LABEL','SCR','INJ_HIT','KM_NAMES'}
tstart=re.compile(r'^const ([A-Z_][A-Z0-9_]*)=[\[{]');lit=re.compile(r"'((?:[^'\\\n]|\\.)*)'")
out=[];intable=None;found=[]
for l in js.split('\n'):
    m=tstart.match(l)
    if m and m.group(1) in SKIP:intable=m.group(1)
    if intable:
        if re.search(r'(\]|\});?\s*$',l) and not l.rstrip().endswith(','):intable=None
        out.append(l);continue
    def rep(mm):
        x=mm.group(1);pre=mm.string[:mm.start()];post=mm.string[mm.end():]
        if not J.search(x) or '<' in x:return mm.group(0)
        if re.search(r'(Tj\(|===|!==|==|includes\(|indexOf\(|split\(|replace\(|startsWith\(|endsWith\(|getItem\(|setItem\()\s*$',pre):return mm.group(0)
        if re.match(r'\s*(===|!==|==|:)',post):return mm.group(0)
        found.append(x);return (" " if re.search(r"[A-Za-z0-9_$]$",pre) else "")+"Tj("+mm.group(0)+")"
    out.append(lit.sub(rep,l))
s2=head+'\n'.join(out)
if '--list' in sys.argv:
    seen=[];[seen.append(x) for x in found if x not in seen];json.dump(seen,open(sys.argv[sys.argv.index('--list')+1],'w'),ensure_ascii=False,indent=0)
open(P,'w',encoding='utf8').write(s2);print('wrapped',len(found))
