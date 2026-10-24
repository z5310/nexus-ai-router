import message from 'ant-design-vue/es/message'
import notification from 'ant-design-vue/es/notification'

message.config({ top: '24px', duration: 2.6, maxCount: 3 })
notification.config({ top: 24, placement: 'topRight', duration: 4, maxCount: 3 })

function errorText(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message.trim()) return reason.message
  if (typeof reason === 'string' && reason.trim()) return reason
  return fallback
}

export const feedback = {
  success(title: string, description?: string) {
    if (description) notification.success({ message: title, description })
    else void message.success(title)
  },
  error(reason: unknown, title = '操作失败', fallback = '请求未完成，请稍后重试。') {
    notification.error({ message: title, description: errorText(reason, fallback) })
  },
  info(title: string, description?: string) {
    if (description) notification.info({ message: title, description })
    else void message.info(title)
  },
  warning(title: string, description?: string) {
    if (description) notification.warning({ message: title, description })
    else void message.warning(title)
  },
}
