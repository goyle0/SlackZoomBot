import { App, AwsLambdaReceiver } from '@slack/bolt';
import type { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';
import { handleZoomCommand } from './handlers/commands/zoom';
import { handleZoomModalSubmit } from './handlers/modals/zoomModal';
import { CALLBACK_IDS } from './handlers/modals/callbacks';
import { logger } from './utils/logger';

// ========================================
// AWS Lambda Receiver 初期化
// ========================================
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// ========================================
// Slack Bolt App 初期化
// ========================================
const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver: awsLambdaReceiver,
});

// ========================================
// ハンドラ登録
// ========================================

// /zoom コマンド
app.command('/zoom', handleZoomCommand);

// モーダル送信
app.view(CALLBACK_IDS.ZOOM_MODAL, handleZoomModalSubmit);

// ========================================
// エラーハンドラ
// ========================================
app.error(async (error) => {
  logger.error('Unhandled error in Slack app', { error: String(error) });
});

logger.info('Slack Bolt app initialized');

// ========================================
// Lambda Handler エクスポート
// ========================================
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked', {
    path: event.path,
    method: event.httpMethod,
  });

  const slackHandler = await awsLambdaReceiver.start();
  return slackHandler(event, context, callback) as Promise<APIGatewayProxyResult>;
};
