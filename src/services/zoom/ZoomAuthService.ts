import axios from 'axios';
import { ZoomAccountConfig, ZoomTokenResponse } from './types';

/**
 * Zoom OAuth認証サービス
 * Server-to-Server OAuth 方式でアクセストークンを取得
 */
export class ZoomAuthService {
  private static readonly TOKEN_URL = 'https://zoom.us/oauth/token';

  /** トークンキャッシュ（アカウントID -> トークン情報） */
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  /**
   * アクセストークンを取得
   * キャッシュが有効な場合はキャッシュから返却
   */
  async getAccessToken(account: ZoomAccountConfig): Promise<string> {
    const cached = this.tokenCache.get(account.id);
    const now = Date.now();

    // キャッシュが有効（有効期限の5分前まで）
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      return cached.token;
    }

    // 新規トークン取得
    const token = await this.fetchToken(account);
    return token;
  }

  /**
   * Zoom APIからトークンを取得
   */
  private async fetchToken(account: ZoomAccountConfig): Promise<string> {
    const credentials = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString(
      'base64'
    );

    const response = await axios.post<ZoomTokenResponse>(
      ZoomAuthService.TOKEN_URL,
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: account.accountId,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // キャッシュに保存
    this.tokenCache.set(account.id, {
      token: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    });

    return access_token;
  }
}
