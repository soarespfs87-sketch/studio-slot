import { defineConfig } from 'vite'

// Porta fixa para o preview duplo conseguir apontar sempre para o mesmo endereço.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
})
