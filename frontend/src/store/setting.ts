import { defineStore } from 'pinia'
import { store } from './index'
import {
  SettingApi,
  type AdvancedAssistantConfig,
  type BaseAssistantConfig,
  type CredentialMapping,
  type SettingRecord,
  normalizeSettingRecord,
} from '@/api/setting'

interface SettingState extends SettingRecord {
  domain: string
  access_token: string
  base_assistant_id: string
  advanced_assistant_id: string
  aes_enable: boolean
  aes_key: string
  base_assistant_config: BaseAssistantConfig
  advanced_assistant_config: AdvancedAssistantConfig
  loaded: boolean
}

const cloneCredentialMappings = (mappings: CredentialMapping[]): CredentialMapping[] => {
  return mappings.map((mapping) => ({ ...mapping }))
}

const cloneIdArray = (values: string[]): string[] => {
  return [...values]
}

const cloneSettingRecord = (record: SettingRecord): SettingRecord => ({
  ...record,
  base_assistant_config: {
    ...record.base_assistant_config,
    workspace_ids: cloneIdArray(record.base_assistant_config.workspace_ids),
    datasource_ids: cloneIdArray(record.base_assistant_config.datasource_ids),
    workspace_names: cloneIdArray(record.base_assistant_config.workspace_names),
    datasource_names: cloneIdArray(record.base_assistant_config.datasource_names),
    public_list: cloneIdArray(record.base_assistant_config.public_list),
    public_list_names: cloneIdArray(record.base_assistant_config.public_list_names),
    private_list: cloneIdArray(record.base_assistant_config.private_list),
    private_list_names: cloneIdArray(record.base_assistant_config.private_list_names),
  },
  advanced_assistant_config: {
    ...record.advanced_assistant_config,
    credential_mappings: cloneCredentialMappings(record.advanced_assistant_config.credential_mappings),
  },
})

export const SettingStore = defineStore('setting', {
  state: (): SettingState => {
    const defaultData = normalizeSettingRecord()
    return {
      ...defaultData,
      loaded: false
    }
  },
  getters: {
    getDomain(): string {
      return this.domain
    },
    getAccessToken(): string {
      return this.access_token
    },
    getBaseAssistantId(): string {
      return this.base_assistant_config.assistant_id || this.base_assistant_id
    },
    getAdvancedAssistantId(): string {
      return this.advanced_assistant_config.assistant_id || this.advanced_assistant_id
    },
    getBaseAssistantConfig(): BaseAssistantConfig {
      return {
        ...this.base_assistant_config,
        workspace_ids: cloneIdArray(this.base_assistant_config.workspace_ids),
        datasource_ids: cloneIdArray(this.base_assistant_config.datasource_ids),
        workspace_names: cloneIdArray(this.base_assistant_config.workspace_names),
        datasource_names: cloneIdArray(this.base_assistant_config.datasource_names),
        public_list: cloneIdArray(this.base_assistant_config.public_list),
        public_list_names: cloneIdArray(this.base_assistant_config.public_list_names),
        private_list: cloneIdArray(this.base_assistant_config.private_list),
        private_list_names: cloneIdArray(this.base_assistant_config.private_list_names),
      }
    },
    getAdvancedAssistantConfig(): AdvancedAssistantConfig {
      return {
        ...this.advanced_assistant_config,
        credential_mappings: cloneCredentialMappings(this.advanced_assistant_config.credential_mappings),
      }
    },
    getLoaded(): boolean {
      return this.loaded
    },
    getData(): SettingRecord {
      return cloneSettingRecord({
        domain: this.domain,
        access_token: this.access_token,
        base_assistant_id: this.getBaseAssistantId,
        advanced_assistant_id: this.getAdvancedAssistantId,
        aes_enable: this.advanced_assistant_config.aes_enable,
        aes_key: this.advanced_assistant_config.aes_key,
        base_assistant_config: {
          ...this.base_assistant_config,
          workspace_ids: cloneIdArray(this.base_assistant_config.workspace_ids),
          datasource_ids: cloneIdArray(this.base_assistant_config.datasource_ids),
          workspace_names: cloneIdArray(this.base_assistant_config.workspace_names),
          datasource_names: cloneIdArray(this.base_assistant_config.datasource_names),
          public_list: cloneIdArray(this.base_assistant_config.public_list),
          public_list_names: cloneIdArray(this.base_assistant_config.public_list_names),
          private_list: cloneIdArray(this.base_assistant_config.private_list),
          private_list_names: cloneIdArray(this.base_assistant_config.private_list_names),
        },
        advanced_assistant_config: {
          ...this.advanced_assistant_config,
          credential_mappings: cloneCredentialMappings(this.advanced_assistant_config.credential_mappings),
        },
      })
    }
  },
  actions: {
    async init(data?: SettingRecord | null) {
      if (!data) {
        const res = await SettingApi.query()
        data = res.data
      }
      const normalized = normalizeSettingRecord(data)
      this.domain = normalized.domain
      this.access_token = normalized.access_token
      this.base_assistant_id = normalized.base_assistant_id
      this.advanced_assistant_id = normalized.advanced_assistant_id
      this.aes_enable = normalized.aes_enable
      this.aes_key = normalized.aes_key
      this.base_assistant_config = {
        ...normalized.base_assistant_config,
        workspace_ids: cloneIdArray(normalized.base_assistant_config.workspace_ids),
        datasource_ids: cloneIdArray(normalized.base_assistant_config.datasource_ids),
        workspace_names: cloneIdArray(normalized.base_assistant_config.workspace_names),
        datasource_names: cloneIdArray(normalized.base_assistant_config.datasource_names),
        public_list: cloneIdArray(normalized.base_assistant_config.public_list),
        public_list_names: cloneIdArray(normalized.base_assistant_config.public_list_names),
        private_list: cloneIdArray(normalized.base_assistant_config.private_list),
        private_list_names: cloneIdArray(normalized.base_assistant_config.private_list_names),
      }
      this.advanced_assistant_config = {
        ...normalized.advanced_assistant_config,
        credential_mappings: cloneCredentialMappings(normalized.advanced_assistant_config.credential_mappings),
      }
      this.loaded = true
    },
    clear() {
      this.$reset()
    },
  },
})

export const useSettingStore = () => {
  return SettingStore(store)
}
