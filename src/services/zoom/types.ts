/** Zoomアカウント設定 */
export interface ZoomAccountConfig {
  id: string;
  name: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
}

/** Zoom OAuthトークンレスポンス */
export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Zoom会議作成リクエスト */
export interface CreateMeetingRequest {
  topic: string;
  type: 2; // Scheduled Meeting
  start_time: string;
  duration: number;
  timezone: string;
  password?: string;
}

/** Zoom会議作成レスポンス */
export interface CreateMeetingResponse {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  password?: string;
  encrypted_password?: string;
}

/** Zoom会議一覧レスポンス */
export interface ListMeetingsResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  meetings: ZoomMeeting[];
}

/** Zoom会議情報 */
export interface ZoomMeeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  password?: string;
  encrypted_password?: string;
}

/** Zoom会議更新リクエスト */
export interface UpdateMeetingRequest {
  topic?: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  password?: string;
}
