// ────────────────────────────────────────────────────────────────
//  Pedacinhos de formulário reaproveitados pelos módulos
// ────────────────────────────────────────────────────────────────

import { enviarImagem } from '../upload.js'

// Escapa texto antes de pôr no HTML (evita quebrar a tela com < > " &).
export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function campoTexto(id, rotulo, valor, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <input type="${opc.tipo || 'text'}" id="${id}" value="${esc(valor)}"
        ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} />
      ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}
    </label>`
}

export function campoCor(id, rotulo, valor) {
  return `
    <label class="campo dono-campo dono-campo-cor">
      <span>${rotulo}</span>
      <input type="color" id="${id}" value="${esc(valor)}" />
    </label>`
}

export function campoCheck(id, rotulo, marcado) {
  return `
    <label class="termo dono-check">
      <input type="checkbox" id="${id}" ${marcado ? 'checked' : ''} />
      <span>${rotulo}</span>
    </label>`
}

// Campo de imagem: botão "Escolher imagem" + prévia. A URL fica num
// input escondido (o formulário lê esse valor).
export function campoFoto(id, rotulo, valor, dica) {
  const tem = !!valor
  return `
    <div class="campo dono-campo">
      <span>${rotulo}</span>
      <div class="foto-campo">
        <img class="foto-preview" id="${id}-preview" src="${esc(valor || '')}" alt="" ${tem ? '' : 'hidden'} />
        <label class="botao botao-fantasma foto-escolher">
          Escolher imagem
          <input type="file" id="${id}-arquivo" accept="image/png,image/jpeg,image/webp" hidden />
        </label>
        <button type="button" class="mini-btn" id="${id}-remover" ${tem ? '' : 'hidden'}>Tirar</button>
        <span class="foto-status" id="${id}-status"></span>
      </div>
      <input type="hidden" id="${id}" value="${esc(valor || '')}" />
      ${dica ? `<small class="campo-dica">${dica}</small>` : ''}
    </div>`
}

// Liga um campoFoto: envia a imagem pro armário e guarda a URL.
export function ligarCampoFoto(raiz, idBase, estudioId, pasta) {
  const arquivo = raiz.querySelector(`#${idBase}-arquivo`)
  if (!arquivo) return
  const escondido = raiz.querySelector(`#${idBase}`)
  const preview = raiz.querySelector(`#${idBase}-preview`)
  const status = raiz.querySelector(`#${idBase}-status`)
  const remover = raiz.querySelector(`#${idBase}-remover`)

  arquivo.addEventListener('change', async () => {
    const file = arquivo.files[0]
    if (!file) return
    status.textContent = 'Enviando…'
    const { url, error } = await enviarImagem(file, estudioId, pasta)
    if (error) {
      status.textContent = 'Falhou: ' + (error.message || 'tente outra imagem')
      return
    }
    escondido.value = url
    preview.src = url
    preview.hidden = false
    remover?.removeAttribute('hidden')
    status.textContent = 'Pronto ✓'
  })

  remover?.addEventListener('click', () => {
    escondido.value = ''
    preview.hidden = true
    remover.hidden = true
    status.textContent = ''
  })
}
