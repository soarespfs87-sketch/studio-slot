// Telas jurídicas: Política de Privacidade e Termos de Uso.
// Textos em PT-BR (a versão em inglês entra no lançamento comercial de 2027).
// `standalone` = aberta fora do app (ex.: link da tela de login, aba nova):
// os links viram âncoras de hash e o "voltar" recarrega o app na raiz.
// Dentro do app, tudo passa pelo router (data-ir).

// Troque este e-mail pelo canal real de privacidade do estúdio / da plataforma.
export const CONTATO_PRIVACIDADE = 'privacidade@studioslot.app'

const ATUALIZADO_EM = '3 de setembro de 2026'

const elo = (destino, texto, standalone) =>
  standalone
    ? `<a href="#${destino}">${texto}</a>`
    : `<button type="button" class="elo" data-ir="${destino}">${texto}</button>`

function moldura(titulo, corpo, standalone) {
  const voltar = standalone
    ? `<a class="link-voltar" href="/">&larr; Voltar</a>`
    : `<button class="link-voltar" data-ir="inicio">&larr; Voltar</button>`
  return `
    <div class="topo-nav">${voltar}</div>
    <article class="reservar-corpo legal">
      <h1 class="titulo-grande">${titulo}</h1>
      <p class="legal-data">Última atualização: ${ATUALIZADO_EM}</p>
      ${corpo}
      <p class="legal-troca">
        ${elo('privacidade', 'Política de Privacidade', standalone)}
        &middot;
        ${elo('termos', 'Termos de Uso', standalone)}
      </p>
    </article>`
}

export function telaPrivacidade({ standalone = false } = {}) {
  return moldura(
    'Política de Privacidade',
    `
    <p>Esta política explica quais dados pessoais o <strong>Studio Slot</strong> trata
    quando você usa o aplicativo para reservar salas e cenários de estúdio fotográfico,
    para que usamos esses dados e quais são os seus direitos. Ela segue a
    <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)</strong>.</p>

    <h2>Quem trata seus dados</h2>
    <p>O Studio Slot é a plataforma que fornece o aplicativo. Cada <strong>estúdio</strong>
    que usa a plataforma para receber reservas é responsável pelos dados das reservas feitas
    com ele. Plataforma e estúdio atuam cada um em seu papel: a plataforma cuida da sua conta
    e da infraestrutura; o estúdio cuida da operação da reserva (agenda, atendimento, nota).</p>

    <h2>Dados que coletamos</h2>
    <ul>
      <li><strong>Cadastro:</strong> nome, e-mail e telefone.</li>
      <li><strong>Reservas:</strong> sala/cenário escolhido, data, horário, extras, valor,
        status do pagamento e o registro do aceite das regras (data e hora).</li>
      <li><strong>Comunicação:</strong> mensagens trocadas com o estúdio a respeito da reserva.</li>
      <li><strong>Dados técnicos:</strong> informações básicas de acesso e um armazenamento
        local no seu navegador para manter você conectado e guardar preferências do app.
        Não usamos rastreadores de publicidade.</li>
      <li><strong>Documento de identificação</strong> (ex.: CPF): só se o estúdio pedir,
        quando for necessário para emissão de nota fiscal.</li>
    </ul>

    <h2>Para que usamos</h2>
    <ul>
      <li>Criar e manter sua conta.</li>
      <li>Processar e gerenciar suas reservas.</li>
      <li>Enviar confirmações e avisos sobre a sua reserva.</li>
      <li>Permitir o contato entre você e o estúdio.</li>
      <li>Cumprir obrigações legais e fiscais.</li>
      <li>Prevenir fraudes e manter a segurança do serviço.</li>
    </ul>

    <h2>Bases legais</h2>
    <p>Tratamos seus dados para <strong>executar o contrato</strong> de uso e a reserva,
    para <strong>cumprir obrigações legais</strong>, com base no <strong>legítimo interesse</strong>
    de manter o serviço seguro e, quando for o caso, com o seu <strong>consentimento</strong>.</p>

    <h2>Pagamento</h2>
    <p>Os pagamentos das reservas são feitos por <strong>Pix</strong>. Não coletamos nem
    armazenamos dados de cartão de crédito. Se, no futuro, a plataforma passar a oferecer
    pagamento por cartão, ele será processado por um provedor de pagamento especializado,
    e os dados do cartão nunca ficarão com o Studio Slot.</p>

    <h2>Com quem compartilhamos</h2>
    <ul>
      <li><strong>Com o estúdio</strong> em que você faz a reserva.</li>
      <li><strong>Com fornecedores que operam a plataforma</strong> em nosso nome — hospedagem,
        banco de dados e autenticação (Supabase) e, quando ativados, serviços de envio de
        e-mail e de pagamento.</li>
      <li><strong>Com autoridades</strong>, quando exigido por lei ou ordem judicial.</li>
    </ul>
    <p>Nós <strong>não vendemos</strong> seus dados pessoais.</p>

    <h2>Onde seus dados ficam</h2>
    <p>Nosso banco de dados fica hospedado na região de <strong>São Paulo, Brasil</strong>.
    Alguns fornecedores podem processar dados fora do país; nesses casos, exigimos garantias
    de proteção compatíveis com a LGPD.</p>

    <h2>Por quanto tempo guardamos</h2>
    <p>Mantemos seus dados enquanto sua conta existir e pelo tempo necessário para cumprir
    obrigações legais (por exemplo, prazos fiscais). Depois disso, os dados são excluídos
    ou anonimizados.</p>

    <h2>Seus direitos</h2>
    <p>A qualquer momento você pode pedir: confirmação de que tratamos seus dados; acesso aos
    dados; correção de dados incompletos ou desatualizados; anonimização ou exclusão;
    portabilidade; informação sobre com quem compartilhamos; e revogação do consentimento.
    Para exercer, fale com o estúdio pelos canais do app ou escreva para
    <a href="mailto:${CONTATO_PRIVACIDADE}">${CONTATO_PRIVACIDADE}</a>.</p>

    <h2>Menores de idade</h2>
    <p>O aplicativo não é destinado a menores de 18 anos.</p>

    <h2>Mudanças nesta política</h2>
    <p>Podemos atualizar este texto. Quando a mudança for relevante, avisamos no app.
    A data no topo indica a versão vigente.</p>
  `,
    standalone,
  )
}

export function telaTermos({ standalone = false } = {}) {
  return moldura(
    'Termos de Uso',
    `
    <p>Ao criar uma conta e usar o <strong>Studio Slot</strong>, você concorda com estas
    condições. Elas valem junto com a Política de Privacidade (link no fim da página).</p>

    <h2>O que é o serviço</h2>
    <p>O Studio Slot é uma plataforma que conecta fotógrafos a estúdios para reserva de salas
    e cenários por hora. A plataforma <strong>não é o estúdio</strong>: as salas, os preços,
    as regras de uso e a política de cancelamento são definidos por cada estúdio.</p>

    <h2>Sua conta</h2>
    <p>Você é responsável pelos dados que informa e por manter sua senha em segurança.
    Use o serviço de forma lícita e não tente burlar a agenda, os pagamentos ou o acesso
    de outras pessoas.</p>

    <h2>Reservas e pagamento</h2>
    <p>Ao escolher um horário, ele fica reservado por tempo limitado enquanto você conclui
    o pagamento por Pix. A reserva só se torna definitiva depois que o estúdio confirma o
    recebimento. Os valores, extras e faixas de preço são os exibidos no momento da reserva.</p>

    <h2>Cancelamento e remarcação</h2>
    <p>Cada estúdio define seus próprios prazos e a taxa aplicável. As condições vigentes
    aparecem na tela da sua reserva antes de você confirmar qualquer alteração. Os estornos
    e repasses seguem o combinado com o estúdio.</p>

    <h2>Responsabilidades</h2>
    <p>O estúdio é responsável pela sala, pelos equipamentos e pelo atendimento no local.
    A plataforma é responsável pelo funcionamento do aplicativo. Na medida permitida em lei,
    o Studio Slot não responde por prejuízos decorrentes do uso do espaço físico ou de
    acordos feitos diretamente entre você e o estúdio.</p>

    <h2>Disponibilidade</h2>
    <p>Buscamos manter o serviço no ar, mas ele pode passar por manutenções e interrupções.
    Podemos alterar ou encerrar funcionalidades, avisando quando a mudança for relevante.</p>

    <h2>Alterações destes termos</h2>
    <p>Podemos atualizar estes termos. O uso continuado do serviço após uma mudança
    significa que você concorda com a nova versão. A data no topo indica a versão vigente.</p>

    <h2>Contato</h2>
    <p>Dúvidas sobre estes termos: <a href="mailto:${CONTATO_PRIVACIDADE}">${CONTATO_PRIVACIDADE}</a>.</p>
  `,
    standalone,
  )
}
