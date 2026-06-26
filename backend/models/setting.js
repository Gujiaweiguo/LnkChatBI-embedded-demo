// const pool = require('../config/database');
const pool = require('../config/db_pool');

/**
 * Parse a JSON text column. Returns parsed object or null.
 */
function parseJsonCol(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

function normalizeIdArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      return null;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' && value.trim() ? value.trim() : null))
    .filter(Boolean);
}

/**
 * Build a minimal base_assistant_config from legacy scalar fields.
 */
function backfillBaseConfig(row) {
  return {
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
  };
}

/**
 * Build a minimal advanced_assistant_config from legacy scalar fields,
 * migrating aes_enable / aes_key into the richer model.
 *
 * Advanced assistant (type=1) is external-API-only: it does not carry
 * workspace/datasource/auto_ds/default_ds config (see LnkChatBI commit
 * 167987b5). Only AES + endpoint + certificate mappings matter here.
 */
function backfillAdvancedConfig(row) {
  return {
    name: '',
    description: '',
    cross_domain_enabled: false,
    cross_domain_origins: '',
    interface_endpoint: '',
    timeout: 30000,
    aes_enable: !!row.aes_enable,
    aes_key: row.aes_key || '',
    credential_mappings: [],
  };
}

async function getNamesByIds(_tableName, _ids) {
  // Demo database (lnkchatbi_demo) does not carry sys_assistant / sys_workspace /
  // core_datasource tables — those live in the LnkChatBI main database. The
  // previous enrichment flow that called this helper was removed when the
  // demo switched to populating the assistant picker via the LnkChatBI
  // login-free embed/list endpoint (frontend/src/api/assistant.ts).
  return [];
}

function enrichBaseAssistantConfig(config, _assistantId) {
  // No in-place enrichment from sys_assistant — the demo does not join across
  // databases. The config is persisted as the operator saved it; the picker
  // is populated separately by the frontend calling embed/list directly.
  return config;
}

function enrichAdvancedAssistantConfig(config, _assistantId) {
  return config;
}

/**
 * Derive base_assistant_id from base_assistant_config.
 * If the config carries an explicit assistant_id, use it;
 * otherwise fall back to the legacy column value.
 */
function deriveBaseAssistantId(config, legacyId) {
  if (config && config.assistant_id != null && config.assistant_id !== '') return config.assistant_id;
  return legacyId || null;
}

/**
 * Derive advanced_assistant_id from advanced_assistant_config.
 */
function deriveAdvancedAssistantId(config, legacyId) {
  if (config && config.assistant_id != null && config.assistant_id !== '') return config.assistant_id;
  return legacyId || null;
}

const createTable = async () => {
  const setting_ddl = `
    CREATE TABLE IF NOT EXISTS setting (
      id SERIAL PRIMARY KEY,
      domain VARCHAR(255) NOT NULL,
      base_assistant_id VARCHAR(255),
      advanced_assistant_id VARCHAR(255),
      aes_enable BOOL,
      aes_key VARCHAR(255)
    );
    ALTER TABLE setting ADD COLUMN IF NOT EXISTS aes_enable BOOL;
    ALTER TABLE setting ADD COLUMN IF NOT EXISTS aes_key VARCHAR(255);
    ALTER TABLE setting ADD COLUMN IF NOT EXISTS base_assistant_config TEXT;
    ALTER TABLE setting ADD COLUMN IF NOT EXISTS advanced_assistant_config TEXT;
    -- access_token column retained for rollback safety (OpenSpec change
    -- 'add-embedded-assistant-listing-endpoint' replaced it with a login-free
    -- Origin-bound endpoint). No longer read or written by application code.
    ALTER TABLE setting ADD COLUMN IF NOT EXISTS access_token VARCHAR(2048);
  `
  await pool.query(setting_ddl)
};

/**
 * Backfill richer config columns from existing legacy data on startup.
 */
const backfillConfigs = async () => {
  try {
    const result = await pool.query(`
      SELECT id, base_assistant_config, advanced_assistant_config, aes_enable, aes_key,
             base_assistant_id, advanced_assistant_id
      FROM setting
    `);
    for (const row of result.rows) {
      const updates = [];
      const params = [];
      let idx = 1;
      if (!row.base_assistant_config) {
        updates.push(`base_assistant_config = $${idx++}`);
        params.push(JSON.stringify(await enrichBaseAssistantConfig(backfillBaseConfig(row), row.base_assistant_id)));
      }
      if (!row.advanced_assistant_config) {
        updates.push(`advanced_assistant_config = $${idx++}`);
        params.push(JSON.stringify(await enrichAdvancedAssistantConfig(backfillAdvancedConfig(row), row.advanced_assistant_id)));
      }
      if (updates.length) {
        params.push(row.id);
        await pool.query(`UPDATE setting SET ${updates.join(', ')} WHERE id = $${idx}`, params);
      }
    }
  } catch (_) {
    // Table may not exist yet on first boot; ignore.
  }
};

// 初始化表
createTable().then(() => backfillConfigs());

/**
 * Decorate a setting row: parse JSON columns and ensure derived IDs.
 */
async function decorate(row) {
  if (!row) return row;
   const baseCfg = parseJsonCol(row.base_assistant_config);
   const advCfg = parseJsonCol(row.advanced_assistant_config);
   row.base_assistant_config = await enrichBaseAssistantConfig(baseCfg || backfillBaseConfig(row), row.base_assistant_id);
   row.advanced_assistant_config = await enrichAdvancedAssistantConfig(advCfg || backfillAdvancedConfig(row), row.advanced_assistant_id);
   row.base_assistant_id = deriveBaseAssistantId(row.base_assistant_config, row.base_assistant_id);
   row.advanced_assistant_id = deriveAdvancedAssistantId(row.advanced_assistant_config, row.advanced_assistant_id);
   return row;
}

const Setting = {

  async getById(id) {
    const result = await pool.query('SELECT * FROM setting WHERE id = $1', [id]);
    if (result?.rows?.length) {
      return decorate(result.rows[0]);
    }
    return null;
  },

  async create(settingData) {
    const {
      domain,
      base_assistant_id,
      advanced_assistant_id,
      aes_enable,
      aes_key,
      base_assistant_config,
      advanced_assistant_config,
    } = settingData;

    let baseCfg = parseJsonCol(base_assistant_config) || backfillBaseConfig(settingData);
    let advCfg = parseJsonCol(advanced_assistant_config) || backfillAdvancedConfig(settingData);

    const resolvedBaseId = deriveBaseAssistantId(baseCfg, base_assistant_id);
    const resolvedAdvId = deriveAdvancedAssistantId(advCfg, advanced_assistant_id);
    baseCfg = await enrichBaseAssistantConfig(baseCfg, resolvedBaseId);
    advCfg = await enrichAdvancedAssistantConfig(advCfg, resolvedAdvId);

    const result = await pool.query(
      `INSERT INTO setting
        (domain, base_assistant_id, advanced_assistant_id, aes_enable, aes_key, base_assistant_config, advanced_assistant_config)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [domain, resolvedBaseId, resolvedAdvId,
       aes_enable, aes_key, JSON.stringify(baseCfg), JSON.stringify(advCfg)]
    );
    return decorate(result.rows[0]);
  },

  async update(id, settingData) {
    const {
      domain,
      base_assistant_id,
      advanced_assistant_id,
      aes_enable,
      aes_key,
      base_assistant_config,
      advanced_assistant_config,
    } = settingData;

    let baseCfg = parseJsonCol(base_assistant_config) || backfillBaseConfig(settingData);
    let advCfg = parseJsonCol(advanced_assistant_config) || backfillAdvancedConfig(settingData);

    const resolvedBaseId = deriveBaseAssistantId(baseCfg, base_assistant_id);
    const resolvedAdvId = deriveAdvancedAssistantId(advCfg, advanced_assistant_id);
    baseCfg = await enrichBaseAssistantConfig(baseCfg, resolvedBaseId);
    advCfg = await enrichAdvancedAssistantConfig(advCfg, resolvedAdvId);

    const result = await pool.query(
      `UPDATE setting SET
        domain = $1, base_assistant_id = $2, advanced_assistant_id = $3,
        aes_enable = $4, aes_key = $5,
        base_assistant_config = $6, advanced_assistant_config = $7
       WHERE id = $8 RETURNING *`,
      [domain, resolvedBaseId, resolvedAdvId,
       aes_enable, aes_key, JSON.stringify(baseCfg), JSON.stringify(advCfg), id]
    );
    return decorate(result.rows[0]);
  },

  async delete(id) {
    await pool.query('DELETE FROM setting WHERE id = $1', [id]);
  },
};

module.exports = Setting;
