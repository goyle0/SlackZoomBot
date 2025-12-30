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
