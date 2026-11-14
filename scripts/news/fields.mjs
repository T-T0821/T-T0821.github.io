// 分野別ダイジェストの設定。分野やフィードを増やすときはここを編集する。
// category は docs/<category>/ と data/<category>/ のディレクトリ名になる。
// 新しいホストを追加した場合は、Claude Code のクラウド環境の「許可するドメイン」にも追加すること。

const arxiv = query =>
  `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}` +
  '&sortBy=submittedDate&sortOrder=descending&max_results=40'

export const FIELDS = [
  {
    category: 'aws',
    label: 'AWS',
    focus: 'AWS の新サービス・機能追加・料金や仕様の変更、アーキテクチャのベストプラクティス',
    feeds: [
      { name: "AWS What's New", url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/' },
      { name: 'AWS News Blog', url: 'https://aws.amazon.com/blogs/aws/feed/' },
      { name: 'AWS Architecture Blog', url: 'https://aws.amazon.com/blogs/architecture/feed/' },
    ],
    papers: [
      {
        name: 'arXiv',
        url: arxiv(
          '(abs:"Amazon Web Services" OR abs:AWS OR abs:serverless OR abs:"cloud-native") AND (cat:cs.DC OR cat:cs.NI OR cat:cs.SE)',
        ),
      },
    ],
  },
  {
    category: 'factory',
    label: 'PLC・装置設計',
    focus: 'PLC・FA（ファクトリーオートメーション）・制御、装置設計、産業用ロボット、IEC 61131-3 / IEC 61499、OPC UA、デジタルツイン、スマート工場',
    feeds: [
      { name: 'MONOist', url: 'https://rss.itmedia.co.jp/rss/2.0/monoist.xml' },
    ],
    papers: [
      {
        name: 'arXiv',
        url: arxiv(
          '(abs:PLC OR abs:"programmable logic controller" OR abs:"IEC 61131" OR abs:"IEC 61499" OR abs:"industrial automation" OR abs:"factory automation" OR abs:"OPC UA" OR abs:"digital twin" OR abs:"industrial control") AND (cat:eess.SY OR cat:cs.RO OR cat:cs.SE OR cat:cs.AI)',
        ),
      },
    ],
  },
  {
    category: 'genai',
    label: '生成AI',
    focus: '生成AI・大規模言語モデル（LLM）・AIエージェントの新モデル、新機能、研究成果、実務での活用',
    feeds: [
      { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml' },
      { name: 'Google AI Blog', url: 'https://blog.google/innovation-and-ai/technology/ai/rss/' },
      { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
    ],
    papers: [{ name: 'Hugging Face Daily Papers', huggingface: true }],
  },
  {
    category: 'engineering',
    label: '開発手法・エンジニアリング',
    focus: 'ソフトウェア開発手法、アーキテクチャ、DevOps・プラットフォームエンジニアリング、テスト、AI を使った開発プロセス、組織とエンジニアリングマネジメントの最新動向',
    feeds: [
      { name: 'InfoQ', url: 'https://feed.infoq.com/' },
      { name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom' },
      { name: 'Publickey', url: 'https://www.publickey1.jp/atom.xml' },
    ],
    papers: [{ name: 'arXiv', url: arxiv('cat:cs.SE') }],
  },
]
