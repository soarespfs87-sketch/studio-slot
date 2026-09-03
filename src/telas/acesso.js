// Telas de acesso: entrar e criar conta. Estúdios e fotógrafos, mesmo login.

import { rodapeStudioSlot } from '../ui.js'

function moldura(conteudo) {
  return `
    <div class="acesso">
      <div class="acesso-caixa">${conteudo}</div>
      <div class="acesso-rodape">${rodapeStudioSlot()}</div>
    </div>`
}

export function telaEntrar({ erro } = {}) {
  return moldura(`
    <h1 class="titulo-grande acesso-frase">Tudo pronto para sua próxima reserva.</h1>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-entrar" class="dono-form">
      <label class="campo"><span>E-mail</span>
        <input type="email" id="e-email" autocomplete="email" required /></label>
      <label class="campo"><span>Senha</span>
        <input type="password" id="e-senha" autocomplete="current-password" required /></label>
      <button class="botao botao-grande" type="submit">Entrar</button>
    </form>
    <button class="link-troca" data-ir-acesso="esqueci">Esqueci minha senha</button>
    <button class="link-troca" data-ir-acesso="cadastro">Não tenho conta — criar agora</button>
  `)
}

// Passo 1 da recuperação: pedir o e-mail e mandar o link.
export function telaEsqueciSenha({ erro, enviado } = {}) {
  if (enviado) {
    return moldura(`
      <div class="feito">
        <div class="feito-check">&#9993;</div>
        <h1 class="titulo-grande">Confira seu e-mail</h1>
        <p>Mandamos um link pra você criar uma senha nova. Se não achar, dá uma olhada na caixa de spam.</p>
        <button class="link-troca link-centro" data-ir-acesso="entrar">Voltar pro login</button>
      </div>
    `)
  }
  return moldura(`
    <h1 class="titulo-grande">Esqueci minha senha</h1>
    <p class="acesso-sub">Digite o e-mail da sua conta — mandamos um link pra criar uma senha nova.</p>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-esqueci" class="dono-form">
      <label class="campo"><span>E-mail</span>
        <input type="email" id="es-email" autocomplete="email" required /></label>
      <button class="botao botao-grande" type="submit">Enviar link</button>
    </form>
    <button class="link-troca" data-ir-acesso="entrar">Voltar pro login</button>
  `)
}

// Passo 2 da recuperação: a pessoa chegou aqui pelo link do e-mail.
export function telaNovaSenha({ erro } = {}) {
  return moldura(`
    <h1 class="titulo-grande">Criar senha nova</h1>
    <p class="acesso-sub">Escolha uma senha nova pra sua conta.</p>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-nova-senha" class="dono-form">
      <label class="campo"><span>Senha nova (mín. 6 caracteres)</span>
        <input type="password" id="np-senha" autocomplete="new-password" minlength="6" required /></label>
      <button class="botao botao-grande" type="submit">Salvar senha</button>
    </form>
  `)
}

export function telaCadastro({ erro, tipo = 'fotografo' } = {}) {
  const marc = (t) => (tipo === t ? 'tipo-op-on' : '')
  const chk = (t) => (tipo === t ? 'checked' : '')
  return moldura(`
    <h1 class="titulo-grande">Criar conta</h1>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-cadastro" class="dono-form">
      <div class="tipo-escolha">
        <label class="tipo-op ${marc('fotografo')}">
          <input type="radio" name="tipo" value="fotografo" ${chk('fotografo')} />
          <strong>Sou fotógrafo</strong><span>quero reservar salas</span>
        </label>
        <label class="tipo-op ${marc('dono')}">
          <input type="radio" name="tipo" value="dono" ${chk('dono')} />
          <strong>Tenho um estúdio</strong><span>quero receber reservas</span>
        </label>
      </div>
      <label class="campo campo-estudio" ${tipo === 'dono' ? '' : 'hidden'}>
        <span>Nome do estúdio</span>
        <input type="text" id="c-estudio" placeholder="Ex.: Estúdio Lúmen" />
      </label>
      <label class="campo"><span>Seu nome</span>
        <input type="text" id="c-nome" autocomplete="name" required /></label>
      <label class="campo"><span>Telefone</span>
        <input type="tel" id="c-tel" autocomplete="tel" placeholder="(11) 90000-0000" /></label>
      <label class="campo"><span>E-mail</span>
        <input type="email" id="c-email" autocomplete="email" required /></label>
      <label class="campo"><span>Senha (mín. 6 caracteres)</span>
        <input type="password" id="c-senha" autocomplete="new-password" minlength="6" required /></label>
      <button class="botao botao-grande" type="submit">Criar conta</button>
    </form>
    <button class="link-troca" data-ir-acesso="entrar">Já tenho conta — entrar</button>
  `)
}

// Fotógrafo abriu o app sem link de estúdio (e nunca abriu nenhum).
export function telaSemEstudio() {
  return moldura(`
    <h1 class="titulo-grande">Abra pelo link do estúdio</h1>
    <p class="acesso-sub">
      Este app é personalizado para cada estúdio. Use o link que o estúdio
      te enviou — ou instale o app a partir dele.
    </p>
    <form id="form-slug" class="dono-form">
      <label class="campo">
        <span>Tem o endereço do estúdio?</span>
        <div class="endereco-linha">
          <span>studioslot.app/</span>
          <input type="text" id="s-slug" placeholder="nome-do-estudio" />
        </div>
      </label>
      <button class="botao botao-grande" type="submit">Abrir estúdio</button>
    </form>
    <button class="link-troca" data-acao="sair">Sair</button>
  `)
}

// Fotógrafo escolhe em qual estúdio quer reservar.
export function telaEscolherEstudio({ estudios, ehAdmin }) {
  return `
    <div class="reservar-corpo">
      <h1 class="titulo-grande">Escolha um estúdio</h1>
      <p class="detalhe-desc">Onde você quer reservar?</p>

      <div class="lista-reservas">
        ${
          estudios.length
            ? estudios
                .map(
                  (e) => `
              <button class="card-reserva" data-estudio-slug="${e.slug}">
                <div class="cr-topo"><span class="cr-sala">${e.nome}</span></div>
                <p class="cr-quando">studioslot.app/${e.slug}</p>
              </button>`,
                )
                .join('')
            : '<p class="vazio">Nenhum estúdio disponível ainda.</p>'
        }
      </div>

      <div class="rodape-links" style="margin-top: 22px">
        ${ehAdmin ? '<button class="link-dono" data-ir="plataforma">Painel da plataforma</button>' : ''}
        <button class="link-dono" data-acao="sair">Sair</button>
      </div>
    </div>`
}

// Estúdio cadastrado, mas ainda sem o plano liberado pela plataforma.
export function telaAguardando({ estudio }) {
  return moldura(`
    <div class="feito">
      <div class="feito-check feito-neutro">&#8987;</div>
      <h1 class="titulo-grande">Estúdio em análise</h1>
      <p>O <strong>${estudio.nome}</strong> foi cadastrado no endereço
         <strong>studioslot.app/${estudio.slug}</strong> e está aguardando a
         liberação da plataforma (depois da confirmação do plano).</p>
      <p class="acesso-sub">Assim que liberar, seu painel abre aqui.</p>
      <div class="rodape-links" style="margin-top: 20px">
        <button class="link-dono" data-acao="recarregar">Já foi liberado? Recarregar</button>
        <button class="link-dono" data-acao="sair">Sair</button>
      </div>
    </div>
  `)
}
