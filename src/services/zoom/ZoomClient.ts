import axios, { AxiosInstance } from 'axios';
import { ZoomAuthService } from './ZoomAuthService';
import {
  ZoomAccountConfig,
  CreateMeetingRequest,
  CreateMeetingResponse,
  ListMeetingsResponse,
} from './types';
import { logger } from '../../utils/logger';

/**
 * Zoom API クライアント
 */
export class ZoomClient {
  private static readonly BASE_URL = 'https://api.zoom.us/v2';
  private readonly authService: ZoomAuthService;
  private readonly httpClient: AxiosInstance;

  constructor(authService: ZoomAuthService) {
    this.authService = authService;
    this.httpClient = axios.create({
      baseURL: ZoomClient.BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * 会議を作成
   */
  async createMeeting(
    account: ZoomAccountConfig,
    request: CreateMeetingRequest
  ): Promise<CreateMeetingResponse> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Creating Zoom meeting', {
      accountId: account.id,
      topic: request.topic,
    });

    const response = await this.httpClient.post<CreateMeetingResponse>(
      '/users/me/meetings',
      request,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    logger.info('Zoom meeting created', {
      meetingId: response.data.id,
      joinUrl: response.data.join_url,
    });

    return response.data;
  }

  /**
   * 会議一覧を取得
   */
  async listMeetings(
    account: ZoomAccountConfig,
    type: 'upcoming' | 'scheduled' = 'upcoming',
    pageSize: number = 10
  ): Promise<ListMeetingsResponse> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Fetching Zoom meetings', {
      accountId: account.id,
      type,
    });

    const response = await this.httpClient.get<ListMeetingsResponse>('/users/me/meetings', {
      params: { type, page_size: pageSize },
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  }
}
