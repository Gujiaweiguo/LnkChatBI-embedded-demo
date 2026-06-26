# LnkChatBI 嵌入式配置操作说明

本文档给出本仓库 `LnkChatBI-embedded-demo` 与 LnkChatBI 主产品的对接配置步骤，覆盖**基础小助手**和**高级小助手**两条接入路径。

## 0. 准备工作：把宿主页域名加入 LnKChatBI 助手的跨域白名单

Demo 配置页通过浏览器直连 LnkChatBI 的免登录 Origin-bound 接口 `GET /api/v1/system/assistant/embed/list` 拉取助手列表。浏览器自动附加 `Origin` header，LnKChatBI 依据每个助手配置的跨域白名单过滤后返回该 origin 能看到的助手。

因此**必须在 LnkChatBI 后台把宿主页域名（如 `http://localhost:5180`、`http://119.29.59.128:5180`）添加到对应助手的跨域白名单中**，否则配置页拉取列表会得到空数组。

无需 access_token，无需从 LnkChatBI 浏览器拷贝任何凭据。

## 1. 前置条件

### 1.1 LnkChatBI 侧

- 已部署可访问的 LnkChatBI 实例（下文记为 `<LnkChatBI-domain>`，例如 `http://localhost:8000` 或 `https://lnkchatbi.example.com`）
- 已用 `admin` 账号登录 LnkChatBI 管理端
- 已在 LnkChatBI 中创建对应类型的助手（基础应用 / 高级应用），并配置好跨域白名单、数据源权限（基础助手）或接口契约（高级助手）

### 1.2 宿主系统（本 Demo）侧

- Node.js >= 18（demo 后端用到了原生 `fetch`）
- PostgreSQL（已建库，后端启动时自动建表 + 写入种子数据）
- 已分别安装前后端依赖：`cd frontend && npm install` + `cd backend && npm install`
- 已复制 `backend/.env.example` 为 `backend/.env` 并填好数据库连接

## 2. 在 LnkChatBI 中创建应用

使用 `admin` 登录 LnkChatBI，进入**小助手应用**页面，根据接入路径分别创建：

| 接入路径 | LnkChatBI 应用类型 | 关键配置 |
|---|---|---|
| 基础小助手 | 基础应用（type=0） | 应用名称、跨域白名单、内部数据源权限 |
| 高级小助手 | 高级应用（type=1） | 应用名称、跨域白名单、`endpoint`、`timeout`、`certificate`、可选 `encrypt` / `aes_key` / `aes_iv` |

### 2.1 高级小助手的接口凭证（certificate）

LnkChatBI 调用宿主接口时，会按照高级助手配置中给出的 `certificate` 列表附加凭证。每条凭证包含：

| 字段 | 含义 | 取值示例 |
|---|---|---|
| target | 凭证位置 | `header` / `cookie` / `param` |
| key | 凭证字段名 | `Authorization` / `X-API-Key` |
| value | 凭证值 | `Bearer <token>` |

如果使用 `Authorization` header 鉴权，推荐配置：`target=header`、`key=Authorization`、`value=Bearer <token>`。

> 本 Demo 的 `/api/datasource/` 接口为示例实现，默认读取请求中的 `lnkchatbi-embedded-token` header 来识别本地用户（演示用，base64 解码）。生产对接时请替换为宿主自己的鉴权方式。

## 3. 在 Demo 中填入配置

启动 Demo 前后端后，浏览器访问 `http://localhost:5180`，使用默认账号登录：

- 账号：`developer` 或 `admin`
- 密码：`LnkChatBIDemo@123`

### 3.1 基础小助手配置

打开 `#/setting/base-assistant`，依次填写：

1. **LnkChatBI 服务地址**：`<LnkChatBI-domain>`（如 `http://localhost:8000`，**末尾不带 `/`**）
2. 点击**「拉取助手列表」**按钮，浏览器会直连 LnkChatBI 免登录接口 `GET <domain>/api/v1/system/assistant/embed/list?type=0`，把 type=0 的助手填充到下拉框（仅显示已把宿主页 origin 加入跨域白名单的助手）
3. 从下拉框选择要嵌入的基础小助手
4. 点击**「保存基础小助手配置」**

保存后菜单会出现「基础小助手」入口。

### 3.2 高级小助手配置

打开 `#/setting/advanced-assistant`，依次填写：

1. **LnkChatBI 服务地址**：默认同步自基础小助手配置（如需独立指定也可在此页修改）
2. 点击**「拉取助手列表」**按钮，拉取 type=1 的助手（同样走 embed/list 免登录接口）
3. 从下拉框选择要嵌入的高级小助手
4. **（可选）启用 AES**：与 LnkChatBI 高级应用配置保持一致（启用则需填入相同的 AES Key）
5. 点击**「保存高级小助手配置」**

保存后菜单会出现「高级小助手」入口。

> 服务地址在两个配置页之间共享（同步到 demo 后端的同一条 setting 记录），任意一页修改后另一页也会同步。

## 4. LnkChatBI 跨域设置

宿主页通过 `<script>` 加载 `assistant.js`、通过 iframe 加载 `#/embeddedPage`，因此 LnkChatBI 必须将宿主域名加入跨域白名单：

- 开发环境：`http://localhost:5180`
- 生产环境：宿主系统的实际访问地址

## 5. 验证嵌入效果

### 5.1 基础小助手

- 浮窗：访问 `#/assistant/float`，页面右下角应出现 LnkChatBI 小助手浮标，点击展开对话框
- 全屏：访问 `#/assistant/full`，整页应被 LnkChatBI 嵌入式问数页接管

### 5.2 高级小助手

- 浮窗：访问 `#/advanced/float`，与基础助手浮窗形态一致
- 全屏：访问 `#/advanced/full`，整页应被 LnkChatBI 嵌入式问数页接管
- LnkChatBI 在用户提问时会调用本 Demo 的 `GET /api/datasource/` 接口拉取数据源列表，可在 LnkChatBI 后端日志或本 Demo 后端日志中观察该调用

## 6. 高级小助手接口契约（与 LnkChatBI 对齐）

### 6.1 请求

```http
GET <endpoint>
Cookie: <若 certificate.target=cookie>
Header: <若 certificate.target=header>
Param:  <若 certificate.target=param>
```

### 6.2 响应

```json
{
  "code": 0,
  "data": [
    {
      "id": "datasource-id",
      "name": "datasource-name",
      "type": "mysql",
      "host": "...",
      "port": 3306,
      "user": "...",
      "password": "...",
      "dataBase": "...",
      "schema": "...",
      "db_schema": "...",
      "mode": "...",
      "tables": [...]
    }
  ]
}
```

- `code` 必须是 `0` 或 `200`，否则 LnkChatBI 视为失败
- `data` 必须是数组

### 6.3 AES 加密字段（仅当高级助手启用 AES 时）

| 字段 | 是否加密 |
|---|---|
| `host` | 是 |
| `user` | 是 |
| `password` | 是 |
| `dataBase` | 是 |
| `db_schema` | 是 |
| `schema` | 是 |
| `mode` | 是 |

加密参数：

- 算法：AES-256-CBC
- Padding：PKCS7
- Key：取 AES Key 的前 32 字符（不足补 `\0`）
- IV：取 AES IV 的前 16 字符（不足补 `\0`），未单独配置时默认 `lnkchatbi_em_aes_iv`
- 输出：base64 字符串

本 Demo 的 AES 实现：`backend/controller/datasource.js`，常量 `LNKCHATBI_SIMPLE_AES_IV`。

## 7. 常见问题

### 7.1 拉取助手列表失败

- 检查 LnkChatBI 服务地址是否填对（末尾不带 `/`）
- **检查 LnkChatBI 助手的跨域白名单是否包含当前宿主页 origin**（如 `http://localhost:5180`）—— embed/list 接口会按白名单过滤，未匹配的 origin 会得到空数组
- 检查 LnkChatBI 后端是否在运行（`<domain>/api/v1/system/assistant/embed/list` 带 `Origin` header 应返回 `{"code":0,"data":[...]}`）
- 浏览器 Console 查看是否有 CORS 报错
- 浏览器 Network 查看 `embed/list` 请求的实际响应内容

### 7.2 浮窗/全屏页空白

- 检查 LnkChatBI 跨域白名单是否包含宿主页域名（`http://localhost:5180`）
- 浏览器控制台查看是否有 CSP 或 CORS 报错
- 检查 demo 设置页是否已成功选择助手 ID

### 7.3 高级助手问数失败

- LnkChatBI 后台的高级助手 `endpoint` 是否正确（相对路径 `/api/datasource/` 或完整 URL `http://<demo-host>:3100/api/datasource/` 均可；若使用相对路径，需确保 LnkChatBI 助手的跨域白名单已包含宿主页域名）
- 本 Demo 后端是否在运行（`/health` 端点返回 OK）
- 若启用 AES，确认双方 AES Key / IV 完全一致
- 本 Demo 后端日志查看 `GET /api/datasource/` 是否被调用、响应是否正常

### 7.4 菜单不显示

- 检查对应助手 ID 是否已保存到设置页
- 退出登录重新登录一次（动态路由基于设置 store 重新计算）

