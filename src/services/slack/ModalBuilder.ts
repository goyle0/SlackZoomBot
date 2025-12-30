import { View } from '@slack/bolt';
import { CALLBACK_IDS } from '../../handlers/modals/callbacks';

/**
 * 今日の日付をYYYY-MM-DD形式で取得（JSTタイムゾーン）
 */
function getTodayDate(): string {
  const now = new Date();
  // JSTでの日付を取得
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/**
 * 現在時刻から30分後の時刻をHH:MM形式で取得（30分単位に丸める、JSTタイムゾーン）
 */
function getDefaultTime(): string {
  const now = new Date();
  // 30分後に設定
  now.setMinutes(now.getMinutes() + 30);

  // JSTでの時刻を取得
  const jstTimeStr = now.toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const [hoursStr, minutesStr] = jstTimeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  // 30分単位に丸める
  const roundedMinutes = Math.ceil(minutes / 30) * 30;
  let finalMinutes = roundedMinutes;

  if (roundedMinutes >= 60) {
    finalMinutes = 0;
    hours = (hours + 1) % 24;
  }

  return `${String(hours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
}

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
        // 日付選択（共通）
        {
          type: 'input',
          block_id: 'date_block',
          element: {
            type: 'datepicker',
            action_id: 'date_select',
            initial_date: getTodayDate(),
            placeholder: {
              type: 'plain_text',
              text: '日付を選択',
            },
          },
          label: {
            type: 'plain_text',
            text: '日付',
          },
        },
        // 会議名入力（会議作成時）
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
            text: '会議名（会議作成時）',
          },
        },
        // パスワード入力（会議作成時）
        {
          type: 'input',
          block_id: 'password_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'password_input',
            max_length: 10,
            placeholder: {
              type: 'plain_text',
              text: '省略時は自動生成',
            },
          },
          label: {
            type: 'plain_text',
            text: 'パスワード（会議作成時）',
          },
          hint: {
            type: 'plain_text',
            text: '英数字と@-_*のみ、最大10文字',
          },
        },
        // 時間選択（会議作成時）
        {
          type: 'input',
          block_id: 'time_block',
          optional: true,
          element: {
            type: 'timepicker',
            action_id: 'time_select',
            initial_time: getDefaultTime(),
            placeholder: {
              type: 'plain_text',
              text: '時間を選択',
            },
          },
          label: {
            type: 'plain_text',
            text: '開始時間（会議作成時）',
          },
        },
        // 所要時間選択（会議作成時）
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
      ],
    };
  }
}
