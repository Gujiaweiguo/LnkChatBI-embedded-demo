<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { SettingApi, type SettingRecord } from '@/api/setting'
import { AssistantApi, type AssistantListItem } from '@/api/assistant'
import { useSettingStore } from '@/store/setting'

const settingStore = useSettingStore()
const formRef = ref<FormInstance>()

interface AdvancedAssistantFormState {
  domain: string
  access_token: string
  assistant_id: string
  aes_enable: boolean
  aes_key: string
}

const form = reactive<AdvancedAssistantFormState>({
  domain: '',
  access_token: '',
  assistant_id: '',
  aes_enable: false,
  aes_key: '',
})

const rules: FormRules = {
  domain: [{ required: true, message: '请输入 LnkChatBI 服务地址', trigger: 'blur' }],
  access_token: [{ required: true, message: '请填入 access_token', trigger: 'blur' }],
  assistant_id: [{ required: true, message: '请选择高级小助手', trigger: 'change' }],
  aes_key: [{ required: true, message: '启用 AES 时必须填写 Key', trigger: 'blur' }],
}

const assistantOptions = ref<AssistantListItem[]>([])
const loadingList = ref(false)
const listError = ref('')

const currentAssistantName = computed(() => {
  const match = assistantOptions.value.find((item) => item.id === form.assistant_id)
  return match?.name || ''
})

const generateRandomKey = (length = 32): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

const syncForm = () => {
  // domain 和 access_token 默认从基础助手配置同步过来（用户可在本页覆盖）
  form.domain = settingStore.getDomain
  form.access_token = settingStore.getAccessToken
  form.assistant_id = settingStore.getAdvancedAssistantId
  const advancedConfig = settingStore.getAdvancedAssistantConfig
  form.aes_enable = advancedConfig.aes_enable
  form.aes_key = advancedConfig.aes_key
}

const ensureStorePersisted = (): SettingRecord => ({
  ...settingStore.getData,
  domain: form.domain.trim().replace(/\/+$/, ''),
  access_token: form.access_token.trim(),
  advanced_assistant_id: form.assistant_id,
  aes_enable: form.aes_enable,
  aes_key: form.aes_enable ? form.aes_key.trim() : '',
  advanced_assistant_config: {
    ...settingStore.getAdvancedAssistantConfig,
    assistant_id: form.assistant_id,
    name: currentAssistantName.value,
    aes_enable: form.aes_enable,
    aes_key: form.aes_enable ? form.aes_key.trim() : '',
  },
})

const fetchList = async (silent = false) => {
  if (!form.domain || !form.access_token) {
    if (!silent) {
      ElMessage.warning('请先填写服务地址和 access_token')
    }
    return
  }
  loadingList.value = true
  listError.value = ''
  try {
    await SettingApi.save(ensureStorePersisted())
    await settingStore.init()
    const res = await AssistantApi.list({ type: 'advanced' })
    assistantOptions.value = (res?.data || []).filter((item) => item.type === 1)
    if (!silent) {
      ElMessage.success(`已加载 ${assistantOptions.value.length} 个高级小助手`)
    }
  } catch (err: any) {
    listError.value = err?.message || '拉取助手列表失败'
    if (!silent) {
      ElMessage.error(listError.value)
    }
  } finally {
    loadingList.value = false
  }
}

const handleSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) {
    return
  }
  if (form.aes_enable && !form.aes_key.trim()) {
    ElMessage.error('启用 AES 时必须填写 Key')
    return
  }
  const valid = await formEl.validate().catch(() => false)
  if (!valid) {
    return
  }
  try {
    const res = await SettingApi.save(ensureStorePersisted())
    await settingStore.init(res.data)
    ElMessage.success('高级小助手配置保存成功')
    window.location.reload()
  } catch {
    ElMessage.error('高级小助手配置保存失败')
  }
}

onMounted(() => {
  syncForm()
})
</script>

<template>
  <div class="setting-page">
    <div class="setting-page__header">
      <div class="setting-page__eyebrow">Advanced assistant</div>
      <div class="setting-page__hero">
        <div class="setting-page__hero-copy">
          <h2 class="setting-page__title">高级小助手配置</h2>
          <p class="setting-page__description">
            填写 LnkChatBI 服务地址与 access_token，从 LnkChatBI 拉取已创建的高级小助手列表，下拉选择当前 demo 要嵌入的小助手，并配置 AES 加密密钥。
          </p>
        </div>
      </div>
    </div>

    <div class="setting-page__content">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" status-icon>
        <div class="setting-page__panel">
          <div class="setting-page__panel-copy">
            <h3 class="setting-page__panel-title">LnkChatBI 连接</h3>
            <p class="setting-page__panel-description">
              服务地址与 access_token 默认同步自基础小助手配置，可在此页独立修改。
            </p>
          </div>

          <div class="setting-page__grid">
            <el-form-item label="LnkChatBI 服务地址" prop="domain" class="setting-page__full">
              <el-input v-model="form.domain" placeholder="例如：http://localhost:8000" clearable />
            </el-form-item>

            <el-form-item label="access_token" prop="access_token" class="setting-page__full">
              <el-input
                v-model="form.access_token"
                placeholder="从 LnkChatBI 浏览器 localStorage 的 user.token 拷贝"
                type="password"
                show-password
                clearable
              />
            </el-form-item>
          </div>
        </div>

        <div class="setting-page__panel">
          <div class="setting-page__panel-header">
            <div class="setting-page__panel-copy">
              <h3 class="setting-page__panel-title">选择高级小助手</h3>
              <p class="setting-page__panel-description">
                点击下方按钮从 LnkChatBI 拉取 type=1 的助手列表。
              </p>
            </div>
            <el-button
              type="primary"
              plain
              :loading="loadingList"
              @click="fetchList(false)"
            >
              {{ loadingList ? '拉取中...' : '拉取助手列表' }}
            </el-button>
          </div>

          <div class="setting-page__grid">
            <el-form-item label="高级小助手" prop="assistant_id" class="setting-page__full">
              <el-select
                v-model="form.assistant_id"
                placeholder="请拉取并选择高级小助手"
                filterable
                :loading="loadingList"
                style="width: 100%"
              >
                <el-option
                  v-for="item in assistantOptions"
                  :key="item.id"
                  :label="`${item.name}（id=${item.id}）`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </div>

          <el-alert
            v-if="listError"
            :title="listError"
            type="error"
            show-icon
            :closable="false"
          />
        </div>

        <div class="setting-page__panel">
          <div class="setting-page__panel-copy">
            <h3 class="setting-page__panel-title">AES 加密（与 LnkChatBI 后台保持一致）</h3>
            <p class="setting-page__panel-description">
              高级小助手的数据源接口 <code>/api/datasource/</code> 可选启用 AES，需与 LnkChatBI 高级应用的 AES Key 完全一致。
            </p>
          </div>

          <div class="setting-page__grid">
            <el-form-item label="启用 AES">
              <el-switch v-model="form.aes_enable" />
            </el-form-item>

            <div v-if="form.aes_enable" class="setting-page__inline-row setting-page__full">
              <el-form-item label="AES Key" prop="aes_key" class="setting-page__full">
                <el-input
                  v-model="form.aes_key"
                  placeholder="32 位 AES Key（需与 LnkChatBI 后台一致）"
                  type="password"
                  show-password
                  clearable
                />
              </el-form-item>
              <el-button plain class="setting-page__compact-button" @click="form.aes_key = generateRandomKey(32)">
                生成随机 Key
              </el-button>
            </div>
          </div>
        </div>
      </el-form>
    </div>

    <div class="setting-page__footer">
      <div class="setting-page__footer-note">
        保存后会通过 <code>/api/setting</code> 同步服务地址、access_token、高级小助手 ID 与 AES 配置，菜单随后出现「高级小助手」入口。
      </div>
      <el-button type="primary" size="large" @click="handleSubmit(formRef)">保存高级小助手配置</el-button>
    </div>
  </div>
</template>

<style scoped>
@import './page.css';
</style>
