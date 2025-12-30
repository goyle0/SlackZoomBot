import {
  ViewSubmitAction,
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import axios from 'axios';
import { ZoomClient } from '../../services/zoom/ZoomClient';
import { ZoomAuthService } from '../../services/zoom/ZoomAuthService';
import { MessageBuilder } from '../../services/slack/MessageBuilder';
import { getZoomAccount } from '../../config/zoomAccounts';
import { ZoomModalFormData, ZoomModalState } from '../../types/slack';
import { MeetingDuration } from '../../types/common';
import { logger } from '../../utils/logger';
import { ZoomMeeting } from '../../services/zoom/types';
import { CALLBACK_IDS } from './callbacks';

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
  const passwordBlock = values.password_block as Record<string, { value?: string }> | undefined;

  return {
    action: actionBlock.action_select.selected_option?.value as 'create' | 'list',
    date: dateBlock.date_select.selected_date || getTodayDate(),
    time: timeBlock?.time_select?.selected_time || undefined,
    duration: durationBlock?.duration_select?.selected_option?.value
      ? (parseInt(durationBlock.duration_select.selected_option.value) as MeetingDuration)
      : 60,
    topic: topicBlock?.topic_input?.value || undefined,
    password: passwordBlock?.password_input?.value || undefined,
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
 * ランダムパスワードを生成（英数字6文字）
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

  // パスワードが入力されていなければ自動生成
  const password = formData.password || generateRandomPassword();

  const meeting = await zoomClient.createMeeting(account, {
    topic,
    type: 2,
    start_time: startTime,
    duration: formData.duration || 60,
    timezone: 'Asia/Tokyo',
    password,
  });

  const message = MessageBuilder.buildMeetingCreatedMessage(meeting, account.name);
  await sendSlackMessage(state.responseUrl, message);
}

/**
 * 指定日から1週間分の日付リストを生成（YYYY-MM-DD形式）
 */
function getWeekDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(startDateStr + 'T00:00:00+09:00');

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }));
  }

  return dates;
}

/**
 * 予定確認処理（1週間分）
 */
async function handleListMeetings(
  formData: ZoomModalFormData,
  state: ZoomModalState
): Promise<void> {
  const account = getZoomAccount();

  // 指定された日付から1週間分の予定を取得
  // 'scheduled' を使用して、過去の会議も含めて取得（'upcoming' は現在時刻以降のみ）
  const response = await zoomClient.listMeetings(account, 'scheduled', 100);

  logger.info('Zoom meetings response', {
    totalRecords: response.total_records,
    meetingsCount: response.meetings?.length || 0,
  });

  // 1週間分の日付リストを取得
  const weekDates = getWeekDates(formData.date);
  const meetings = response.meetings || [];

  logger.info('Week dates and meetings debug', {
    selectedDate: formData.date,
    weekDates,
    meetingsCount: meetings.length,
    meetingsDetails: meetings.map((m) => ({
      id: m.id,
      topic: m.topic,
      start_time: m.start_time,
      start_time_jst: new Date(m.start_time).toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Tokyo',
      }),
    })),
  });

  // 日付ごとに会議をグループ化
  const meetingsByDate: Map<string, ZoomMeeting[]> = new Map();

  // 初期化（空の配列で）
  for (const date of weekDates) {
    meetingsByDate.set(date, []);
  }

  // 会議を日付ごとに振り分け
  for (const meeting of meetings) {
    if (!meeting.start_time) {
      continue;
    }

    // UTCからJSTに変換して日付を取得
    const meetingDateJST = new Date(meeting.start_time).toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tokyo',
    });

    // 1週間の範囲内かチェック
    if (weekDates.includes(meetingDateJST)) {
      const dateMeetings = meetingsByDate.get(meetingDateJST) || [];
      dateMeetings.push(meeting);
      meetingsByDate.set(meetingDateJST, dateMeetings);
    }
  }

  // 日付ごとにソート（開始時間順）
  for (const [date, dateMeetings] of meetingsByDate) {
    dateMeetings.sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    meetingsByDate.set(date, dateMeetings);
  }

  // 各会議のパスワードを取得（listMeetingsではパスワードが返されないため）
  for (const [, dateMeetings] of meetingsByDate) {
    for (let i = 0; i < dateMeetings.length; i++) {
      try {
        const meetingDetails = await zoomClient.getMeeting(account, dateMeetings[i].id);
        dateMeetings[i].password = meetingDetails.password;
      } catch (error) {
        logger.warn('Failed to get meeting password', {
          meetingId: dateMeetings[i].id,
          error: String(error),
        });
      }
    }
  }

  // MessageBuilder用のデータ形式に変換
  const allMeetings: { accountName: string; meetings: ZoomMeeting[]; date: string }[] = [];
  for (const date of weekDates) {
    allMeetings.push({
      accountName: account.name,
      meetings: meetingsByDate.get(date) || [],
      date,
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

/**
 * 会議削除ハンドラ
 */
export async function handleDeleteMeeting(
  args: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs
): Promise<void> {
  const { ack, action, respond } = args;

  // アクションを確認
  await ack();

  if (!action.value) {
    logger.error('Delete meeting requested without meeting ID');
    await respond(MessageBuilder.buildErrorMessage('会議IDが指定されていません'));
    return;
  }

  const meetingId = action.value;

  logger.info('Delete meeting requested', { meetingId });

  try {
    const account = getZoomAccount();
    await zoomClient.deleteMeeting(account, meetingId);

    const message = MessageBuilder.buildMeetingDeletedMessage(meetingId);
    await respond(message);
  } catch (error) {
    logger.error('Error deleting meeting', { error: String(error), meetingId });

    // Zoom APIエラーの場合、エラーコードに基づいてメッセージを生成
    let errorMessage = '削除中にエラーが発生しました';
    if (axios.isAxiosError(error) && error.response?.data) {
      const zoomError = error.response.data as { code?: number; message?: string };
      if (zoomError.code === 3002) {
        errorMessage = '会議が進行中のため削除できません。会議を終了してから再度お試しください。';
      } else if (zoomError.code === 3001) {
        errorMessage = '会議が見つかりません。既に削除されている可能性があります。';
      } else if (zoomError.message) {
        errorMessage = zoomError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await respond(MessageBuilder.buildErrorMessage(errorMessage));
  }
}

/**
 * 編集モーダルの状態
 */
interface EditModalState {
  meetingId: string;
  responseUrl: string;
}

/**
 * 会議編集ボタンハンドラ（モーダルを開く）
 */
export async function handleEditMeeting(
  args: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs
): Promise<void> {
  const { ack, action, body, client } = args;

  await ack();

  if (!action.value) {
    logger.error('Edit meeting requested without meeting data');
    return;
  }

  try {
    const meetingData = JSON.parse(action.value);
    const { id, topic, start_time, duration } = meetingData;

    // 日付と時刻を分解（JSTタイムゾーンで）
    const dateTime = new Date(start_time);
    const dateStr = dateTime.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tokyo',
    });
    const timeStr = dateTime.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    logger.info('Edit meeting requested', { meetingId: id, topic });

    // 編集モーダルを開く
    const state: EditModalState = {
      meetingId: id,
      responseUrl: (body as { response_url?: string }).response_url || '',
    };

    await client.views.open({
      trigger_id: (body as { trigger_id: string }).trigger_id,
      view: {
        type: 'modal',
        callback_id: CALLBACK_IDS.EDIT_MODAL,
        private_metadata: JSON.stringify(state),
        title: {
          type: 'plain_text',
          text: '会議を編集',
        },
        submit: {
          type: 'plain_text',
          text: '更新',
        },
        close: {
          type: 'plain_text',
          text: 'キャンセル',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'topic_block',
            element: {
              type: 'plain_text_input',
              action_id: 'topic_input',
              initial_value: topic,
              placeholder: {
                type: 'plain_text',
                text: '会議名を入力',
              },
            },
            label: {
              type: 'plain_text',
              text: '会議名',
            },
          },
          {
            type: 'input',
            block_id: 'date_block',
            element: {
              type: 'datepicker',
              action_id: 'date_select',
              initial_date: dateStr,
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
          {
            type: 'input',
            block_id: 'time_block',
            element: {
              type: 'timepicker',
              action_id: 'time_select',
              initial_time: timeStr,
              placeholder: {
                type: 'plain_text',
                text: '時間を選択',
              },
            },
            label: {
              type: 'plain_text',
              text: '開始時間',
            },
          },
          {
            type: 'input',
            block_id: 'duration_block',
            element: {
              type: 'static_select',
              action_id: 'duration_select',
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: `${duration}分`,
                },
                value: String(duration),
              },
              options: [
                { text: { type: 'plain_text', text: '30分' }, value: '30' },
                { text: { type: 'plain_text', text: '60分' }, value: '60' },
                { text: { type: 'plain_text', text: '90分' }, value: '90' },
                { text: { type: 'plain_text', text: '120分' }, value: '120' },
              ],
            },
            label: {
              type: 'plain_text',
              text: '所要時間',
            },
          },
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
                text: '変更する場合のみ入力',
              },
            },
            label: {
              type: 'plain_text',
              text: 'パスワード',
            },
            hint: {
              type: 'plain_text',
              text: '英数字と@-_*のみ、最大10文字（空欄で変更なし）',
            },
          },
        ],
      },
    });
  } catch (error) {
    logger.error('Error opening edit modal', { error: String(error) });
  }
}

/**
 * 編集モーダル送信ハンドラ
 */
export async function handleEditModalSubmit(
  args: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs
): Promise<void> {
  const { ack, view } = args;

  await ack();

  const state: EditModalState = JSON.parse(view.private_metadata);
  const values = view.state.values;

  // フォームデータを抽出
  const topicBlock = values.topic_block as Record<string, { value?: string }>;
  const dateBlock = values.date_block as Record<string, { selected_date?: string }>;
  const timeBlock = values.time_block as Record<string, { selected_time?: string }>;
  const durationBlock = values.duration_block as Record<
    string,
    { selected_option?: { value: string } }
  >;
  const passwordBlock = values.password_block as Record<string, { value?: string }> | undefined;

  const topic = topicBlock.topic_input.value || '';
  const date = dateBlock.date_select.selected_date || getTodayDate();
  const time = timeBlock.time_select.selected_time || '09:00';
  const duration = parseInt(durationBlock.duration_select.selected_option?.value || '60', 10);
  const password = passwordBlock?.password_input?.value || undefined;

  const startTime = createStartTime(date, time);

  logger.info('Edit modal submitted', {
    meetingId: state.meetingId,
    topic,
    startTime,
    duration,
    hasPassword: !!password,
  });

  try {
    const account = getZoomAccount();
    const updateRequest: {
      topic: string;
      start_time: string;
      duration: number;
      timezone: string;
      password?: string;
    } = {
      topic,
      start_time: startTime,
      duration,
      timezone: 'Asia/Tokyo',
    };

    // パスワードが入力された場合のみ更新に含める
    if (password) {
      updateRequest.password = password;
    }

    await zoomClient.updateMeeting(account, state.meetingId, updateRequest);

    // 更新後の会議情報を取得
    const updatedMeeting = await zoomClient.getMeeting(account, state.meetingId);

    const message = MessageBuilder.buildMeetingUpdatedMessage(updatedMeeting, account.name);
    if (state.responseUrl) {
      await axios.post(state.responseUrl, message);
    }
  } catch (error) {
    logger.error('Error updating meeting', { error: String(error), meetingId: state.meetingId });
    const errorMessage = error instanceof Error ? error.message : '更新中にエラーが発生しました';
    if (state.responseUrl) {
      await axios.post(state.responseUrl, {
        response_type: 'ephemeral',
        text: `エラー: ${errorMessage}`,
      });
    }
  }
}
