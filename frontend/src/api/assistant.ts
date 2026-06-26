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

const EMBED_LIST_PATH = '/api/v1/system/assistant/embed/list'

const normalizeDomain = (domain: string): string => {
  return (domain || '').trim().replace(/\/+$/, '')
}

/**
 * 直连 LnkChatBI 的免登录 embed/list 接口（OpenSpec change
 * `add-embedded-assistant-listing-endpoint` 落地后的标准路径）。
 *
 * 浏览器自动附加 Origin header，LnkChatBI 后端依据各助手配置的跨域
 * 白名单过滤后返回。无需 access_token，无需 demo 后端代理。
 */
export const AssistantApi = {
  list: async (params: {
    domain: string
    type?: AssistantType
  }): Promise<AssistantListResponse> => {
    const base = normalizeDomain(params.domain)
    if (!base) {
      throw new Error('LnkChatBI 服务地址未配置')
    }

    const url = new URL(`${base}${EMBED_LIST_PATH}`)
    if (params.type === 'base') {
      url.searchParams.set('type', '0')
    } else if (params.type === 'advanced') {
      url.searchParams.set('type', '1')
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    })

    if (!res.ok) {
      throw new Error(`LnkChatBI embed/list 接口报错 (HTTP ${res.status})`)
    }

    // LnKChatBI 返回的 id 是 19 位 long，超过 JS Number.MAX_SAFE_INTEGER。
    // 不能直接 res.json()（精度会在 JSON.parse 时丢失），必须先把 id 字段
    // 改写成字符串字面量再 parse，否则下游用到 id 的所有逻辑都会错。
    const rawText = await res.text()
    const safeText = rawText.replace(/"id":\s*(\d{16,})/g, '"id":"$1"')
    const json: { code?: number; data?: Array<{ id: string; name: string; type: number }> } =
      JSON.parse(safeText)
    const rawList = Array.isArray(json?.data) ? json.data : []
    return {
      success: true,
      data: rawList.map((item) => ({
        id: String(item.id),
        name: item.name ?? '',
        type: typeof item.type === 'number' ? item.type : Number(item.type) || 0,
      })),
    }
  },
}
