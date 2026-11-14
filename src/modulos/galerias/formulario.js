// ────────────────────────────────────────────────────────────────
//  Galerias › Nova galeria / Editar
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import { paraCentavos, centavosParaCampo } from '../../calculos.js'
import { salvarGaleria, mensagemDeErro } from './dados.js'
import { TIPOS } from './regras.js'
import { dataBR } from '../clientes/ui.js'

const campo = (id, rotulo, valor, opc = {}) => `
  <label class="campo dono-campo ${opc.cls || ''}"><span>${rotulo}</span>
    <input type="${opc.tipo || 'text'}" id="${id}" value="${esc(valor ?? '')}" ${opc.attrs || ''}
      ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} autocomplete="off" />
    ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}</label>`

// 30 dias a partir de hoje (padrão de expiração)
function daquiA(dias) {
  const d = new Date(hojeISO() + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function renderFormulario(el, { galeria, clientes, leads, servicos, clienteInicial, designPadrao = {} }) {
  const nova = !galeria
  const g = galeria || {
    tipo: 'selecao',
    cliente_id: clienteInicial || null,
    expira_em: daquiA(30),
    marca_dagua: true,
    download_liberado: true,
    preco_extra_centavos: 0,
  }
  const voltar = nova ? '#/galerias' : `#/galerias/${g.id}`
  const comprasDe = (clienteId) =>
    leads
      .filter((l) => l.etapa === 'fechado' && l.cliente_id === clienteId)
      .sort((a, b) => (b.data_sessao || '').localeCompare(a.data_sessao || ''))
  const nomeServico = (id) => servicos.find((s) => s.id === id)?.nome || 'Sessão'
  const opcoesCompras = (clienteId, atual) => {
    const lista = clienteId ? comprasDe(clienteId) : []
    return `<option value="">${lista.length ? 'Sem ligar a uma compra' : 'Nenhuma compra dessa cliente'}</option>${lista
      .map(
        (l) =>
          `<option value="${l.id}" ${l.id === atual ? 'selected' : ''}>${esc(nomeServico(l.servico_id))}${
            l.data_sessao ? ` · ${dataBR(l.data_sessao)}` : ''
          }</option>`,
      )
      .join('')}`
  }
  // Pacote da compra: sugere "fotos incluídas" se o nome do pacote tiver "30 fotos" etc.
  const sugerirIncluidas = (leadId) => {
    const l = leads.find((x) => x.id === leadId)
    const s = l && servicos.find((x) => x.id === l.servico_id)
    const m = s && /(\d+)\s*fotos?/i.exec(`${s.nome} ${s.entregaveis || ''}`)
    return m ? Number(m[1]) : null
  }

  el.innerHTML = `
    <section class="modulo">
      <a class="link-voltar-mod" href="${voltar}">&larr; ${nova ? 'Galerias' : esc(g.nome)}</a>
      <h1 class="titulo-editor">${nova ? 'Nova galeria' : 'Editar galeria'}</h1>
      <form id="form-galeria" class="dono-form" novalidate>
        <div class="cartao-bloco">
          ${campo('g-nome', 'Nome da galeria *', g.nome, { placeholder: 'Ensaio gestante · Ana' })}
          <div class="gal-tipos" role="radiogroup" aria-label="Tipo">
            ${Object.entries(TIPOS)
              .map(
                ([id, t]) => `
              <label class="gal-tipo ${g.tipo === id ? 'gal-tipo-on' : ''}">
                <input type="radio" name="g-tipo" value="${id}" ${g.tipo === id ? 'checked' : ''} ${
                  !nova && g.n_itens ? 'disabled' : ''
                } />
                <strong>${t.rotulo}</strong><small>${t.dica}</small>
              </label>`,
              )
              .join('')}
          </div>
          ${!nova && g.n_itens ? '<small class="campo-dica">O tipo não muda depois que a galeria tem fotos.</small>' : ''}
          <div class="dono-grid2">
            <label class="campo dono-campo"><span>Cliente</span>
              <select id="g-cliente">
                <option value="">Sem cliente</option>
                ${clientes.map((c) => `<option value="${c.id}" ${c.id === g.cliente_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
              </select></label>
            <label class="campo dono-campo"><span>Compra</span>
              <select id="g-lead">${opcoesCompras(g.cliente_id, g.lead_id)}</select>
              <small class="campo-dica">Liga as fotos extras à venda certa no Financeiro.</small></label>
          </div>
        </div>

        <div class="cartao-bloco" data-so="selecao">
          <h2 class="bloco-titulo">Seleção</h2>
          <div class="dono-grid2">
            ${campo('g-incluidas', 'Fotos incluídas no pacote', g.incluidas, {
              attrs: 'inputmode="numeric"',
              placeholder: 'sem limite',
              dica: 'Passou disso, cada foto vira extra.',
            })}
            ${campo('g-extra', 'Preço da foto extra (R$)', g.preco_extra_centavos ? centavosParaCampo(g.preco_extra_centavos) : '', {
              attrs: 'inputmode="decimal"',
              placeholder: '0',
              dica: 'Ao enviar a seleção, o valor cai previsto no Financeiro.',
            })}
          </div>
          <label class="termo dono-check"><input type="checkbox" id="g-marca" ${g.marca_dagua ? 'checked' : ''} />
            <span>Marca d’água com o nome do negócio (vale pras fotos que você enviar daqui pra frente)</span></label>
        </div>

        <div class="cartao-bloco" data-so="entrega">
          <h2 class="bloco-titulo">Entrega</h2>
          <label class="termo dono-check"><input type="checkbox" id="g-download" ${g.download_liberado ? 'checked' : ''} />
            <span>Cliente pode baixar as fotos em alta</span></label>
        </div>

        <div class="cartao-bloco">
          <h2 class="bloco-titulo">Acesso</h2>
          <div class="dono-grid2">
            ${campo('g-senha', 'Senha (opcional)', g.senha, { placeholder: 'sem senha', dica: '4 a 40 caracteres. Vai junto na mensagem do WhatsApp.' })}
            ${campo('g-expira', 'Fica no ar até', g.expira_em, { tipo: 'date', dica: 'Em branco = não expira.' })}
          </div>
          <label class="campo dono-campo"><span>Recado pra cliente</span>
            <textarea id="g-msg" rows="3" placeholder="Foi lindo fotografar vocês!">${esc(g.mensagem)}</textarea></label>
        </div>

        <p class="form-erro" id="g-erro" hidden></p>
        <div class="barra-salvar">
          <a class="botao botao-fantasma" href="${voltar}">Cancelar</a>
          <button type="submit" class="botao">${nova ? 'Criar e enviar fotos' : 'Salvar'}</button>
        </div>
      </form>
    </section>`

  const form = el.querySelector('#form-galeria')
  const v = (id) => form.querySelector(id).value.trim()
  const tipoAtual = () => form.querySelector('[name="g-tipo"]:checked')?.value || g.tipo
  const mostrarTipo = () => {
    const t = tipoAtual()
    form.querySelectorAll('[data-so]').forEach((b) => (b.hidden = b.dataset.so !== t))
    form.querySelectorAll('.gal-tipo').forEach((l) => l.classList.toggle('gal-tipo-on', l.querySelector('input').checked))
  }
  mostrarTipo()
  form.querySelectorAll('[name="g-tipo"]').forEach((r) => r.addEventListener('change', mostrarTipo))

  form.querySelector('#g-cliente').addEventListener('change', (e) => {
    form.querySelector('#g-lead').innerHTML = opcoesCompras(e.target.value || null, null)
    const nome = clientes.find((c) => c.id === e.target.value)?.nome
    if (nome && !v('#g-nome')) form.querySelector('#g-nome').value = nome
  })
  form.querySelector('#g-lead').addEventListener('change', (e) => {
    const n = sugerirIncluidas(e.target.value)
    if (n && !v('#g-incluidas')) form.querySelector('#g-incluidas').value = n
  })

  const erro = (msg) => {
    const e = form.querySelector('#g-erro')
    e.textContent = msg
    e.hidden = false
    e.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const tipo = tipoAtual()
    const incl = v('#g-incluidas')
    const incluidas = incl ? Number(incl) : null
    const extra = v('#g-extra') ? paraCentavos(v('#g-extra')) : 0
    const senha = v('#g-senha')
    if (!v('#g-nome')) return erro('Dê um nome pra galeria.')
    if (incluidas != null && !(Number.isInteger(incluidas) && incluidas > 0)) return erro('Fotos incluídas: um número inteiro maior que zero.')
    if (extra == null || extra < 0) return erro('Confira o preço da foto extra.')
    if (senha && (senha.length < 4 || senha.length > 40)) return erro('A senha precisa ter de 4 a 40 caracteres.')
    if (nova && v('#g-expira') && v('#g-expira') < hojeISO()) return erro('A data de expiração já passou.')

    const campos = {
      nome: v('#g-nome'),
      tipo,
      cliente_id: v('#g-cliente') || null,
      lead_id: v('#g-lead') || null,
      senha: senha || null,
      expira_em: v('#g-expira') || null,
      mensagem: v('#g-msg'),
      incluidas: tipo === 'selecao' ? incluidas : null,
      preco_extra_centavos: tipo === 'selecao' ? extra : 0,
      marca_dagua: tipo === 'selecao' ? form.querySelector('#g-marca').checked : false,
      download_liberado: tipo === 'entrega' ? form.querySelector('#g-download').checked : false,
    }
    if (!nova && g.n_itens) delete campos.tipo
    if (nova) campos.design = designPadrao // galeria nova nasce com o design padrão do negócio
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const { galeria: salva, error } = await salvarGaleria(campos, g.id)
    if (error) {
      btn.disabled = false
      return erro(mensagemDeErro(error))
    }
    location.hash = `#/galerias/${salva.id}`
  })

  if (nova) form.querySelector('#g-nome').focus()
}
