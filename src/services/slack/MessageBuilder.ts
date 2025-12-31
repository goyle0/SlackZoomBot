import type { CreateMeetingResponse, ZoomMeeting } from '../zoom/types';

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
    // 開始時刻をJSTでフォーマット
    const startDate = new Date(meeting.start_time);
    const formattedDate = startDate.toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    const formattedTime = startDate.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fields = [
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
      {
        type: 'mrkdwn',
        text: `*パスワード:*\n${meeting.password || 'なし'}`,
      },
    ];

    return {
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Zoom会議を作成しました*',
          },
        },
        {
          type: 'section',
          fields,
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
   * 会議一覧メッセージを構築（1週間表示対応）
   */
  static buildMeetingListMessage(
    accountMeetings: { accountId: string; accountName: string; meetings: ZoomMeeting[]; date?: string }[]
  ): object {
    const blocks: object[] = [];

    // 週の範囲を取得してヘッダーを作成
    if (accountMeetings.length > 0) {
      const firstDate = accountMeetings[0].date;
      const lastDate = accountMeetings[accountMeetings.length - 1].date;
      const accountName = accountMeetings[0].accountName;

      if (firstDate && lastDate) {
        const startDateObj = new Date(firstDate + 'T00:00:00+09:00');
        const endDateObj = new Date(lastDate + 'T00:00:00+09:00');

        const startFormatted = startDateObj.toLocaleDateString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          month: 'numeric',
          day: 'numeric',
        });
        const endFormatted = endDateObj.toLocaleDateString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          month: 'numeric',
          day: 'numeric',
        });

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${startFormatted} 〜 ${endFormatted} の予定* (${accountName})`,
          },
        });
        blocks.push({ type: 'divider' });
      }
    }

    for (const { accountId, meetings, date } of accountMeetings) {
      // 日付をJSTでフォーマット
      let dateHeader = '本日';
      if (date) {
        const targetDate = new Date(date + 'T00:00:00+09:00');
        dateHeader = targetDate.toLocaleDateString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          month: 'numeric',
          day: 'numeric',
          weekday: 'short',
        });
      }

      if (meetings.length === 0) {
        // 予定がない日は1行で簡潔に表示
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*${dateHeader}* - _予定なし_`,
            },
          ],
        });
      } else {
        // 予定がある日は日付ヘッダーを表示
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${dateHeader}*`,
          },
        });

        for (const meeting of meetings) {
          // JSTで時間を表示
          const startTime = new Date(meeting.start_time).toLocaleTimeString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
          });
          const endTime = new Date(
            new Date(meeting.start_time).getTime() + meeting.duration * 60 * 1000
          ).toLocaleTimeString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
          });

          // 会議詳細テキスト
          let meetingText = `*${startTime} - ${endTime}*  ${meeting.topic}\n`;
          meetingText += `会議ID: \`${meeting.id}\`\n`;
          meetingText += `パスワード: ${meeting.password ? `\`${meeting.password}\`` : '_なし_'}\n`;
          meetingText += `<${meeting.join_url}|参加する>`;

          // 会議情報セクション
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: meetingText,
            },
          });

          // 編集・削除ボタン
          const meetingData = JSON.stringify({
            id: String(meeting.id),
            topic: meeting.topic,
            start_time: meeting.start_time,
            duration: meeting.duration,
            accountId: accountId,
          });

          const deleteData = JSON.stringify({
            meetingId: String(meeting.id),
            accountId: accountId,
          });

          blocks.push({
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '編集',
                  emoji: true,
                },
                action_id: 'edit_meeting',
                value: meetingData,
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '削除',
                  emoji: true,
                },
                style: 'danger',
                action_id: 'delete_meeting',
                value: deleteData,
                confirm: {
                  title: {
                    type: 'plain_text',
                    text: '会議を削除',
                  },
                  text: {
                    type: 'mrkdwn',
                    text: `「${meeting.topic}」を削除しますか？`,
                  },
                  confirm: {
                    type: 'plain_text',
                    text: '削除',
                  },
                  deny: {
                    type: 'plain_text',
                    text: 'キャンセル',
                  },
                },
              },
            ],
          });
        }
      }
    }

    return {
      response_type: 'ephemeral',
      blocks,
    };
  }

  /**
   * 会議削除完了メッセージを構築
   */
  static buildMeetingDeletedMessage(meetingId: string | number): object {
    return {
      response_type: 'ephemeral',
      text: `会議 (ID: ${meetingId}) を削除しました。`,
    };
  }

  /**
   * 会議更新完了メッセージを構築
   */
  static buildMeetingUpdatedMessage(meeting: ZoomMeeting, accountName: string): object {
    // 開始時刻をJSTでフォーマット
    const startDate = new Date(meeting.start_time);
    const formattedDate = startDate.toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    const formattedTime = startDate.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fields = [
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
      {
        type: 'mrkdwn',
        text: `*パスワード:*\n${meeting.password || 'なし'}`,
      },
    ];

    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Zoom会議を更新しました*',
          },
        },
        {
          type: 'section',
          fields,
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
   * エラーメッセージを構築
   */
  static buildErrorMessage(message: string): object {
    return {
      response_type: 'ephemeral',
      text: `エラー: ${message}`,
    };
  }
}
