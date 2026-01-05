import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAllZoomAccounts,
  getZoomAccountById,
  getZoomAccount,
  clearAccountCache,
} from './zoomAccounts';

describe('zoomAccounts', () => {
  beforeEach(() => {
    // キャッシュをクリア
    clearAccountCache();
    // 環境変数をリセット
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    clearAccountCache();
    vi.unstubAllEnvs();
  });

  describe('複数アカウント対応（ZOOM_ACCOUNTS）', () => {
    it('JSON配列から複数アカウントを読み込める', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([
          {
            id: 'room1',
            name: '会議室A',
            accountId: 'acc1',
            clientId: 'client1',
            clientSecret: 'secret1',
          },
          {
            id: 'room2',
            name: '会議室B',
            accountId: 'acc2',
            clientId: 'client2',
            clientSecret: 'secret2',
          },
        ])
      );

      const accounts = getAllZoomAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts[0].id).toBe('room1');
      expect(accounts[0].name).toBe('会議室A');
      expect(accounts[1].id).toBe('room2');
      expect(accounts[1].name).toBe('会議室B');
    });

    it('getZoomAccountByIdで特定のアカウントを取得できる', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([
          {
            id: 'room1',
            name: '会議室A',
            accountId: 'acc1',
            clientId: 'client1',
            clientSecret: 'secret1',
          },
          {
            id: 'room2',
            name: '会議室B',
            accountId: 'acc2',
            clientId: 'client2',
            clientSecret: 'secret2',
          },
        ])
      );

      const account = getZoomAccountById('room2');
      expect(account.id).toBe('room2');
      expect(account.name).toBe('会議室B');
      expect(account.accountId).toBe('acc2');
    });

    it('存在しないアカウントIDでエラーを投げる', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([
          {
            id: 'room1',
            name: '会議室A',
            accountId: 'acc1',
            clientId: 'client1',
            clientSecret: 'secret1',
          },
        ])
      );

      expect(() => getZoomAccountById('nonexistent')).toThrow(
        "Zoom account not found: 'nonexistent'"
      );
    });

    it('getZoomAccountでデフォルト（最初の）アカウントを取得できる', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([
          {
            id: 'room1',
            name: '会議室A',
            accountId: 'acc1',
            clientId: 'client1',
            clientSecret: 'secret1',
          },
          {
            id: 'room2',
            name: '会議室B',
            accountId: 'acc2',
            clientId: 'client2',
            clientSecret: 'secret2',
          },
        ])
      );

      const account = getZoomAccount();
      expect(account.id).toBe('room1');
    });
  });

  describe('後方互換性（レガシー環境変数）', () => {
    it('ZOOM_ACCOUNTS未設定時に旧環境変数を使用する', () => {
      vi.stubEnv('ZOOM_ACCOUNT_ID', 'legacy_acc_id');
      vi.stubEnv('ZOOM_CLIENT_ID', 'legacy_client_id');
      vi.stubEnv('ZOOM_CLIENT_SECRET', 'legacy_client_secret');

      const accounts = getAllZoomAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('default');
      expect(accounts[0].name).toBe('Zoom');
      expect(accounts[0].accountId).toBe('legacy_acc_id');
    });
  });

  describe('バリデーション', () => {
    it('空の配列でエラーを投げる', () => {
      vi.stubEnv('ZOOM_ACCOUNTS', '[]');
      expect(() => getAllZoomAccounts()).toThrow(
        'ZOOM_ACCOUNTS must contain at least one account'
      );
    });

    it('必須フィールド欠落でエラーを投げる', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([{ id: 'room1', name: '会議室A' }])
      );
      expect(() => getAllZoomAccounts()).toThrow("'accountId' is required");
    });

    it('重複IDでエラーを投げる', () => {
      vi.stubEnv(
        'ZOOM_ACCOUNTS',
        JSON.stringify([
          {
            id: 'room1',
            name: '会議室A',
            accountId: 'acc1',
            clientId: 'client1',
            clientSecret: 'secret1',
          },
          {
            id: 'room1',
            name: '会議室B',
            accountId: 'acc2',
            clientId: 'client2',
            clientSecret: 'secret2',
          },
        ])
      );
      expect(() => getAllZoomAccounts()).toThrow("Duplicate account id 'room1'");
    });

    it('不正なJSONでエラーを投げる', () => {
      vi.stubEnv('ZOOM_ACCOUNTS', 'invalid json');
      expect(() => getAllZoomAccounts()).toThrow('Failed to parse ZOOM_ACCOUNTS');
    });
  });
});
