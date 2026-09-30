// Telas de acesso: entrar, criar conta, recuperar senha, criar o negócio.

import { rodapeStudioSlot } from '../ui.js'

function moldura(conteudo) {
  return `
    <div class="acesso">
      <div class="acesso-caixa">${conteudo}</div>
      <div class="acesso-rodape">
        ${rodapeStudioSlot()}
        <p class="acesso-legal">
          <a href="#privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
          <span>&middot;</span>
          <a href="#termos" target="_blank" rel="noopener">Termos de Uso</a>
        </p>
      </div>
    </div>`
}

export function telaEntrar({ erro } = {}) {
  return moldura(`
    <h1 class="titulo-grande acesso-frase">Seu negócio de fotografia, no azul.</h1>
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

export function telaCadastro({ erro } = {}) {
  return moldura(`
    <h1 class="titulo-grande">Criar conta</h1>
    <p class="acesso-sub">Preços, leads e financeiro do seu negócio de fotografia num lugar só.</p>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-cadastro" class="dono-form">
      <label class="campo"><span>Nome do seu negócio</span>
        <input type="text" id="c-negocio" placeholder="Ex.: Ana Lima Fotografia" required /></label>
      <label class="campo"><span>Seu nome</span>
        <input type="text" id="c-nome" autocomplete="name" required /></label>
      <label class="campo"><span>WhatsApp</span>
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

// Conta sem negócio (ex.: conta antiga da v1): dá um nome pro negócio.
export function telaCriarNegocio({ erro } = {}) {
  return moldura(`
    <h1 class="titulo-grande">Qual é o nome do seu negócio?</h1>
    <p class="acesso-sub">É o nome que aparece no topo do app. Dá pra trocar depois em Ajustes.</p>
    ${erro ? `<p class="form-erro">${erro}</p>` : ''}
    <form id="form-negocio" class="dono-form">
      <label class="campo"><span>Nome do negócio</span>
        <input type="text" id="n-nome" placeholder="Ex.: Ana Lima Fotografia" required /></label>
      <button class="botao botao-grande" type="submit">Continuar</button>
    </form>
    <button class="link-troca" data-acao="sair">Sair</button>
  `)
}

// Conta criada, mas a assinatura ainda não foi liberada pela plataforma.
export function telaAguardando({ estudio }) {
  return moldura(`
    <div class="feito">
      <div class="feito-check feito-neutro">&#8987;</div>
      <h1 class="titulo-grande">Falta liberar sua assinatura</h1>
      <p>A conta do <strong>${estudio.nome}</strong> foi criada e está aguardando a
         liberação do plano (assim que o pagamento for confirmado).</p>
      <p class="acesso-sub">Assim que liberar, o app abre aqui.</p>
      <div class="rodape-links" style="margin-top: 20px">
        <button class="link-dono" data-acao="recarregar">Já foi liberado? Recarregar</button>
        <button class="link-dono" data-acao="sair">Sair</button>
      </div>
    </div>
  `)
}
