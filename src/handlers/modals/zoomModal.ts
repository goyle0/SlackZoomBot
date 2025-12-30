import { ViewSubmitAction, AllMiddlewareArgs, SlackViewMiddlewareArgs } from '@slack/bolt';
import axios from 'axios';
import { ZoomClient } from '../../services/zoom/ZoomClient';
import { ZoomAuthService } from '../../services/zoom/ZoomAuthService';
import { MessageBuilder } from '../../services/slack/MessageBuilder';
import { getZoomAccount, getAllZoomAccounts } from '../../config/zoomAccounts';
import { ZoomModalFormData, ZoomModalState } from '../../types/slack';
import { MeetingDuration, ZoomAccountId } from '../../types/common';
import { logger } from '../../utils/logger';
import { formatToISOString } from '../../utils/dateTime';
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
  const actionBlock = values.action_block as Record<string, { selected_option?: { value: string } }>;
  const accountBlock = values.account_block as Record<string, { selected_option?: { value: string } }>;
  const durationBlock = values.duration_block as Record<string, { selected_option?: { value: string } }> | undefined;
  const topicBlock = values.topic_block as Record<string, { value?: string }> | undefined;

  return {
    action: actionBlock.action_select.selected_option?.value as 'create' | 'list',
    account: accountBlock.account_select.selected_option?.value as ZoomAccountId | 'all',
    duration: durationBlock?.duration_select?.selected_option?.value
      ? (parseInt(durationBlock.duration_select.selected_option.value) as MeetingDuration)
      : 60,
    topic: topicBlock?.topic_input?.value || undefined,
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
  const accounts =
    formData.account === 'all'
      ? getAllZoomAccounts()
      : [getZoomAccount(formData.account as ZoomAccountId)];

  const allMeetings: { accountName: string; meetings: ZoomMeeting[] }[] = [];

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
