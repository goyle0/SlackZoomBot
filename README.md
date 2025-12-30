# Slack Zoom Bot

SlackのSlash Command (`/zoom`) から、Zoom会議を作成・予定確認できるBotシステム

## 概要

| 項目 | 内容 |
|------|------|
| **技術スタック** | TypeScript, AWS Lambda, Slack Bolt SDK, Zoom API |
| **アーキテクチャ** | サーバーレス（Lambda Function URL） |
| **リージョン** | ap-northeast-1（東京） |

## 主な機能

- **会議作成**: 3つのZoomアカウント（A/B/C）から選択して即時会議を作成
- **予定確認**: 当日の会議予定を一覧表示（個別/全アカウント）
- **モーダルUI**: Slack Block Kitによる直感的な操作

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/slack-zoom-bot.git
cd slack-zoom-bot

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集して認証情報を設定

# ローカル開発（ngrok必要）
npm run dev

# AWSにデプロイ
npm run deploy
```

## ディレクトリ構成

```
slack-zoom-bot/
├── README.md                    # プロジェクト概要（本ファイル）
├── BASIC_DESIGN.md              # 基本設計書
├── DETAILED_DESIGN.md           # 詳細設計書
├── package.json                 # 依存関係・スクリプト
├── tsconfig.json                # TypeScript設定
├── serverless.yml               # Serverless Framework設定
├── .env.example                 # 環境変数テンプレート
├── .eslintrc.json               # ESLint設定
├── .prettierrc                  # Prettier設定
├── .gitignore
│
└── src/
    ├── index.ts                 # Lambda エントリポイント + Slack App
    │
    ├── handlers/
    │   ├── index.ts             # ハンドラのエクスポート
    │   ├── commands/
    │   │   └── zoom.ts          # /zoom コマンドハンドラ
    │   └── modals/
    │       ├── zoomModal.ts     # Modal 送信ハンドラ
    │       └── callbacks.ts     # コールバックID定義
    │
    ├── services/
    │   ├── index.ts             # サービスのエクスポート
    │   ├── zoom/
    │   │   ├── ZoomClient.ts    # Zoom API クライアント
    │   │   ├── ZoomAuthService.ts # OAuth認証サービス
    │   │   ├── types.ts         # Zoom関連の型定義
    │   │   └── index.ts
    │   └── slack/
    │       ├── ModalBuilder.ts  # モーダルUI構築
    │       ├── MessageBuilder.ts # メッセージ構築
    │       ├── blocks.ts        # Block Kit コンポーネント
    │       └── index.ts
    │
    ├── config/
    │   ├── index.ts             # 設定エクスポート
    │   ├── env.ts               # 環境変数読み込み
    │   └── zoomAccounts.ts      # Zoomアカウント設定
    │
    ├── types/
    │   ├── index.ts             # 型定義エクスポート
    │   ├── slack.ts             # Slack関連の型
    │   └── common.ts            # 共通型定義
    │
    └── utils/
        ├── index.ts             # ユーティリティエクスポート
        ├── logger.ts            # 構造化ロガー
        ├── errors.ts            # カスタムエラー
        └── dateTime.ts          # 日時ユーティリティ
```

## 環境変数

`.env.example`をコピーして`.env`を作成し、以下の値を設定してください。

| 変数名 | 説明 |
|--------|------|
| `SLACK_SIGNING_SECRET` | Slack App の Signing Secret |
| `SLACK_BOT_TOKEN` | Slack Bot の OAuth Token（xoxb-...） |
| `ZOOM_ACCOUNT_A_ACCOUNT_ID` | Zoom Account A の Account ID |
| `ZOOM_ACCOUNT_A_CLIENT_ID` | Zoom Account A の Client ID |
| `ZOOM_ACCOUNT_A_CLIENT_SECRET` | Zoom Account A の Client Secret |
| `ZOOM_ACCOUNT_B_*` | Zoom Account B 用（同上） |
| `ZOOM_ACCOUNT_C_*` | Zoom Account C 用（同上） |

## NPM スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | ローカル開発サーバー起動（serverless-offline） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint 実行 |
| `npm run lint:fix` | ESLint 自動修正 |
| `npm run format` | Prettier フォーマット |
| `npm run deploy` | AWS Lambda にデプロイ（dev環境） |
| `npm run deploy:prod` | AWS Lambda にデプロイ（prod環境） |
| `npm run logs` | CloudWatch Logs をリアルタイム表示 |

## セットアップ手順

### 1. Slack App 作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→「From scratch」
3. 以下の機能を設定:

   **Slash Commands:**
   - Command: `/zoom`
   - Request URL: `{Lambda Function URL}`
   - Short Description: `Zoom会議を作成・確認`

   **Interactivity & Shortcuts:**
   - Interactivity: On
   - Request URL: `{Lambda Function URL}`

   **OAuth & Permissions (Bot Token Scopes):**
   - `commands`
   - `chat:write`

4. ワークスペースにインストール
5. Signing Secret と Bot User OAuth Token をメモ

### 2. Zoom App 作成（アカウントごとに実施）

1. [Zoom Marketplace](https://marketplace.zoom.us/) にアクセス
2. 「Develop」→「Build App」
3. 「Server-to-Server OAuth」を選択
4. 以下のスコープを追加:
   - `meeting:write:admin`
   - `meeting:read:admin`
5. 「Activate」でアプリを有効化
6. Account ID, Client ID, Client Secret をメモ

### 3. デプロイ

```bash
# AWS CLIの設定（未設定の場合）
aws configure

# デプロイ
npm run deploy

# 出力されたFunction URLをSlack Appに設定
```

## 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| **言語** | TypeScript | ^5.3 | 型安全な開発 |
| **ランタイム** | Node.js | 20.x | AWS Lambda ランタイム |
| **フレームワーク** | Slack Bolt | ^3.18 | Slack Bot 開発 |
| **HTTP Client** | axios | ^1.6 | Zoom API 通信 |
| **IaC** | Serverless Framework | ^3.38 | AWS デプロイ |
| **ビルド** | serverless-esbuild | ^1.52 | TypeScriptバンドル |
| **テスト** | Vitest | ^1.2 | ユニットテスト |

## コスト見積もり

| サービス | 無料枠 | 想定使用量 | 月額コスト |
|----------|--------|-----------|-----------|
| AWS Lambda | 100万リクエスト/月 | ~1,000リクエスト | $0 |
| CloudWatch Logs | 5GB/月 | ~100MB | $0 |
| **合計** | - | - | **$0** |

※ 個人利用レベルでは無料枠内で運用可能

## ドキュメント

- [基本設計書](./BASIC_DESIGN.md) - システム概要、機能要件、アーキテクチャ設計
- [詳細設計書](./DETAILED_DESIGN.md) - モジュール設計、クラス設計、API仕様

## ライセンス

MIT License
