// 記事の frontmatter に付けるカテゴリとタグを決める。
// サイトのテーマ（Teek）はこの categories / tags をもとに、トップの記事一覧・カテゴリ・タグ・
// アーカイブのページを作るので、自動生成するすべてのページで同じ規則を使う。

// 週刊ダイジェストの分野キー → カテゴリ名（docs/.vitepress/categories.ts の label と同じ）
export const FIELD_LABEL = {
  trending: 'トレンド OSS',
  genai: '生成AI',
  aws: 'AWS',
  factory: 'PLC・装置設計',
  engineering: '開発手法',
}

export const CONFERENCE_CATEGORY = '国際会議'

// 出現回数の多い順に上位 n 件の値を返す（同数なら先に出たもの）
function topValues(values, n) {
  const count = new Map()
  for (const v of values) if (v) count.set(v, (count.get(v) || 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v)
}

// 週刊ダイジェスト: カテゴリは分野名。タグはトレンド OSS なら主な言語、ニュースなら主な情報源
export function digestTaxonomy(category, data = {}) {
  const tags = category === 'trending'
    ? topValues((data.repos || []).map(r => r.language), 3)
    : topValues([...(data.news || []), ...(data.papers || [])].map(i => i.source), 3)
  return { categories: [FIELD_LABEL[category] || category], tags }
}

// 国際会議の各回: カテゴリは「国際会議」、タグは会議名と分野名
export function conferenceTaxonomy(confName, fieldLabel) {
  return { categories: [CONFERENCE_CATEGORY], tags: [confName, fieldLabel].filter(Boolean) }
}

// YAML のインライン配列として書き出す（JSON の文字列は YAML としても有効）
export function yamlList(key, values) {
  return `${key}: [${values.map(v => JSON.stringify(String(v))).join(', ')}]`
}

export function taxonomyLines({ categories, tags }) {
  return [yamlList('categories', categories), yamlList('tags', tags)]
}
