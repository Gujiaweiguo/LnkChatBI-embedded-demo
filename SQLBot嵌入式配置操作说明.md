# SQLBot 嵌入式配置操作说明

本文基于 SQLBot 官方文档《嵌入式对接》中的基础应用（`#111`）及同页相关嵌入说明整理，并结合本仓库 `sqlbot-embedded-demo` 的实际实现给出一份可执行的配置操作指南。

- 官方文档：<https://sqlbot.org/docs/v1/embedding_integration/#111>
- 当前 Demo 仓库：`sqlbot-embedded-demo`

## 1. 适用范围

本 Demo 支持三类嵌入方式：

1. **基础应用嵌入**
2. **高级应用嵌入**
3. **嵌入式小助手**（问数页 + 数据源页）

它们在本仓库中的对应页面如下：

- 基础应用浮窗：`frontend/src/views/assistant/float.vue`
- 基础应用全屏：`frontend/src/views/assistant/full.vue`
- 高级应用浮窗：`frontend/src/views/advanced/float.vue`
- 高级应用全屏：`frontend/src/views/advanced/full.vue`
- 嵌入式小助手问数页：`frontend/src/views/assistant-embed/base.vue`
- 嵌入式小助手数据源页：`frontend/src/views/assistant-embed/advanced.vue`

## 2. 前置条件

在开始配置前，请确认以下条件满足：

### 2.1 SQLBot 侧

- 已能登录 SQLBot 管理端。
- 已准备好工作空间与可用数据源。
- 已确认宿主系统域名或访问地址，用于 SQLBot 的跨域设置。

### 2.2 Demo 系统侧

- 后端已可启动，并可访问数据库。
- 前端已可启动。
- 当前开发端口约定如下：
  - 前端：`5180`
  - 后端：`3100`

启动命令：

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

启动后访问：

- 前端页面：`http://<你的主机>:5180/`
- 后端健康检查：`http://<你的主机>:3100/health`

## 3. 在 SQLBot 中创建嵌入应用

## 3.1 基础应用

根据官方文档，使用 `admin` 登录 SQLBot 后，在**小助手应用**中创建基础应用。

需要关注的配置项：

1. **名称**
2. **描述**
3. **跨域设置**
4. **工作空间**
5. **数据源权限**

说明：

- 基础应用采用“游客 / 员工”简单权限模式。
- 游客模式只能访问“公共”数据源。

创建完成后，记录：

- **基础应用 ID**

该值将填写到本 Demo 的“基础应用 ID”字段。

## 3.2 高级应用

高级应用与基础应用的核心区别在于：**数据源通过宿主系统 API 接口提供**。

在 SQLBot 中创建高级应用时，除常规信息外，还需要重点配置：

1. **数据源接口地址**
2. **接口认证方式**
3. **是否开启 AES 加密**
4. **凭证来源与凭证目标映射**

官方文档给出的关键说明：

- SQLBot 在问数时会从宿主页面读取认证凭证。
- SQLBot 不会存储这些凭证。
- 如果宿主系统依赖 `httpOnly Cookie`，则需要额外定义一个可供接口调用的认证凭证。
- “目标凭证字段”支持 JS 表达式。

官方示例中的凭证配置：

### 源系统凭证

- 类型：`localStorage`
- 凭证名称：`sqlbot-embedded-token`

示例：

```js
var source_val = localStorage.getItem('sqlbot-embedded-token')
```

### 目标凭证

值示例：

```js
Bearer ${JSON.parse(JSON.parse(source_val).v)}
```

### 目标凭证位置

- 位置：`header`
- 名称：`sqlbot-embedded-token`

创建完成后，记录：

- **高级应用 ID**
- **是否开启 AES**
- **AES KEY**（若启用）

这些值将填写到本 Demo 的对应表单字段。

## 3.3 基础应用与高级应用的数据源访问配置差异

基础应用和高级应用的数据源访问机制完全不同，配置位置也不同。下面逐项说明。

### 基础应用：在 SQLBot 基础应用设置中配置数据源访问

基础应用的数据源访问由 SQLBot 内部的工作空间与权限模型决定，配置入口在 SQLBot 管理端的**基础应用设置**页面中。

关键字段与语义：

| 字段 | 含义 |
|---|---|
| `oid` | 工作空间 ID，决定该应用归属哪个工作空间 |
| `public_list` | 公共数据源列表，控制游客模式下可访问的数据源 |

配置逻辑：

- 基础应用绑定到某个工作空间（`oid`），该工作空间下已接入的数据源决定了应用能看到的数据范围。
- `public_list` 字段用于标记哪些数据源对游客开放。未登录用户（游客）只能访问 `public_list` 中列出的数据源。
- 已登录用户（员工）可以访问该工作空间下所有已授权的数据源，不受 `public_list` 限制。

宿主系统（本 Demo）不参与基础应用的数据源配置。宿主只需提供 SQLBot 服务地址和基础应用 ID，数据源的全部权限控制在 SQLBot 侧完成。

### 高级应用：在 SQLBot 高级应用设置 + 宿主数据源接口中配置数据源访问

高级应用的数据源不由 SQLBot 内部管理，而是由宿主系统通过 API 动态提供。配置分布在两个位置：

**位置一：SQLBot 高级应用设置页面**

需要配置以下字段，让 SQLBot 知道如何调用宿主的数据源接口：

| 字段 | 含义 |
|---|---|
| `endpoint`（数据源接口地址） | 宿主系统提供的数据源 API 地址，本 Demo 中为 `/api/datasource/` |
| 接口认证方式 | SQLBot 调用宿主接口时传递凭证的方式（header / cookie 等） |
| AES 开关与密钥 | 是否对数据源响应中的敏感字段做 AES 加密 |
| 凭证来源（源系统凭证） | 从宿主页面的 localStorage 等位置读取认证 token |
| 凭证目标（目标凭证） | 将源凭证转换后附加到请求 header，供宿主接口校验 |

**位置二：宿主系统数据源接口（`/api/datasource/`）**

SQLBot 在问数时会调用宿主配置的 `endpoint` 地址，宿主接口返回的数据源列表就是高级应用实际可用的数据源。本 Demo 中该接口的实现为 `backend/controller/datasource.js`。

返回结构中的每个数据源对象包含以下核心字段：

```json
{
  "name": "数据源名称",
  "type": "数据库类型",
  "host": "数据库地址",
  "port": "端口",
  "user": "用户名",
  "password": "密码",
  "dataBase": "数据库名",
  "schema": "schema",
  "comment": "备注",
  "tables": "表过滤规则",
  "fields": "字段过滤规则"
}
```

如果启用了 AES，`host`、`user`、`password`、`dataBase`、`schema` 这五个字段会被加密传输。

### 当前环境的数据源映射

本 Demo 通过 provider 注册表提供数据源，支持多种后端：

- **GS SCRM**：内置演示数据源，对应 `backend/providers/gs_scrm.js`。
- **thxtd**：从 mysqlbot 同步的元数据中读取，对应 `backend/providers/thxtd.js`。该 provider 从 `core_datasource`（id=20）、`core_table`、`core_field` 表读取数据源连接信息和表/字段元数据，无需直接连接远程 MySQL。

高级应用的 `/api/datasource/` 接口会根据设置中配置的 `datasource_ids` 选择对应的 provider，并对 `host/user/password/dataBase/schema` 做 AES 加密后返回给 SQLBot。

如果后续需要新增数据源，在 `backend/providers/` 下新建 provider 并注册即可。

## 3.4 页面嵌入

页面嵌入在 SQLBot 中创建后，需要记录：

- **APP ID**
- **APP Secret**

官方文档强调：

- 页面嵌入所需 token 应由**后端生成**。
- 不要在前端直接暴露 `APP Secret`。

本仓库中，后端使用 `backend/controller/token.js` 生成 token，逻辑为：

- payload：`appId + account`
- secret：`embedded_app_secret`

## 3.5 页面嵌入凭据的来源与运行时流程

#### 凭据从哪里获取

页面嵌入所需的三个参数全部来自 **SQLBot 管理后台**，不是本 Demo 自己生成的。

获取路径：

1. 使用 `admin` 账号登录 SQLBot 管理端。
2. 导航到 **页面嵌入 → 新建应用**。
3. SQLBot 会自动生成 **APP ID** 和 **APP Secret**。
4. 记录这两个值，然后手动填入本 Demo 的“通用设置”页面。

三个参数的含义：

| 参数 | 含义 | 示例 |
|------|------|------|
| SQLBot 服务地址 (`domain`) | SQLBot 产品的后端部署地址 | `https://sqlbot.lanlnk.cn` |
| 页面嵌入 APP ID (`embedded_app_id`) | SQLBot 平台上注册的页面嵌入应用的唯一标识 | `f0f5803e7dbc074b` |
| 页面嵌入 APP Secret (`embedded_app_secret`) | 与 APP ID 配对的签名密钥，用于签发 JWT | （创建时 SQLBot 显示的密钥值） |

#### 运行时如何使用

页面嵌入场景的认证流程如下：

```
宿主 Demo 通用设置页 → POST /api/setting → PostgreSQL setting 表（保存凭据）
                                                    │
                                                    ▼
          嵌入页面（问数/数据源）→ GET /api/token → backend/controller/token.js
                                                    │
                                              读取 embedded_app_id
                                              读取 embedded_app_secret
                                                    │
                                         ┌──────────┴──────────┐
                                         │   生成 JWT           │
                                         │   payload: { appId } │
                                         │   签名: HS256+secret │
                                         └──────────┬──────────┘
                                                    │
                                                    ▼
          sqlbot_embedded_handler.mounted(selector, {
            appId: '<APP ID>',
            token: '<签名后的 JWT>'
          })
                                                    │
                                                    ▼
          SQLBot 服务 → 用同一份 APP Secret 验证 JWT 签名 → 验证通过后渲染嵌入界面
```

关键说明：

- **APP ID** 放入 JWT 的 payload，告诉 SQLBot "这是哪个嵌入应用"。
- **APP Secret** 用作 HS256 签名密钥。SQLBot 用自己保存的同一份 Secret 验证签名，确认请求确实来自合法宿主。APP Secret 不会出现在前端传给 SQLBot 的参数中，只有签名后的 JWT 会传递。
- **SQLBot 服务地址** 是 SQLBot 的部署地址，demo 从这里加载 JS SDK（`sqlbot-embedded-dynamic.umd.js`）和 iframe 页面。

#### 各嵌入模式的凭据使用范围

| 参数 | 页面嵌入（问数/数据源） | 基础小助手 | 高级小助手 |
|------|------------------------|-----------|-----------|
| domain（SQLBot 服务地址） | ✅ 加载 SDK | ✅ 加载 assistant.js | ✅ 加载 assistant.js |
| embedded_app_id（APP ID） | ✅ JWT payload + SDK 参数 | ❌ 不使用 | ❌ 不使用 |
| embedded_app_secret（APP Secret） | ✅ JWT 签名密钥 | ❌ 不使用 | ❌ 不使用 |

基础小助手和高级小助手走的是另一套认证路径（使用 assistant_id + demo 自身的 base64 token），不依赖页面嵌入的 APP ID / APP Secret。

## 4. 在 Demo 系统中填写配置

本 Demo 的系统设置入口为：

- 路由：`#/setting`
- 通用设置文件：`frontend/src/views/setting/index.vue`
- 嵌入式小助手配置文件：`frontend/src/views/setting/embedded-assistant.vue`

页面中需要填写的字段如下。

| 表单字段 | 含义 | 对应 SQLBot 配置 |
|---|---|---|
| SQLBot 服务地址 | SQLBot 访问域名 | 例如 `https://sqlbot.lanlnk.cn` |
| 页面嵌入 APP ID | 页面嵌入应用 ID | SQLBot 页面嵌入创建后获得 |
| 页面嵌入 APP Secret | 页面嵌入密钥 | SQLBot 页面嵌入创建后获得 |
| API 开启 AES | 是否启用 AES 加密 | 与 SQLBot 高级应用配置保持一致 |
| API AES KEY | AES 密钥 | 启用 AES 时必填 |

推荐填写顺序：

1. 先填写 **SQLBot 服务地址**。
2. 若验证页面嵌入，在“通用设置”填写 **页面嵌入 APP ID / APP Secret**。
3. 若验证基础小助手，进入“基础助手配置”填写对应参数。
4. 若验证高级小助手，进入“高级助手配置”填写对应参数与 AES 字段。
5. 若验证嵌入式小助手，进入“嵌入式小助手配置”填写 **问数页 / 数据源页** 的 APP ID 与 APP Secret。
6. 分页保存后再进入对应演示页面验证。

### 4.1 嵌入式小助手配置页

嵌入式小助手不再和通用设置混在同一个编辑面板中，而是单独放在系统设置子页：

- 路由：`#/setting/embedded-assistant`
- 菜单名称：`系统设置 -> 嵌入式小助手配置`

页面中需要填写：

| 表单字段 | 含义 |
|---|---|
| 问数页 APP ID | 嵌入式小助手“问数页”使用的页面嵌入 APP ID（内部复用原基础应用字段） |
| 问数页 APP Secret | 对应问数页的页面嵌入签名密钥 |
| 数据源页 APP ID | 嵌入式小助手“数据源页”使用的页面嵌入 APP ID（内部复用原高级应用字段） |
| 数据源页 APP Secret | 对应数据源页的页面嵌入签名密钥 |

## 5. 宿主系统与本 Demo 的实现对应关系

## 5.1 基础应用浮窗

实现文件：`frontend/src/views/assistant/float.vue`

实现方式：

- 前端按如下格式加载 SQLBot 提供的脚本：

```ts
${sqlbotDomain}/assistant.js?id=${assistantId}
```

- 在线模式下会附带：
  - `online`
  - `userFlag`

说明：

- `sqlbot_assistant_handler` 用于浮窗模式。
- 未登录时走游客模式。
- 登录后可带用户标识参与对话归属。

## 5.2 基础 / 高级应用全屏嵌入

实现文件：

- 基础应用全屏：`frontend/src/views/assistant/full.vue`
- 高级应用全屏：`frontend/src/views/advanced/full.vue`

实现方式：iframe + postMessage 证书握手

1. 前端动态创建 iframe，src 指向 SQLBot 的 `embeddedPage` 路由：

```text
${sqlbotDomain}/#/embeddedPage?id=${assistantId}&online=${online}[&userFlag=${uid}]
```

2. 监听 iframe 发来的 `postMessage`，等待 `busi: 'ready'` 事件。

3. 收到 ready 后，通过 `postMessage` 向 iframe 回传证书：

```ts
{
  eventName: 'sqlbot_embedded_event',
  messageId: assistantId,
  hostOrigin: window.location.origin,
  busi: 'certificate',
  type: 1,
  certificate: JSON.stringify([{ target: 'header', key: 'sqlbot-embedded-token', value: 'Bearer ...' }])
}
```

参数重点：

- `embeddedId`（iframe URL 中的 `id` 参数）
- `online`
- `userFlag`（在线模式）
- `type: 1`（高级应用证书类型）

说明：

- 基础和高级全屏共用同一条 iframe + postMessage 链路，仅 `assistantId` 来源不同。
- 高级应用必须登录后才能正常获取宿主凭证。
- 本仓库中高级应用的 `userFlag` 取值为 `uid + 1`，基础应用为原始 `uid`。
- postMessage 收发均做了 origin 校验，防止跨域消息伪造。

## 5.3 页面嵌入

实现文件：`frontend/src/views/embedded/index.vue`

实现方式：

1. 前端先请求本仓库后端 `/api/token/` 获取 JWT。
2. 后端根据数据库保存的 `embedded_app_id` 与 `embedded_app_secret` 生成 token。
3. 前端调用：

```ts
window.sqlbot_embedded_handler.mounted('.embedded-full-page', { appId, token })
```

说明：

- 这是本仓库对官方文档“不要在前端暴露 app secret”的具体落地。

## 5.4 嵌入式小助手

实现文件：

- `frontend/src/views/assistant-embed/base.vue`
- `frontend/src/views/assistant-embed/advanced.vue`

配置入口：

- `frontend/src/views/setting/embedded-assistant.vue`

实现方式：

1. 前端先请求本仓库后端 `/api/token/` 获取 JWT。
2. 后端根据传入的 `appId` 读取 `base_embedded_app_*` 或 `advanced_embedded_app_*` 凭据生成 token。
3. 前端分别挂载“基础应用”和“高级应用”的嵌入式小助手页面。

说明：

- 这两页共用现有后端 token 能力，不额外新增接口。
- 高级应用页会附带 `busiFlag: 'ds'`，用于加载高级语义页面。

## 6. 高级应用 API 配置说明

本仓库内高级应用数据源接口示例实现位于：

- `backend/controller/datasource.js`

接口路径：

- `GET /api/datasource/`

返回格式：

```json
{
  "success": true,
  "code": 0,
  "data": [ ... ]
}
```

与官方文档要求一致的核心字段包括：

- `name`
- `type`
- `host`
- `port`
- `user`
- `password`
- `dataBase`
- `schema`
- `comment`
- `tables`
- `fields`

若启用 AES，本仓库会对以下字段加密：

- `host`
- `user`
- `password`
- `dataBase`
- `schema`

对应实现见：`backend/controller/datasource.js`

## 7. 登录与凭证说明

本 Demo 的登录不是标准 JWT 校验，而是本地演示逻辑：

- 前端从本地缓存中维护 `sqlbot-embedded-token`
- 后端在 `backend/middleware/requestHandler.js` 中解析该值

这意味着：

- 它适合作为嵌入流程演示
- 不适合作为生产级认证方案直接复用

如果你要对接真实宿主系统，应重点替换：

1. 宿主系统登录态获取方式
2. 高级应用数据源接口认证方式
3. 页面嵌入 token 生成与用户同步逻辑

## 8. 推荐操作流程

推荐按以下顺序完成对接：

### 8.1 基础应用最小验证

1. 在 SQLBot 中创建基础应用。
2. 配置跨域、工作空间、数据源权限。
3. 记录基础应用 ID。
4. 在 Demo 设置页填写：
   - SQLBot 服务地址
   - 基础应用 ID
5. 打开：
   - 浮窗模式
   - 全屏模式
6. 检查游客模式是否可正常问数。

### 8.2 高级应用验证

1. 在 SQLBot 中创建高级应用。
2. 配置宿主数据源接口与认证凭证规则。
3. 视需要开启 AES。
4. 在 Demo 设置页填写：
   - SQLBot 服务地址
   - 高级应用 ID
   - AES 开关与 AES KEY
5. 登录 Demo 系统。
6. 进入高级应用页面，验证是否能正常读取宿主数据源。

### 8.3 页面嵌入验证

1. 在 SQLBot 中创建页面嵌入应用。
2. 记录 APP ID 与 APP Secret。
3. 在 Demo 的“通用设置”页填写：
    - 页面嵌入 APP ID
    - 页面嵌入 APP Secret
4. 进入页面嵌入页面。
5. 验证后端 token 生成是否成功，页面是否正常挂载。

### 8.4 嵌入式小助手验证

1. 在 SQLBot 中分别创建小助手嵌入所需的基础应用与高级应用。
2. 打开 `#/setting/embedded-assistant`。
3. 填写基础应用 / 高级应用对应的 APP ID 与 APP Secret。
4. 打开菜单“嵌入式小助手 -> 问数页 / 数据源页”。
5. 验证两类页面都能正常获取 token 并挂载。

## 9. 验证清单

完成配置后，建议逐项验证：

- Demo 设置页能成功保存配置。
- 基础应用浮窗能正常出现。
- 基础应用全屏能正常挂载。
- 高级应用登录后能正常问数。
- 页面嵌入能拿到后端生成的 token。
- 嵌入式小助手配置页能成功保存问数页与数据源页凭据。
- 嵌入式小助手菜单能按已配置应用动态显示。
- 高级应用接口 `/api/datasource/` 返回结构符合 SQLBot 要求。
- 若启用 AES，宿主接口加密字段与 SQLBot 配置一致。

## 10. 常见问题

### 10.1 页面能打开，但嵌入区没有内容

优先检查：

- SQLBot 服务地址是否正确
- 应用 ID / APP ID 是否填写错误
- 是否存在跨域限制
- SQLBot 脚本是否成功加载

### 10.2 高级应用无法问数

优先检查：

- 是否已登录宿主系统
- `sqlbot-embedded-token` 是否存在
- SQLBot 凭证映射表达式是否正确
- 宿主接口是否真的返回 SQLBot 要求的数据源结构

### 10.3 页面嵌入失败

优先检查：

- APP ID / APP Secret 是否匹配
- 后端 `/api/token/` 是否正常返回 token
- token payload 是否包含 `appId` 与 `account`

## 11. 参考来源

- SQLBot 官方文档：<https://sqlbot.org/docs/v1/embedding_integration/#111>
- 本仓库前端通用设置页：`frontend/src/views/setting/index.vue`
- 本仓库前端嵌入式小助手配置页：`frontend/src/views/setting/embedded-assistant.vue`
- 本仓库页面嵌入实现：`frontend/src/views/embedded/index.vue`
- 本仓库高级应用数据源接口：`backend/controller/datasource.js`
- 本仓库页面嵌入 token 接口：`backend/controller/token.js`
