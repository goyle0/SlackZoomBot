import { ZoomAccountConfig } from '../services/zoom/types';

/**
 * Zoomアカウント設定を環境変数から取得
 */
const zoomAccount: ZoomAccountConfig = {
  id: 'default',
  name: 'Zoom',
  accountId: process.env.ZOOM_ACCOUNT_ID || '',
  clientId: process.env.ZOOM_CLIENT_ID || '',
  clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
};

/**
 * Zoomアカウント設定を取得
 */
export function getZoomAccount(): ZoomAccountConfig {
  return zoomAccount;
}

/**
 * 全てのZoomアカウント設定を取得（互換性のため配列で返す）
 */
export function getAllZoomAccounts(): ZoomAccountConfig[] {
  return [zoomAccount];
}
