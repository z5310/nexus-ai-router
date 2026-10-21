import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      nexus: {
        bg: '#070d09',
        panel: '#111e17',
        green: '#63e495',
        muted: '#8c9b91',
      },
    },
    fontFamily: {
      sans: 'Inter, "SF Pro Text", "PingFang SC", system-ui, sans-serif',
      display: 'Inter, "SF Pro Display", "PingFang SC", system-ui, sans-serif',
    },
  },
  shortcuts: {
    'nexus-focus': 'outline-none ring-2 ring-nexus-green/35 border-nexus-green/45',
    'nexus-surface': 'border border-white/9 rounded-xl bg-white/2',
  },
})
