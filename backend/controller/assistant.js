const Setting = require('../models/setting');

const buildHeaders = (token) => {
  const headers = { 'Accept': 'application/json' };
  if (token) {
    headers['X-LNKCHATBI-TOKEN'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return headers;
};

const normalizeDomain = (domain) => {
  if (!domain) return '';
  return String(domain).replace(/\/+$/, '');
};

const buildListUrl = (domain, type) => {
  const base = normalizeDomain(domain);
  const url = new URL(`${base}/api/v1/system/assistant`);
  if (type !== undefined && type !== null && type !== '') {
    url.searchParams.set('type', String(type));
  }
  return url.toString();
};

const pickListItem = (raw) => ({
  id: raw?.id != null ? String(raw.id) : '',
  name: raw?.name ?? '',
  type: typeof raw?.type === 'number' ? raw.type : Number(raw?.type) || 0,
});

const assistantController = {
  async list(req, res, next) {
    try {
      const typeRaw = req.query.type;
      let type;
      if (typeRaw === 'base' || typeRaw === '0') type = 0;
      else if (typeRaw === 'advanced' || typeRaw === '1') type = 1;
      else type = undefined;

      const setting = await Setting.getById(1);
      const domain = normalizeDomain(req.query.domain || setting?.domain);
      const token = req.query.token || setting?.access_token || '';

      if (!domain) {
        return res.status(400).json({
          success: false,
          message: 'LnkChatBI 服务地址未配置',
        });
      }
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'LnkChatBI access_token 未配置',
        });
      }

      const upstream = await fetch(buildListUrl(domain, type), {
        method: 'GET',
        headers: buildHeaders(token),
      });

      const text = await upstream.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return res.status(502).json({
          success: false,
          message: 'LnkChatBI 返回非 JSON 响应',
          upstream_status: upstream.status,
          upstream_preview: text.slice(0, 500),
        });
      }

      if (!upstream.ok) {
        return res.status(502).json({
          success: false,
          message: 'LnkChatBI 列表接口报错',
          upstream_status: upstream.status,
          upstream_body: parsed,
        });
      }

      const rawList = Array.isArray(parsed) ? parsed : (parsed?.data || []);
      const filtered = rawList
        .filter((item) => item?.type !== 4)
        .filter((item) => type === undefined ? true : Number(item?.type) === type)
        .map(pickListItem);

      res.json({ success: true, data: filtered });
    } catch (error) {
      next(error);
    }
  },
};

const apiHandler = {
  prefix: '/assistant',
  mapping: [
    { path: '/list', method: 'get', handler: assistantController.list },
  ],
};

module.exports = apiHandler;
