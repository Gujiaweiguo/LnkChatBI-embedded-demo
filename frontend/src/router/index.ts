import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '../components/Layout.vue'
import BaseAssistantSetting from '../views/setting/base-assistant.vue'
import AdvancedAssistantSetting from '../views/setting/advanced-assistant.vue'
import FloatPage from '../views/assistant/float.vue'
import FullPage from '../views/assistant/full.vue'
import AdvancedFloatPage from '../views/advanced/float.vue'
import AdvancedFullPage from '../views/advanced/full.vue'
import { useUserStore } from '@/store/user'
import { useSettingStore } from '@/store/setting'
const userStore = useUserStore()
const settingStore = useSettingStore()
// 基础路由
const baseRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/setting/base-assistant'
  },
  {
    path: '/setting',
    component: Layout,
    meta: {
      title: '助手配置',
      icon: 'Setting'
    },
    children: [
      {
        path: 'base-assistant',
        name: 'baseAssistantSetting',
        meta: {
          title: '基础小助手配置'
        },
        component: BaseAssistantSetting
      },
      {
        path: 'advanced-assistant',
        name: 'advancedAssistantSetting',
        meta: {
          title: '高级小助手配置'
        },
        component: AdvancedAssistantSetting
      }
    ]
  }
]

// 动态路由配置
const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/assistant',
    component: Layout,
    meta: {
      title: '基础小助手',
      icon: 'DataLine',
      requireBaseAssistant: true // 需要基础助手ID
    },
    children: [
      {
        path: 'float',
        name: 'assistantFloat',
        meta: {
          title: '浮窗嵌入'
        },
        component: FloatPage
      },
      {
        path: 'full',
        name: 'assistantFull',
        meta: {
          title: '全屏嵌入'
        },
        component: FullPage
      }
    ]
  },
  {
    path: '/advanced',
    component: Layout,
    meta: {
      title: '高级小助手',
      icon: 'DataLine',
      requireAdvancedAssistant: true
    },
    children: [
      {
        path: 'float',
        name: 'advancedFloat',
        meta: {
          title: '浮窗嵌入'
        },
        component: AdvancedFloatPage
      },
      {
        path: 'full',
        name: 'advancedFull',
        meta: {
          title: '全屏嵌入'
        },
        component: AdvancedFullPage
      }
    ]
  }
]

// 过滤动态路由的函数
const filterAsyncRoutes = (routes: RouteRecordRaw[]) => {
  return routes.filter(route => {
    const hasDomain = !!settingStore.getDomain
    if (route.meta?.requireBaseAssistant && (!hasDomain || !settingStore.getBaseAssistantId)) {
      return false
    }
    if (route.meta?.requireAdvancedAssistant && (!hasDomain || !settingStore.getAdvancedAssistantId)) {
      return false
    }
    return true
  })
}




const router = createRouter({
  history: createWebHashHistory(),
  routes: baseRoutes
})

// 动态添加路由的函数
const setupRouter = async () => {
  userStore.init()
  if (!settingStore.getLoaded) {
    await settingStore.init()
    const accessRoutes = filterAsyncRoutes(asyncRoutes)
    accessRoutes.forEach(route => {
      router.addRoute(route)
    })
  }
}

const isValidRoute = (path: string) => {
  const routerList = router.getRoutes()
  return routerList.some(item => item.path === path)
}
router.beforeEach(async (to, _from, next) => {
  if (!settingStore.getLoaded) {
    await setupRouter()
    next({ ...to, replace: true })
  } else {
    if (isValidRoute(to.path)) {
      next()
    } else {
      next('/')
    }
  }
})

export default router
