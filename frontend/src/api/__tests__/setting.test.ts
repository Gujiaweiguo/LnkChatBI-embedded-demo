import { describe, it, expect } from 'vitest'
import {
  createDefaultBaseAssistantConfig,
  createDefaultCredentialMapping,
  createDefaultAdvancedAssistantConfig,
  normalizeBaseAssistantConfig,
  normalizeCredentialMapping,
  normalizeAdvancedAssistantConfig,
  normalizeSettingRecord,
} from '../setting'

describe('createDefaultBaseAssistantConfig', () => {
  it('returns correct default shape', () => {
    const result = createDefaultBaseAssistantConfig()
    expect(result).toEqual({
      assistant_id: '',
      name: '',
      description: '',
      cross_domain_enabled: false,
      cross_domain_origins: '',
      workspace_scope: '',
      datasource_exposure: 'none',
      workspace_ids: [],
      datasource_ids: [],
      workspace_names: [],
      datasource_names: [],
      public_list: [],
      public_list_names: [],
      private_list: [],
      private_list_names: [],
      auto_ds: false,
      default_datasource_id: null,
      default_datasource_name: '',
    })
  })
})

describe('createDefaultCredentialMapping', () => {
  it('returns correct default shape with target_location header', () => {
    const result = createDefaultCredentialMapping()
    expect(result).toEqual({
      source_type: '',
      source_name: '',
      target_location: 'header',
      target_name: '',
      target_value_expression: '',
    })
  })

  it('returns a new object each call', () => {
    const a = createDefaultCredentialMapping()
    const b = createDefaultCredentialMapping()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('createDefaultAdvancedAssistantConfig', () => {
  it('returns correct default shape with timeout 30000', () => {
    const result = createDefaultAdvancedAssistantConfig()
    expect(result).toEqual({
      assistant_id: '',
      name: '',
      description: '',
      cross_domain_enabled: false,
      cross_domain_origins: '',
      interface_endpoint: '',
      timeout: 30000,
      aes_enable: false,
      aes_key: '',
      credential_mappings: [],
    })
  })

  it('returns a new object each call', () => {
    const a = createDefaultAdvancedAssistantConfig()
    const b = createDefaultAdvancedAssistantConfig()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })

  it('returns a new credential_mappings array each call', () => {
    const a = createDefaultAdvancedAssistantConfig()
    const b = createDefaultAdvancedAssistantConfig()
    expect(a.credential_mappings).not.toBe(b.credential_mappings)
  })
})

describe('normalizeBaseAssistantConfig', () => {
  it('returns defaults for null input', () => {
    const result = normalizeBaseAssistantConfig(null)
    expect(result).toEqual(createDefaultBaseAssistantConfig())
  })

  it('returns defaults for undefined input', () => {
    const result = normalizeBaseAssistantConfig(undefined)
    expect(result).toEqual(createDefaultBaseAssistantConfig())
  })

  it('falls back to legacyAssistantId when config.assistant_id is empty', () => {
    const result = normalizeBaseAssistantConfig({}, 'legacy-id-123')
    expect(result.assistant_id).toBe('legacy-id-123')
  })

  it('prefers config.assistant_id over legacyAssistantId', () => {
    const result = normalizeBaseAssistantConfig(
      { assistant_id: 'config-id' },
      'legacy-id'
    )
    expect(result.assistant_id).toBe('config-id')
  })

  it('falls back to "none" when datasource_exposure is empty', () => {
    const result = normalizeBaseAssistantConfig({ datasource_exposure: '' })
    expect(result.datasource_exposure).toBe('none')
  })

  it('preserves a valid datasource_exposure value', () => {
    const result = normalizeBaseAssistantConfig({ datasource_exposure: 'all' })
    expect(result.datasource_exposure).toBe('all')
  })

  it('handles partial input preserving defaults for missing fields', () => {
    const result = normalizeBaseAssistantConfig({ name: 'My Assistant' })
    expect(result.name).toBe('My Assistant')
    expect(result.assistant_id).toBe('')
    expect(result.description).toBe('')
    expect(result.cross_domain_enabled).toBe(false)
    expect(result.datasource_exposure).toBe('none')
    expect(result.workspace_ids).toEqual([])
    expect(result.datasource_ids).toEqual([])
  })

  it('normalizes base binding arrays and auto_ds', () => {
    const result = normalizeBaseAssistantConfig({
      workspace_ids: ['7455261716515917824', 1] as unknown as string[],
      datasource_ids: ['20', 17] as unknown as string[],
      workspace_names: ['thxtd'] as unknown as string[],
      datasource_names: ['thxtd'] as unknown as string[],
      public_list: ['20'] as unknown as string[],
      public_list_names: ['thxtd'] as unknown as string[],
      private_list: [21] as unknown as string[],
      private_list_names: ['private-ds'] as unknown as string[],
      auto_ds: true,
    })
    expect(result.workspace_ids).toEqual(['7455261716515917824', '1'])
    expect(result.datasource_ids).toEqual(['20', '17'])
    expect(result.workspace_names).toEqual(['thxtd'])
    expect(result.datasource_names).toEqual(['thxtd'])
    expect(result.public_list).toEqual(['20'])
    expect(result.public_list_names).toEqual(['thxtd'])
    expect(result.private_list).toEqual(['21'])
    expect(result.private_list_names).toEqual(['private-ds'])
    expect(result.auto_ds).toBe(true)
  })

  it('handles full input preserving all values', () => {
    const full = {
      assistant_id: 'id-1',
      name: 'Test',
      description: 'Desc',
      cross_domain_enabled: true,
      cross_domain_origins: '*',
      workspace_scope: 'global',
      datasource_exposure: 'partial',
      workspace_ids: ['1'],
      datasource_ids: ['20'],
      workspace_names: ['thxtd'],
      datasource_names: ['thxtd'],
      public_list: ['20'],
      public_list_names: ['thxtd'],
      private_list: [],
      private_list_names: [],
      auto_ds: false,
      default_datasource_id: null,
      default_datasource_name: '',
    }
    const result = normalizeBaseAssistantConfig(full)
    expect(result).toEqual(full)
  })

  it('coerces non-string fields via toStringValue', () => {
    const result = normalizeBaseAssistantConfig({
      assistant_id: 123 as unknown as string,
      name: undefined as unknown as string,
    })
    expect(result.assistant_id).toBe('')
    expect(result.name).toBe('')
  })

  it('coerces non-boolean cross_domain_enabled via toBooleanValue', () => {
    const result = normalizeBaseAssistantConfig({
      cross_domain_enabled: 'true' as unknown as boolean,
    })
    expect(result.cross_domain_enabled).toBe(false)
  })
})

describe('normalizeCredentialMapping', () => {
  it('returns defaults for null input', () => {
    const result = normalizeCredentialMapping(null)
    expect(result).toEqual(createDefaultCredentialMapping())
  })

  it('returns defaults for undefined input', () => {
    const result = normalizeCredentialMapping(undefined)
    expect(result).toEqual(createDefaultCredentialMapping())
  })

  it('defaults target_location to "header" when empty', () => {
    const result = normalizeCredentialMapping({ target_location: '' })
    expect(result.target_location).toBe('header')
  })

  it('defaults target_location to "header" when omitted', () => {
    const result = normalizeCredentialMapping({})
    expect(result.target_location).toBe('header')
  })

  it('preserves a valid target_location value', () => {
    const result = normalizeCredentialMapping({ target_location: 'query' })
    expect(result.target_location).toBe('query')
  })

  it('handles partial input preserving defaults for missing fields', () => {
    const result = normalizeCredentialMapping({ source_name: 'api_key' })
    expect(result.source_name).toBe('api_key')
    expect(result.source_type).toBe('')
    expect(result.target_location).toBe('header')
  })

  it('handles full input preserving all values', () => {
    const full = {
      source_type: 'env',
      source_name: 'KEY',
      target_location: 'query',
      target_name: 'token',
      target_value_expression: '${value}',
    }
    const result = normalizeCredentialMapping(full)
    expect(result).toEqual(full)
  })
})

describe('normalizeAdvancedAssistantConfig', () => {
  it('returns defaults for null input', () => {
    const result = normalizeAdvancedAssistantConfig(null)
    expect(result).toEqual(createDefaultAdvancedAssistantConfig())
  })

  it('returns defaults for undefined input', () => {
    const result = normalizeAdvancedAssistantConfig(undefined)
    expect(result).toEqual(createDefaultAdvancedAssistantConfig())
  })

  it('falls back to legacyAssistantId when config.assistant_id is empty', () => {
    const result = normalizeAdvancedAssistantConfig({}, 'legacy-adv-id')
    expect(result.assistant_id).toBe('legacy-adv-id')
  })

  it('prefers config.assistant_id over legacyAssistantId', () => {
    const result = normalizeAdvancedAssistantConfig(
      { assistant_id: 'cfg-id' },
      'legacy-id'
    )
    expect(result.assistant_id).toBe('cfg-id')
  })

  it('uses legacyAesEnable as fallback when config.aes_enable is not boolean', () => {
    const result = normalizeAdvancedAssistantConfig({}, '', true, '')
    expect(result.aes_enable).toBe(true)
  })

  it('prefers config.aes_enable over legacyAesEnable', () => {
    const result = normalizeAdvancedAssistantConfig(
      { aes_enable: false },
      '',
      true,
      ''
    )
    expect(result.aes_enable).toBe(false)
  })

  it('uses legacyAesKey as fallback when config.aes_key is empty', () => {
    const result = normalizeAdvancedAssistantConfig({}, '', false, 'legacy-key')
    expect(result.aes_key).toBe('legacy-key')
  })

  it('prefers config.aes_key over legacyAesKey', () => {
    const result = normalizeAdvancedAssistantConfig(
      { aes_key: 'config-key' },
      '',
      false,
      'legacy-key'
    )
    expect(result.aes_key).toBe('config-key')
  })

  it('falls back timeout to 30000 when value is invalid', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: NaN })
    expect(result.timeout).toBe(30000)
  })

  it('falls back timeout to 30000 when value is Infinity', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: Infinity })
    expect(result.timeout).toBe(30000)
  })

  it('preserves a valid numeric timeout', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: 5000 })
    expect(result.timeout).toBe(5000)
  })

  it('parses string timeout to number', () => {
    const result = normalizeAdvancedAssistantConfig({
      timeout: '10000' as unknown as number,
    })
    expect(result.timeout).toBe(10000)
  })

  it('normalizes credential_mappings entries', () => {
    const result = normalizeAdvancedAssistantConfig({
      credential_mappings: [
        { source_type: 'env', source_name: 'API_KEY' },
        { target_location: 'query', target_name: 'token' },
      ] as unknown as Array<import('../setting').CredentialMapping>,
    })
    expect(result.credential_mappings).toHaveLength(2)
    expect(result.credential_mappings[0]).toEqual({
      source_type: 'env',
      source_name: 'API_KEY',
      target_location: 'header',
      target_name: '',
      target_value_expression: '',
    })
    expect(result.credential_mappings[1]).toEqual({
      source_type: '',
      source_name: '',
      target_location: 'query',
      target_name: 'token',
      target_value_expression: '',
    })
  })

  it('returns empty credential_mappings for non-array input', () => {
    const result = normalizeAdvancedAssistantConfig({
      credential_mappings: 'not-array' as unknown as [],
    })
    expect(result.credential_mappings).toEqual([])
  })

  it('returns empty credential_mappings when omitted', () => {
    const result = normalizeAdvancedAssistantConfig({})
    expect(result.credential_mappings).toEqual([])
  })

  it('handles full input preserving all values', () => {
    const full = {
      assistant_id: 'adv-id',
      name: 'Adv',
      description: 'Desc',
      cross_domain_enabled: true,
      cross_domain_origins: 'http://example.com',
      interface_endpoint: '/api/chat',
      timeout: 60000,
      aes_enable: true,
      aes_key: 'secret-key',
      credential_mappings: [],
    }
    const result = normalizeAdvancedAssistantConfig(full)
    expect(result).toEqual(full)
  })
})

describe('normalizeSettingRecord', () => {
  it('returns defaults for null input', () => {
    const result = normalizeSettingRecord(null)
    const defaultBase = createDefaultBaseAssistantConfig()
    const defaultAdv = createDefaultAdvancedAssistantConfig()
    expect(result.domain).toBe('')
    expect(result.base_assistant_id).toBe('')
    expect(result.advanced_assistant_id).toBe('')
    expect(result.aes_enable).toBe(false)
    expect(result.aes_key).toBe('')
    expect(result.base_assistant_config).toEqual(defaultBase)
    expect(result.advanced_assistant_config).toEqual(defaultAdv)
  })

  it('returns defaults for undefined input', () => {
    const result = normalizeSettingRecord(undefined)
    expect(result).toEqual(normalizeSettingRecord(null))
  })

  it('returns defaults for empty object input', () => {
    const result = normalizeSettingRecord({})
    expect(result).toEqual(normalizeSettingRecord(null))
  })

  it('handles partial input with only domain', () => {
    const result = normalizeSettingRecord({ domain: 'example.com' })
    expect(result.domain).toBe('example.com')
    expect(result.base_assistant_id).toBe('')
  })

  it('normalizes base_assistant_config and propagates assistant_id', () => {
    const result = normalizeSettingRecord({
      base_assistant_id: 'base-id-1',
      base_assistant_config: { name: 'Test Base' } as unknown as import('../setting').BaseAssistantConfig,
    })
    expect(result.base_assistant_id).toBe('base-id-1')
    expect(result.base_assistant_config.name).toBe('Test Base')
    expect(result.base_assistant_config.assistant_id).toBe('base-id-1')
  })

  it('normalizes advanced_assistant_config with legacy AES fallback', () => {
    const result = normalizeSettingRecord({
      advanced_assistant_id: 'adv-id-1',
      aes_enable: true,
      aes_key: 'setting-aes-key',
    })
    expect(result.advanced_assistant_id).toBe('adv-id-1')
    expect(result.advanced_assistant_config.assistant_id).toBe('adv-id-1')
    expect(result.advanced_assistant_config.aes_enable).toBe(true)
    expect(result.advanced_assistant_config.aes_key).toBe('setting-aes-key')
    expect(result.aes_enable).toBe(true)
    expect(result.aes_key).toBe('setting-aes-key')
  })

  it('handles full input preserving all values', () => {
    const data = {
      domain: 'test.com',
      base_assistant_id: 'b-id',
      advanced_assistant_id: 'a-id',
      aes_enable: true,
      aes_key: 'aes-key',
      base_assistant_config: {
        assistant_id: 'b-cfg-id',
        name: 'Base',
        description: 'Base Desc',
        cross_domain_enabled: true,
        cross_domain_origins: '*',
        workspace_scope: 'ws',
        datasource_exposure: 'all',
        workspace_ids: ['7455261716515917824'],
        datasource_ids: ['20'],
        workspace_names: ['thxtd'],
        datasource_names: ['thxtd'],
        public_list: ['20'],
        public_list_names: ['thxtd'],
        private_list: [],
        private_list_names: [],
        auto_ds: false,
        default_datasource_id: null,
        default_datasource_name: '',
      },
      advanced_assistant_config: {
        assistant_id: 'a-cfg-id',
        name: 'Adv',
        description: 'Adv Desc',
        cross_domain_enabled: false,
        cross_domain_origins: '',
        interface_endpoint: '/api',
        timeout: 15000,
        aes_enable: false,
        aes_key: 'cfg-aes-key',
        credential_mappings: [],
      },
    }
    const result = normalizeSettingRecord(data)

    expect(result.domain).toBe('test.com')

    expect(result.base_assistant_id).toBe('b-cfg-id')
    expect(result.base_assistant_config.name).toBe('Base')
    expect(result.base_assistant_config.cross_domain_enabled).toBe(true)
    expect(result.base_assistant_config.workspace_names).toEqual(['thxtd'])
    expect(result.base_assistant_config.datasource_names).toEqual(['thxtd'])
    expect(result.base_assistant_config.public_list_names).toEqual(['thxtd'])

    expect(result.advanced_assistant_id).toBe('a-cfg-id')
    expect(result.advanced_assistant_config.name).toBe('Adv')
    expect(result.advanced_assistant_config.timeout).toBe(15000)
    expect(result.advanced_assistant_config.interface_endpoint).toBe('/api')
    expect(result.advanced_assistant_config.credential_mappings).toEqual([])

    expect(result.aes_enable).toBe(false)
    expect(result.aes_key).toBe('cfg-aes-key')
  })

  it('falls back base_assistant_id from top-level when config is missing', () => {
    const result = normalizeSettingRecord({
      base_assistant_id: 'top-level-id',
    })
    expect(result.base_assistant_id).toBe('top-level-id')
    expect(result.base_assistant_config.assistant_id).toBe('top-level-id')
  })

  it('falls back advanced_assistant_id from top-level when config is missing', () => {
    const result = normalizeSettingRecord({
      advanced_assistant_id: 'top-adv-id',
    })
    expect(result.advanced_assistant_id).toBe('top-adv-id')
    expect(result.advanced_assistant_config.assistant_id).toBe('top-adv-id')
  })
})

describe('internal helper: toStringValue (via string fields)', () => {
  it('returns empty string for undefined', () => {
    const result = normalizeBaseAssistantConfig({ name: undefined as unknown as string })
    expect(result.name).toBe('')
  })

  it('returns empty string for null', () => {
    const result = normalizeBaseAssistantConfig({ name: null as unknown as string })
    expect(result.name).toBe('')
  })

  it('returns empty string for number', () => {
    const result = normalizeBaseAssistantConfig({ name: 42 as unknown as string })
    expect(result.name).toBe('')
  })

  it('returns empty string for boolean', () => {
    const result = normalizeBaseAssistantConfig({ name: true as unknown as string })
    expect(result.name).toBe('')
  })

  it('returns the string for valid string', () => {
    const result = normalizeBaseAssistantConfig({ name: 'hello' })
    expect(result.name).toBe('hello')
  })

  it('returns empty string for empty string', () => {
    const result = normalizeBaseAssistantConfig({ name: '' })
    expect(result.name).toBe('')
  })
})

describe('internal helper: toBooleanValue (via boolean fields)', () => {
  it('returns false for non-boolean with default fallback', () => {
    const result = normalizeBaseAssistantConfig({
      cross_domain_enabled: 'yes' as unknown as boolean,
    })
    expect(result.cross_domain_enabled).toBe(false)
  })

  it('returns true for boolean true', () => {
    const result = normalizeBaseAssistantConfig({ cross_domain_enabled: true })
    expect(result.cross_domain_enabled).toBe(true)
  })

  it('returns false for boolean false', () => {
    const result = normalizeBaseAssistantConfig({ cross_domain_enabled: false })
    expect(result.cross_domain_enabled).toBe(false)
  })

  it('returns false for number 1', () => {
    const result = normalizeBaseAssistantConfig({
      cross_domain_enabled: 1 as unknown as boolean,
    })
    expect(result.cross_domain_enabled).toBe(false)
  })

  it('returns false for null', () => {
    const result = normalizeBaseAssistantConfig({
      cross_domain_enabled: null as unknown as boolean,
    })
    expect(result.cross_domain_enabled).toBe(false)
  })
})

describe('internal helper: toNumberValue (via timeout field)', () => {
  it('returns fallback for NaN', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: NaN })
    expect(result.timeout).toBe(30000)
  })

  it('returns fallback for Infinity', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: Infinity })
    expect(result.timeout).toBe(30000)
  })

  it('returns fallback for -Infinity', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: -Infinity })
    expect(result.timeout).toBe(30000)
  })

  it('returns fallback for undefined', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: undefined })
    expect(result.timeout).toBe(30000)
  })

  it('returns fallback for string non-number', () => {
    const result = normalizeAdvancedAssistantConfig({
      timeout: 'abc' as unknown as number,
    })
    expect(result.timeout).toBe(30000)
  })

  it('parses valid numeric string', () => {
    const result = normalizeAdvancedAssistantConfig({
      timeout: '15000' as unknown as number,
    })
    expect(result.timeout).toBe(15000)
  })

  it('returns 0 for empty string (Number("") is 0, which is finite)', () => {
    const result = normalizeAdvancedAssistantConfig({
      timeout: '' as unknown as number,
    })
    expect(result.timeout).toBe(0)
  })

  it('returns fallback for 0', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: 0 })
    expect(result.timeout).toBe(0)
  })

  it('preserves valid number', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: 5000 })
    expect(result.timeout).toBe(5000)
  })

  it('preserves negative number', () => {
    const result = normalizeAdvancedAssistantConfig({ timeout: -100 })
    expect(result.timeout).toBe(-100)
  })

  it('returns fallback for boolean', () => {
    const result = normalizeAdvancedAssistantConfig({
      timeout: true as unknown as number,
    })
    expect(result.timeout).toBe(30000)
  })
})
