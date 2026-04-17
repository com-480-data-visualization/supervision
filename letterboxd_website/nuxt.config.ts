// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // These keys are only available on the server
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
  },
  vite: {
    optimizeDeps: {
      include: ['globe.gl', '@vue/devtools-core', '@vue/devtools-kit']
    }
  }
})