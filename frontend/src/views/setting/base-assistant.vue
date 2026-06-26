<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { SettingApi, type SettingRecord } from '@/api/setting'
import { AssistantApi, type AssistantListItem } from '@/api/assistant'
import { useSettingStore } from '@/store/setting'

const settingStore = useSettingStore()
const formRef = ref<FormInstance>()

interface BaseAssistantFormState {
  domain: string
  assistant_id: string
}

const form = reactive<BaseAssistantFormState>({
  domain: '',
  assistant_id: '',
})

const rules: FormRules = {
  domain: [{ required: true, message: '请输入 LnkChatBI 服务地址', trigger: 'blur' }],
  assistant_id: [{ required: true, message: '请选择基础小助手', trigger: 'change' }],
}

const assistantOptions = ref<AssistantListItem[]>([])
const loadingList = ref(false)
const listError = ref('')

const currentAssistantName = computed(() => {
  const match = assistantOptions.value.find((item) => item.id === form.assistant_id)
  return match?.name || ''
})

const syncForm = () => {
  form.domain = settingStore.getDomain
  form.assistant_id = settingStore.getBaseAssistantId
}

const ensureStorePersisted = (): SettingRecord => ({
  ...settingStore.getData,
  domain: form.domain.trim().replace(/\/+$/, ''),
  base_assistant_id: form.assistant_id,
  base_assistant_config: {
    ...settingStore.getBaseAssistantConfig,
    assistant_id: form.assistant_id,
    name: currentAssistantName.value,
  },
})

const fetchList = async (silent = false) => {
  if (!form.domain) {
    if (!silent) {
      ElMessage.warning('请先填写 LnkChatBI 服务地址')
    }
    return
  }
  loadingList.value = true
  listError.value = ''
  try {
    // 直连 LnkChatBI 免登录 embed/list 接口，浏览器自动带 Origin header
    // 由 LnKChatBI 依据助手白名单过滤，不再需要 demo 后端代理 / access_token
    const res = await AssistantApi.list({ domain: form.domain, type: 'base' })
    assistantOptions.value = (res?.data || []).filter((item) => item.type === 0)
    if (!silent) {
      ElMessage.success(`已加载 ${assistantOptions.value.length} 个基础小助手`)
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
  const valid = await formEl.validate().catch(() => false)
  if (!valid) {
    return
  }
  try {
    const res = await SettingApi.save(ensureStorePersisted())
    await settingStore.init(res.data)
    ElMessage.success('基础小助手配置保存成功')
    window.location.reload()
  } catch {
    ElMessage.error('基础小助手配置保存失败')
  }
}

onMounted(() => {
  syncForm()
})
</script>

<template>
  <div class="setting-page">
    <div class="setting-page__header">
      <div class="setting-page__eyebrow">Base assistant</div>
      <div class="setting-page__hero">
        <div class="setting-page__hero-copy">
          <h2 class="setting-page__title">基础小助手配置</h2>
          <p class="setting-page__description">
            填写 LnkChatBI 服务地址，从 LnkChatBI 免登录拉取已创建的基础小助手列表，下拉选择当前 demo 要嵌入的小助手。
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
              助手列表通过浏览器直连 LnkChatBI <code>GET /api/v1/system/assistant/embed/list</code>，浏览器自动带 Origin header，LnkChatBI 依据各助手白名单过滤。
            </p>
          </div>

          <div class="setting-page__grid">
            <el-form-item label="LnkChatBI 服务地址" prop="domain" class="setting-page__full">
              <el-input v-model="form.domain" placeholder="例如：http://localhost:8000" clearable />
            </el-form-item>
          </div>
        </div>

        <div class="setting-page__panel">
          <div class="setting-page__panel-header">
            <div class="setting-page__panel-copy">
              <h3 class="setting-page__panel-title">选择基础小助手</h3>
              <p class="setting-page__panel-description">
                点击下方按钮从 LnkChatBI 拉取 type=0 的助手列表。
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
            <el-form-item label="基础小助手" prop="assistant_id" class="setting-page__full">
              <el-select
                v-model="form.assistant_id"
                placeholder="请拉取并选择基础小助手"
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
      </el-form>
    </div>

    <div class="setting-page__footer">
      <div class="setting-page__footer-note">
        保存后会通过 <code>/api/setting</code> 同步服务地址与基础小助手 ID，菜单随后出现「基础小助手」入口。
      </div>
      <el-button type="primary" size="large" @click="handleSubmit(formRef)">保存基础小助手配置</el-button>
    </div>
  </div>
</template>

<style scoped>
@import './page.css';
</style>
