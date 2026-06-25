<template>
  <div class="full-page advanced-full-page">
    <Inactivate :font-color="inactivateFontColor" @show-history="showHistory" @new-chat="newChat" class="inactivate-container"/>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from 'vue';
import { useSettingStore } from '@/store/setting'
import { useUserStore } from '@/store/user'
import Inactivate from '@/components/Inactivate.vue'

const historyShow = ref(true)
const inactivateFontColor = ref('#FFFFFF')
const settingStore = useSettingStore()
const userStore = useUserStore()


const assistantId = computed(() => settingStore.getAdvancedAssistantId)
const lnkchatbiDomain = computed(() => settingStore.getDomain)
const online = computed(() => userStore.getOnline)
const userFlag = computed(() => {
  if (!online.value) {
    return null
  }
  const uid = userStore.getUid
  return uid + 1
})
const iframeId = computed(() => `lnkchatbi-embedded-chat-iframe-${assistantId.value}`)
const getTargetOrigin = () => new URL(lnkchatbiDomain.value).origin
const getIframe = () => document.getElementById(iframeId.value) as HTMLIFrameElement | null
const buildCertificate = () => {
  const sourceVal = window.localStorage.getItem('lnkchatbi-embedded-token')
  if (!sourceVal) {
    return null
  }
  let token = sourceVal
  try {
    const parsed = JSON.parse(sourceVal)
    if (parsed && typeof parsed.v === 'string') {
      token = parsed.v
    }
  } catch {
    // keep raw storage value
  }
  return JSON.stringify([
    {
      target: 'header',
      key: 'lnkchatbi-embedded-token',
      value: `Bearer ${token}`,
    },
  ])
}
const postToIframe = (payload: Record<string, unknown>) => {
  const iframe = getIframe()
  if (!iframe?.contentWindow) {
    return
  }
  iframe.contentWindow.postMessage(
    {
      eventName: 'lnkchatbi_embedded_event',
      messageId: assistantId.value,
      ...payload,
    },
    getTargetOrigin()
  )
}
const handleEmbeddedMessage = (event: MessageEvent) => {
  if (event.origin !== getTargetOrigin()) {
    return
  }
  if (event.data?.eventName !== 'lnkchatbi_embedded_event') {
    return
  }
  if (event.data?.messageId !== assistantId.value) {
    return
  }
  if (event.data?.busi === 'ready' && event.data?.ready) {
    const certificate = buildCertificate()
    postToIframe({
      hostOrigin: window.location.origin,
      busi: 'certificate',
      type: 1,
      certificate,
    })
  }
}
const init = () => {
  if (!lnkchatbiDomain.value || !assistantId.value) {
    return
  }
  const root = document.querySelector('.advanced-full-page') as HTMLElement | null
  if (!root) {
    return
  }
  const iframe = document.createElement('iframe')
  let srcUrl = `${lnkchatbiDomain.value}/#/embeddedPage?id=${assistantId.value}&online=${online.value}&mode=fullscreen`
  if (online.value) {
    srcUrl += `&userFlag=${userFlag.value}`
  }
  iframe.id = iframeId.value
  iframe.src = srcUrl
  iframe.allow = "microphone;clipboard-read 'src'; clipboard-write 'src'"
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  root.innerHTML = ''
  root.appendChild(iframe)
  window.addEventListener('message', handleEmbeddedMessage)
}
const newChat = (param?: any) => {
  postToIframe({ busi: 'createConversation', param })
}
const showHistory = () => {
  historyShow.value = !historyShow.value
  postToIframe({ busi: 'setHistory', show: historyShow.value })
}
onMounted(() => {
  init()
})
onBeforeUnmount(() => {
  window.removeEventListener('message', handleEmbeddedMessage)
  const dom = getIframe()
  if (dom) {
    dom.parentNode?.removeChild(dom)
  }
})
</script>

<style scoped>
.full-page {
  width: 100%;
  height: 100%;
}
.inactivate-container {
  background-color: #000;
  opacity: 0.8;
}
@media (max-width: 768px) {
  .inactivate-container {
    display: none;
  }
}
</style>
