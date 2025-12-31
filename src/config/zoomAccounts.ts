import { ZoomAccountConfig } from '../services/zoom/types';
import { logger } from '../utils/logger';

/** Zoomアカウント設定キャッシュ */
let cachedAccounts: ZoomAccountConfig[] | null = null;

/**
 * 環境変数からZoomアカウント設定を解析
 */
function parseZoomAccounts(): ZoomAccountConfig[] {
  const accountsJson = process.env.ZOOM_ACCOUNTS;

  if (!accountsJson) {
    // フォールバック: 旧形式の単一アカウント環境変数をサポート
    const legacyAccount = parseLegacyAccount();
    if (legacyAccount) {
      logger.warn('Using legacy single account configuration. Consider migrating to ZOOM_ACCOUNTS.');
      return [legacyAccount];
    }
    throw new Error(
      'ZOOM_ACCOUNTS environment variable is not set. ' +
        'Please set ZOOM_ACCOUNTS as a JSON array of account configurations.'
    );
  }

  try {
    const accounts = JSON.parse(accountsJson) as ZoomAccountConfig[];
    validateAccounts(accounts);
    logger.info('Loaded Zoom accounts', { count: accounts.length });
    return accounts;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse ZOOM_ACCOUNTS: Invalid JSON format. ${error.message}`);
    }
    throw error;
  }
}

/**
 * 旧形式の単一アカウント環境変数をサポート（後方互換性）
 */
function parseLegacyAccount(): ZoomAccountConfig | null {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (accountId && clientId && clientSecret) {
    return {
      id: 'default',
      name: 'Zoom',
      accountId,
      clientId,
      clientSecret,
    };
  }
  return null;
}

/**
 * アカウント設定のバリデーション
 */
function validateAccounts(accounts: unknown): asserts accounts is ZoomAccountConfig[] {
  if (!Array.isArray(accounts)) {
    throw new Error('ZOOM_ACCOUNTS must be a JSON array');
  }

  if (accounts.length === 0) {
    throw new Error('ZOOM_ACCOUNTS must contain at least one account');
  }

  const ids = new Set<string>();

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i] as Record<string, unknown>;
    const prefix = `ZOOM_ACCOUNTS[${i}]`;

    if (!account.id || typeof account.id !== 'string') {
      throw new Error(`${prefix}: 'id' is required and must be a string`);
    }
    if (!account.name || typeof account.name !== 'string') {
      throw new Error(`${prefix}: 'name' is required and must be a string`);
    }
    if (!account.accountId || typeof account.accountId !== 'string') {
      throw new Error(`${prefix}: 'accountId' is required and must be a string`);
    }
    if (!account.clientId || typeof account.clientId !== 'string') {
      throw new Error(`${prefix}: 'clientId' is required and must be a string`);
    }
    if (!account.clientSecret || typeof account.clientSecret !== 'string') {
      throw new Error(`${prefix}: 'clientSecret' is required and must be a string`);
    }

    if (ids.has(account.id as string)) {
      throw new Error(`${prefix}: Duplicate account id '${account.id}'`);
    }
    ids.add(account.id as string);
  }
}

/**
 * 全てのZoomアカウント設定を取得
 */
export function getAllZoomAccounts(): ZoomAccountConfig[] {
  if (!cachedAccounts) {
    cachedAccounts = parseZoomAccounts();
  }
  return cachedAccounts;
}

/**
 * 指定IDのZoomアカウント設定を取得
 */
export function getZoomAccountById(accountId: string): ZoomAccountConfig {
  const accounts = getAllZoomAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    const availableIds = accounts.map((a) => a.id).join(', ');
    throw new Error(`Zoom account not found: '${accountId}'. Available accounts: ${availableIds}`);
  }
  return account;
}

/**
 * デフォルト（最初の）Zoomアカウント設定を取得
 * 単一アカウント時や後方互換性のために使用
 */
export function getZoomAccount(): ZoomAccountConfig {
  const accounts = getAllZoomAccounts();
  return accounts[0];
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearAccountCache(): void {
  cachedAccounts = null;
}
