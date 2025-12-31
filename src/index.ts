import { App, AwsLambdaReceiver } from '@slack/bolt';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
  Callback,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { handleZoomCommand } from './handlers/commands/zoom';
import {
  handleZoomModalSubmit,
  handleDeleteMeeting,
  handleEditMeeting,
  handleEditModalSubmit,
} from './handlers/modals/zoomModal';
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

// /meeting コマンド
app.command('/meeting', handleZoomCommand);

// モーダル送信
app.view(CALLBACK_IDS.ZOOM_MODAL, handleZoomModalSubmit);

// 会議削除ボタン
app.action('delete_meeting', handleDeleteMeeting);

// 会議編集ボタン
app.action('edit_meeting', handleEditMeeting);

// 編集モーダル送信
app.view(CALLBACK_IDS.EDIT_MODAL, handleEditModalSubmit);

// ========================================
// エラーハンドラ
// ========================================
app.error(async (error) => {
  logger.error('Unhandled error in Slack app', { error: String(error) });
});

logger.info('Slack Bolt app initialized');

// ========================================
// Function URL v2 → API Gateway v1 変換
// ========================================
function convertFunctionUrlToApiGateway(
  event: APIGatewayProxyEventV2
): APIGatewayProxyEvent {
  const headers: Record<string, string> = {};
  const multiValueHeaders: Record<string, string[]> = {};

  // ヘッダーを変換
  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      if (value) {
        headers[key] = value;
        multiValueHeaders[key] = [value];
      }
    }
  }

  return {
    body: event.body || null,
    headers,
    multiValueHeaders,
    httpMethod: event.requestContext?.http?.method || 'POST',
    isBase64Encoded: event.isBase64Encoded || false,
    path: event.rawPath || '/',
    pathParameters: event.pathParameters || null,
    queryStringParameters: event.queryStringParameters || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: event.requestContext?.accountId || '',
      apiId: event.requestContext?.apiId || '',
      authorizer: null,
      protocol: event.requestContext?.http?.protocol || 'HTTP/1.1',
      httpMethod: event.requestContext?.http?.method || 'POST',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: event.requestContext?.http?.sourceIp || '',
        user: null,
        userAgent: event.requestContext?.http?.userAgent || '',
        userArn: null,
      },
      path: event.rawPath || '/',
      stage: event.requestContext?.stage || '$default',
      requestId: event.requestContext?.requestId || '',
      requestTimeEpoch: event.requestContext?.timeEpoch || Date.now(),
      resourceId: '',
      resourcePath: event.rawPath || '/',
    },
    resource: event.rawPath || '/',
  };
}

// ========================================
// Lambda Handler エクスポート
// ========================================
export const handler = async (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  // Function URL (v2) イベントを API Gateway (v1) 形式に変換
  const isV2Event = 'requestContext' in event && 'http' in (event as APIGatewayProxyEventV2).requestContext;
  const v1Event = isV2Event
    ? convertFunctionUrlToApiGateway(event as APIGatewayProxyEventV2)
    : (event as APIGatewayProxyEvent);

  logger.info('Lambda invoked', {
    path: v1Event.path,
    method: v1Event.httpMethod,
    isV2Event,
  });

  const slackHandler = await awsLambdaReceiver.start();
  return slackHandler(v1Event, context, callback) as Promise<APIGatewayProxyResult>;
};
