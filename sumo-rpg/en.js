/* English mode for 横綱への道. The game shows Japanese text; when English is on, every piece of text is passed
   through I18N_EN.tr() as it reaches the screen (DOM text, attributes and canvas text).
   x: exact strings / g: glossary of terms used to translate short composed strings / R: templates with numbers or names.
   Anything not covered stays Japanese (long story text is translated in later passes). */
(()=>{
const J=/[぀-ヿ㐀-鿿！-～]/;
/* ---------- kanji numerals (banzuke ranks are written 十六枚目 etc.) ---------- */
const KD={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
function kan(s){if(/^\d+$/.test(s))return +s;let n=0,cur=0;for(const c of s){if(c==='百'){n+=(cur||1)*100;cur=0;}else if(c==='十'){n+=(cur||1)*10;cur=0;}else if(KD[c])cur=KD[c];else return NaN;}return n+cur;}
/* ---------- names ---------- */
const NAME={'若葉山':'Wakabayama','蒼龍':'Sōryū','春風':'Harukaze','剛ノ峰':'Gōnomine','錦川':'Nishikigawa','翔嵐':'Shōran','雷光':'Raikō','嶺乃海':'Reinoumi','大鷲':'Ōwashi','風早':'Kazehaya',
  '遥':'Haruka','綾乃':'Ayano','真緒':'Mao','千夏':'Chinatsu','紗季':'Saki','奈央子':'Naoko','天嶺':'Tenrei','鬼瓦':'Onigawara','剛ノ嶺':'Gōnomine','舞鶴':'Maizuru','佐伯':'Saeki','大鍋':'Ōnabe','小太郎':'Kotarō','結':'Yui','岩見':'Iwami','響':'Hibiki'};
const NA={'白波':'Shiranami','若':'Waka','大':'Ō','海':'Kai','風':'Kaze','雷':'Rai','錦':'Nishiki','春':'Haru','剛':'Gō','嶺':'Mine','蒼':'Ao','翔':'Shō','鷹':'Taka','雲':'Kumo'};
const NB={'富士':'fuji','ノ花':'nohana','山':'yama','海':'umi','川':'gawa','嵐':'arashi','浪':'nami','桜':'zakura','丸':'maru','龍':'ryū','錦':'nishiki','国':'kuni','里':'sato','岳':'dake'};
function nameEN(n){if(NAME[n])return NAME[n];for(const a of Object.keys(NA).sort((x,y)=>y.length-x.length))if(n.startsWith(a)){const b=n.slice(a.length);if(NB[b]){let r=NA[a]+NB[b];return r[0].toUpperCase()+r.slice(1);}}return null;}
/* ---------- glossary (longest first when applied) ---------- */
const G={
  // divisions & ranks
  '前相撲':'Maezumo','序ノ口':'Jonokuchi','序二段':'Jonidan','三段目':'Sandanme','幕下':'Makushita','十両':'Jūryō','前頭':'Maegashira','幕内':'Makuuchi',
  '小結':'Komusubi','関脇':'Sekiwake','大関':'Ōzeki','横綱':'Yokozuna','三役':'Sanyaku','関取':'Sekitori','新弟子':'recruit','平幕':'rank-and-file',
  // basho & places
  '初場所':'Hatsu Basho','春場所':'Haru Basho','夏場所':'Natsu Basho','名古屋場所':'Nagoya Basho','秋場所':'Aki Basho','九州場所':'Kyūshū Basho',
  '東京・両国国技館':'Tokyo (Ryōgoku Kokugikan)','両国国技館':'Ryōgoku Kokugikan','大阪':'Osaka','名古屋':'Nagoya','福岡':'Fukuoka',
  // stats
  '押し':'Push','力':'Power','技':'Skill','速さ':'Speed','体重':'Weight','疲れ':'Fatigue',
  // misc short terms
  '勝ち越し':'kachi-koshi','負け越し':'make-koshi','優勝':'championship','千秋楽':'senshūraku','ご祝儀':'Prize money','タニマチ':'Tanimachi','宿敵':'Rival',
  '稽古の伸び':'training gains ','取組の力':'bout power ','相撲教習所':'Sumo school','あいつには負けない':'I won\'t lose to him','けがのしにくさ':'injury resistance ','休場':'withdrawn','負傷':'injured','場所':'basho',
  // prefectures
  '北海道':'Hokkaidō','青森':'Aomori','秋田':'Akita','岩手':'Iwate','山形':'Yamagata','宮城':'Miyagi','福島':'Fukushima','茨城':'Ibaraki','栃木':'Tochigi','群馬':'Gunma','埼玉':'Saitama','千葉':'Chiba','東京':'Tokyo','神奈川':'Kanagawa',
  '新潟':'Niigata','富山':'Toyama','石川':'Ishikawa','福井':'Fukui','山梨':'Yamanashi','長野':'Nagano','岐阜':'Gifu','静岡':'Shizuoka','愛知':'Aichi','三重':'Mie','滋賀':'Shiga','京都':'Kyoto','兵庫':'Hyōgo','奈良':'Nara','和歌山':'Wakayama',
  '鳥取':'Tottori','島根':'Shimane','岡山':'Okayama','広島':'Hiroshima','山口':'Yamaguchi','徳島':'Tokushima','香川':'Kagawa','愛媛':'Ehime','高知':'Kōchi','佐賀':'Saga','長崎':'Nagasaki','熊本':'Kumamoto','大分':'Ōita','宮崎':'Miyazaki','鹿児島':'Kagoshima','沖縄':'Okinawa','モンゴル':'Mongolia',
};
const DIVJ='前相撲|序ノ口|序二段|三段目|幕下|十両|前頭';
/* ---------- exact strings ---------- */
const X={
  // title / create
  '横綱への道':'Road to Yokozuna','序ノ口の新弟子から、稽古と本場所で番付を上げていく。':'Start as a Jonokuchi recruit and climb the banzuke through training and tournaments.','めざすは綱を締めるその日。':'Aim for the day you tie the rope.',
  '部屋の力士':'Rikishi in the stable','新弟子として入門する':'Join as a new recruit','新しい力士を入門させる':'Recruit a new rikishi','ご祝儀':'Prize money','ご祝儀ガチャ':'Prize-money gacha','殿堂（引退した力士たち）':'Hall of fame (retired rikishi)',
  '実績（部屋の歴代）':'Achievements (all-time)','データをすべて消して最初から':'Erase all data and start over','稽古は1場所ごとに5回。幕下以下は7番、十両から上は15番。勝ち越せば番付が上がる。':'5 training sessions per basho. 7 bouts up to Makushita, 15 from Jūryō. A winning record moves you up.',
  'まだいない。幕内まで上がった力士は、引退すると親方になって部屋の格が上がる。':'None yet. A rikishi who reached Makuuchi becomes a stablemaster on retiring and raises the stable\'s standing.',
  '入門届　しこ名':'Entry form — Shikona','おまかせ':'Random','力士を選ぶ（新弟子）':'Choose your rikishi','イラストから選ぶ':'Pick an illustration','パーツで作る':'Build from parts','入門の年齢':'Age at entry',
  '15歳':'15','中学卒業':'After junior high','18歳':'18','高校卒業':'After high school','22歳':'22','大学卒業':'After university','体つき':'Build','押し相撲':'Pusher','四つ相撲':'Belt fighter','技能派':'Technician','入門する':'Join the stable',
  'はじめの能力は低いが、伸びしろは最大。長く強くなれる。':'Weak at first but the most room to grow. Can stay strong for a long time.','体ができていて能力やや高め。伸びもまずまず。':'Already built, a little stronger. Grows reasonably well.','即戦力で三段目付出デビュー。ただし伸びは早く止まる。':'Ready now — debuts in Sandanme. But growth stops early.',
  '押しが強い。前に出て一気に勝負。':'Strong pushing. Drives forward to settle it fast.','力が強く体も大きい。まわしを取って寄る。':'Strong and big. Grabs the belt and drives out.','小柄で素早い。技とスピードでかわす。':'Small and quick. Evades with skill and speed.',
  '出身地':'Hometown','しこ名':'Shikona','顔のプレビュー':'Face preview','輪郭':'Face','眉':'Brows','目':'Eyes','鼻':'Nose','口':'Mouth','特徴':'Feature','肌':'Skin',
  'シャープ':'Sharp','たまご':'Oval','精悍':'Rugged','やさしげ':'Gentle','凛々しい':'Bold','細め':'Thin','太眉':'Thick','きりり':'Sharp','切れ長':'Narrow','ぱっちり二重':'Big','涼しげ':'Cool','甘いたれ目':'Droopy',
  'すっと高い':'High','通った鼻筋':'Straight','小鼻':'Small','微笑み':'Smile','引き締め':'Firm','口角上げ':'Grin','ふっくら':'Full','なし':'None','もみあげ':'Sideburns','無精ひげ':'Stubble','泣きぼくろ':'Beauty mark',
  '色白':'Fair','うす小麦':'Light tan','小麦':'Tan','日焼け':'Dark tan',
  // home
  '東':'East','西':'West','体と技':'Body & skills','？ 遊び方':'? How to play','遊び方を見る':'How to play','本場所へ':'To the basho','星取':'Record','記録':'History','カード':'Cards','ガチャ':'Gacha','力士':'Rikishi','道具':'Items','オート':'Auto',
  '閉じる':'Close','部屋の話':'Stable news','実績':'Achievements','付けたカードの効果が、稽古と取組に効く（3枚まで）。':'Equipped cards boost training and bouts (up to 3).','いま効いている出来事':'Active effects','最高位':'Best rank','あなたの力士':'Your rikishi',
  '音を鳴らす':'Sound on','BGMと効果音（スマホは画面を一度タップすると鳴り始めます）':'Music & effects (on phones, tap the screen once to start)','BGMの音量':'Music volume','効果音の音量':'Effects volume','音の設定':'Sound','音・言語の設定':'Sound & language','音のオンオフ':'Sound on/off','タップで音が鳴る':'Tap for sound','音 ON':'Sound ON','音 OFF':'Sound OFF',
  'オートで育成を進めます。止めたいタイミングを選んでください（いくつでも）。':'Auto plays for you. Choose when it should stop (any number).','昇進したら':'On promotion','優勝したら':'On a championship','恋愛・結婚':'Romance','告白・プロポーズなど':'Confessions, proposals…','全イベント':'Every event','タニマチ・教習所も':'Patrons, school too','年末の帰省':'Year-end trip home','けがをしたら':'On injury','場所数で止める':'Stop after','1場所':'1 basho','3場所':'3 basho','1年':'1 year','この設定でオート開始':'Start auto','オート中':'Auto','ふつう':'Normal','速い':'Fast','停止':'Stop','スキップ':'Skip','次へ':'Next','続ける':'Continue','はじめる':'Start',
  '道具は、ガチャで引いた力士本人の持ち物。使うとこの力士の能力が上がる。引退すると消える（二代目の息子には受け継がれる）。':'Items belong to the rikishi who drew them. Using one raises his stats. They vanish when he retires (his son inherits them).',
  '道具はまだない。ご祝儀ガチャで「秘伝書」「極意書」が出ることがある。':'No items yet. Secret and master scrolls can come from the prize-money gacha.',
  '付けたいカードを選ぶ。カードは部屋で共有。ガチャで増やせる。':'Pick cards to equip. Cards are shared by the stable; get more from the gacha.','＋ 空き':'+ Empty','おすすめ':'Recommended','まだ持っていない':'Not owned yet',
  '四股':'Shiko','てっぽう':'Teppō','すり足':'Suriashi','申し合い':'Sparring','ちゃんこ':'Chanko','休む':'Rest','会食':'Dinner','デート':'Date','家族サービス':'Family time',
  '力↑　疲+12':'Power↑ Fat+12','押し↑　疲+12':'Push↑ Fat+12','速さ↑　疲+10':'Speed↑ Fat+10','技↑↑力↑ 疲+18':'Skill↑↑ Power↑ Fat+18','体重+3kg 疲−12':'Weight+3kg Fat−12','疲−35 けが回復':'Fat−35, heals','祝儀↑体重↑ 疲+5':'Money↑ Weight↑ Fat+5','親密度↑ 疲−12':'Affection↑ Fat−12','絆↑　疲−20':'Bond↑ Fat−20',
  '力が上がる　疲れ+12':'Raises power. Fatigue +12','押しが上がる　疲れ+12':'Raises push. Fatigue +12','速さが上がる　疲れ+10':'Raises speed. Fatigue +10','技↑↑ 力↑　疲れ+18':'Skill↑↑ power↑. Fatigue +18','体重+3kg　疲れ−12':'Weight +3kg. Fatigue −12','疲れ−35　けがが治る':'Fatigue −35. Heals injuries',
  '目標':'Goal','番付':'Rank','出身':'From','人柄':'Personality','出会い':'How we met','結婚すると':'If married','妻の支え':'Her support','子ども':'Child','住まい':'Home','仲のよさ':'Affection','付き合い':'Known for','支え':'Support','取り口':'Style','対戦成績':'Head-to-head','顔':'Face','全身':'Full body',
  'ふだん着':'Everyday','お出かけ着':'Going out','秋冬の私服':'Autumn/winter','夏祭り（浴衣）':'Summer festival (yukata)','家で':'At home','結婚式（白無垢）':'Wedding (shiromuku)','披露宴（ドレス）':'Reception (dress)','子どもと':'With our child','正装':'Formal','前の絵':'Previous','次の絵':'Next',
  '話している人のプロフィール':'Profile of the speaker','力士プロフィール':'Rikishi profile','タニマチ（後援者）':'Tanimachi (patron)','宿敵（同じ日に入門）':'Rival (joined the same day)','押し相撲':'Pusher','技の相撲':'Technician',
  '気になる人':'Crush','恋人':'Girlfriend','婚約者':'Fiancée','妻':'Wife','知り合い':'Acquaintance','交際中':'Dating','婚約中':'Engaged','家族':'Family','1年たらず':'Under a year',
  'よく顔を出している':'You visit often','しばらく会っていない':'Haven\'t seen him lately','「顔を見せんな」と言われている。会食に行こう':'"You never show your face" — go to a dinner','毎場所ご祝儀をくれる（勝ち越すと満額）':'Gives prize money every basho (full amount with a winning record)',
  '部屋を出て一緒に暮らしている':'Living together outside the stable','力士は部屋暮らし（関取になったら一緒に暮らせる）':'Rikishi live in the stable (together once he is sekitori)','ひとり（すくすく育っている）':'One (growing fast)',
  // gacha
  '稽古場へ':'To the training room','もどる':'Back','勝ち星・勝ち越し・優勝でご祝儀がたまる。カードは部屋のみんなで共有。同じカードが出ると強くなる（最大★5）。':'Wins, winning records and titles earn prize money. Cards are shared by the stable; duplicates power them up (max ★5).',
  '1回引く（100）':'Draw 1 (100)','10連（900）':'Draw 10 (900)','カード図鑑':'Card book','道具（秘伝書・極意書）':'Items (scrolls)','引いた力士の持ち物になる':'Belongs to the rikishi who drew it','今の力士の持ち物になる（ホームの「道具」から使う）':'Goes to your current rikishi (use it from Items at home)',
  '提供割合　SSR 3%・SR 12%・R 35%・N 50%　／　10連は1枚以上SR以上確定　／　部屋（ホーム）から引くと、SRとSSRの中に能力のランクを上げる「秘伝書」「極意書」も入っている':'Rates: SSR 3% · SR 12% · R 35% · N 50% / 10-draw guarantees SR or better / Drawing from home, SR and SSR also include scrolls that raise a stat rank',
  // bout
  '初日':'Day 1','対':'vs','押しは四つに、四つは技に、技は押しに強い':'Push beats belt, belt beats skill, skill beats push','四つ':'Belt','押し・体重':'Push · weight','力・体重':'Power · weight','技・速さ':'Skill · speed','作戦は相性で自動':'Auto-pick tactics','取組ミニゲーム':'Bout mini-games',
  '立つ！':'Charge!','白い輪が金の輪に重なった瞬間に立つ。早すぎると「待った」':'Charge when the white ring meets the gold ring. Too early is a false start.','次の一番へ':'Next bout','残りの取組をおまかせで取る':'Auto-play the remaining bouts','場所を終える':'End the basho','取組中…':'Bout in progress…',
  '待った':'False start!','突っ張り！ 3秒間ひたすら連打！':'Thrust! Tap like mad for 3 seconds!','突っ張る！':'Thrust!','針が緑に来たら「寄る！」（3回）':'Tap "Drive!" when the needle hits green (3 times)','寄る！':'Drive!','矢印が出たら、同じ向きを押していなす（3回）':'When an arrow shows, tap the same direction to sidestep (3 times)','◀ いなす':'◀ Dodge','いなす ▶':'Dodge ▶',
  '土俵際！ 連打で残せ！':'At the edge! Tap to hold on!','残せ！！':'Hold!!','早い！':'Too early!','よし！':'Good!','ミス':'Miss','鋭い！':'Sharp!','立ち遅れ…':'Slow start…','はっけよい':'Hakkeyoi','のこった！':'Nokotta!','座布団が舞う！':'Cushions fly!','珍しい決まり手！':'A rare kimarite!',
  '突っ張りで圧倒':'Overwhelmed with thrusts','寄りが決まった':'Drove him out','見事ないなし':'A fine sidestep','突っ張り負け':'Out-thrust','寄り負け':'Driven out','いなし損ね':'Missed the sidestep','土俵際で逆転！':'Turned it around at the edge!','土俵際で残せず':'Couldn\'t hold at the edge',
  '鋭い立ち合い':'Sharp tachiai','相性で有利':'Good matchup','地力で圧倒':'Pure strength','格上を破った':'Beat a higher rank','立ち遅れ':'Slow tachiai','力の差':'Strength gap','まさかの取りこぼし':'A shock upset','紙一重':'By a hair','有利':'Advantage','互角':'Even','不利':'Disadvantage',
  'この相手とは初対戦':'First meeting with this opponent','宿敵との対戦':'Bout against your rival','新弟子':'Recruit','ケガのため途中休場':'Withdrew mid-basho with an injury','千秋楽 結びの一番、横綱決戦！ 勝ったほうが優勝だ':'Senshūraku, the final bout — a Yokozuna showdown! The winner takes the title','千秋楽 結びの一番、東西横綱の対決':'Senshūraku, the final bout — East vs West Yokozuna',
  '金星！ 横綱を破った（ご祝儀 +100）':'Kinboshi! You beat a Yokozuna (prize money +100)','30連勝！':'30 straight wins!','50連勝！ 記者が部屋に押しかけている':'50 straight wins! Reporters are crowding the stable','63連勝！ 歴代2位の記録に並んだ':'63 straight wins! Level with the 2nd-best ever','69連勝！ 双葉山の不滅の大記録に並んだ':'69 straight wins! Level with Futabayama\'s immortal record','70連勝！ ついに双葉山の69連勝を超えた！':'70 straight wins! You finally passed Futabayama\'s 69!',
  // result
  '勝ち越し':'Kachi-koshi','負け越し':'Make-koshi','番付発表':'New banzuke','部屋に帰る':'Back to the stable','部屋に戻る':'Back to the stable','★ 自己最高位 ★':'★ Career-best rank ★','幕内優勝':'Makuuchi championship','全勝':'Perfect record',
  // stable / misc
  '親方':'Stablemaster','親方「大学で鍛えた体だ。三段目付出から一気に駆け上がれ」':'Stablemaster: "You built that body in university. Start in Sandanme and charge up the ranks."','親方「高校相撲の経験を生かせ。まずは序ノ口で勝ち越しだ」':'Stablemaster: "Use your high-school sumo. First, a winning record in Jonokuchi."','「受けて立つ」':'"Bring it on"','帰省':'Trip home','新年、部屋に戻る':'New year — back to the stable','相撲教習所':'Sumo school','引退する':'Retire','土俵':'Dohyō','呼出':'Yobidashi','兄弟子':'Senior','後援者':'Patron','ファン':'Fan','同期':'Classmate','付け人':'Attendant','床山':'Hairdresser','トレーナー':'Trainer','裏方':'Staff',
  '番付（力士の位）は下から順にこうなっている。':'The banzuke (ranking) goes like this, from the bottom.','7番（十両からは15番）取って、勝ち越せば上がり、負け越せば下がる。めざすは一番上の横綱だ。':'Fight 7 bouts (15 from Jūryō). A winning record moves you up, a losing one down. Aim for Yokozuna at the very top.',
  'いちばん下。新弟子はここから（前相撲で勝つと載る）':'The bottom. Recruits start here (listed after winning in maezumo)','いちばん人数が多い段':'The biggest division','ここまでは浴衣に下駄':'Up to here: yukata and geta','十両の一歩手前。上位は厳しい':'One step from Jūryō. The top is tough',
  '「関取」。大銀杏を結い、給料が出て、取組は15番':'"Sekitori": the ōichō-mage topknot, a salary, 15 bouts','前頭。テレビで見る土俵':'Maegashira. The dohyō you see on TV','三役のはじまり':'The start of sanyaku','大関とりを狙う地位':'The rank to aim for Ōzeki from','横綱の一歩手前':'One step from Yokozuna','最高位。綱を締めて土俵入り':'The top. Wears the rope for the ring entry',
  '国技館の土俵に立つ力士たち':'Rikishi on the Kokugikan dohyō','場所を終えた力士の立ち姿':'A rikishi after the basho','実家の窓あかり':'Light in the window back home',
  // tutorial
  '本場所では毎日1番ずつ取組がある。\n作戦を選んで立ち合い、そのあと作戦ごとの勝負（押しは連打、四つはタイミング、技は反応）。\n負けそうでも土俵際で連打すれば逆転できる。\n勝ち越せば番付が上がり、負け越せば下がる。':'In a basho you fight one bout a day.\nPick a tactic and charge, then win the tactic\'s mini-game (push: tap fast, belt: timing, skill: reflexes).\nEven when losing, tapping at the edge can turn it around.\nA winning record moves you up the banzuke, a losing one down.',
  '稽古はこの6つから選ぶ。\n・四股 → 力が上がる\n・てっぽう → 押しが上がる\n・すり足 → 速さが上がる\n・申し合い → 技がよく上がる（力も少し）\n・ちゃんこ → 体重が増える（重いほど押されにくい）\n・休む → 疲れが取れる。けがも治る':'Choose training from these 6.\n· Shiko → power\n· Teppō → push\n· Suriashi → speed\n· Sparring → lots of skill (a little power)\n· Chanko → weight (heavier is harder to push)\n· Rest → removes fatigue and heals injuries',
  '稽古をすると「疲れ」がたまる。\n疲れが多いと伸びが悪くなり、けがもしやすい。\n疲れが60をこえたら「休む」か「ちゃんこ」で回復しろ。':'Training builds "fatigue".\nWith a lot of fatigue you grow less and get hurt more easily.\nOver 60, recover with "Rest" or "Chanko".',
  '稽古は1場所につき5回。\nこの丸が全部うまったら、本場所に出る。':'5 training sessions per basho.\nWhen all the boxes fill, you go to the basho.',
  'これがおまえの「体と技」だ。\n押し・力・技・速さの4つと、体重、疲れ。\n取組の強さは、この合計で決まる。':'These are your "body & skills".\nPush, power, skill, speed, plus weight and fatigue.\nYour strength in a bout comes from all of them together.',
  '忙しいときは「オート」で進められる。\nどこで止めるかも選べるぞ。\n遊び方は「？ 遊び方」でいつでも見られる。さあ、稽古だ！':'When you\'re busy, "Auto" plays for you.\nYou can choose where it stops.\n"? How to play" shows this again any time. Now, train!',
  '迷ったら、おまえは押し相撲だから「てっぽう」を中心に押しをのばせ。\n序盤は「ちゃんこ」で体重を増やすのも大事だ。':'If unsure: you\'re a pusher, so build push with "Teppō".\nEarly on, gaining weight with "Chanko" matters too.',
  '迷ったら、おまえは四つ相撲だから「四股」で力をのばせ。\n序盤は「ちゃんこ」で体重を増やすのも大事だ。':'If unsure: you\'re a belt fighter, so build power with "Shiko".\nEarly on, gaining weight with "Chanko" matters too.',
  '迷ったら、おまえは技能派だから「申し合い」で技をのばせ。\n体重は増やしすぎず、すり足で速さも磨け。':'If unsure: you\'re a technician, so build skill with "Sparring".\nDon\'t put on too much weight; sharpen speed with "Suriashi".',
  // injuries
  '膝':'Knee','腰':'Back','肩':'Shoulder','足首':'Ankle','右手の指':'Right fingers','肘':'Elbow','軽傷':'minor','中傷':'moderate','重傷':'serious',
};
/* cards, achievements, kimarite: tables of [ja, en] */
const T2=[
 // cards
 ['元横綱 天嶺','Former Yokozuna Tenrei'],['名伯楽 鬼瓦親方','Master trainer Onigawara'],['大タニマチ 銀座の女将','Grand patron, the Ginza okami'],['兄弟子 剛ノ嶺','Senior Gōnomine'],['技能派の兄弟子 舞鶴','Technician senior Maizuru'],['トレーナー 佐伯','Trainer Saeki'],['ちゃんこ番 大鍋','Chanko cook Ōnabe'],
 ['付け人 小太郎','Attendant Kotarō'],['床山 結','Hairdresser Yui'],['後援会長','Supporters\' club chief'],['部屋の先輩 岩見','Stable senior Iwami'],['呼出 響','Yobidashi Hibiki'],['近所の子ども','Neighbourhood kid'],['相撲好きのおばあちゃん','Sumo-loving grandma'],['新弟子仲間','Fellow recruit'],['見習い呼出','Apprentice yobidashi'],
 ['すべての稽古 +25%・会心の稽古が出やすい','All training +25% · more great sessions'],['四股・てっぽう +35%・けがをしにくい','Shiko & teppō +35% · fewer injuries'],['ちゃんこの増量 +50%・ご祝儀 +50%','Chanko gain +50% · prize money +50%'],['てっぽう +30%・取組の力 +1','Teppō +30% · bout power +1'],['申し合い +30%','Sparring +30%'],
 ['すり足 +30%・疲れにくい（−20%）','Suriashi +30% · less fatigue (−20%)'],['ちゃんこの増量 +40%・休むと疲れがよく取れる','Chanko gain +40% · rest recovers more'],['疲れにくい（−10%）','Less fatigue (−10%)'],['立ち合いが少し鋭くなる','Slightly sharper tachiai'],['ご祝儀 +20%','Prize money +20%'],['四股 +15%','Shiko +15%'],['取組の力 +1','Bout power +1'],
 ['すべての稽古 +5%','All training +5%'],['休むと疲れがよく取れる','Rest recovers more'],['すり足 +10%','Suriashi +10%'],['申し合い +10%','Sparring +10%'],
 // achievements
 ['初白星','First win'],['初めて勝つ','Win a bout'],['初勝ち越し','First kachi-koshi'],['場所で勝ち越す','Finish a basho with a winning record'],['場所で全勝する','Win every bout in a basho'],['関取','Sekitori'],['十両に昇進する','Reach Jūryō'],['新入幕','Makuuchi debut'],['幕内に昇進する','Reach Makuuchi'],['小結以上に昇進する','Reach Komusubi or higher'],
 ['大関に昇進する','Reach Ōzeki'],['横綱に昇進する','Reach Yokozuna'],['金星','Kinboshi'],['平幕で横綱を破る','Beat a Yokozuna as a maegashira'],['三賞','Special prize'],['三賞を受賞する','Win a special prize'],['賜杯','The Emperor\'s Cup'],['幕内優勝する','Win the Makuuchi title'],['名横綱','Great Yokozuna'],['幕内優勝5回','5 Makuuchi titles'],
 ['大横綱','Legendary Yokozuna'],['幕内優勝10回','10 Makuuchi titles'],['史上最強','Greatest ever'],['幕内優勝20回','20 Makuuchi titles'],['通算100勝','100 career wins'],['通算300勝','300 career wins'],['通算500勝','500 career wins'],['通算1000勝','1000 career wins'],['20連勝','20 straight wins'],['20連勝する','Win 20 in a row'],
 ['50連勝','50 straight wins'],['50連勝する','Win 50 in a row'],['技のデパート','Department store of moves'],['決まり手を15種類以上出す','Win with 15+ kimarite'],['決まり手博士','Kimarite scholar'],['決まり手を30種類以上出す','Win with 30+ kimarite'],['珍手','Rare move'],['珍しい決まり手で勝つ','Win with a rare kimarite'],
 ['父超え','Surpass your father'],['二代目で父の最高位を超える','As the son, beat your father\'s best rank'],['親子横綱','Father-and-son Yokozuna'],['父も子も横綱になる','Father and son both reach Yokozuna'],['三連覇','Three-peat'],['幕内優勝3連覇','3 Makuuchi titles in a row'],['宿命の対決','Destined rivals'],['宿敵に通算10勝','10 career wins over your rival'],
 ['横綱決戦','Yokozuna showdown'],['千秋楽の横綱決戦で宿敵に勝つ','Beat your rival in a senshūraku Yokozuna showdown'],['不滅の記録','Immortal record'],['70連勝する（双葉山超え）','Win 70 in a row (past Futabayama)'],['史上最多','All-time record'],['幕内優勝46回','46 Makuuchi titles'],
 ['幕内経験のある力士を引退させて親方にする','Retire a former Makuuchi rikishi as stablemaster'],['名門部屋','Elite stable'],['殿堂入りの力士3人','3 rikishi in the hall of fame'],
 // tanimachi & heroines
 ['ちゃんこ屋「大関」の大将','The chef of the "Ōzeki" chanko restaurant'],['地元建設会社の社長','The president of a local construction firm'],['老舗旅館の女将','The okami of an old ryokan'],['IT企業の若社長','The young CEO of an IT company'],['大将','The chef'],['社長','The president'],['女将','The okami'],['若社長','The young CEO'],
 ['幼なじみの遥','Haruka, his childhood friend'],['後援会長の娘・綾乃','Ayano, the supporters\' club chief\'s daughter'],['管理栄養士の真緒','Mao, a dietitian'],['宿敵の妹・千夏','Chinatsu, his rival\'s sister'],['部屋の手伝いの紗季','Saki, who helps at the stable'],['相撲記者の奈央子','Naoko, a sumo reporter'],
 ['帰省先で再会した幼なじみ','A childhood friend he met again back home'],['地元後援会の集まりで出会った','Met at a local supporters\' club gathering'],['部屋のちゃんこ番を手伝いに来た管理栄養士','A dietitian who came to help with the stable\'s chanko'],['宿敵が紹介してくれた妹','His rival introduced his sister'],['朝稽古のあと、いつも部屋を手伝っている','Always helps out after morning practice'],['関取昇進の取材で部屋に来た','Came to the stable to cover his promotion to sekitori'],
 ['取組の力 +1（ずっと）、負け越した場所のあと疲れが全回復','Bout power +1 (permanent); full recovery after a losing basho'],['ご祝儀 +20%（ずっと）','Prize money +20% (permanent)'],['ちゃんこで体重が増えやすく、けがをしにくい','Gains weight easily from chanko; fewer injuries'],['宿敵との取組で力 +2','Power +2 against the rival'],['稽古の伸び +10%（ずっと）','Training gains +10% (permanent)'],['初めて当たる相手との取組で力 +2（取材ノートの研究）','Power +2 against first-time opponents (her research notes)'],
 ['明るくて世話焼き。泣き虫だったころから、ずっと励ましてくれる','Cheerful and caring. She has cheered him on since he was a crybaby'],['おっとりしたお嬢さま。芯が強く、後援会の人たちにも好かれている','A gentle young lady with a strong core, loved by the supporters'],['食事の管理はおまかせ。体のことになると、ちょっとこわい','Leave the meals to her. A little scary when it comes to his health'],
 ['兄ゆずりの負けず嫌い。兄との取組の日は、どっちを応援するか悩む','As competitive as her brother. On the day they meet, she can\'t decide who to cheer for'],['朝稽古のあと、いつも黙々と手伝っている。笑うと目が細くなる','Quietly helps after every morning practice. Her eyes narrow when she smiles'],['落ち着いた聞き上手。取材ノートには、誰よりも細かく相撲のことが書いてある','Calm and a good listener. Her notebook holds more sumo detail than anyone\'s'],
];
T2.push(
 ['「あんたの相撲が気に入った。腹いっぱい食わせたる。今度うちの店に来な」','"I like your sumo. I\'ll fill you up. Come by my place sometime."'],['「最近ちっとも店に顔を出さんな。わしはもう、ほかの若いのを応援するわ」','"You never come by the restaurant any more. I\'ll be backing some other youngster now."'],
 ['「いい相撲とるな。これからワシが面倒みたる。今度メシ行こう」','"You fight good sumo. I\'ll look after you from now on. Let\'s get dinner."'],['「ずいぶん顔を見せんな。ワシはもう、ほかの力士を応援するわ」','"You never show your face these days. I\'ll be backing another rikishi now."'],
 ['「あなたのお相撲、うちのお客さまにも評判なのよ。今度ゆっくりお食事にいらして」','"Your sumo is popular with our guests too. Do come for a relaxing dinner sometime."'],['「最近お見えになりませんね。残念ですけれど、ほかのお相撲さんを応援させていただきます」','"We haven\'t seen you lately. It\'s a pity, but I shall support another rikishi."'],
 ['「君の相撲、伸びしろしかないね。応援させてよ。今度食事でもどう？」','"Your sumo is all upside. Let me back you. Dinner sometime?"'],['「最近会えてないね。悪いけど、別の力士を応援することにしたよ」','"We haven\'t met in a while. Sorry, but I\'ve decided to back a different rikishi."'],
 ['「お疲れさん！ 明日からは、うちの店でたらふく食わせたる」','"Well done! From tomorrow, I\'ll feed you all you can eat at my place."'],['「ようやった。第二の人生も、ワシが応援させてもらうで」','"You did well. I\'ll back your second life too."'],['「長いあいだ、本当にお疲れさまでございました」','"Thank you so much for all these years."'],['「最高のキャリアだったね。次のチャレンジも応援するよ」','"What a career. I\'ll back your next challenge too."'],
 ['十両昇進','Jūryō promotion'],['新入幕','Makuuchi debut'],['大関昇進','Ōzeki promotion'],['横綱昇進','Yokozuna promotion'],['妻の','his wife '],['恋人の','his girlfriend '],['婚約者の','his fiancée '],['記者','Reporter'],
 ['ちゃんこ屋「大関」の大将から祝いの席に招かれた。','The chef of the "Ōzeki" chanko restaurant invited him to a celebration dinner.'],
);
for(const [a,b] of T2)X[a]=b;
const KM={'押し出し':'Oshidashi','突き出し':'Tsukidashi','押し倒し':'Oshitaoshi','突き倒し':'Tsukitaoshi','寄り切り':'Yorikiri','寄り倒し':'Yoritaoshi','上手投げ':'Uwatenage','下手投げ':'Shitatenage','小手投げ':'Kotenage','すくい投げ':'Sukuinage','上手出し投げ':'Uwatedashinage','下手出し投げ':'Shitatedashinage','首投げ':'Kubinage','吊り出し':'Tsuridashi','吊り落とし':'Tsuriotoshi',
  '外掛け':'Sotogake','内掛け':'Uchigake','切り返し':'Kirikaeshi','渡し込み':'Watashikomi','上手ひねり':'Uwatehineri','下手ひねり':'Shitatehineri','送り吊り出し':'Okuritsuridashi','櫓投げ':'Yaguranage','二丁投げ':'Nichōnage','河津掛け':'Kawazugake',
  'はたき込み':'Hatakikomi','突き落とし':'Tsukiotoshi','引き落とし':'Hikiotoshi','送り出し':'Okuridashi','送り倒し':'Okuritaoshi','肩透かし':'Katasukashi','とったり':'Tottari','引っ掛け':'Hikkake','足取り':'Ashitori','蹴返し':'Kekaeshi','素首落とし':'Sokubiotoshi','逆とったり':'Sakatottari','裾払い':'Susoharai','一本背負い':'Ipponzeoi','居反り':'Isori','うっちゃり':'Utchari',
  '勇み足':'Isamiashi','腰砕け':'Koshikudake','つき手':'Tsukite','踏み出し':'Fumidashi'};
for(const k in KM){X[k]=KM[k];G[k]=KM[k];}
/* ---------- helpers ---------- */
const GK=Object.keys(G).sort((a,b)=>b.length-a.length);
function rankEN(side,div,num){num=num==='筆頭'?'一':num.replace('枚目','');const d={'序ノ口':'Jonokuchi','序二段':'Jonidan','三段目':'Sandanme','幕下':'Makushita','十両':'Jūryō','前頭':'Maegashira'}[div];const n=kan(num);return(side?(side==='東'?'East ':'West '):'')+d+' '+n+(side?'':'');}
function names(s){return s.replace(/[\u3400-\u9fff\u30ce\u4e43]{1,6}/g,m=>nameEN(m)||m);}
function gloss(s){
  s=s.replace(new RegExp('(東|西)?\\s?('+DIVJ+')([一二三四五六七八九十百\\d]+枚目|筆頭)','g'),(m,sd,dv,nm)=>rankEN(sd,dv,nm));
  s=s.replace(/(東|西)\s?(横綱|大関|関脇|小結)/g,(m,sd,r)=>(sd==='東'?'East ':'West ')+G[r]);
  s=s.replace(/(\d+)年目/g,'Year $1').replace(/(\d+)場所目/g,'Basho $1').replace(/(\d+)歳/g,'age $1').replace(/(\d+)勝(\d+)敗(\d+)休/g,'$1-$2-$3a').replace(/(\d+)勝(\d+)敗/g,'$1–$2').replace(/(\d+)勝/g,'$1 wins').replace(/(\d+)敗/g,'$1 losses').replace(/(\d+)回/g,'$1×')
       .replace(/(\d+)月/g,(m,n)=>['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+n]||m).replace(/(\d+)連覇中/g,'$1 titles in a row').replace(/(\d+)連覇/g,'$1 in a row').replace(/(\d+)連勝/g,'$1 straight wins');
  s=s.replace(/出身/g,'').replace(/まで/g,' ahead').replace(/：/g,': ').replace(/・/g,' · ').replace(/、/g,', ').replace(/。/g,'. ').replace(/（/g,' (').replace(/）/g,')').replace(/「/g,'"').replace(/」/g,'"').replace(/　/g,' ').replace(/！/g,'!').replace(/？/g,'?');
  for(const k of GK)if(s.includes(k))s=s.split(k).join(G[k]);
  return names(s).replace(/\s{2,}/g,' ').trim();}
/* ---------- templates ---------- */
const RK=r=>gloss(r);
const R=[
  [/^入門(\d+)年目$/,m=>'Year '+m[1]],
  [/^([○●]) (.+)の勝ち　(.+)$/,m=>m[1]+' '+(nameEN(m[2])||m[2])+' wins · '+tr(m[3])],
  [/^([○●]) (.+)の勝ち$/,m=>m[1]+' '+(nameEN(m[2])||m[2])+' wins'],
  [/^(\d+)歳・入門(\d+)年目・(\d+)勝(\d+)敗$/,m=>'Age '+m[1]+' · Year '+m[2]+' · '+m[3]+'–'+m[4]],
  [/^(\d+)歳になった。$/,m=>'He turned '+m[1]+'.'],
  [/^(東|西)?\s?(前頭)?([一二三四五六七八九十百]+|筆頭)(枚目)?$/,m=>((m[1]?X[m[1]]+' ':'')+(m[2]?'Maegashira ':'')+(m[3]==='筆頭'?'1':kan(m[3]))).trim()],
  [/^(\d+)年目の年の瀬　(\d+)歳$/,m=>'End of year '+m[1]+' · age '+m[2]],
  [/^前相撲 ([一二三四五六七八九十]+)番$/,m=>'Maezumo bout '+kan(m[1])],
  [/^(\d+)日目$/,m=>'Day '+m[1]],
  [/^(\d+)番相撲$/,m=>'Bout '+m[1]],
  [/^出身　通算$/,m=>' · Career '],
  [/^(\d+)歳$/,m=>m[1]],
  [/^まだ本場所に出ていない$/,m=>'Hasn\'t fought a basho yet'],
  [/^前相撲：2勝すれば、来場所から序ノ口に名前が載る$/,m=>'Maezumo: win 2 and you\'re listed in Jonokuchi next basho'],
  [/^親方「まずは前相撲だ。勝てば来場所から序ノ口に名前が載る」$/,m=>'Stablemaster: "Maezumo first. Win and you\'re on the Jonokuchi banzuke next basho."'],
  [/^ケガで休場すると、全敗あつかいで番付が下がる$/,m=>'Sitting out injured counts as losses — your rank will drop'],
  [/^(\d+)連覇中！ 優勝すれば(\d+)連覇$/,m=>m[1]+' titles in a row! Win to make it '+m[2]],
  [/^前の場所で優勝。優勝すれば2連覇$/,m=>'You won last basho. Win again for 2 in a row'],
  [/^横綱：負け越すと進退問題。2場所続けて休むのも危ない$/,m=>'Yokozuna: a losing record puts your career in question. Two absences in a row are risky too'],
  [/^カド番：負け越すと大関から陥落する$/,m=>'Kadoban: a losing record drops you from Ōzeki'],
  [/^綱取りの場所！ 優勝をめざせ$/,m=>'A tsuna-tori basho! Go for the title'],
  [/^綱取り：優勝か13勝のあと、次の場所で優勝すれば横綱$/,m=>'Tsuna-tori: a title or 13 wins, then a title the next basho, makes you Yokozuna'],
  [/^大関復帰の場所：10勝すれば大関に戻れる$/,m=>'Ōzeki comeback: 10 wins returns you to Ōzeki'],
  [/^大関取りの目安：三役で3場所33勝（あと (\d+)勝）$/,m=>'Ōzeki target: 33 wins over 3 basho in sanyaku ('+m[1]+' to go)'],
  [/^勝ち越せば三役を守れる。10勝で関脇も見える$/,m=>'A winning record keeps you in sanyaku. 10 wins could mean Sekiwake'],
  [/^勝ち越しで(.+)前後へ・三役は(\d+)勝$/,m=>'Kachi-koshi → about '+RK(m[1])+' · sanyaku needs '+m[2]+' wins'],
  [/^勝ち越しで(.+)前後へ・入幕は(\d+)勝$/,m=>'Kachi-koshi → about '+RK(m[1])+' · Makuuchi needs '+m[2]+' wins'],
  [/^十両昇進：この地位なら(\d+)勝で関取に$/,m=>'Jūryō promotion: from here, '+m[1]+' wins makes you sekitori'],
  [/^4勝で(.+)前後・6勝で(.+)前後へ$/,m=>'4 wins → about '+RK(m[1])+' · 6 wins → about '+RK(m[2])],
  [/^勝ち越せば序二段へ上がれる$/,m=>'A winning record takes you to Jonidan'],
  [/^(.+)：(.+)\+(\d+)%（あと(\d+)場所）$/,m=>tr(m[1])+': '+gloss(m[2])+' +'+m[3]+'% ('+m[4]+' basho left)'],
  [/^(.+)：(.+)(\+|−)(\d+)（あと(\d+)場所）$/,m=>tr(m[1])+': '+gloss(m[2])+' '+m[3]+m[4]+' ('+m[5]+' basho left)'],
  [/^(.+)出身$/,m=>'From '+(G[m[1]]||m[1])],
  [/^稽古 (\d)\/5$/,m=>'Training '+m[1]+'/5'],
  [/^稽古あと(\d)回で(.+)$/,m=>m[1]+' more training before the '+tr(m[2])],
  [/^(\d+)歳・入門(\d+)年目(・教習所通い)?(・(\d+)勝(\d+)敗・場所中)?$/,m=>'Age '+m[1]+' · Year '+m[2]+(m[3]?' · at sumo school':'')+(m[4]?' · '+m[5]+'–'+m[6]+' · in basho':'')],
  [/^(\d+)年目　(\d+)歳$/,m=>'Year '+m[1]+'  ·  age '+m[2]],
  [/^(\d+)年目 (.+)$/,m=>'Year '+m[1]+' '+tr(m[2])],
  [/^(.+)まで$/,m=>tr(m[1])+' next'],
  [/^(\d+)月・(.+)$/,m=>['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[1]]+' · '+gloss(m[2])],
  [/^(\d+)cm・(\d+)kg$/,m=>m[1]+' cm · '+m[2]+' kg'],
  [/^目安 (\d+)〜(\d+)kg$/,m=>'Target '+m[1]+'–'+m[2]+' kg'],
  [/^伸びしろ (大|中|小)・総合力 (\d+)$/,m=>'Potential '+{大:'high',中:'medium',小:'low'}[m[1]]+' · overall '+m[2]],
  [/^仲のよさ (\d+)$/,m=>'Affection '+m[1]],
  [/^♥(.+) (\d+)$/,m=>'♥'+(nameEN(m[1])||m[1])+' '+m[2]],
  [/^家 (.+?)(・長男)?$/,m=>'Home '+(nameEN(m[1])||m[1])+(m[2]?' · son':'')],
  [/^谷 (.+)$/,m=>'Patron '+tr(m[1])],
  [/^(負傷|休場) あと(\d+)休$/,m=>(m[1]==='負傷'?'Injured':'Out')+' · '+m[2]+' rests'],
  [/^(.+)のケガ：(軽傷|中傷|重傷)・あと(\d+)回休めば治る$/,m=>tr(m[1])+' injury: '+X[m[2]]+' · heals after '+m[3]+' rests'],
  [/^交際中：(.+)（親密度 (\d+)）$/,m=>'Dating '+(nameEN(m[1])||m[1])+' (affection '+m[2]+')'],
  [/^タニマチ：(.+)$/,m=>'Patron: '+tr(m[1])],
  [/^(恋人|婚約者|妻|気になる人|知り合い)・(.+)$/,m=>X[m[1]]+' · '+tr(m[2])],
  [/^(.+)（(\d+)\/(\d+)）$/,m=>tr(m[1])+' ('+m[2]+'/'+m[3]+')'],
  [/^(\d+)年$/,m=>m[1]+(m[1]==='1'?' year':' years')],
  [/^あと(\d+)勝$/,m=>m[1]+' more wins'],
  [/^(\d+)場所目$/,m=>'Basho '+m[1]],
  [/^この相手とは (\d+)勝(\d+)敗$/,m=>'Head-to-head '+m[1]+'–'+m[2]],
  [/^宿敵：(.+?)（(.+)）　(.+)$/,m=>'Rival: '+(nameEN(m[1])||m[1])+' ('+gloss(m[2])+')  '+(m[3]==='まだ対戦なし'?'no bouts yet':gloss(m[3]))],
  [/^宿敵（(.+)）$/,m=>'Rival ('+gloss(m[1])+')'],
  [/^(.+)・(\d+)歳・(\d+)cm・(\d+)kg$/,m=>tr(m[1])+' · '+m[2]+' · '+m[3]+' cm · '+m[4]+' kg'],
  [/^(.+)をこなした。　(.+)$/,m=>tr(m[1])+' done.  '+gloss(m[2])],
  [/^決まり手図鑑　(\d+) \/ (\d+)種$/,m=>'Kimarite book  '+m[1]+' / '+m[2]],
  [/^部屋の格 (\d+)（新弟子の成長 \+(\d+)%）$/,m=>'Stable standing '+m[1]+' (recruit growth +'+m[2]+'%)'],
  [/^(.+)（部屋）$/,m=>tr(m[1])+' (stable)'],
  [/^(.+)の勝ち$/,m=>(nameEN(m[1])||m[1])+' wins'],
  [/^新しい決まり手「(.+)」（(\d+)種）$/,m=>'New kimarite: '+(KM[m[1]]||m[1])+' ('+m[2]+')'],
  [/^宿敵 (.+) に勝った！$/,m=>'You beat your rival '+(nameEN(m[1])||m[1])+'!'],
  [/^相性で不利（相手は(.+)）$/,m=>'Bad matchup (he chose '+tr(m[1])+')'],
  [/^(\d+)連勝で止まった。$/,m=>'The streak ended at '+m[1]+'.'],
  [/^親方「今日からお前は(.+)だ。若さが武器だ、とことん鍛えるぞ」$/,m=>'Stablemaster: "From today you are '+(nameEN(m[1])||m[1])+'. Youth is your weapon — we\'ll train you hard."'],
  [/^(.+)がにやりと笑った。これから長い付き合いになりそうだ。$/,m=>(nameEN(m[1])||m[1])+' grinned. This looks like the start of a long rivalry.'],
  [/^(.+)が宿敵になった・教習所の間、稽古の伸び \+5%$/,m=>(nameEN(m[1])||m[1])+' is now your rival · training gains +5% while at school'],
  [/^([^：「」]{1,16})：(.+)$/s,m=>{const a=tr(m[1]),b=tr(m[2]);return a+': '+b;}],
  [/^よく来たな、(.+)。ここがおまえの部屋だ。\n稽古で体と技をきたえて、本場所で勝ち、番付を上げていく。めざすは横綱だ。$/,m=>'Welcome, '+(nameEN(m[1])||m[1])+'. This is your stable.\nBuild your body and skills in training, win at the basho, and climb the banzuke. The goal is Yokozuna.'],
  [/^(.+) (\+|−)([\d.]+)$/,m=>tr(m[1])+' '+m[2]+m[3]],
];
/* sentences built from translated fragments with Japanese names/terms still inside */
let PK=null;
function mixed(s){if(!PK)PK=Object.keys(X).filter(k=>k.length>=2&&k.length<=90).sort((a,b)=>b.length-a.length);
  for(const k of PK)if(s.includes(k))s=s.split(k).join(X[k]);
  s=s.replace(new RegExp('(東|西)?\\s?('+DIVJ+')([一二三四五六七八九十百\\d]+枚目|筆頭)','g'),(m,sd,dv,nm)=>rankEN(sd,dv,nm)).replace(/(東|西)\s?(横綱|大関|関脇|小結)/g,(m,sd,r)=>(sd==='東'?'East ':'West ')+G[r]);
  s=s.replace(/(\d+)年目 /g,'Year $1 ').replace(/\u306f(?=\d)/g,': ');
  s=names(s);for(const k of GK)if(k.length>=2&&s.includes(k))s=s.split(k).join(G[k]);
  // leftover particles between a name and English
  s=s.replace(/your (?:wife|fiancée|girlfriend)\u306e([A-Z][A-Za-z\u014d\u016b\u0101]+)/g,'$1').replace(/([A-Za-z\u014d\u016b\u0101])\u306e(?=[ A-Za-z])/g,"$1's ").replace(/([A-Za-z\u014d\u016b\u0101)])[\u306f\u304c\u3092\u306b\u3068](?=[ A-Za-z"\u201c(])/g,'$1 ').replace(/([A-Za-z\u014d\u016b\u0101])\u3055\u3093/g,'$1');
  s=s.replace(/」「/g,'", "').replace(/(押し|力|技|速さ|体重|疲れ)\s?([+−\-]\s?\d)/g,(m,k,n)=>G[k]+' '+n);
  return s.replace(/(\d+)勝(\d+)敗/g,'$1–$2').replace(/(\d+)勝/g,'$1 wins').replace(/(\d+)敗/g,'$1 losses').replace(/(\d+)歳/g,'$1').replace(/：/g,': ').replace(/・/g,' · ').replace(/、/g,', ').replace(/。/g,'. ').replace(/（/g,' (').replace(/）/g,')').replace(/「/g,'"').replace(/」/g,'"').replace(/　/g,' ').replace(/！/g,'!').replace(/？/g,'?').replace(/…/g,'…').replace(/ {2,}/g,' ').replace(/ ([,.!?)])/g,'$1').replace(/([.!?]) "(\s|$)/g,'$1"$2');}
/* story fragments from en2.js, longest first (short or empty ones are too ambiguous to splice into old text) */
let FR=null,FRK=null;function EN_S(){if(FR)return true;const S=window.I18N_EN&&window.I18N_EN.S;if(!S)return false;FR={};for(const k in S)if(k.length>=3&&S[k])FR[k]=S[k];FRK=Object.keys(FR).sort((a,b)=>b.length-a.length);return true;}
/* ---------- main ---------- */
const cache=new Map();
/* tidy English built from fragments: missing spaces between sentences, sentence-initial capitals, "the" mid-sentence */
function post(s){if(s.length<20)return s;s=s.replace(/([.!?]) "(\s|$)/g,'$1"$2');
  // a sentence end glued to the next sentence: decide by quote parity whether a " opens or closes
  let out='',q=0;for(let k=0;k<s.length;k++){const c=s[k];out+=c;if(c==='"'||c==='\u201c'||c==='\u201d'){q++;continue;}
    if(/[.!?]/.test(c)&&/[a-z\u014d\u016b\u0101)]/.test(s[k-1]||'')){const n=s[k+1]||'';
      if(/[A-Z\u201c]/.test(n))out+=' ';
      else if(n==='"'){if(q%2===1){out+='"';q++;k++;if(/[A-Z]/.test(s[k+1]||''))out+=' ';}else out+=' ';}}}
  s=out.replace(/, The (?=[a-z])/g,', the ').replace(/ {2,}/g,' ');
  return s.replace(/^([a-z])(?=[a-z]* )/,c=>c.toUpperCase()).replace(/\n([a-z])/g,(m,c)=>'\n'+c.toUpperCase());}
function tr(s,ctx){if(s==null)return s;s=String(s);if(!J.test(s)){const p=post(s);return p;}
  if(s.trim().length===1){const k=s.trim();return k==='東'||k==='西'?s.replace(k,X[k]):ctx==='stat'&&G[k]?G[k]:s;} // single kanji are icons, except East/West and the stat names
  const c=cache.get(s);if(c!==undefined)return c;
  const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.trim();let out=null;
  if(X[core]!=null)out=X[core];
  else if(core.length===1)out=null; // single kanji are decorative icons
  else if(nameEN(core))out=nameEN(core);
  else{for(const [re,f] of R){const m=core.match(re);if(m){const r=f(m);if(r!=null&&!J.test(r)){out=r;break;}}}
    if(out==null&&core.length<=28&&!/[A-Za-z]{3}/.test(core)){const g=gloss(core);if(!J.test(g))out=g;}}
  if(out==null&&EN_S()){const jp0=(core.match(/[\u3040-\u30ff\u3400-\u9fff]/g)||[]).length,lat0=(core.match(/[A-Za-z]/g)||[]).length;
    if(jp0>=6&&lat0<jp0){let s2=core;for(const k of FRK)if(s2.includes(k))s2=s2.split(k).join(FR[k]);if(s2!==core){const m2=mixed(s2),j2=(m2.match(/[\u3040-\u30ff\u3400-\u9fff]/g)||[]).length;if(j2<=jp0*.2)out=m2;}}}
  if(out==null){const lat=(core.match(/[A-Za-z]/g)||[]).length,jp=(core.match(/[\u3040-\u30ff\u3400-\u9fff]/g)||[]).length;if(lat>=6&&lat>=jp)out=mixed(core);else{const m2=mixed(core),j2=(m2.match(/[\u3040-\u30ff\u3400-\u9fff]/g)||[]).length;if(j2<=jp*.25)out=m2;}}
  const res=out==null?s:lead+post(out)+trail;if(cache.size>5000)cache.clear();cache.set(s,res);return res;}
window.I18N_EN={tr,nameEN,kan};
})();
