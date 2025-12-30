/**
 * Slack Block Kit コンポーネント
 * 共通で使用するブロック要素を定義
 */

/**
 * セクションブロックを作成
 */
export function createSectionBlock(text: string, markdown: boolean = true): object {
  return {
    type: 'section',
    text: {
      type: markdown ? 'mrkdwn' : 'plain_text',
      text,
    },
  };
}

/**
 * 区切り線ブロックを作成
 */
export function createDividerBlock(): object {
  return {
    type: 'divider',
  };
}

/**
 * コンテキストブロックを作成
 */
export function createContextBlock(text: string): object {
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text,
      },
    ],
  };
}
