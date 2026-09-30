// Painel da Plataforma (só admin): libera planos e guarda a cobrança manual.
// Não aparece no menu — o admin entra por Ajustes.

import {
  telaPlataforma,
  carregarEstudios,
  definirPlano,
  salvarCobranca,
} from '../../telas/plataforma.js'
import { hojeISO } from '../../format.js'
import { sair } from '../../auth.js'

export async function render(el, ctx, { comSair = false } = {}) {
  if (!ctx.ehAdmin) {
    location.hash = '#/inicio'
    return
  }
  const recarregar = () => render(el, ctx, { comSair })

  el.innerHTML = '<section class="modulo"><p class="vazio">Carregando…</p></section>'
  const { estudios, error } = await carregarEstudios()
  if (error) {
    el.innerHTML = `<section class="modulo"><p class="form-erro">${error.message}</p></section>`
    return
  }
  el.innerHTML = telaPlataforma({ estudios, hoje: hojeISO(), comSair })

  el.querySelectorAll('[data-acao="liberar"], [data-acao="suspender"]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      await definirPlano(b.dataset.id, b.dataset.acao === 'liberar')
      recarregar()
    }),
  )

  el.querySelectorAll('form[data-cobranca]').forEach((f) =>
    f.addEventListener('submit', async (e) => {
      e.preventDefault()
      const id = f.dataset.cobranca
      const status = el.querySelector(`[data-cobranca-status="${id}"]`)
      const btn = f.querySelector('button[type="submit"]')
      btn.disabled = true
      if (status) status.textContent = 'Salvando…'
      const { error } = await salvarCobranca(id, {
        plano_faixa: f.elements.plano_faixa.value,
        cobranca_proxima: f.elements.cobranca_proxima.value,
        lastlink_url: f.elements.lastlink_url.value.trim(),
      })
      if (error) {
        if (status) status.textContent = 'Falhou: ' + (error.message || '')
        btn.disabled = false
        return
      }
      recarregar()
    }),
  )

  el.querySelectorAll('[data-acao="copiar-lastlink"]').forEach((b) =>
    b.addEventListener('click', async () => {
      const f = el.querySelector(`form[data-cobranca="${b.dataset.id}"]`)
      const url = f?.elements.lastlink_url.value.trim()
      const status = el.querySelector(`[data-cobranca-status="${b.dataset.id}"]`)
      if (!url) return
      try {
        await navigator.clipboard.writeText(url)
        if (status) status.textContent = 'Link copiado ✓'
      } catch {
        if (status) status.textContent = url
      }
    }),
  )

  el.querySelector('[data-acao="sair"]')?.addEventListener('click', async () => {
    await sair()
    location.reload()
  })
}
