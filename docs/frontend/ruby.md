---
title: "Ruby 4.0 最新動向：ZJIT・Ruby Box・Ractor 強化で進化する言語"
date: 2026-03-07
category: "frontend"
description: "2025年12月にリリースされた Ruby 4.0 の主要な新機能（ZJIT、Ruby Box、Ractor 改善）と言語・コアクラスの変更点を実践的なコード例とともに解説する。"
lang: "日本語"
---

# Ruby 4.0 最新動向：ZJIT・Ruby Box・Ractor 強化で進化する言語

## 概要・背景

Ruby は 2025 年 12 月 25 日（クリスマス恒例リリース）に **Ruby 4.0.0** を公開し、翌 2026 年 1 月 13 日には **Ruby 4.0.1** のバグ修正版も届いた。30 周年を迎えた Ruby は、新世代 JIT コンパイラ **ZJIT**・定義スコープ分離機能 **Ruby Box**・**Ractor** の大幅な改善という三本柱でパフォーマンスと安全性を大きく前進させた。

本記事では Ruby 4.0 の主要な新機能を実際のコードを交えて紹介し、アップグレード時に注意すべき破壊的変更もまとめる。

---

## 詳細解説

### 1. ZJIT — 次世代 JIT コンパイラ

**ZJIT (Zapier/Shopify JIT)** は YJIT の後継として開発された新しい Just-In-Time コンパイラで、Ruby 4.0 にデフォルトでビルドされる（有効化は別途必要）。

| 比較項目 | YJIT | ZJIT |
|----------|------|------|
| コンパイル単位 | メソッド単位 | より大きな単位（SSA IR） |
| バックエンド | Rust | Rust（改良版） |
| サイドイグジット | あり | あり（改善済み） |
| 成熟度 | 本番投入可 | 実験的（4.0 時点） |

有効化は以下のいずれかで行う：

```bash
# フラグで有効化
ruby --zjit your_app.rb

# 環境変数で有効化
RUBY_ZJIT_ENABLE=1 ruby your_app.rb
```

```ruby
# アプリ起動後にプログラム内から有効化
RubyVM::ZJIT.enable
```

> ⚠️ ZJIT はインタープリターより高速だが、現時点では YJIT より遅いケースもある。本番環境への投入は Ruby 4.1 以降を待つことを推奨。

---

### 2. Ruby Box — 定義の分離・隔離機能（実験的）

`Ruby::Box` はモンキーパッチやグローバル変数の変更を「箱」の中に閉じ込める実験的機能。クラス・モジュール定義やネイティブライブラリのロードも Box 内に隔離される。

```bash
# 環境変数で有効化（Ruby 4.0 時点では要フラグ）
RUBY_BOX=1 ruby your_app.rb
```

期待されるユースケース：

```ruby
# テストケースを Box 内で実行し、他テストへのモンキーパッチ汚染を防ぐ
box = Ruby::Box.new
box.eval do
  class String
    def shout = upcase + "!!!"
  end
  puts "hello".shout  # => "HELLO!!!"
end

# Box の外では元の String は変更されていない
puts "hello".respond_to?(:shout)  # => false
```

主なユースケース：
- テスト実行時のモンキーパッチ汚染の防止
- ブルー/グリーンデプロイの同一プロセス内での並列実行
- 依存関係アップデートの差分評価

---

### 3. Ractor の強化 — 真の並列実行へ

Ractor は Ruby 3.0 で実験的導入されたが、4.0 では API が大幅に整理され実用性が増した。

#### `Ractor::Port` — 新しい同期プリミティブ

```ruby
port1 = Ractor::Port.new
port2 = Ractor::Port.new

worker = Ractor.new(port1, port2) do |p1, p2|
  p1 << "タスクA完了"
  p2 << "タスクB完了"
  p1 << "タスクC完了"
end

2.times { puts port1.receive }
# => タスクA完了
# => タスクC完了
puts port2.receive
# => タスクB完了
```

#### `Ractor#join` / `Ractor#value` — スレッドライクな待機

```ruby
ractor = Ractor.new { "計算結果: #{1 + 2}" }
ractor.join    # 終了を待機
puts ractor.value  # => 計算結果: 3
```

#### `Ractor.shareable_proc` — Proc の共有

```ruby
double = Ractor.shareable_proc { |x| x * 2 }

r = Ractor.new(double) do |fn|
  fn.call(21)
end
puts r.value  # => 42
```

> ℹ️ `Ractor.yield` / `Ractor#take` は削除された。`Ractor::Port` を使って移行する。

---

### 4. 言語構文の変更

#### 論理演算子の行頭継続

`||`・`&&`・`and`・`or` を行頭に書くと前の行の続きとして扱われる（フルーエントドットと同様）：

```ruby
# Ruby 4.0 から OK
result = fetch_data
  .filter_map { |item| process(item) }
  || fallback_data

if long_condition_one
   && long_condition_two
   && long_condition_three
  do_something
end
```

#### `*nil` の動作変更

```ruby
# Ruby 3.x: nil.to_a が呼ばれ [] に展開
# Ruby 4.0: **nil と同様に何も展開しない（破壊的変更）
def foo(*args) = args
foo(*nil)  # => []  ※ Ruby 4.0 では ArgumentError に注意
```

---

### 5. コアクラスの更新

#### `Array#rfind` の追加

```ruby
arr = [1, 2, 3, 4, 5, 4, 3]
arr.rfind { |x| x == 3 }   # => 3（末尾から検索、効率的）
# arr.reverse_each.find と等価だが高速
```

#### `Kernel#inspect` — 表示変数の制御

```ruby
class DatabaseConfig
  def initialize(host, user, password)
    @host     = host
    @user     = user
    @password = password
  end

  private def instance_variables_to_inspect = [:@host, :@user]
end

conf = DatabaseConfig.new("localhost", "root", "secret123")
puts conf.inspect
# => #<DatabaseConfig:0x... @host="localhost", @user="root">
# @password は表示されない！
```

#### `Set` と `Pathname` がコアクラスに昇格

```ruby
# require 不要になった
set = Set[1, 2, 3]
puts set.inspect  # => Set[1, 2, 3]  ※表示形式も変更

path = Pathname.new("/tmp/work")
path.join("output.txt").exist?
```

#### `String#strip` の拡張

```ruby
"  hello world  ".strip("lo ")  # => "hello world"（特定文字を除去）
"***hello***".lstrip("*")       # => "hello***"
```

---

## コード例

### ZJIT + Ractor を組み合わせた並列計算

```ruby
RubyVM::ZJIT.enable if defined?(RubyVM::ZJIT)

# Ractor::Port を使った Fan-out/Fan-in パターン
WORKERS = 4

result_port = Ractor::Port.new

workers = WORKERS.times.map do |i|
  Ractor.new(i, result_port) do |id, port|
    # CPU バウンドな計算（ZJIT が効果を発揮）
    sum = (1..1_000_000).sum { |n| n * id }
    port << { worker: id, result: sum }
  end
end

results = WORKERS.times.map { result_port.receive }
workers.each(&:join)

total = results.sum { |r| r[:result] }
puts "合計: #{total}"
```

### Ruby Box を使ったテスト隔離

```ruby
# テスト内でのモンキーパッチを Box に閉じ込める
def run_isolated_test(description, &block)
  box = Ruby::Box.new
  box.eval(&block)
  puts "✓ #{description}"
rescue => e
  puts "✗ #{description}: #{e.message}"
end

run_isolated_test("Array#sum のモック") do
  class Array
    def sum = 42  # モンキーパッチ
  end
  raise "失敗" unless [1, 2, 3].sum == 42
end

# Box 外の Array#sum は正常
puts [1, 2, 3].sum  # => 6
```

---

## ユースケース

| シーン | Ruby 4.0 の恩恵 |
|--------|-----------------|
| **高トラフィック Web アプリ** | YJIT（本番）/ ZJIT（将来）による高速化、Ractor でマルチコア活用 |
| **テスト自動化基盤** | Ruby Box でテスト間の副作用を完全に分離 |
| **マイクロサービス** | Ractor::Port による安全なメッセージパッシング |
| **セキュリティ重視の API** | `instance_variables_to_inspect` で機密情報をログから除外 |
| **段階的デプロイ** | Ruby Box で新バージョンをプロセス内で並列評価 |

---

## まとめ

Ruby 4.0 は **ZJIT**・**Ruby Box**・**Ractor の成熟** という三つの大きな柱によって、パフォーマンス・並列性・安全性の面で大きく前進した。特に `Ractor::Port` の導入によって並列プログラミングのモデルが整理され、実用的な並列アプリを書きやすくなった。`*nil` の挙動変更など破壊的な変更もあるため、3.x からの移行時は `ruby -W` で警告を確認しながら段階的に進めることを推奨する。

ZJIT はまだ実験段階だが、Ruby 4.1 以降でさらなる高速化が期待される。今のうちに実験・フィードバックを送ることがエコシステム全体の底上げにつながる。

---

## 参考資料

- [Ruby 4.0.0 Released](https://www.ruby-lang.org/en/news/2025/12/25/ruby-4-0-0-released/)
- [Ruby 4.0.1 Released](https://www.ruby-lang.org/en/news/2026/01/13/ruby-4-0-1-released/)
- [Launching ZJIT — Rails at Scale Blog](https://railsatscale.com/2025-12-24-launch-zjit/)
- [Ruby::Box Documentation](https://docs.ruby-lang.org/en/4.0/language/box_md.html)
- [Ractor::Port — Revamping the Ractor API (ko1's blog)](https://dev.to/ko1/ractorport-revamping-the-ractor-api-98)
- [Ruby 公式サイト ニュース一覧](https://www.ruby-lang.org/en/news/)
- [Ruby 4.0 GitHub Releases](https://github.com/ruby/ruby/releases/tag/v4.0.0)
