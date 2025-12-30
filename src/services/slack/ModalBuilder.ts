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
                text: { type: 'plain_text', text: '会議を作成' },
                value: 'create',
              },
              {
                text: { type: 'plain_text', text: '予定を確認' },
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
