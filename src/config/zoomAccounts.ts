import { ZoomAccountConfig } from '../services/zoom/types';
import { ZoomAccountId } from '../types/common';

/**
 * Zoomアカウント設定を環境変数から取得
 */
const zoomAccounts: Record<ZoomAccountId, ZoomAccountConfig> = {
  a: {
    id: process.env.ZOOM_ACCOUNT_A_ID || 'account_a',
    name: 'Account A',
    accountId: process.env.ZOOM_ACCOUNT_A_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_A_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_A_CLIENT_SECRET || '',
  },
  b: {
    id: process.env.ZOOM_ACCOUNT_B_ID || 'account_b',
    name: 'Account B',
    accountId: process.env.ZOOM_ACCOUNT_B_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_B_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_B_CLIENT_SECRET || '',
  },
  c: {
    id: process.env.ZOOM_ACCOUNT_C_ID || 'account_c',
    name: 'Account C',
    accountId: process.env.ZOOM_ACCOUNT_C_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_ACCOUNT_C_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_ACCOUNT_C_CLIENT_SECRET || '',
  },
};

/**
 * 指定されたIDのZoomアカウント設定を取得
 */
export function getZoomAccount(id: ZoomAccountId): ZoomAccountConfig {
  const account = zoomAccounts[id];
  if (!account) {
    throw new Error(`Unknown Zoom account: ${id}`);
  }
  return account;
}

/**
 * 全てのZoomアカウント設定を取得
 */
export function getAllZoomAccounts(): ZoomAccountConfig[] {
  return Object.values(zoomAccounts);
}
