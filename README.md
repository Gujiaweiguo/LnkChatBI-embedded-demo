# LnkChatBI 嵌入式对接 Demo

LnkChatBI 嵌入式对接 Demo，演示如何将 LnkChatBI 小助手以两种方式集成到宿主系统中。包含完整的前后端示例代码，开箱即用。

## 功能特性

本 Demo 支持 **两种** 小助手接入方式：

- **基础小助手** -- 加载 LnkChatBI 的 `assistant.js` 脚本，支持浮窗和全屏两种嵌入形态，数据源由 LnkChatBI 内部权限模型决定，适合快速集成
- **高级小助手** -- 数据源由宿主系统通过 API 动态提供，支持 AES 加密传输敏感字段，适合需要细粒度数据源控制的场景

> 历史版本中"嵌入式小助手"和"独立页面嵌入"两种模式已废弃，因为 LnkChatBI 已将它们统一收敛为同一条 iframe + `postMessage` 链路，不再单独暴露。本 Demo 仅保留与产品现行接入契约一致的两种路径。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3, TypeScript, Element Plus, Pinia, Vite |
| 后端 | Express, PostgreSQL |
| 测试 | Vitest (单元), Playwright (E2E) |

## 快速开始

### 前置条件

- Node.js >= 18
- PostgreSQL（需提前建好数据库，后端启动时会自动创建表结构和种子数据）
- 一个可用的 LnkChatBI 实例（用于实际的小助手对接）

### 安装依赖

前后端是两个独立的 npm 项目，没有根级 workspace，需要分别安装：

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 本地开发

启动后端：

```bash
cd backend && npm run dev
```

启动前端：

```bash
cd frontend && npm run dev
```

默认端口：

- 前端：`5180`
- 后端：`3100`

后端配置文件参考 `backend/.env.example`，使用时复制为 `backend/.env` 并填写实际值。前端开发环境下 API 请求代理到后端的 `http://localhost:3100/api`。

### 构建前端

```bash
cd frontend && npm run build
```

构建产物输出到 `frontend/dist`。生产模式下后端会直接托管该目录的静态文件，同时提供 `/api/*` 接口，形成一个完整的单端口服务。

## 项目结构

```
lnkchatbi-embedded-demo/
├── frontend/                # Vue 3 前端项目
│   ├── src/
│   │   ├── router/          # 路由配置（hash history + 动态路由）
│   │   ├── views/
│   │   │   ├── assistant/   # 基础小助手（浮窗 + 全屏）
│   │   │   ├── advanced/    # 高级小助手（浮窗 + 全屏）
│   │   │   ├── setting/     # 配置页（基础小助手 + 高级小助手）
│   │   │   └── login/       # 登录页
│   │   ├── store/           # Pinia 状态管理
│   │   └── utils/           # 工具函数（含 request.ts 请求封装）
│   └── package.json
├── backend/                 # Express 后端项目
│   ├── controller/          # API 控制器（自动注册）
│   │   ├── setting.js       # 设置读写
│   │   ├── assistant.js     # 助手列表代理（拉取 LnKChatBI 的 /system/assistant）
│   │   └── datasource.js    # 高级助手数据源接口（LnkChatBI 调用）
│   ├── config/              # 数据库连接池配置
│   ├── middleware/          # 请求处理中间件
│   ├── models/              # 数据模型（含启动时的表初始化）
│   ├── providers/           # 数据源 provider（GS SCRM、thxtd 等）
│   ├── server.js            # 服务入口
│   └── package.json
└── e2e/                     # Playwright E2E 测试
```

## 两种小助手接入方式

### 基础小助手

通过加载 LnkChatBI 的 `assistant.js` 脚本实现。基础应用在 LnkChatBI 内部管理数据源权限，宿主系统只需提供服务地址和应用 ID。

**对应路由：**

- `#/assistant/float` -- 浮窗嵌入
- `#/assistant/full` -- 全屏嵌入

**配置入口：** `#/setting/base-assistant`

**SDK 行为：**
- 宿主页加载 `<LnkChatBI-domain>/assistant.js?id=<assistantId>`，脚本 id 形如 `lnkchatbi-assistant-float-script-<id>`
- 脚本会在 `window.lnkchatbi_assistant_handler[id]` 上注册方法：`setOnline / refresh / destroy / setHistory / createConversation`
- 浮窗模式由 `assistant.js` 自己渲染 UI；全屏模式由宿主构造 iframe 指向 `<LnkChatBI-domain>/#/embeddedPage?id=<id>`，并通过 `lnkchatbi_embedded_event` 事件完成 certificate 握手

### 高级小助手

数据源由宿主系统通过 `/api/datasource/` 接口动态提供，而非 LnkChatBI 内部管理。支持 AES 加密传输敏感字段。前端链路与基础小助手一致（同样加载 `assistant.js`），区别在于 LnkChatBI 后台将该应用配置为"高级"类型，并在问数时回调宿主的数据源接口。

**对应路由：**

- `#/advanced/float` -- 浮窗嵌入
- `#/advanced/full` -- 全屏嵌入

**配置入口：** `#/setting/advanced-assistant`

**接口契约（宿主必须实现）：**

LnkChatBI 后端通过 `backend/apps/system/crud/assistant.py::AssistantOutDs.get_ds_from_api` 调用宿主的接口，约束如下：

| 项 | 值 |
|---|---|
| 方法 | HTTP GET |
| URL | 来自高级助手配置中的 `endpoint` 字段（支持完整 URL 或相对路径） |
| 超时 | 来自高级助手配置中的 `timeout`（秒，默认 10） |
| 认证 | 来自助手 `certificate` 配置，多渠道：`header` / `cookie` / `param` |
| 响应格式 | JSON，必须含 `code`（0 或 200）和 `data`（数组） |

**AES 加密（可选）：**

- 算法：AES-256-CBC + PKCS7 padding
- Key：取前 32 字符（不足补 `\0`）
- IV：取前 16 字符（不足补 `\0`），默认 IV 为 `lnkchatbi_em_aes_iv`
- 加密字段（7 个）：`host, user, password, dataBase, db_schema, schema, mode`

宿主实现参考 `backend/controller/datasource.js`。

## 配置说明

完整配置步骤请参阅 [LnkChatBI嵌入式配置操作说明.md](./LnkChatBI嵌入式配置操作说明.md)。

简要流程：

1. 在 LnkChatBI 中创建对应类型的助手（基础应用 / 高级应用）
2. 从 LnkChatBI 浏览器拷贝 access_token（详见操作说明第 0 节）
3. 在本 Demo 的 `#/setting/base-assistant` 或 `#/setting/advanced-assistant` 填入服务地址 + access_token，下拉选择助手并保存
4. 进入对应的演示页面验证嵌入效果

## 测试

单元测试（前端）：

```bash
cd frontend && npm test
```

单元测试（后端）：

```bash
cd backend && npm test
```

E2E 测试（Playwright）：

```bash
npx playwright test
```

E2E 测试默认访问 `http://localhost:5180`，可通过 `E2E_BASE_URL` 环境变量修改。

## 注意事项

- 本 Demo 的登录认证是**本地演示逻辑**（base64 编码的 token 匹配），不适用于生产环境
- 对接真实宿主系统时，应替换登录态获取方式和数据源接口的鉴权方式
- 前端路由采用 hash history，菜单项根据配置动态注册，未配置对应助手 ID 的菜单不会显示
- 项目使用 `backend/.env.example` 作为环境变量模板，实际运行需复制为 `backend/.env` 并填写数据库凭据
- 默认登录密码（仅 demo 演示用）：`LnkChatBIDemo@123`
