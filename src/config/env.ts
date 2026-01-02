/**
 * 環境変数の読み込みと検証
 */

export interface SlackConfig {
  signingSecret: string;
  botToken: string;
}

export interface ZoomEnvConfig {
  accountAId: string;
  accountAAccountId: string;
  accountAClientId: string;
  accountAClientSecret: string;
  accountBId: string;
  accountBAccountId: string;
  accountBClientId: string;
  accountBClientSecret: string;
  accountCId: string;
  accountCAccountId: string;
  accountCClientId: string;
  accountCClientSecret: string;
}

export interface AppConfig {
  slack: SlackConfig;
  zoom: ZoomEnvConfig;
}

/**
 * 環境変数を取得（必須）
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * 環境変数を取得（任意）
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Slack設定のみを検証・取得
 * （Zoom設定はzoomAccounts.tsで別途検証される）
 */
export function getSlackConfig(): SlackConfig {
  return {
    signingSecret: getRequiredEnv('SLACK_SIGNING_SECRET'),
    botToken: getRequiredEnv('SLACK_BOT_TOKEN'),
  };
}

/**
 * アプリケーション設定を取得
 * @deprecated Zoom設定は新形式（ZOOM_ACCOUNTS）を使用するため、Slack設定のみ必要な場合はgetSlackConfig()を使用してください
 */
export function getConfig(): AppConfig {
  return {
    slack: {
      signingSecret: getRequiredEnv('SLACK_SIGNING_SECRET'),
      botToken: getRequiredEnv('SLACK_BOT_TOKEN'),
    },
    zoom: {
      accountAId: getOptionalEnv('ZOOM_ACCOUNT_A_ID', 'account_a'),
      accountAAccountId: getRequiredEnv('ZOOM_ACCOUNT_A_ACCOUNT_ID'),
      accountAClientId: getRequiredEnv('ZOOM_ACCOUNT_A_CLIENT_ID'),
      accountAClientSecret: getRequiredEnv('ZOOM_ACCOUNT_A_CLIENT_SECRET'),
      accountBId: getOptionalEnv('ZOOM_ACCOUNT_B_ID', 'account_b'),
      accountBAccountId: getRequiredEnv('ZOOM_ACCOUNT_B_ACCOUNT_ID'),
      accountBClientId: getRequiredEnv('ZOOM_ACCOUNT_B_CLIENT_ID'),
      accountBClientSecret: getRequiredEnv('ZOOM_ACCOUNT_B_CLIENT_SECRET'),
      accountCId: getOptionalEnv('ZOOM_ACCOUNT_C_ID', 'account_c'),
      accountCAccountId: getRequiredEnv('ZOOM_ACCOUNT_C_ACCOUNT_ID'),
      accountCClientId: getRequiredEnv('ZOOM_ACCOUNT_C_CLIENT_ID'),
      accountCClientSecret: getRequiredEnv('ZOOM_ACCOUNT_C_CLIENT_SECRET'),
    },
  };
}
