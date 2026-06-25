const crypto = require('crypto');
const pool = require('../config/db_pool');
const { registerProvider } = require('./index');

const THXTD_DATASOURCE_ID = '20';
// Historical AES-128-ECB key used by the upstream thxtd metadata store to
// encrypt core_datasource.configuration. Value is fixed by external data and
// must NOT be changed; only renamed for brand alignment.
const LNKCHATBI_DATASOURCE_AES_KEY = 'SQLBot1234567890';

let thxtdDescriptorCache = null;

function decryptDatasourceConfiguration(encryptedText) {
  if (!encryptedText) {
    throw new Error('Datasource configuration is missing');
  }

  const decipher = crypto.createDecipheriv(
    'aes-128-ecb',
    Buffer.from(LNKCHATBI_DATASOURCE_AES_KEY, 'utf8'),
    null
  );
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(encryptedText), 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function introspectSchema() {
  if (thxtdDescriptorCache?.tables) {
    return thxtdDescriptorCache.tables;
  }

  const tableResult = await pool.query(
    `
      SELECT id::text AS id, table_name, table_comment, custom_comment
      FROM core_table
      WHERE ds_id::text = $1 AND checked = TRUE
      ORDER BY id
    `,
    [THXTD_DATASOURCE_ID]
  );

  const fieldResult = await pool.query(
    `
      SELECT table_id::text AS table_id, field_name, field_type, field_comment, custom_comment, field_index
      FROM core_field
      WHERE ds_id::text = $1 AND checked = TRUE
      ORDER BY table_id, field_index, id
    `,
    [THXTD_DATASOURCE_ID]
  );

  const fieldsByTable = new Map();
  fieldResult.rows.forEach((row) => {
    const fields = fieldsByTable.get(row.table_id) || [];
    fields.push({
      name: row.field_name,
      comment: row.custom_comment || row.field_comment || row.field_name,
      type: row.field_type ? String(row.field_type).toUpperCase() : '',
    });
    fieldsByTable.set(row.table_id, fields);
  });

  return tableResult.rows.map((row) => ({
    name: row.table_name,
    comment: row.custom_comment || row.table_comment || row.table_name,
    fields: fieldsByTable.get(row.id) || [],
  }));
}

async function getDescriptor() {
  if (thxtdDescriptorCache) {
    return thxtdDescriptorCache;
  }

  const datasourceResult = await pool.query(
    `
      SELECT id::text AS id, name, type, type_name, description, configuration
      FROM core_datasource
      WHERE id::text = $1
      LIMIT 1
    `,
    [THXTD_DATASOURCE_ID]
  );

  if (!datasourceResult.rows.length) {
    throw new Error(`Datasource ${THXTD_DATASOURCE_ID} not found in synced thxtd metadata`);
  }

  const ds = datasourceResult.rows[0];
  const conf = decryptDatasourceConfiguration(ds.configuration);
  const tables = await introspectSchema();

  thxtdDescriptorCache = {
    id: ds.id,
    name: ds.name || 'thxtd',
    type: ds.type || 'mysql',
    host: conf.host || '',
    port: conf.port || '',
    dataBase: conf.database || '',
    user: conf.username || '',
    password: conf.password || '',
    schema: conf.dbSchema || conf.database || '',
    comment: ds.description || `${ds.name || 'thxtd'} mysql datasource`,
    tables,
  };

  return thxtdDescriptorCache;
}

const provider = {
  id: THXTD_DATASOURCE_ID,
  name: 'thxtd',
  type: 'mysql',
  defaultSelected: false,
  introspectSchema,
  getDescriptor,
};

registerProvider(provider);

module.exports = provider;
