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
          text: `*本日の予定一覧*`,
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
              text: `- ${startTime} - ${meeting.topic}\n  <${meeting.join_url}|参加する>`,
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
