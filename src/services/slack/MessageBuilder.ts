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
    // 開始時刻をフォーマット
    const startDate = new Date(meeting.start_time);
    const formattedDate = startDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    const formattedTime = startDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Zoom会議を作成しました*`,
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
              text: `*開始日時:*\n${formattedDate} ${formattedTime}`,
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
    accountMeetings: { accountName: string; meetings: ZoomMeeting[]; date?: string }[]
  ): object {
    const blocks: object[] = [];

    for (const { accountName, meetings, date } of accountMeetings) {
      // 日付をフォーマット
      let dateHeader = '本日';
      if (date) {
        const targetDate = new Date(date + 'T00:00:00');
        dateHeader = targetDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${dateHeader}の予定一覧* (${accountName})`,
        },
      });
      blocks.push({ type: 'divider' });

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
          const endTime = new Date(
            new Date(meeting.start_time).getTime() + meeting.duration * 60 * 1000
          ).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          });

          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${startTime} - ${endTime}*  ${meeting.topic}\n<${meeting.join_url}|参加する>`,
            },
          });
        }
      }
    }

    return {
      response_type: 'ephemeral',
      blocks,
    };
  }
}
