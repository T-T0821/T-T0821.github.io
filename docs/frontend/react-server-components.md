---
title: "React Server Components の仕組み"
date: 2026-03-07
category: "frontend"
description: "React Server Components（RSC）はサーバー側でのみ実行されるコンポーネントモデルであり、バンドルサイズ削減・データフェッチの効率化・セキュリティ向上をもたらす。本記事ではその内部アーキテクチャから実践的な使い方まで徹底解説する。"
lang: "日本語"
---

# React Server Components の仕組み

## 概要・背景

### なぜ React Server Components が生まれたのか

従来の React アプリケーションにはいくつかの根本的な課題がありました。

- **大きなバンドルサイズ**: ライブラリをクライアントに全て送り込む必要がある
- **ウォーターフォール型のデータフェッチ**: コンポーネントがマウントされてから初めてフェッチが始まる
- **クライアントとサーバーの分離**: API エンドポイントを介した間接的なデータアクセスが必要

これらの課題を解決するために、Meta（Facebook）の React チームは **React Server Components（RSC）** を設計しました。2020 年 12 月に RFC が公開され、Next.js 13 の App Router（2022 年）で実用化が進みました。

### SSR との違い

RSC はしばしば SSR（Server-Side Rendering）と混同されますが、根本的に異なります。

| 特徴 | SSR | RSC |
|------|-----|-----|
| 実行タイミング | リクエスト時にサーバーで HTML を生成 | サーバーでコンポーネントツリーをシリアライズ |
| クライアントへの送信 | HTML 文字列 | RSC ペイロード（特殊な JSON 形式） |
| ハイドレーション | 全コンポーネントをハイドレート | Server Components はハイドレート不要 |
| インタラクティビティ | 可能 | 不可（Client Components に委譲） |
| バンドルサイズへの影響 | なし | Server Components のコードはバンドルから除外 |

SSR と RSC は**組み合わせて使うことができ**、Next.js App Router はその典型例です。

---

## 詳細な解説

### アーキテクチャ概観

RSC の世界では、コンポーネントは 3 種類に分類されます。

```
Server Components  ─── サーバーでのみ実行・レンダリング
Client Components  ─── クライアント（ブラウザ）で実行
Shared Components  ─── どちらでも実行可能（状態・エフェクトなし）
```

### React コンポーネントツリーの二分割モデル

RSC では、コンポーネントツリーが「サーバー側ツリー」と「クライアント側ツリー」に分割されます。

```
[Server Tree]
  <Layout>           ← Server Component
    <Header>         ← Server Component
    <main>
      <ProductList>  ← Server Component（DB に直接アクセス）
        <ProductCard>← Server Component
          <LikeButton> ← Client Component（"use client" 境界）
```

`"use client"` ディレクティブが **クライアントとサーバーの境界（boundary）** を定義します。境界より下のツリーはクライアントバンドルに含まれます。

### RSC ペイロードの仕組み

Server Component がレンダリングされると、React は HTML ではなく独自のシリアライズ形式（**RSC Payload**）を生成します。

```
1:I{"id":"./src/components/LikeButton.tsx","chunks":["app/page"],"async":false}
2:{"userId":42,"productId":100}
0:["$","div",null,{"children":[["$","h1",null,{"children":"商品一覧"}],["$","$L1",null,{"initialLiked":false}]]}]
```

- `I` で始まる行：クライアントコンポーネントへの参照（実際のコードは含まない）
- `0` で始まる行：レンダリング済みのコンポーネントツリー（JSON 形式）
- Client Components はプレースホルダーとして埋め込まれ、クライアントで補完される

この設計により：
1. Server Components のソースコードはクライアントに**一切送られない**
2. クライアントは受け取った RSC Payload を使ってツリーを構築・ハイドレートする
3. ページ遷移時も RSC Payload を差分受信し、DOM を部分的に更新できる

### データフェッチのモデル

Server Components ではコンポーネント内で `async/await` が使えます。

```tsx
// app/products/page.tsx（Server Component）
async function ProductsPage() {
  // DB に直接アクセス（API 不要）
  const products = await db.product.findMany({ take: 20 });
  return (
    <ul>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </ul>
  );
}
```

React はコンポーネントツリーを並列・ストリーミングでレンダリングするため、ウォーターフォールを回避できます。

### Suspense との統合

RSC は React の `Suspense` と深く統合されており、**ストリーミング SSR** を実現します。

```tsx
// app/page.tsx
import { Suspense } from 'react';
import ProductList from './ProductList';
import Recommendations from './Recommendations';

export default function Page() {
  return (
    <div>
      <h1>ショップ</h1>
      {/* 商品一覧は即時表示 */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />
      </Suspense>
      {/* レコメンドは遅延してストリーミング */}
      <Suspense fallback={<RecommendationSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

サーバーは HTML を**チャンク単位でストリーム送信**するため、TTFB（Time To First Byte）を改善しつつ、重い処理が完了するまで他のコンテンツを表示できます。

---

## コード例

### 基本的な Server Component

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/posts';
import CommentSection from './CommentSection'; // Client Component

// デフォルトは Server Component（"use server" 不要）
export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>
        {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      {/* インタラクティブな部分だけ Client Component */}
      <CommentSection postId={post.id} />
    </article>
  );
}
```

### Client Component（"use client" ディレクティブ）

```tsx
// app/blog/[slug]/CommentSection.tsx
'use client'; // このファイル以下がクライアントバンドルに含まれる

import { useState, useTransition } from 'react';
import { submitComment } from './actions';

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const text = formData.get('comment') as string;
    startTransition(async () => {
      await submitComment({ postId, text });
      setComments(prev => [...prev, text]);
    });
  }

  return (
    <section>
      <h2>コメント</h2>
      <ul>
        {comments.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
      <form action={handleSubmit}>
        <textarea name="comment" required />
        <button type="submit" disabled={isPending}>
          {isPending ? '送信中...' : '送信'}
        </button>
      </form>
    </section>
  );
}
```

### Server Actions との連携

Server Actions（`"use server"` 関数）を使うと、クライアントからサーバー側のロジックを安全に呼び出せます。

```tsx
// app/blog/[slug]/actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CommentSchema = z.object({
  postId: z.string().uuid(),
  text: z.string().min(1).max(500),
});

export async function submitComment(input: unknown) {
  const { postId, text } = CommentSchema.parse(input);

  await db.comment.create({
    data: { postId, text, createdAt: new Date() },
  });

  // Server Component のキャッシュを無効化して再レンダリング
  revalidatePath(`/blog/${postId}`);
}
```

### データキャッシュの制御（Next.js）

```tsx
// app/products/page.tsx

// 1. デフォルト（キャッシュあり）
const res = await fetch('https://api.example.com/products');

// 2. 毎リクエスト再フェッチ（SSR 相当）
const res = await fetch('https://api.example.com/products', {
  cache: 'no-store',
});

// 3. 一定時間でキャッシュ再検証（ISR 相当）
const res = await fetch('https://api.example.com/products', {
  next: { revalidate: 60 }, // 60秒ごとに再検証
});

// 4. タグベースの再検証
const res = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] },
});
// 任意のタイミングでキャッシュ無効化
// revalidateTag('products');
```

### Server Component から Client Component へ props を渡す

```tsx
// ✅ 正しい例：シリアライズ可能な値を渡す
<ClientComponent
  name="Alice"
  count={42}
  items={['a', 'b', 'c']}
  config={{ theme: 'dark' }}
/>

// ✅ Server Component を children として渡す（合成パターン）
// page.tsx（Server Component）
export default function Page() {
  return (
    <InteractiveWrapper>
      <ServerContent /> {/* Server Component を children に */}
    </InteractiveWrapper>
  );
}

// InteractiveWrapper.tsx（Client Component）
'use client';
import { useState } from 'react';

export default function InteractiveWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}>Toggle</button>
      {open && children}
    </div>
  );
}

// ❌ 不正な例：関数・クラスインスタンスは渡せない
<ClientComponent onClick={() => console.log('click')} /> // Error!
```

---

## 実践的なユースケース

### 1. ダッシュボードの最適化

データ量が多いダッシュボードは RSC の恩恵を最も受けやすい構成です。

```
app/dashboard/
├── page.tsx              ← Server Component（データ取得・配置）
├── MetricsCard.tsx       ← Server Component（静的表示）
├── ChartWidget/
│   ├── index.tsx         ← Server Component（データ整形）
│   └── Chart.tsx         ← Client Component（Chart.js 等を使用）
└── FilterPanel.tsx       ← Client Component（状態管理が必要）
```

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import MetricsCard from './MetricsCard';
import ChartWidget from './ChartWidget';
import FilterPanel from './FilterPanel';
import { getMetrics, getSalesData } from '@/lib/analytics';

export default async function DashboardPage() {
  // 並列フェッチ
  const [metrics, salesData] = await Promise.all([
    getMetrics(),
    getSalesData({ period: '30d' }),
  ]);

  return (
    <div className="dashboard">
      <FilterPanel /> {/* Client Component */}
      <div className="metrics-grid">
        {metrics.map(m => <MetricsCard key={m.id} metric={m} />)}
      </div>
      <Suspense fallback={<ChartSkeleton />}>
        <ChartWidget data={salesData} />
      </Suspense>
    </div>
  );
}
```

### 2. 認証ゲート

Server Components ではセッション情報をサーバーで安全に検証できます。

```tsx
// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.role === 'admin') {
    redirect('/login');
  }

  return (
    <div>
      <AdminNav user={session.user} />
      {children}
    </div>
  );
}
```

### 3. 検索・フィルタリング（URL State パターン）

```tsx
// app/products/page.tsx（Server Component）
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const products = await searchProducts({
    query: searchParams.q ?? '',
    category: searchParams.category,
    page: Number(searchParams.page ?? 1),
  });

  return (
    <div>
      <SearchForm /> {/* Client Component：URL を更新 */}
      <ProductGrid products={products} />
    </div>
  );
}

// SearchForm.tsx（Client Component）
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSearch(formData: FormData) {
    const params = new URLSearchParams(searchParams);
    params.set('q', formData.get('q') as string);
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  }

  return (
    <form action={handleSearch}>
      <input name="q" defaultValue={searchParams.get('q') ?? ''} />
      <button type="submit">検索</button>
    </form>
  );
}
```

---

## 注意点とベストプラクティス

### Server Components でできないこと

```tsx
// ❌ useState / useEffect は使えない
'use server'; // これは不要（デフォルトで Server Component）
import { useState } from 'react'; // エラーになる

// ❌ ブラウザ API は使えない
const width = window.innerWidth; // エラーになる

// ❌ イベントハンドラを直接定義できない
<button onClick={() => {}}>Click</button> // エラーになる
```

### パフォーマンスのアンチパターン

```tsx
// ❌ N+1 問題：コンポーネント内で繰り返しフェッチ
async function ProductList() {
  const products = await getProducts();
  return (
    <ul>
      {products.map(async p => (
        // 各商品ごとに別フェッチが発生
        <li key={p.id}>{(await getReviews(p.id)).length} レビュー</li>
      ))}
    </ul>
  );
}

// ✅ 一括フェッチに改善
async function ProductList() {
  const [products, reviews] = await Promise.all([
    getProducts(),
    getAllReviews(), // 一括取得
  ]);
  const reviewMap = new Map(reviews.map(r => [r.productId, r]));
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>{reviewMap.get(p.id)?.count ?? 0} レビュー</li>
      ))}
    </ul>
  );
}
```

### `"use client"` 境界を最小化する

```
// ❌ ページ全体を Client Component にしてしまう
'use client';
export default function Page() { ... } // バンドルが肥大化

// ✅ インタラクティブな部分だけ切り出す
// page.tsx（Server Component）
export default function Page() {
  return <div><StaticContent /><InteractiveButton /></div>;
}
```

---

## まとめ

React Server Components は、React エコシステムにおける**アーキテクチャの根本的な変革**です。

| ポイント | 内容 |
|---------|------|
| バンドルサイズ | Server Components のコードはクライアントに含まれない |
| データフェッチ | サーバーで直接・並列フェッチ可能。ウォーターフォール回避 |
| セキュリティ | DB 接続・API キーをクライアントに公開しない |
| ストリーミング | Suspense と組み合わせて段階的な UI 表示が可能 |
| 既存 React との共存 | Client Components と組み合わせて段階的に移行可能 |

RSC は Next.js App Router を通じて実用フェーズに入っており、今後は Remix や他のフレームワークへの展開も進んでいます。`"use client"` 境界を適切に設計し、Server Components でデータ取得・静的表示を担い、Client Components でインタラクティビティを実装するという**責務の分離**が、RSC 活用の核心です。

---

## 参考資料

- [React Server Components RFC (GitHub)](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [React 公式ドキュメント: Server Components](https://react.dev/reference/rsc/server-components)
- [React 公式ドキュメント: "use client"](https://react.dev/reference/rsc/use-client)
- [React 公式ドキュメント: "use server"](https://react.dev/reference/rsc/use-server)
- [Next.js 公式ドキュメント: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js 公式ドキュメント: Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Next.js 公式ドキュメント: Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js 公式ドキュメント: Data Fetching & Caching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- [Dan Abramov: "RSC From Scratch. Part 1: Server Components" (GitHub)](https://github.com/reactwg/server-components/discussions/5)
- [Demystifying React Server Components with NextJS 13 App Router (Josh tried coding)](https://www.joshwcomeau.com/react/server-components/)
- [Making Sense of React Server Components (Josh W. Comeau)](https://www.joshwcomeau.com/react/server-components/)
- [React Server Components: the Good, the Bad, and the Ugly (Thierry Launay, LogRocket)](https://blog.logrocket.com/react-server-components-comprehensive-guide/)
- [GitHub: react-server-components (公式デモリポジトリ)](https://github.com/reactjs/server-components-demo)
- [Patterns.dev: React Server Components](https://www.patterns.dev/react/react-server-components/)
