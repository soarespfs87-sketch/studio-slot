// ────────────────────────────────────────────────────────────────
//  Módulo Ajustes — nome, marca e cores do negócio + conta
//  (os "dados do negócio" da precificação entram aqui na Fase 1)
// ────────────────────────────────────────────────────────────────

import {
  esc,
  campoTexto,
  campoCor,
  campoCheck,
  campoFoto,
  ligarCampoFoto,
} from '../../componentes/campos.js'
import { getNegocio, salvarIdentidade } from '../../negocio.js'
import { aplicarTema } from '../../theme.js'
import { sair } from '../../auth.js'
import { carregarPrecos, salvarConfig } from '../precos/dados.js'
import { cpfValido, cnpjValido, formatarDocumento } from '../clientes/regras.js'

function tela({ negocio, ehAdmin, email, erro, salvo }) {
  const t = negocio.tema
  return `
    <section class="modulo">
      <h1 class="titulo-grande">Ajustes</h1>

      <form class="dono-form" id="form-identidade">
        <h2 class="bloco-titulo">Seu negócio</h2>
        ${erro ? `<p class="form-erro">${esc(erro)}</p>` : ''}
        ${salvo ? '<p class="form-ok">Salvo ✓</p>' : ''}
        ${campoTexto('f-nome', 'Nome do negócio', negocio.nome)}

        <h2 class="bloco-titulo">Marca</h2>
        ${campoFoto('f-logo', 'Logo (aparece no topo do app)', negocio.logo || '', 'Em branco = só o nome em texto.')}
        ${campoCheck('f-logo-com-nome', 'Minha logo já mostra o nome (esconder o texto no topo)', negocio.logoComNome)}
        ${campoFoto('f-icone', 'Ícone do app no celular', negocio.icone || '', 'Imagem quadrada. Em branco = usa a logo.')}

        <h2 class="bloco-titulo">Cores</h2>
        <p class="campo-dica">O app muda enquanto você escolhe. Só fica valendo depois de salvar.</p>
        <div class="dono-grid2">
          ${campoCor('f-cor-primaria', 'Principal (botões)', t.primaria)}
          ${campoCor('f-cor-fundo', 'Topo e menu', t.fundo)}
          ${campoCor('f-cor-superficie', 'Fundo das telas', t.superficie)}
          ${campoCor('f-cor-texto', 'Texto suave', t.textoSuave)}
        </div>

        <button type="submit" class="botao botao-grande">Salvar</button>
      </form>

      <form class="dono-form" id="form-contrato" novalidate>
        <h2 class="bloco-titulo">Dados pro contrato</h2>
        <p class="campo-dica">Aparecem nos contratos no lugar das etiquetas {contratada_nome}, {contratada_documento}, {contratada_endereco} e {foro_cidade}.</p>
        <div id="contrato-campos"><p class="vazio-mini">Carregando…</p></div>
      </form>
      <div class="passo-a-passo">
        <strong>Como gerar um contrato</strong>
        <ol>
          <li>Preencha e salve os dados acima.</li>
          <li>Crie seu modelo em <a href="#/clientes/modelos">Clientes › Modelos de contrato</a> (tem um exemplo pronto pra começar).</li>
          <li>Abra uma <a href="#/clientes">cliente</a> e clique em <em>+ Gerar contrato</em>. Quem fecha um lead vira cliente sozinha.</li>
        </ol>
      </div>

      <h2 class="bloco-titulo">Conta</h2>
      <div class="ajustes-lista">
        ${email ? `<p class="ajustes-linha"><span>E-mail</span><strong>${esc(email)}</strong></p>` : ''}
        ${ehAdmin ? '<a class="ajustes-link" href="#/plataforma">Painel da plataforma →</a>' : ''}
        <a class="ajustes-link" href="#termos" target="_blank" rel="noopener">Termos de Uso</a>
        <a class="ajustes-link" href="#privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
        <button type="button" class="ajustes-link ajustes-sair" data-acao="sair">Sair da conta</button>
      </div>
    </section>`
}

// Lê as cores escolhidas no formulário.
const temaDoForm = (el) => ({
  primaria: el.querySelector('#f-cor-primaria').value,
  fundo: el.querySelector('#f-cor-fundo').value,
  superficie: el.querySelector('#f-cor-superficie').value,
  textoSuave: el.querySelector('#f-cor-texto').value,
})

async function ligarDadosContrato(el) {
  const caixa = el.querySelector('#contrato-campos')
  const { dados, error } = await carregarPrecos(getNegocio().id)
  if (!caixa.isConnected) return
  if (error) {
    caixa.innerHTML = '<p class="form-erro">Não consegui carregar. Recarregue a página.</p>'
    return
  }
  const c = dados.config
  caixa.innerHTML = `
    ${campoTexto('k-nome', 'Seu nome ou razão social', c.contratada_nome || '')}
    ${campoTexto('k-doc', 'CPF ou CNPJ', formatarDocumento(c.contratada_documento || ''))}
    ${campoTexto('k-end', 'Endereço completo', c.contratada_endereco || '')}
    ${campoTexto('k-foro', 'Cidade do foro', c.foro_cidade || '', { placeholder: 'Ex.: São Paulo/SP' })}
    <p class="form-erro" id="k-erro" hidden></p>
    <div class="linha-acao"><button type="submit" class="botao">Salvar dados pro contrato</button><span class="status-salvo" id="k-status"></span></div>`
  const form = el.querySelector('#form-contrato')
  form.onsubmit = async (e) => {
    e.preventDefault()
    const doc = form.querySelector('#k-doc').value.replace(/\D/g, '')
    const erro = form.querySelector('#k-erro')
    if (doc && !(doc.length === 11 ? cpfValido(doc) : doc.length === 14 ? cnpjValido(doc) : false)) {
      erro.textContent = 'Confira o CPF (11 números) ou CNPJ (14 números).'
      erro.hidden = false
      return
    }
    erro.hidden = true
    const { error: e2 } = await salvarConfig({
      contratada_nome: form.querySelector('#k-nome').value.trim() || null,
      contratada_documento: doc || null,
      contratada_endereco: form.querySelector('#k-end').value.trim() || null,
      foro_cidade: form.querySelector('#k-foro').value.trim() || null,
    })
    const st = form.querySelector('#k-status')
    st.textContent = e2 ? 'Não deu pra salvar: ' + (e2.message || '') : 'Salvo ✓'
    st.dataset.tipo = e2 ? 'erro' : 'ok'
    if (!e2) form.querySelector('#k-doc').value = formatarDocumento(doc)
  }
}

export function render(el, ctx, estadoTela = {}) {
  const negocio = getNegocio()
  el.innerHTML = tela({ negocio, ehAdmin: ctx.ehAdmin, email: ctx.email, ...estadoTela })

  ligarDadosContrato(el)
  ligarCampoFoto(el, 'f-logo', negocio.id, 'marca')
  ligarCampoFoto(el, 'f-icone', negocio.id, 'marca')

  // prévia das cores ao vivo
  el.querySelectorAll('input[type="color"]').forEach((c) =>
    c.addEventListener('input', () => aplicarTema({ ...negocio, tema: temaDoForm(el) })),
  )

  el.querySelector('#form-identidade').addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = el.querySelector('#f-nome').value.trim()
    if (nome.length < 2) return render(el, ctx, { erro: 'O negócio precisa de um nome.' })

    e.target.querySelector('button[type="submit"]').disabled = true
    const { error } = await salvarIdentidade({
      nome,
      logo: el.querySelector('#f-logo').value || null,
      logoComNome: el.querySelector('#f-logo-com-nome').checked,
      icone: el.querySelector('#f-icone').value || null,
      tema: temaDoForm(el),
    })
    if (error) return render(el, ctx, { erro: 'Não deu pra salvar: ' + (error.message || '') })
    ctx.atualizarMarca()
    render(el, ctx, { salvo: true })
  })

  el.querySelector('[data-acao="sair"]').addEventListener('click', async () => {
    await sair()
    location.hash = ''
    location.reload()
  })
}

// Saiu de Ajustes sem salvar: volta às cores gravadas.
export function sairDaTela() {
  const negocio = getNegocio()
  if (negocio) aplicarTema(negocio)
}
