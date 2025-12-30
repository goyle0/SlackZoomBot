import { ActionType, MeetingDuration } from './common';

/** モーダル送信時のフォームデータ */
export interface ZoomModalFormData {
  action: ActionType;
  date: string; // YYYY-MM-DD形式
  time?: string; // HH:MM形式（会議作成時）
  duration?: MeetingDuration;
  topic?: string;
  password?: string; // 会議パスワード（会議作成時）
}

/** モーダルのビュー状態 */
export interface ZoomModalState {
  responseUrl: string;
  channelId: string;
  userId: string;
}
