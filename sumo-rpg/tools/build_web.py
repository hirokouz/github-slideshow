# Build the public release folder sumo-rpg/web/ (upload this folder to any static host).
# usage: python3 tools/build_web.py [https://your-site.example/]   (site URL makes share previews work)
# live site: https://yokozuna.j2prco.workers.dev/
import sys, shutil, json, os, zipfile
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));WEB=os.path.join(ROOT,'web')
site=(sys.argv[1].rstrip('/')+'/') if len(sys.argv)>1 else ''
html=open(os.path.join(ROOT,'index.html'),encoding='utf-8').read()
html=html.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
desc='序ノ口の新弟子から、稽古と本場所で番付を上げていく相撲育成RPG。めざすは綱を締めるその日。'
meta=f'''<title>横綱への道</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0d1430">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="横綱への道">
<meta property="og:type" content="website">
<meta property="og:title" content="横綱への道">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{site}og-image.jpg">
{f'<meta property="og:url" content="{site}">' if site else ''}
<meta name="twitter:card" content="summary_large_image">'''
assert html.count('<title>横綱への道</title>')==1
html=html.replace('<title>横綱への道</title>',meta)
open(os.path.join(WEB,'index.html'),'w',encoding='utf-8').write(html)
for f in ['cast.js','faces.js','women.js','tani.js','title.webp']:shutil.copy(os.path.join(ROOT,f),os.path.join(WEB,f))
json.dump({'name':'横綱への道','short_name':'横綱への道','start_url':'./','display':'standalone','orientation':'portrait',
  'background_color':'#0d1430','theme_color':'#0d1430','lang':'ja',
  'icons':[{'src':'icon-192.png','sizes':'192x192','type':'image/png'},{'src':'icon-512.png','sizes':'512x512','type':'image/png'}]},
  open(os.path.join(WEB,'manifest.webmanifest'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
# cache the big art files for a day on hosts that read _headers (Cloudflare Pages / Netlify)
open(os.path.join(WEB,'_headers'),'w').write('/*.js\n  Cache-Control: public, max-age=86400\n/*.png\n  Cache-Control: public, max-age=604800\n')
z=os.path.join(ROOT,'yokozuna-web.zip')
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as zz:
    for f in sorted(os.listdir(WEB)):zz.write(os.path.join(WEB,f),f)
print('built',WEB,'and',z,round(os.path.getsize(z)/1e6,1),'MB')
