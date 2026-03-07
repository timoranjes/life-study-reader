export interface Message {
  id: string
  title: string
  shortTitle: string
}

export interface Book {
  id: string
  name: string
  messages: Message[]
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple" | "red"
export type Language = "simplified" | "traditional" | "english"
export type FontFamily = "serif" | "sans" | "kai" | "mono"

export interface Highlight {
  id: string
  paragraphIndex: number
  startOffset: number
  endOffset: number
  color: HighlightColor
  noteId?: string
  createdAt: string
}

export interface Note {
  id: string
  highlightId: string
  highlightParagraphIndex: number
  quotedText: string
  content: string
  createdAt: string
  updatedAt?: string
}

export const books: Book[] = [
  {
    id: "matthew",
    name: "马太福音",
    messages: [
      { id: "matt-1", title: "马太福音生命读经 第一篇", shortTitle: "第一篇：基督的家谱（一）" },
      { id: "matt-2", title: "马太福音生命读经 第二篇", shortTitle: "第二篇：基督的家谱（二）" },
      { id: "matt-3", title: "马太福音生命读经 第三篇", shortTitle: "第三篇：基督的降生" },
      { id: "matt-4", title: "马太福音生命读经 第四篇", shortTitle: "第四篇：从基督的受膏看祂是谁" },
      { id: "matt-5", title: "马太福音生命读经 第五篇", shortTitle: "第五篇：诸天之国的宪法（一）" },
      { id: "matt-6", title: "马太福音生命读经 第六篇", shortTitle: "第六篇：诸天之国的宪法（二）" },
      { id: "matt-7", title: "马太福音生命读经 第七篇", shortTitle: "第七篇：王的权柄" },
      { id: "matt-8", title: "马太福音生命读经 第八篇", shortTitle: "第八篇：国度的奥秘" },
    ],
  },
  {
    id: "mark",
    name: "马可福音",
    messages: [
      { id: "mark-1", title: "马可福音生命读经 第一篇", shortTitle: "第一篇：奴仆救主的福音" },
      { id: "mark-2", title: "马可福音生命读经 第二篇", shortTitle: "第二篇：奴仆救主的身份" },
      { id: "mark-3", title: "马可福音生命读经 第三篇", shortTitle: "第三篇：奴仆救主的服事" },
    ],
  },
  {
    id: "luke",
    name: "路加福音",
    messages: [
      { id: "luke-1", title: "路加福音生命读经 第一篇", shortTitle: "第一篇：人救主的介绍" },
      { id: "luke-2", title: "路加福音生命读经 第二篇", shortTitle: "第二篇：人救主的降生" },
      { id: "luke-3", title: "路加福音生命读经 第三篇", shortTitle: "第三篇：人救主的使命" },
    ],
  },
  {
    id: "john",
    name: "约翰福音",
    messages: [
      { id: "john-1", title: "约翰福音生命读经 第一篇", shortTitle: "第一篇：太初的话" },
      { id: "john-2", title: "约翰福音生命读经 第二篇", shortTitle: "第二篇：话成了肉体" },
      { id: "john-3", title: "约翰福音生命读经 第三篇", shortTitle: "第三篇：生命的光" },
    ],
  },
  {
    id: "romans",
    name: "罗马书",
    messages: [
      { id: "rom-1", title: "罗马书生命读经 第一篇", shortTitle: "第一篇：引言" },
      { id: "rom-2", title: "罗马书生命读经 第二篇", shortTitle: "第二篇：定罪" },
      { id: "rom-3", title: "罗马书生命读经 第三篇", shortTitle: "第三篇：称义" },
    ],
  },
  {
    id: "genesis",
    name: "创世记",
    messages: [
      { id: "gen-1", title: "创世记生命读经 第一篇", shortTitle: "第一篇：神的创造" },
      { id: "gen-2", title: "创世记生命读经 第二篇", shortTitle: "第二篇：人的被造" },
      { id: "gen-3", title: "创世记生命读经 第三篇", shortTitle: "第三篇：人的堕落" },
    ],
  },
]

// Localized book data for the TOC
export const booksByLang: Record<Language, Book[]> = {
  simplified: books,
  traditional: [
    {
      id: "matthew",
      name: "馬太福音",
      messages: [
        { id: "matt-1", title: "馬太福音生命讀經 第一篇", shortTitle: "第一篇：基督的家譜（一）" },
        { id: "matt-2", title: "馬太福音生命讀經 第二篇", shortTitle: "第二篇：基督的家譜（二）" },
        { id: "matt-3", title: "馬太福音生命讀經 第三篇", shortTitle: "第三篇：基督的降生" },
        { id: "matt-4", title: "馬太福音生命讀經 第四篇", shortTitle: "第四篇：從基督的受膏看祂是誰" },
        { id: "matt-5", title: "馬太福音生命讀經 第五篇", shortTitle: "第五篇：諸天之國的憲法（一）" },
        { id: "matt-6", title: "馬太福音生命讀經 第六篇", shortTitle: "第六篇：諸天之國的憲法（二）" },
        { id: "matt-7", title: "馬太福音生命讀經 第七篇", shortTitle: "第七篇：王的權柄" },
        { id: "matt-8", title: "馬太福音生命讀經 第八篇", shortTitle: "第八篇：國度的奧祕" },
      ],
    },
    {
      id: "mark",
      name: "馬可福音",
      messages: [
        { id: "mark-1", title: "馬可福音生命讀經 第一篇", shortTitle: "第一篇：奴僕救主的福音" },
        { id: "mark-2", title: "馬可福音生命讀經 第二篇", shortTitle: "第二篇：奴僕救主的身份" },
        { id: "mark-3", title: "馬可福音生命讀經 第三篇", shortTitle: "第三篇：奴僕救主的服事" },
      ],
    },
    {
      id: "luke",
      name: "路加福音",
      messages: [
        { id: "luke-1", title: "路加福音生命讀經 第一篇", shortTitle: "第一篇：人救主的介紹" },
        { id: "luke-2", title: "路加福音生命讀經 第二篇", shortTitle: "第二篇：人救主的降生" },
        { id: "luke-3", title: "路加福音生命讀經 第三篇", shortTitle: "第三篇：人救主的使命" },
      ],
    },
    {
      id: "john",
      name: "約翰福音",
      messages: [
        { id: "john-1", title: "約翰福音生命讀經 第一篇", shortTitle: "第一篇：太初的話" },
        { id: "john-2", title: "約翰福音生命讀經 第二篇", shortTitle: "第二篇：話成了肉體" },
        { id: "john-3", title: "約翰福音生命讀經 第三篇", shortTitle: "第三篇：生命的光" },
      ],
    },
    {
      id: "romans",
      name: "羅馬書",
      messages: [
        { id: "rom-1", title: "羅馬書生命讀經 第一篇", shortTitle: "第一篇：引言" },
        { id: "rom-2", title: "羅馬書生命讀經 第二篇", shortTitle: "第二篇：定罪" },
        { id: "rom-3", title: "羅馬書生命讀經 第三篇", shortTitle: "第三篇：稱義" },
      ],
    },
    {
      id: "genesis",
      name: "創世記",
      messages: [
        { id: "gen-1", title: "創世記生命讀經 第一篇", shortTitle: "第一篇：神的創造" },
        { id: "gen-2", title: "創世記生命讀經 第二篇", shortTitle: "第二篇：人的被造" },
        { id: "gen-3", title: "創世記生命讀經 第三篇", shortTitle: "第三篇：人的墮落" },
      ],
    },
  ],
  english: [
    {
      id: "matthew",
      name: "Matthew",
      messages: [
        { id: "matt-1", title: "Life-Study of Matthew, Message 1", shortTitle: "Message 1: The Genealogy of Christ (1)" },
        { id: "matt-2", title: "Life-Study of Matthew, Message 2", shortTitle: "Message 2: The Genealogy of Christ (2)" },
        { id: "matt-3", title: "Life-Study of Matthew, Message 3", shortTitle: "Message 3: The Birth of Jesus" },
        { id: "matt-4", title: "Life-Study of Matthew, Message 4", shortTitle: "Message 4: Who Christ Is" },
        { id: "matt-5", title: "Life-Study of Matthew, Message 5", shortTitle: "Message 5: Constitution of the Kingdom (1)" },
        { id: "matt-6", title: "Life-Study of Matthew, Message 6", shortTitle: "Message 6: Constitution of the Kingdom (2)" },
        { id: "matt-7", title: "Life-Study of Matthew, Message 7", shortTitle: "Message 7: The Authority of the King" },
        { id: "matt-8", title: "Life-Study of Matthew, Message 8", shortTitle: "Message 8: The Mystery of the Kingdom" },
      ],
    },
    {
      id: "mark",
      name: "Mark",
      messages: [
        { id: "mark-1", title: "Life-Study of Mark, Message 1", shortTitle: "Message 1: The Gospel of the Slave-Savior" },
        { id: "mark-2", title: "Life-Study of Mark, Message 2", shortTitle: "Message 2: The Identity of the Slave-Savior" },
        { id: "mark-3", title: "Life-Study of Mark, Message 3", shortTitle: "Message 3: The Service of the Slave-Savior" },
      ],
    },
    {
      id: "luke",
      name: "Luke",
      messages: [
        { id: "luke-1", title: "Life-Study of Luke, Message 1", shortTitle: "Message 1: Introduction of the Man-Savior" },
        { id: "luke-2", title: "Life-Study of Luke, Message 2", shortTitle: "Message 2: The Birth of the Man-Savior" },
        { id: "luke-3", title: "Life-Study of Luke, Message 3", shortTitle: "Message 3: The Mission of the Man-Savior" },
      ],
    },
    {
      id: "john",
      name: "John",
      messages: [
        { id: "john-1", title: "Life-Study of John, Message 1", shortTitle: "Message 1: The Word in the Beginning" },
        { id: "john-2", title: "Life-Study of John, Message 2", shortTitle: "Message 2: The Word Became Flesh" },
        { id: "john-3", title: "Life-Study of John, Message 3", shortTitle: "Message 3: The Light of Life" },
      ],
    },
    {
      id: "romans",
      name: "Romans",
      messages: [
        { id: "rom-1", title: "Life-Study of Romans, Message 1", shortTitle: "Message 1: Introduction" },
        { id: "rom-2", title: "Life-Study of Romans, Message 2", shortTitle: "Message 2: Condemnation" },
        { id: "rom-3", title: "Life-Study of Romans, Message 3", shortTitle: "Message 3: Justification" },
      ],
    },
    {
      id: "genesis",
      name: "Genesis",
      messages: [
        { id: "gen-1", title: "Life-Study of Genesis, Message 1", shortTitle: "Message 1: God's Creation" },
        { id: "gen-2", title: "Life-Study of Genesis, Message 2", shortTitle: "Message 2: Man's Creation" },
        { id: "gen-3", title: "Life-Study of Genesis, Message 3", shortTitle: "Message 3: Man's Fall" },
      ],
    },
  ],
}

export interface MessageContent {
  title: string
  subtitle: string
  paragraphs: string[]
}

export const messageContentByLang: Record<Language, MessageContent> = {
  simplified: {
    title: "马太福音生命读经 第一篇",
    subtitle: "基督的家谱（一）",
    paragraphs: [
      "马太福音是新约的第一卷书。在这卷书里，我们看见一个奇妙的人物，就是耶稣基督。马太福音启示基督是君王，是大卫的子孙，也是亚伯拉罕的后裔。这位基督是何等的包罗万有！祂是神，也是人；祂是创造主，也是受造之物中的首生者。",
      "马太福音一章一节说，'耶稣基督，大卫的子孙，亚伯拉罕子孙的家谱。'这一节是全书的标题。这里有三个名称：耶稣基督、大卫的子孙、亚伯拉罕的子孙。耶稣的意思是耶和华救主，或耶和华救恩。基督的意思是受膏者。大卫的意思是可爱的。亚伯拉罕的意思是众人之父。",
      "在马太福音的家谱里，我们看见四十二代的名字。这四十二代的名字不仅仅是一些名字而已，每一个名字都有其属灵的意义。这些名字启示了基督的身位和工作。基督是从永远到永远的那一位，也是在时间里成为肉体的那一位。",
      "基督的家谱给我们看见，基督与人类有极其密切的关系。祂不是仅仅在天上远远地观看人类，而是亲自进入人类的历史中。祂取了人的血肉之体，进入人的家谱，成为人的后裔。这是何等奇妙的事！宇宙的创造主竟然成为一个受造之人的后裔。",
      "在这个家谱里，我们不仅看见男人，也看见女人。这在犹太人的家谱里是非常不寻常的。马太特别提到四个女人：他玛、喇合、路得和乌利亚的妻子。这四个女人都有不寻常的背景。他玛装作妓女，喇合是一个妓女，路得是摩押女子，乌利亚的妻子犯了奸淫。然而，这四个女人都被列在基督的家谱中。",
      "这给我们看见一个非常重要的真理：基督来，不是为着义人，乃是为着罪人。祂来不是呼召义人，乃是呼召罪人悔改。在基督的家谱里有罪人的名字，这说出基督与罪人联合。祂不嫌弃罪人，反而爱罪人，为罪人而来，要拯救罪人。",
      "在这家谱里，我们也看见犹太人和外邦人的联合。喇合是迦南人，路得是摩押人。这说出基督不仅是犹太人的基督，也是外邦人的基督。祂是全人类的救主。在祂里面，犹太人和外邦人合而为一。",
      "家谱中的四十二代分为三个十四代。头十四代从亚伯拉罕到大卫，说出列祖的时期。第二个十四代从大卫到迁至巴比伦的时候，说出君王的时期。第三个十四代从迁至巴比伦的时候到基督，说出被掳和归回的时期。",
      "这三个十四代的历史，实在是人类的缩影。人从高处堕落到低处，从荣耀降到羞耻，从自由变为奴役。但感谢神，在人最低落的时候，基督来了。基督就是在人类最黑暗的时刻出现的那一颗明亮的晨星。",
      "让我们从这家谱学一个功课。基督的家谱告诉我们，无论我们的背景如何，无论我们的过去如何，我们都能在基督里找到盼望。基督来了，就是要寻找拯救失丧的人。我们都是蒙恩的罪人，在基督里成了新造的人。",
      "我们需要深深宝贝这位基督。祂是我们的一切。祂不仅是我们的救主，也是我们的生命、我们的义、我们的圣、我们的荣耀。在祂里面，我们是完全的、完整的。让我们每一天都来享受这位包罗万有的基督，��祂充满我们的全人。",
      "愿主开我们的眼睛，使我们看见这家谱中深奥的启示。愿主也使我们的心被祂的爱所激励，使我们更加爱祂，更加追求认识祂。阿们。",
    ],
  },
  traditional: {
    title: "馬太福音生命讀經 第一篇",
    subtitle: "基督的家譜（一）",
    paragraphs: [
      "馬太福音是新約的第一卷書。在這卷書裏，我們看見一個奇妙的人物，就是耶穌基督。馬太福音啟示基督是君王，是大衛的子孫，也是亞伯拉罕的後裔。這位基督是何等的包羅萬有！祂是神，也是人；祂是創造主，也是受造之物中的首生者。",
      "馬太福音一章一節說，'耶穌基督，大衛的子孫，亞伯拉罕子孫的家譜。'這一節是全書的標題。這裏有三個名稱：耶穌基督、大衛的子孫、亞伯拉罕的子孫。耶穌的意思是耶和華救主，或耶和華救恩。基督的意思是受膏者。大衛的意思是可愛的。亞伯拉罕的意思是衆人之父。",
      "在馬太福音的家譜裏，我們看見四十二代的名字。這四十二代的名字不僅僅是一些名字而已，每一個名字都有其屬靈的意義。這些名字啟示了基督的身位和工作。基督是從永遠到永遠的那一位，也是在時間裏成爲肉體的那一位。",
      "基督的家譜給我們看見，基督與人類有極其密切的關係。祂不是僅僅在天上遠遠地觀看人類，而是親自進入人類的歷史中。祂取了人的血肉之體，進入人的家譜，成爲人的後裔。這是何等奇妙的事！宇宙的創造主竟然成爲一個受造之人的後裔。",
      "在這個家譜裏，我們不僅看見男人，也看見女人。這在猶太人的家譜裏是非常不尋常的。馬太特別提到四個女人：他瑪、喇合、路得和烏利亞的妻子。這四個女人都有不尋常的背景。他瑪裝作妓女，喇合是一個妓女，路得是摩押女子，烏利亞的妻子犯了姦淫。然而，這四個女人都被列在基督的家譜中。",
      "這給我們看見一個非常重要的真理：基督來，不是爲着義人，乃是爲着罪人。祂來不是呼召義人，乃是呼召罪人悔改。在基督的家譜裏有罪人的名字，這說出基督與罪人聯合。祂不嫌棄罪人，反而愛罪人，爲罪人而來，要拯救罪人。",
      "在這家譜裏，我們也看見猶太人和外邦人的聯合。喇合是迦南人，路得是摩押人。這說出基督不僅是猶太人的基督，也是外邦人的基督。祂是全人類的救主。在祂裏面，猶太人和外邦人合而爲一。",
      "家譜中的四十二代分爲三個十四代。頭十四代從亞伯拉罕到大衛，說出列祖的時期。第二個十四代從大衛到遷至巴比倫的時候，說出君王的時期。第三個十四代從遷至巴比倫的時候到基督，說出被擄和歸回的時期。",
      "這三個十四代的歷史，實在是人類的縮影。人從高處墮落到低處，從榮耀降到羞恥，從自由變爲奴役。但感謝神，在人最低落的時候，基督來了。基督就是在人類最黑暗的時刻出現的那一顆明亮的晨星。",
      "讓我們從這家譜學一個功課。基督的家譜告訴我們，無論我們的背景如何，無論我們的過去如何，我們都能在基督裏找到盼望。基督來了，就是要尋找拯救失喪的人。我們都是蒙恩的罪人，在基督裏成了新造的人。",
      "我們需要深深寶貝這位基督。祂是我們的一切。祂不僅是我們的救主，也是我們的生命、我們的義、我們的聖、我們的榮耀。在祂裏面，我們是完全的、完整的。讓我們每一天都來享受這位包羅萬有的基督，讓祂充滿我們的全人。",
      "願主開我們的眼睛，使我們看見這家譜中深奧的啟示。願主也使我們的心被祂的愛所激勵，使我們更加愛祂，更加追求認識祂。阿們。",
    ],
  },
  english: {
    title: "Life-Study of Matthew, Message 1",
    subtitle: "The Genealogy of Christ (1)",
    paragraphs: [
      "The Gospel of Matthew is the first book of the New Testament. In this book we see a wonderful person - Jesus Christ. The Gospel of Matthew reveals that Christ is the King, the Son of David, and the descendant of Abraham. How all-inclusive this Christ is! He is God, and He is also man; He is the Creator, and He is also the Firstborn of all creation.",
      "Matthew 1:1 says, 'The book of the genealogy of Jesus Christ, the Son of David, the Son of Abraham.' This verse is the heading of the entire book. Here we have three names: Jesus Christ, the Son of David, and the Son of Abraham. Jesus means Jehovah the Savior, or Jehovah salvation. Christ means the Anointed One. David means beloved. Abraham means the father of many.",
      "In the genealogy of Matthew, we see forty-two generations of names. These forty-two generations are not merely names; every name has its spiritual significance. These names reveal the person and work of Christ. Christ is the One from eternity to eternity, and He is also the One who in time became flesh.",
      "The genealogy of Christ shows us that Christ has a most intimate relationship with the human race. He did not merely watch the human race from afar in heaven; rather, He personally entered into human history. He took upon Himself human flesh and blood, entered the human genealogy, and became a descendant of man. What a wonderful thing! The Creator of the universe became a descendant of a created man.",
      "In this genealogy, we see not only men but also women. This is very unusual in a Jewish genealogy. Matthew specifically mentions four women: Tamar, Rahab, Ruth, and the wife of Uriah. All four of these women had unusual backgrounds. Tamar disguised herself as a harlot, Rahab was a harlot, Ruth was a Moabitess, and the wife of Uriah committed adultery. Yet all four of these women are listed in the genealogy of Christ.",
      "This shows us a very important truth: Christ came not for the righteous but for sinners. He came not to call the righteous but to call sinners to repentance. The names of sinners are in the genealogy of Christ, and this speaks of Christ's union with sinners. He does not despise sinners; rather, He loves sinners and came for sinners to save them.",
      "In this genealogy, we also see the union of Jews and Gentiles. Rahab was a Canaanite, and Ruth was a Moabitess. This speaks of the fact that Christ is not only the Christ of the Jews but also the Christ of the Gentiles. He is the Savior of all mankind. In Him, Jews and Gentiles are made one.",
      "The forty-two generations in the genealogy are divided into three sets of fourteen. The first fourteen generations, from Abraham to David, speak of the period of the patriarchs. The second fourteen generations, from David to the deportation to Babylon, speak of the period of the kings. The third fourteen, from the deportation to Babylon to Christ, speak of the period of captivity and return.",
      "The history of these three sets of fourteen generations is truly a portrait of humanity. Man fell from a high place to a low place, from glory to shame, from freedom to bondage. But thanks be to God, at man's lowest point, Christ came. Christ is the bright morning star who appeared at the darkest moment of human history.",
      "Let us learn a lesson from this genealogy. The genealogy of Christ tells us that regardless of our background, regardless of our past, we can all find hope in Christ. Christ came to seek and save the lost. We are all sinners saved by grace, made into a new creation in Christ.",
      "We need to deeply treasure this Christ. He is our everything. He is not only our Savior but also our life, our righteousness, our holiness, and our glory. In Him, we are complete and whole. Let us come every day to enjoy this all-inclusive Christ and let Him fill our entire being.",
      "May the Lord open our eyes to see the deep revelation in this genealogy. May the Lord also cause our hearts to be stirred by His love, that we may love Him more and pursue knowing Him all the more. Amen.",
    ],
  },
}

// Pre-set demo highlights to show the feature
export const demoHighlights: Highlight[] = [
  { id: "hl-1", paragraphIndex: 0, startOffset: 0, endOffset: 27, color: "yellow", createdAt: "2026-02-20T10:00:00Z" },
  { id: "hl-2", paragraphIndex: 1, startOffset: 44, endOffset: 80, color: "blue", createdAt: "2026-02-20T10:05:00Z" },
  { id: "hl-3", paragraphIndex: 3, startOffset: 0, endOffset: 32, color: "green", noteId: "note-1", createdAt: "2026-02-20T10:30:00Z" },
  { id: "hl-4", paragraphIndex: 4, startOffset: 55, endOffset: 100, color: "red", createdAt: "2026-02-20T10:35:00Z" },
  { id: "hl-5", paragraphIndex: 5, startOffset: 0, endOffset: 27, color: "blue", createdAt: "2026-02-20T10:40:00Z" },
  { id: "hl-6", paragraphIndex: 6, startOffset: 0, endOffset: 28, color: "green", createdAt: "2026-02-20T10:45:00Z" },
  { id: "hl-7", paragraphIndex: 8, startOffset: 65, endOffset: 106, color: "yellow", noteId: "note-2", createdAt: "2026-02-21T14:15:00Z" },
  { id: "hl-8", paragraphIndex: 9, startOffset: 0, endOffset: 30, color: "red", noteId: "note-3", createdAt: "2026-02-22T09:00:00Z" },
  { id: "hl-9", paragraphIndex: 10, startOffset: 20, endOffset: 50, color: "yellow", createdAt: "2026-02-22T10:00:00Z" },
  { id: "hl-10", paragraphIndex: 11, startOffset: 0, endOffset: 25, color: "green", noteId: "note-4", createdAt: "2026-02-22T16:45:00Z" },
]

export const demoNotes: Note[] = [
  {
    id: "note-1",
    highlightId: "hl-3",
    highlightParagraphIndex: 3,
    quotedText: "基督的家谱给我们看见，基督与人类有极其密切的关系。",
    content: "这里说到基督与人类的联合，非常宝贝。祂不是远远地观看我们，而是亲自进入我们的历史中。",
    createdAt: "2026-02-20T10:30:00Z",
  },
  {
    id: "note-2",
    highlightId: "hl-7",
    highlightParagraphIndex: 8,
    quotedText: "基督就是在人类最黑暗的时刻出现的那一颗明亮的晨星。",
    content: "何等美好的描述！基督是晨星，在最黑暗的时候带来盼望和光明。",
    createdAt: "2026-02-21T14:15:00Z",
  },
  {
    id: "note-3",
    highlightId: "hl-8",
    highlightParagraphIndex: 9,
    quotedText: "让我们从这家谱学一个功课。基督的家谱告诉我们…",
    content: "家谱的功课：无论背景如何，在基督里都有盼望。这对传福音非常有帮助。",
    createdAt: "2026-02-22T09:00:00Z",
  },
  {
    id: "note-4",
    highlightId: "hl-10",
    highlightParagraphIndex: 11,
    quotedText: "愿主开我们的眼睛，使我们看见这家谱中深奥的启示。",
    content: "需要主开启我们的眼睛。这不仅是头脑的知识，更是属灵的看见。",
    createdAt: "2026-02-22T16:45:00Z",
  },
]

// Migration functions for backward compatibility with old data
export function migrateHighlight(h: Partial<Highlight> & { paragraphIndex: number; startOffset: number; endOffset: number; color: HighlightColor }): Highlight {
  return {
    id: h.id || `hl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    paragraphIndex: h.paragraphIndex,
    startOffset: h.startOffset,
    endOffset: h.endOffset,
    color: h.color || 'yellow',
    noteId: h.noteId,
    createdAt: h.createdAt || new Date().toISOString(),
  }
}

export function migrateNote(n: Partial<Note> & { id: string; highlightParagraphIndex: number; quotedText: string; content: string; createdAt: string }, highlights: Highlight[]): Note {
  // Try to find the associated highlight by paragraphIndex and noteId
  const highlight = highlights.find(h =>
    h.paragraphIndex === n.highlightParagraphIndex && h.noteId === n.id
  )
  
  return {
    id: n.id,
    highlightId: n.highlightId || highlight?.id || '',
    highlightParagraphIndex: n.highlightParagraphIndex,
    quotedText: n.quotedText,
    content: n.content,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }
}

// Helper function to generate unique IDs
export function generateHighlightId(): string {
  return `hl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
