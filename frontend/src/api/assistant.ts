import { request } from '@/utils/request'

export interface AssistantListItem {
  id: string
  name: string
  type: number
}

export interface AssistantListResponse {
  success: boolean
  data: AssistantListItem[]
}

export type AssistantType = 'base' | 'advanced'

export const AssistantApi = {
  list: (params: { type?: AssistantType } = {}) =>
    request.get<AssistantListResponse>('/assistant/list', { params }),
}
