// ────────────────────────────────────────────────────────────────
//  Pedacinhos de interface reaproveitados
// ────────────────────────────────────────────────────────────────

// Ícone de abertura de lente. `cls` opcional para estilizar.
export const aperture = (cls = '') => `
<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 3l4.5 7.8M21 12l-9 0M16.5 20.2L12 12M3 12l7.8 4.5M7.5 3.8L12 12M12 21l-1.5-8.7"/>
</svg>`

// ────────────────────────────────────────────────────────────────
//  Selo da plataforma (a EMPRESA que faz o app: Studio Slot).
//  É fixo — não vem do estudio.config.js e o Painel do Dono não mexe
//  nele. O estúdio personaliza a marca DELE; este selo é de quem
//  desenvolve a plataforma.
// ────────────────────────────────────────────────────────────────
export const rodapeStudioSlot = () => `
  <div class="selo-dev">
    <img class="selo-dev-logo" src="/studio-slot-logo.png" alt="Studio Slot" />
    <span class="selo-dev-txt">Powered by Studio Slot</span>
  </div>`

// A "capa" de uma sala: a foto quando existe, senão a cor + o ícone de lente.
// A cor fica sempre no fundo — aparece enquanto a foto carrega ou se ela falha.
export function capaSala(sala, { classe, apertureCls }) {
  const etiqueta = sala.tipo === 'sazonal' ? 'Cenário sazonal' : 'Sala fixa'
  const foto = sala.fotos && sala.fotos[0]
  return `
    <div class="${classe}" style="background:${sala.corFoto}">
      ${
        foto
          ? `<img class="capa-img" src="${foto}" alt="${sala.nome}" loading="lazy" />`
          : aperture(apertureCls)
      }
      <span class="badge">${etiqueta}</span>
    </div>`
}
