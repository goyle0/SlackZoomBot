import axios, { AxiosInstance } from 'axios';
import { ZoomAuthService } from './ZoomAuthService';
import {
  ZoomAccountConfig,
  CreateMeetingRequest,
  CreateMeetingResponse,
  ListMeetingsResponse,
  UpdateMeetingRequest,
  ZoomMeeting,
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
      password: request.password,
      startTime: request.start_time,
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
      password: response.data.password,
      startTime: response.data.start_time,
    });

    return response.data;
  }

  /**
   * 会議一覧を取得
   */
  async listMeetings(
    account: ZoomAccountConfig,
    type: 'upcoming' | 'live' | 'scheduled' = 'upcoming',
    pageSize: number = 30
  ): Promise<ListMeetingsResponse> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Fetching Zoom meetings', {
      accountId: account.id,
      type,
    });

    try {
      const response = await this.httpClient.get<ListMeetingsResponse>('/users/me/meetings', {
        params: { type, page_size: pageSize },
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Zoom API error', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  /**
   * 会議を削除
   */
  async deleteMeeting(account: ZoomAccountConfig, meetingId: string | number): Promise<void> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Deleting Zoom meeting', {
      accountId: account.id,
      meetingId,
    });

    try {
      await this.httpClient.delete(`/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      logger.info('Zoom meeting deleted', { meetingId });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Zoom API error on delete', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  /**
   * 会議を更新
   */
  async updateMeeting(
    account: ZoomAccountConfig,
    meetingId: string | number,
    request: UpdateMeetingRequest
  ): Promise<void> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Updating Zoom meeting', {
      accountId: account.id,
      meetingId,
      updates: request,
    });

    try {
      await this.httpClient.patch(`/meetings/${meetingId}`, request, {
        headers: { Authorization: `Bearer ${token}` },
      });

      logger.info('Zoom meeting updated', { meetingId });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Zoom API error on update', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  /**
   * 会議詳細を取得
   */
  async getMeeting(account: ZoomAccountConfig, meetingId: string | number): Promise<ZoomMeeting> {
    const token = await this.authService.getAccessToken(account);

    logger.info('Fetching Zoom meeting details', {
      accountId: account.id,
      meetingId,
    });

    try {
      const response = await this.httpClient.get<ZoomMeeting>(`/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      logger.info('Zoom meeting details fetched', {
        meetingId: response.data.id,
        topic: response.data.topic,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Zoom API error on get meeting', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }
}
