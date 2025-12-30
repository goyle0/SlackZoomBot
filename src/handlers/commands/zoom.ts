import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { ModalBuilder } from '../../services/slack/ModalBuilder';
import { ZoomModalState } from '../../types/slack';
import { logger } from '../../utils/logger';

/**
 * /zoom コマンドハンドラ
 */
export async function handleZoomCommand(
  args: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  const { command, client, ack } = args;

  // 3秒以内にAck（必須）
  await ack();

  logger.info('/zoom command received', {
    userId: command.user_id,
    channelId: command.channel_id,
  });

  // モーダル状態をprivate_metadataに保存
  const state: ZoomModalState = {
    responseUrl: command.response_url,
    channelId: command.channel_id,
    userId: command.user_id,
  };

  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: ModalBuilder.buildZoomModal(JSON.stringify(state)),
    });
  } catch (error) {
    logger.error('Failed to open modal', { error: String(error) });
    throw error;
  }
}
