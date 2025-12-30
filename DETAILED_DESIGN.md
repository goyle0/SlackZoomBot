# 詳細設計書

## 1. ドキュメント情報

| 項目 | 内容 |
|------|------|
| **プロジェクト名** | Slack Zoom Bot |
| **バージョン** | 1.1.0 |
| **作成日** | 2024-12-30 |
| **更新日** | 2024-12-30 |
| **前提ドキュメント** | [基本設計書](BASIC_DESIGN.md) |

---

## 2. ディレクトリ構成

```
slack-zoom-bot/
├── README.md                           # プロジェクト概要
├── package.json                        # 依存関係・スクリプト
├── package-lock.json
├── tsconfig.json                       # TypeScript設定
├── serverless.yml                      # Serverless Framework設定
├── .env.example                        # 環境変数テンプレート
├── .eslintrc.json                      # ESLint設定
├── .prettierrc                         # Prettier設定
├── .gitignore
│
├── docs/
│   ├── BASIC_DESIGN.md                 # 基本設計書
│   └── DETAILED_DESIGN.md              # 詳細設計書（本ドキュメント）
│
├── src/
│   ├── index.ts                        # Lambda エントリポイント + Slack App初期化
│   │
│   ├── handlers/
│   │   ├── index.ts                    # ハンドラのエクスポート
│   │   ├── commands/
│   │   │   └── zoom.ts                 # /zoom コマンドハンドラ
│   │   └── modals/
│   │       ├── zoomModal.ts            # メインモーダル送信ハンドラ
│   │       └── callbacks.ts            # コールバックID定義
│   │
│   ├── services/
│   │   ├── index.ts                    # サービスのエクスポート
│   │   ├── zoom/
│   │   │   ├── ZoomClient.ts           # Zoom API クライアント
│   │   │   ├── ZoomAuthService.ts      # OAuth認証サービス
│   │   │   └── types.ts                # Zoom関連の型定義
│   │   └── slack/
│   │       ├── ModalBuilder.ts         # モーダルUI構築
│   │       ├── MessageBuilder.ts       # メッセージ構築
│   │       └── blocks.ts               # Block Kit コンポーネント
│   │
│   ├── config/
│   │   ├── index.ts                    # 設定エクスポート
│   │   ├── env.ts                      # 環境変数読み込み
│   │   └── zoomAccounts.ts             # Zoomアカウント設定
│   │
│   ├── types/
│   │   ├── index.ts                    # 型定義エクスポート
│   │   ├── slack.ts                    # Slack関連の型
│   │   └── common.ts                   # 共通型定義
│   │
│   └── utils/
│       ├── index.ts                    # ユーティリティエクスポート
│       ├── logger.ts                   # ロガー
│       ├── errors.ts                   # カスタムエラー
│       └── dateTime.ts                 # 日時ユーティリティ
│
├── tests/
│   ├── setup.ts                        # テストセットアップ
│   ├── handlers/
│   │   └── commands/
│   │       └── zoom.test.ts
│   ├── services/
│   │   └── zoom/
│   │       └── ZoomClient.test.ts
│   └── mocks/
│       ├── slack.ts                    # Slackモック
│       └── zoom.ts                     # Zoomモック
│
└── .github/
    └── workflows/
        └── deploy.yml                  # CI/CDワークフロー
```

---

## 3. モジュール設計

### 3.1 モジュール依存関係

```
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                             │
│              (Lambda Handler + Slack App 初期化)             │
└─────────────────────────────┬───────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│     handlers/     │ │    config/    │ │      utils/       │
│  - commands/zoom  │ │  - env        │ │  - logger         │
│  - modals/*       │ │  - accounts   │ │  - errors         │
└─────────┬─────────┘ └───────────────┘ └───────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                        services/                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │       zoom/         │    │          slack/             │ │
│  │  - ZoomClient       │    │  - ModalBuilder             │ │
│  │  - ZoomAuthService  │    │  - MessageBuilder           │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 各モジュールの責務

| モジュール | 責務 | 依存先 |
|-----------|------|--------|
| `index.ts` | Lambda関数のエントリポイント、Slack App初期化 | handlers/, config/, utils/ |
| `handlers/commands/zoom.ts` | /zoomコマンド処理 | services/, utils/ |
| `handlers/modals/zoomModal.ts` | モーダル送信処理 | services/, utils/ |
| `services/zoom/ZoomClient.ts` | Zoom API操作 | ZoomAuthService |
| `services/zoom/ZoomAuthService.ts` | OAuth認証 | config/ |
| `services/slack/ModalBuilder.ts` | モーダルUI生成 | - |
| `services/slack/MessageBuilder.ts` | メッセージ生成 | - |
| `config/env.ts` | 環境変数管理 | - |
| `utils/logger.ts` | ログ出力 | - |
| `utils/errors.ts` | カスタムエラー | - |

---

## 4. クラス・インターフェース設計

### 4.1 型定義 (`src/types/`)

```typescript
// src/types/common.ts

/** 会議の所要時間（分） */
export type MeetingDuration = 30 | 60 | 90;

/** アクション種別 */
export type ActionType = 'create' | 'list';

/** Zoomアカウント識別子 */
export type ZoomAccountId = 'a' | 'b' | 'c';
```

```typescript
// src/types/slack.ts

import { ActionType, MeetingDuration, ZoomAccountId } from './common';

/** モーダル送信時のフォームデータ */
export interface ZoomModalFormData {
  action: ActionType;
  account: ZoomAccountId | 'all';
  duration?: MeetingDuration;
  topic?: string;
}

/** モーダルのビュー状態 */
export interface ZoomModalState {
  responseUrl: string;
  channelId: string;
  userId: string;
}
```

```typescript
// src/services/zoom/types.ts

/** Zoomアカウント設定 */
export interface ZoomAccountConfig {
  id: string;
  name: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
}

/** Zoom OAuthトークンレスポンス */
export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Zoom会議作成リクエスト */
export interface CreateMeetingRequest {
  topic: string;
  type: 2;  // Scheduled Meeting
  start_time: string;
  duration: number;
  timezone: string;
}

/** Zoom会議作成レスポンス */
export interface CreateMeetingResponse {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  password?: string;
}

/** Zoom会議一覧レスポンス */
export interface ListMeetingsResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  meetings: ZoomMeeting[];
}

/** Zoom会議情報 */
export interface ZoomMeeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
}
```

### 4.2 サービスクラス

#### ZoomAuthService

```typescript
// src/services/zoom/ZoomAuthService.ts

import axios from 'axios';
import { ZoomAccountConfig, ZoomTokenResponse } from './types';

/**
 * Zoom OAuth認証サービス
 * Server-to-Server OAuth 方式でアクセストークンを取得
 */
export class ZoomAuthService {
  private static readonly TOKEN_URL = 'https://zoom.us/oauth/token';
  
  /** トークンキャッシュ（アカウントID -> トークン情報） */
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  /**
   * アクセストークンを取得
   * キャッシュが有効な場合はキャッシュから返却
   */
  async getAccessToken(account: ZoomAccountConfig): Promise<string> {
    const cached = this.tokenCache.get(account.id);
    const now = Date.now();
    
    // キャッシュが有効（有効期限の5分前まで）
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      return cached.token;
    }

    // 新規トークン取得
    const token = await this.fetchToken(account);
    return token;
  }

  /**
   * Zoom APIからトークンを取得
   */
  private async fetchToken(account: ZoomAccountConfig): Promise<string> {
    const credentials = Buffer.from(
      `${account.clientId}:${account.clientSecret}`
    ).toString('base64');

    const response = await axios.post<ZoomTokenResponse>(
      ZoomAuthService.TOKEN_URL,
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: account.accountId,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;
    
    // キャッシュに保存
    this.tokenCache.set(account.id, {
      token: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    });

    return access_token;
  }
}
```

#### ZoomClient

```typescript
// src/services/zoom/ZoomClient.ts

import axios, { AxiosInstance } from 'axios';
import { ZoomAuthService } from './ZoomAuthService';
import {
  ZoomAccountConfig,
  CreateMeetingRequest,
  CreateMeetingResponse,
  ListMeetingsResponse,
} from './types';
import { logger } from '../../utils/logger';

/**
 * Zoom API クライアント
 */
export class ZoomClient {
  private static readonly BASE_URL = 'https://api.zoom.us/v2';
  private readonly authService: ZoomAuthService;
  private readonly httpClient: AxiosInstance;

  constructor(authService: ZoomAuthService) {
    this.authService = authService;
    this.httpClient = axios.create({
      baseURL: ZoomClient.BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * 会議を作成
   */
  async createMeeting(
    account: ZoomAccountConfig,
    request: CreateMeetingRequest
  ): Promise<CreateMeetingResponse> {
    const token = await this.authService.getAccessToken(account);
    
    logger.info('Creating Zoom meeting', {
      accountId: account.id,
      topic: request.topic,
    });

    const response = await this.httpClient.post<CreateMeetingResponse>(
      '/users/me/meetings',
      request,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    logger.info('Zoom meeting created', {
      meetingId: response.data.id,
      joinUrl: response.data.join_url,
    });

    return response.data;
  }

  /**
   * 会議一覧を取得
   */
  async listMeetings(
    account: ZoomAccountConfig,
    type: 'upcoming' | 'scheduled' = 'upcoming',
    pageSize: number = 10
  ): Promise<ListMeetingsResponse> {
    const token = await this.authService.getAccessToken(account);
    
    logger.info('Fetching Zoom meetings', {
      accountId: account.id,
      type,
    });

    const response = await this.httpClient.get<ListMeetingsResponse>(
      '/users/me/meetings',
      {
        params: { type, page_size: pageSize },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  }
}
```

#### ModalBuilder

```typescript
// src/services/slack/ModalBuilder.ts

import { View } from '@slack/bolt';
import { CALLBACK_IDS } from '../../handlers/modals/callbacks';

/**
 * Slack Modal UI ビルダー
 */
export class ModalBuilder {
  /**
   * Zoom操作モーダルを構築
   */
  static buildZoomModal(privateMetadata: string): View {
    return {
      type: 'modal',
      callback_id: CALLBACK_IDS.ZOOM_MODAL,
      private_metadata: privateMetadata,
      title: {
        type: 'plain_text',
        text: 'Zoom Meeting',
      },
      submit: {
        type: 'plain_text',
        text: '実行',
      },
      close: {
        type: 'plain_text',
        text: 'キャンセル',
      },
      blocks: [
        // アクション選択
        {
          type: 'input',
          block_id: 'action_block',
          element: {
            type: 'static_select',
            action_id: 'action_select',
            placeholder: {
              type: 'plain_text',
              text: '操作を選択',
            },
            options: [
              {
                text: { type: 'plain_text', text: '🎥 会議を作成' },
                value: 'create',
              },
              {
                text: { type: 'plain_text', text: '📅 予定を確認' },
                value: 'list',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: '操作',
          },
        },
        // アカウント選択
        {
          type: 'input',
          block_id: 'account_block',
          element: {
            type: 'static_select',
            action_id: 'account_select',
            placeholder: {
              type: 'plain_text',
              text: 'アカウントを選択',
            },
            options: [
              {
                text: { type: 'plain_text', text: 'Account A' },
                value: 'a',
              },
              {
                text: { type: 'plain_text', text: 'Account B' },
                value: 'b',
              },
              {
                text: { type: 'plain_text', text: 'Account C' },
                value: 'c',
              },
              {
                text: { type: 'plain_text', text: '全てのアカウント' },
                value: 'all',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: 'Zoomアカウント',
          },
        },
        // 所要時間選択
        {
          type: 'input',
          block_id: 'duration_block',
          optional: true,
          element: {
            type: 'static_select',
            action_id: 'duration_select',
            placeholder: {
              type: 'plain_text',
              text: '所要時間を選択',
            },
            options: [
              {
                text: { type: 'plain_text', text: '30分' },
                value: '30',
              },
              {
                text: { type: 'plain_text', text: '60分' },
                value: '60',
              },
              {
                text: { type: 'plain_text', text: '90分' },
                value: '90',
              },
            ],
            initial_option: {
              text: { type: 'plain_text', text: '60分' },
              value: '60',
            },
          },
          label: {
            type: 'plain_text',
            text: '所要時間（会議作成時）',
          },
        },
        // 会議名入力
        {
          type: 'input',
          block_id: 'topic_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'topic_input',
            placeholder: {
              type: 'plain_text',
              text: '会議名を入力（省略可）',
            },
          },
          label: {
            type: 'plain_text',
            text: '会議名',
          },
        },
      ],
    };
  }
}
```

#### MessageBuilder

```typescript
// src/services/slack/MessageBuilder.ts

import { CreateMeetingResponse, ZoomMeeting } from '../zoom/types';

/**
 * Slackメッセージビルダー
 */
export class MessageBuilder {
  /**
   * 会議作成完了メッセージを構築
   */
  static buildMeetingCreatedMessage(
    meeting: CreateMeetingResponse,
    accountName: string
  ): object {
    return {
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Zoom会議を作成しました*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*会議名:*\n${meeting.topic}`,
            },
            {
              type: 'mrkdwn',
              text: `*アカウント:*\n${accountName}`,
            },
            {
              type: 'mrkdwn',
              text: `*所要時間:*\n${meeting.duration}分`,
            },
            {
              type: 'mrkdwn',
              text: `*会議ID:*\n${meeting.id}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*参加URL:*\n${meeting.join_url}`,
          },
        },
      ],
    };
  }

  /**
   * 会議一覧メッセージを構築
   */
  static buildMeetingListMessage(
    accountMeetings: { accountName: string; meetings: ZoomMeeting[] }[]
  ): object {
    const blocks: object[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📅 *本日の予定一覧*`,
        },
      },
      { type: 'divider' },
    ];

    for (const { accountName, meetings } of accountMeetings) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${accountName}*`,
        },
      });

      if (meetings.length === 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_予定なし_',
          },
        });
      } else {
        for (const meeting of meetings) {
          const startTime = new Date(meeting.start_time).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          });
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• ${startTime} - ${meeting.topic}\n  <${meeting.join_url}|参加する>`,
            },
          });
        }
      }

      blocks.push({ type: 'divider' });
    }

    return {
      response_type: 'ephemeral',
      blocks,
    };
  }
}
```

### 4.3 コールバックID定義

```typescript
// src/handlers/modals/callbacks.ts

/**
 * Slackモーダルのコールバック ID
 */
export const CALLBACK_IDS = {
  ZOOM_MODAL: 'zoom_modal_submit',
} as const;
```

### 4.4 ハンドラ

#### /zoom コマンドハンドラ

```typescript
// src/handlers/commands/zoom.ts

import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { ModalBuilder } from '../../services/slack/ModalBuilder';
import { ZoomModalState } from '../../types/slack';
import { logger } from '../../utils/logger';

/**
 * /zoom コマンドハンドラ
 */
export async function handleZoomCommand(
  args: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  const { command, client, ack } = args;

  // 3秒以内にAck（必須）
  await ack();

  logger.info('/zoom command received', {
    userId: command.user_id,
    channelId: command.channel_id,
  });

  // モーダル状態をprivate_metadataに保存
  const state: ZoomModalState = {
    responseUrl: command.response_url,
    channelId: command.channel_id,
    userId: command.user_id,
  };

  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: ModalBuilder.buildZoomModal(JSON.stringify(state)),
    });
  } catch (error) {
    logger.error('Failed to open modal', { error });
    throw error;
  }
}
```

#### モーダル送信ハンドラ

```typescript
// src/handlers/modals/zoomModal.ts

import {
  ViewSubmitAction,
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
} from '@slack/bolt';
import axios from 'axios';
import { ZoomClient } from '../../services/zoom/ZoomClient';
import { ZoomAuthService } from '../../services/zoom/ZoomAuthService';
import { MessageBuilder } from '../../services/slack/MessageBuilder';
import { getZoomAccount, getAllZoomAccounts } from '../../config/zoomAccounts';
import { ZoomModalFormData, ZoomModalState } from '../../types/slack';
import { MeetingDuration, ZoomAccountId } from '../../types/common';
import { logger } from '../../utils/logger';
import { formatToISOString } from '../../utils/dateTime';

const authService = new ZoomAuthService();
const zoomClient = new ZoomClient(authService);

/**
 * Zoomモーダル送信ハンドラ
 */
export async function handleZoomModalSubmit(
  args: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs
): Promise<void> {
  const { ack, view } = args;

  // モーダルを閉じる（必須）
  await ack();

  // フォームデータを抽出
  const formData = extractFormData(view.state.values);
  const state: ZoomModalState = JSON.parse(view.private_metadata);

  logger.info('Modal submitted', { formData, state });

  try {
    if (formData.action === 'create') {
      await handleCreateMeeting(formData, state);
    } else {
      await handleListMeetings(formData, state);
    }
  } catch (error) {
    logger.error('Error handling modal submit', { error });
    await sendErrorMessage(state.responseUrl, error);
  }
}

/**
 * フォームデータを抽出
 */
function extractFormData(values: Record<string, any>): ZoomModalFormData {
  return {
    action: values.action_block.action_select.selected_option.value,
    account: values.account_block.account_select.selected_option.value,
    duration: values.duration_block?.duration_select?.selected_option?.value
      ? parseInt(values.duration_block.duration_select.selected_option.value) as MeetingDuration
      : 60,
    topic: values.topic_block?.topic_input?.value || undefined,
  };
}

/**
 * 会議作成処理
 */
async function handleCreateMeeting(
  formData: ZoomModalFormData,
  state: ZoomModalState
): Promise<void> {
  if (formData.account === 'all') {
    throw new Error('会議作成時は個別のアカウントを選択してください');
  }

  const account = getZoomAccount(formData.account as ZoomAccountId);
  const topic = formData.topic || `Slack Meeting (${new Date().toLocaleDateString('ja-JP')})`;

  const meeting = await zoomClient.createMeeting(account, {
    topic,
    type: 2,
    start_time: formatToISOString(new Date()),
    duration: formData.duration || 60,
    timezone: 'Asia/Tokyo',
  });

  const message = MessageBuilder.buildMeetingCreatedMessage(meeting, account.name);
  await sendSlackMessage(state.responseUrl, message);
}

/**
 * 予定確認処理
 */
async function handleListMeetings(
  formData: ZoomModalFormData,
  state: ZoomModalState
): Promise<void> {
  const accounts = formData.account === 'all'
    ? getAllZoomAccounts()
    : [getZoomAccount(formData.account as ZoomAccountId)];

  const allMeetings: { accountName: string; meetings: any[] }[] = [];

  for (const account of accounts) {
    const response = await zoomClient.listMeetings(account, 'upcoming', 10);
    allMeetings.push({
      accountName: account.name,
      meetings: response.meetings,
    });
  }

  const message = MessageBuilder.buildMeetingListMessage(allMeetings);
  await sendSlackMessage(state.responseUrl, message);
}

/**
 * Slackにメッセージを送信
 */
async function sendSlackMessage(responseUrl: string, message: any): Promise<void> {
  await axios.post(responseUrl, message);
}

/**
 * エラーメッセージを送信
 */
async function sendErrorMessage(responseUrl: string, error: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
  await axios.post(responseUrl, {
    response_type: 'ephemeral',
    text: `❌ エラー: ${errorMessage}`,
  });
}
```

---

## 5. エントリポイント（修正版）

### 5.1 index.ts (Lambda Handler + Slack App)

**重要**: `AwsLambdaReceiver` を `App` に渡す必要があります。

```typescript
// src/index.ts

import { App, AwsLambdaReceiver } from '@slack/bolt';
import { handleZoomCommand } from './handlers/commands/zoom';
import { handleZoomModalSubmit } from './handlers/modals/zoomModal';
import { CALLBACK_IDS } from './handlers/modals/callbacks';
import { logger } from './utils/logger';

// ========================================
// AWS Lambda Receiver 初期化
// ========================================
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// ========================================
// Slack Bolt App 初期化
// ========================================
const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver: awsLambdaReceiver,  // 重要: receiverを渡す
});

// ========================================
// ハンドラ登録
// ========================================

// /zoom コマンド
app.command('/zoom', handleZoomCommand);

// モーダル送信
app.view(CALLBACK_IDS.ZOOM_MODAL, handleZoomModalSubmit);

// ========================================
// エラーハンドラ
// ========================================
app.error(async (error) => {
  logger.error('Unhandled error in Slack app', { error });
});

logger.info('Slack Bolt app initialized');

// ========================================
// Lambda Handler エクスポート
// ========================================
export const handler = async (
  event: any,
  context: any,
  callback: any
): Promise<any> => {
  logger.info('Lambda invoked', {
    path: event.rawPath || event.path,
    method: event.requestContext?.http?.method || event.httpMethod,
  });

  const slackHandler = await awsLambdaReceiver.start();
  return slackHandler(event, context, callback);
};
```

---

## 6. 設定ファイル

### 6.1 package.json

```json
{
  "name": "slack-zoom-bot",
  "version": "1.0.0",
  "description": "Slack Bot for Zoom meeting management",
  "main": "src/index.ts",
  "scripts": {
    "dev": "serverless offline",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src/**/*.ts",
    "typecheck": "tsc --noEmit",
    "deploy": "serverless deploy",
    "deploy:prod": "serverless deploy --stage prod",
    "logs": "serverless logs -f slack -t"
  },
  "dependencies": {
    "@slack/bolt": "^3.18.0",
    "axios": "^1.6.7"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitest/coverage-v8": "^1.2.2",
    "esbuild": "^0.20.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "msw": "^2.1.5",
    "prettier": "^3.2.4",
    "serverless": "^3.38.0",
    "serverless-esbuild": "^1.52.0",
    "serverless-offline": "^13.3.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 6.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 6.3 serverless.yml（修正版）

```yaml
service: slack-zoom-bot

frameworkVersion: "3"

provider:
  name: aws
  runtime: nodejs20.x
  region: ap-northeast-1
  memorySize: 256
  timeout: 30
  environment:
    NODE_OPTIONS: --enable-source-maps
    SLACK_SIGNING_SECRET: ${env:SLACK_SIGNING_SECRET}
    SLACK_BOT_TOKEN: ${env:SLACK_BOT_TOKEN}
    ZOOM_ACCOUNT_A_ID: ${env:ZOOM_ACCOUNT_A_ID}
    ZOOM_ACCOUNT_A_ACCOUNT_ID: ${env:ZOOM_ACCOUNT_A_ACCOUNT_ID}
    ZOOM_ACCOUNT_A_CLIENT_ID: ${env:ZOOM_ACCOUNT_A_CLIENT_ID}
    ZOOM_ACCOUNT_A_CLIENT_SECRET: ${env:ZOOM_ACCOUNT_A_CLIENT_SECRET}
    ZOOM_ACCOUNT_B_ID: ${env:ZOOM_ACCOUNT_B_ID}
    ZOOM_ACCOUNT_B_ACCOUNT_ID: ${env:ZOOM_ACCOUNT_B_ACCOUNT_ID}
    ZOOM_ACCOUNT_B_CLIENT_ID: ${env:ZOOM_ACCOUNT_B_CLIENT_ID}
    ZOOM_ACCOUNT_B_CLIENT_SECRET: ${env:ZOOM_ACCOUNT_B_CLIENT_SECRET}
    ZOOM_ACCOUNT_C_ID: ${env:ZOOM_ACCOUNT_C_ID}
    ZOOM_ACCOUNT_C_ACCOUNT_ID: ${env:ZOOM_ACCOUNT_C_ACCOUNT_ID}
    ZOOM_ACCOUNT_C_CLIENT_ID: ${env:ZOOM_ACCOUNT_C_CLIENT_ID}
    ZOOM_ACCOUNT_C_CLIENT_SECRET: ${env:ZOOM_ACCOUNT_C_CLIENT_SECRET}

functions:
  slack:
    handler: src/index.handler
    url: true  # Lambda Function URL を有効化（API Gateway不要）

plugins:
  - serverless-esbuild
  - serverless-offline

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    exclude:
      - aws-sdk
    target: node20
    platform: node
    concurrency: 10
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002
```

### 6.4 .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "env": {
    "node": true,
    "es2022": true
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "no-console": "warn"
  },
  "ignorePatterns": ["dist", "node_modules", "*.js"]
}
```

### 6.5 .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### 6.6 .env.example

```bash
# ============================================
# Slack Zoom Bot - 環境変数テンプレート
# ============================================
# このファイルをコピーして .env として保存し、
# 各値を実際の認証情報に置き換えてください。
# cp .env.example .env
# ============================================

# ============================================
# Slack 設定
# ============================================
# Slack App > Basic Information > App Credentials
SLACK_SIGNING_SECRET=your_slack_signing_secret_here

# Slack App > OAuth & Permissions > Bot User OAuth Token
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# ============================================
# Zoom Account A 設定
# ============================================
# 識別用ID（任意の文字列）
ZOOM_ACCOUNT_A_ID=account_a

# Zoom Marketplace > App > App Credentials
ZOOM_ACCOUNT_A_ACCOUNT_ID=your_zoom_account_id
ZOOM_ACCOUNT_A_CLIENT_ID=your_zoom_client_id
ZOOM_ACCOUNT_A_CLIENT_SECRET=your_zoom_client_secret

# ============================================
# Zoom Account B 設定
# ============================================
ZOOM_ACCOUNT_B_ID=account_b
ZOOM_ACCOUNT_B_ACCOUNT_ID=your_zoom_account_id
ZOOM_ACCOUNT_B_CLIENT_ID=your_zoom_client_id
ZOOM_ACCOUNT_B_CLIENT_SECRET=your_zoom_client_secret

# ============================================
# Zoom Account C 設定
# ============================================
ZOOM_ACCOUNT_C_ID=account_c
ZOOM_ACCOUNT_C_ACCOUNT_ID=your_zoom_account_id
ZOOM_ACCOUNT_C_CLIENT_ID=your_zoom_client_id
ZOOM_ACCOUNT_C_CLIENT_SECRET=your_zoom_client_secret
```

---

## 7. 設定管理モジュール

### 7.1 config/zoomAccounts.ts

```typescript
// src/config/zoomAccounts.ts

import { ZoomAccountConfig } from '../services/zoom/types';
import { ZoomAccountId } from '../types/common';

/**
 * Zoomアカウント設定を環境変数から取得
 */
const zoomAccounts: Record<ZoomAccountId, ZoomAccountConfig> = {
  a: {
    id: process.env.ZOOM_ACCOUNT_A_ID || 'account_a',
    name: 'Account A',
    accountId: process.env.ZOOM_ACCOUNT_A_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_A_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_A_CLIENT_SECRET || '',
  },
  b: {
    id: process.env.ZOOM_ACCOUNT_B_ID || 'account_b',
    name: 'Account B',
    accountId: process.env.ZOOM_ACCOUNT_B_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_B_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_B_CLIENT_SECRET || '',
  },
  c: {
    id: process.env.ZOOM_ACCOUNT_C_ID || 'account_c',
    name: 'Account C',
    accountId: process.env.ZOOM_ACCOUNT_C_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_C_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_C_CLIENT_SECRET || '',
  },
};

/**
 * 指定されたIDのZoomアカウント設定を取得
 */
export function getZoomAccount(id: ZoomAccountId): ZoomAccountConfig {
  const account = zoomAccounts[id];
  if (!account) {
    throw new Error(`Unknown Zoom account: ${id}`);
  }
  return account;
}

/**
 * 全てのZoomアカウント設定を取得
 */
export function getAllZoomAccounts(): ZoomAccountConfig[] {
  return Object.values(zoomAccounts);
}
```

---

## 8. ユーティリティ

### 8.1 logger.ts

```typescript
// src/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * 構造化ロガー
 * CloudWatch Logs での検索を考慮したJSON形式
 */
class Logger {
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data: this.maskSensitiveData(data) }),
    };
    console.log(JSON.stringify(entry));
  }

  /**
   * 機密情報をマスク
   */
  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['token', 'secret', 'password', 'authorization', 'clientSecret'];
    const masked = { ...data };
    
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        masked[key] = '***MASKED***';
      }
    }
    
    return masked;
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, any>): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
```

### 8.2 errors.ts

```typescript
// src/utils/errors.ts

/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Zoom API エラー
 */
export class ZoomApiError extends AppError {
  constructor(message: string, originalError?: Error) {
    super('E002', `Zoom API Error: ${message}`, 502);
    this.name = 'ZoomApiError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super('E003', message, 400);
    this.name = 'ValidationError';
  }
}
```

### 8.3 dateTime.ts

```typescript
// src/utils/dateTime.ts

/**
 * DateをISO 8601形式の文字列に変換
 */
export function formatToISOString(date: Date): string {
  return date.toISOString();
}

/**
 * 今日の開始時刻を取得（JST）
 */
export function getTodayStart(): Date {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + jstOffset * 60000);
  jst.setHours(0, 0, 0, 0);
  return jst;
}

/**
 * 今日の終了時刻を取得（JST）
 */
export function getTodayEnd(): Date {
  const todayStart = getTodayStart();
  todayStart.setHours(23, 59, 59, 999);
  return todayStart;
}
```

---

## 9. CI/CD設定

### 9.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml

name: Deploy to AWS Lambda

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Test
        run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to AWS
        run: npm run deploy
        env:
          SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          ZOOM_ACCOUNT_A_ID: ${{ secrets.ZOOM_ACCOUNT_A_ID }}
          ZOOM_ACCOUNT_A_ACCOUNT_ID: ${{ secrets.ZOOM_ACCOUNT_A_ACCOUNT_ID }}
          ZOOM_ACCOUNT_A_CLIENT_ID: ${{ secrets.ZOOM_ACCOUNT_A_CLIENT_ID }}
          ZOOM_ACCOUNT_A_CLIENT_SECRET: ${{ secrets.ZOOM_ACCOUNT_A_CLIENT_SECRET }}
          ZOOM_ACCOUNT_B_ID: ${{ secrets.ZOOM_ACCOUNT_B_ID }}
          ZOOM_ACCOUNT_B_ACCOUNT_ID: ${{ secrets.ZOOM_ACCOUNT_B_ACCOUNT_ID }}
          ZOOM_ACCOUNT_B_CLIENT_ID: ${{ secrets.ZOOM_ACCOUNT_B_CLIENT_ID }}
          ZOOM_ACCOUNT_B_CLIENT_SECRET: ${{ secrets.ZOOM_ACCOUNT_B_CLIENT_SECRET }}
          ZOOM_ACCOUNT_C_ID: ${{ secrets.ZOOM_ACCOUNT_C_ID }}
          ZOOM_ACCOUNT_C_ACCOUNT_ID: ${{ secrets.ZOOM_ACCOUNT_C_ACCOUNT_ID }}
          ZOOM_ACCOUNT_C_CLIENT_ID: ${{ secrets.ZOOM_ACCOUNT_C_CLIENT_ID }}
          ZOOM_ACCOUNT_C_CLIENT_SECRET: ${{ secrets.ZOOM_ACCOUNT_C_CLIENT_SECRET }}
```

---

## 10. セットアップ手順

### 10.1 Slack App 作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→「From scratch」
3. App名とワークスペースを設定
4. 以下の機能を設定:

   **Slash Commands:**
   - Command: `/zoom`
   - Request URL: `{Lambda Function URL}`
   - Short Description: `Zoom会議を作成・確認`

   **Interactivity & Shortcuts:**
   - Interactivity: On
   - Request URL: `{Lambda Function URL}`

   **OAuth & Permissions:**
   - Bot Token Scopes:
     - `commands`
     - `chat:write`

5. ワークスペースにインストール
6. 以下の値をメモ:
   - Signing Secret（Basic Information）
   - Bot User OAuth Token（OAuth & Permissions）

### 10.2 Zoom App 作成（アカウントごとに3回実施）

1. [Zoom Marketplace](https://marketplace.zoom.us/) にアクセス
2. 「Develop」→「Build App」
3. 「Server-to-Server OAuth」を選択
4. App名を設定
5. 以下のスコープを追加:
   - `meeting:write:admin`
   - `meeting:read:admin`
6. 「Activate」でアプリを有効化
7. 以下の値をメモ:
   - Account ID
   - Client ID
   - Client Secret

### 10.3 ローカル開発

```bash
# 1. リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/slack-zoom-bot.git
cd slack-zoom-bot

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .envファイルを編集

# 4. ngrokでローカルサーバーを公開
ngrok http 3000

# 5. Slack AppのRequest URLを更新
# https://YOUR_NGROK_URL/slack/events

# 6. ローカルサーバー起動
npm run dev
```

### 10.4 AWS デプロイ

```bash
# 1. AWS CLIの設定
aws configure

# 2. デプロイ
npm run deploy

# 3. 出力されたFunction URLをSlack Appに設定
# endpoints:
#   slack: https://xxx.lambda-url.ap-northeast-1.on.aws/
```

---

## 11. トラブルシューティング

### 11.1 よくある問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| モーダルが表示されない | Signing Secret不一致 | 環境変数を確認 |
| 3秒タイムアウト | ack()が遅い | ack()を最初に呼び出す |
| Zoom API エラー (401) | トークン期限切れ | トークンキャッシュを確認 |
| Zoom API エラー (unsupported_grant_type) | Content-Type不正 | `application/x-www-form-urlencoded` を確認 |
| 会議作成失敗 | スコープ不足 | Zoom Appのスコープを確認 |
| Lambda 500エラー | receiver未設定 | `App({ receiver: awsLambdaReceiver })` を確認 |

### 11.2 デバッグ方法

```bash
# CloudWatch Logsを確認
npm run logs

# または AWS CLI で直接
aws logs tail /aws/lambda/slack-zoom-bot-dev-slack --follow

# ローカルでテスト
npm run dev
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|-----------|---------|------|
| 2024-12-30 | 1.0.0 | 初版作成 | Goyle |
| 2024-12-30 | 1.1.0 | index.ts統合、serverless.yml修正、package.json修正 | Goyle |
