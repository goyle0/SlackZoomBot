import { ViewSubmitAction, AllMiddlewareArgs, SlackViewMiddlewareArgs } from '@slack/bolt';
import axios from 'axios';
import { ZoomClient } from '../../services/zoom/ZoomClient';
import { ZoomAuthService } from '../../services/zoom/ZoomAuthService';
import { MessageBuilder } from '../../services/slack/MessageBuilder';
import { getZoomAccount } from '../../config/zoomAccounts';
import { ZoomModalFormData, ZoomModalState } from '../../types/slack';
import { MeetingDuration } from '../../types/common';
import { logger } from '../../utils/logger';
import { ZoomMeeting } from '../../services/zoom/types';

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
    logger.error('Error handling modal submit', { error: String(error) });
    await sendErrorMessage(state.responseUrl, error);
  }
}

/**
 * フォームデータを抽出
 */
function extractFormData(values: Record<string, Record<string, unknown>>): ZoomModalFormData {
  const actionBlock = values.action_block as Record<
    string,
    { selected_option?: { value: string } }
  >;
  const dateBlock = values.date_block as Record<string, { selected_date?: string }>;
  const timeBlock = values.time_block as
    | Record<string, { selected_time?: string }>
    | undefined;
  const durationBlock = values.duration_block as
    | Record<string, { selected_option?: { value: string } }>
    | undefined;
  const topicBlock = values.topic_block as Record<string, { value?: string }> | undefined;

  return {
    action: actionBlock.action_select.selected_option?.value as 'create' | 'list',
    date: dateBlock.date_select.selected_date || getTodayDate(),
    time: timeBlock?.time_select?.selected_time || undefined,
    duration: durationBlock?.duration_select?.selected_option?.value
      ? (parseInt(durationBlock.duration_select.selected_option.value) as MeetingDuration)
      : 60,
    topic: topicBlock?.topic_input?.value || undefined,
  };
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付と時間からISO 8601形式の文字列を生成
 */
function createStartTime(date: string, time?: string): string {
  const timeStr = time || '09:00';
  // 日本時間で指定されているため、ISO形式に変換
  return `${date}T${timeStr}:00`;
}

/**
 * 会議作成処理
 */
async function handleCreateMeeting(
  formData: ZoomModalFormData,
  state: ZoomModalState
): Promise<void> {
  const account = getZoomAccount();
  const topic = formData.topic || `Slack Meeting (${formData.date})`;
  const startTime = createStartTime(formData.date, formData.time);

  const meeting = await zoomClient.createMeeting(account, {
    topic,
    type: 2,
    start_time: startTime,
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
  const account = getZoomAccount();

  // 指定された日付の予定を取得
  const response = await zoomClient.listMeetings(account, 'scheduled', 30);

  // 指定日の予定のみフィルタリング
  const targetDate = formData.date;
  const filteredMeetings = response.meetings.filter((meeting) => {
    const meetingDate = meeting.start_time.split('T')[0];
    return meetingDate === targetDate;
  });

  const allMeetings: { accountName: string; meetings: ZoomMeeting[]; date: string }[] = [
    {
      accountName: account.name,
      meetings: filteredMeetings,
      date: targetDate,
    },
  ];

  const message = MessageBuilder.buildMeetingListMessage(allMeetings);
  await sendSlackMessage(state.responseUrl, message);
}

/**
 * Slackにメッセージを送信
 */
async function sendSlackMessage(responseUrl: string, message: unknown): Promise<void> {
  await axios.post(responseUrl, message);
}

/**
 * エラーメッセージを送信
 */
async function sendErrorMessage(responseUrl: string, error: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
  await axios.post(responseUrl, {
    response_type: 'ephemeral',
    text: `エラー: ${errorMessage}`,
  });
}
