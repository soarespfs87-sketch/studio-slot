// Estado vazio de um módulo que ainda vai ser construído:
// diz o que vai ter ali, pra tela nunca parecer quebrada.

export function telaEmBreve({ titulo, frase, itens, fase }) {
  return `
    <section class="modulo">
      <h1 class="titulo-grande">${titulo}</h1>
      <div class="em-breve">
        <p class="em-breve-frase">${frase}</p>
        <ul class="em-breve-lista">
          ${itens.map((i) => `<li>${i}</li>`).join('')}
        </ul>
        <span class="em-breve-selo">Chega na ${fase}</span>
      </div>
    </section>`
}
