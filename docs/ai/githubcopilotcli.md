---
title: "GitHub Copilot CLI の独自の魅力"
date: 2026-03-07
category: "ai"
description: "GitHub Copilot CLI が持つ独自の魅力を、コード例とユースケースを交えて徹底解説します。"
lang: "日本語"
---

# GitHub Copilot CLI の独自の魅力

## 概要・背景

GitHub Copilot はコードエディタ上の AI ペアプログラマーとして広く知られていますが、**GitHub Copilot CLI**（`gh copilot`）はその力をターミナルへと拡張したツールです。2023 年に GA となったこの拡張機能は、シェルコマンドの提案・説明・修正を自然言語で行える点が大きな特徴です。

エディタを離れてターミナルに集中したいエンジニア、DevOps エンジニア、あるいは「あのコマンドどう書くんだっけ…」と悩む瞬間を減らしたいすべての開発者にとって、Copilot CLI は強力な武器になります。

::: tip 前提条件
- GitHub CLI (`gh`) バージョン 2.x 以上がインストール済みであること
- GitHub Copilot のサブスクリプション（個人・Business・Enterprise のいずれか）
:::

---

## インストールと初期設定

```bash
# GitHub CLI のインストール（macOS の例）
brew install gh

# Copilot CLI 拡張機能のインストール
gh extension install github/gh-copilot

# ログイン（未認証の場合）
gh auth login

# 動作確認
gh copilot --version
```

Windows や Linux でも `winget` や `apt` 経由で `gh` を取得後、同様に `gh extension install` を実行するだけです。

---

## 詳細な解説

GitHub Copilot CLI が提供する主要サブコマンドは **3 つ**です。

### 1. `gh copilot suggest` — コマンドを提案させる

自然言語で「やりたいこと」を伝えると、対応するシェルコマンドを提案してくれます。

```bash
gh copilot suggest "カレントディレクトリ以下の .log ファイルをすべて削除したい"
```

**出力例:**

```
Suggestion:
  find . -type f -name "*.log" -delete

? Select an option
> Copy command to clipboard
  Explain command
  Revise command
  Exit
```

提案されたコマンドは **クリップボードへのコピー**・**その場での説明表示**・**追加修正** を対話的に選択できます。

---

### 2. `gh copilot explain` — コマンドを解説させる

難解なワンライナーや他人のスクリプトを即座に日本語で解説させることができます。

```bash
gh copilot explain "awk 'NR%2==0' /var/log/syslog | sort -u | head -20"
```

**出力例（抜粋）:**

```
This command:
1. Uses `awk` to print every even-numbered line from /var/log/syslog
2. Pipes to `sort -u` to remove duplicates
3. Shows the first 20 unique even lines with `head -20`
```

`--target shell` オプションで対象シェル（bash / zsh / fish / powershell）を明示することで、より正確な解説が得られます。

```bash
gh copilot explain --target shell "Set-ExecutionPolicy RemoteSigned"
```

---

### 3. `gh copilot suggest` の `--target` オプション

提案するコマンドの種類を絞ることも可能です。

| オプション値 | 説明 |
|---|---|
| `shell` | 汎用シェルコマンド（デフォルト） |
| `gh` | GitHub CLI コマンド |
| `git` | Git コマンド |

```bash
# GitHub CLI コマンドとして提案
gh copilot suggest --target gh "マージ済みブランチを一括削除したい"

# Git コマンドとして提案
gh copilot suggest --target git "直前のコミットメッセージを修正したい"
```

---

## コード例：実践的なシナリオ

### シナリオ A：CI/CD パイプラインのトラブルシューティング

```bash
# エラーログから原因を素早く把握
gh copilot explain "grep -E 'ERROR|FATAL' ./build.log | awk '{print $1, $2, $NF}' | sort | uniq -c | sort -rn"

# 修正コマンドを提案させる
gh copilot suggest "Docker イメージのビルドキャッシュを完全にクリアしてリビルドしたい"
```

### シナリオ B：Git 操作の支援

```bash
# 複雑なリベース操作を提案させる
gh copilot suggest --target git \
  "feature ブランチを main に rebase して、コンフリクトを theirs で解決したい"
```

**出力例:**

```
Suggestion:
  git rebase main && git checkout --theirs . && git add . && git rebase --continue
```

### シナリオ C：シェルスクリプト中で使う（非対話モード）

`--no-interactive` フラグを使うと CI スクリプト内でも利用できます。

```bash
#!/usr/bin/env bash
# suggest モードで提案を取得し、そのまま実行する（注意: 十分なレビューを推奨）
SUGGESTED=$(gh copilot suggest --no-interactive \
  "空のディレクトリのみを再帰的に削除したい")
echo "提案されたコマンド: $SUGGESTED"
```

::: warning セキュリティ上の注意
AI が提案したコマンドを**そのまま自動実行**することは避け、必ず内容を確認してから実行してください。
:::

---

## 実践的なユースケース

### ユースケース 1：オンボーディングの加速

新しくチームに加わった開発者が、慣れないリポジトリの CI/CD スクリプトや Makefile コマンドを素早く理解できます。

```bash
# Makefile のターゲットを解説させる
gh copilot explain "make -j$(nproc) VERBOSE=1 install DESTDIR=/tmp/staging"
```

### ユースケース 2：kubectl / cloud CLI の補助

Kubernetes や AWS CLI などの複雑なコマンドを自然言語で生成できます。

```bash
gh copilot suggest "クラッシュしている Pod のログを直近 100 行だけ取得したい（kubectl）"
# → kubectl logs --tail=100 <pod-name>

gh copilot suggest "S3 バケット内のファイルをストレージクラス GLACIER に一括移行したい（aws cli）"
```

### ユースケース 3：コードレビュー前の自己チェック

```bash
# 変更差分を概説させる（パイプ経由）
git diff HEAD~1 | gh copilot explain -
```

### ユースケース 4：エイリアス化してさらに手軽に

```bash
# ~/.bashrc や ~/.zshrc に追記
alias '??'='gh copilot suggest'
alias '?!'='gh copilot explain'
```

これにより次のように使えます。

```bash
?? "特定の IP アドレスへの通信だけ tcpdump でキャプチャしたい"
?! "ss -tulnp"
```

---

## 他ツールとの比較

| 機能 | Copilot CLI | `tldr` | `man` | ChatGPT（ブラウザ） |
|---|---|---|---|---|
| 自然言語入力 | ✅ | ❌ | ❌ | ✅ |
| ターミナル統合 | ✅ | ✅ | ✅ | ❌ |
| コンテキスト継続 | 限定的 | ❌ | ❌ | ✅ |
| オフライン利用 | ❌ | ✅ | ✅ | ❌ |
| GitHub 認証連携 | ✅ | ❌ | ❌ | ❌ |
| コマンド即実行 | ✅（確認付き） | ❌ | ❌ | ❌ |

Copilot CLI の最大の強みは「**ターミナルを離れずに AI の力を借りられる**」点と、**GitHub 認証・エコシステムとのシームレスな統合**にあります。

---

## まとめ

GitHub Copilot CLI は単なる「コマンドサジェスター」ではなく、ターミナルワークフロー全体を底上げするインテリジェントなアシスタントです。

- **`suggest`** で「どう書くか」を忘れる心配がなくなる
- **`explain`** で「なぜこう動くのか」を即座に理解できる
- **`--target`** オプションで `git` / `gh` / `shell` を使い分けることで精度が向上する
- エイリアスや CI スクリプトとの組み合わせで開発フローに自然に溶け込む

AI をエディタ内だけに留めず、ターミナルという最前線の作業場へと引き込む——それが GitHub Copilot CLI の独自の魅力です。ぜひ日常のシェル操作に取り入れてみてください。

---

*この記事は GitHub Copilot CLI を実際に動かしながら執筆しました。コマンドの挙動はバージョンにより異なる場合があります。最新情報は [公式ドキュメント](https://docs.github.com/en/copilot/github-copilot-in-the-cli) を参照してください。*

