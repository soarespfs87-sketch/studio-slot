// Telas jurídicas: Política de Privacidade e Termos de Uso.
// Textos em PT-BR (a versão em inglês entra no lançamento comercial de 2027).
// v2 (30/09/2026): app de gestão pro fotógrafo — o fotógrafo é controlador
// dos dados dos clientes dele; o Studio Slot é operador desses dados.
// `standalone` = aberta fora do app (ex.: link da tela de login, aba nova):
// os links viram âncoras de hash e o "voltar" recarrega o app na raiz.
// Dentro do app, tudo passa pelo router (data-ir).

// Canal de contato para questões de privacidade / LGPD e dúvidas sobre os termos.
// TODO: trocar por um e-mail dedicado (ex.: contato@studioslot.app) quando houver domínio.
export const CONTATO_PRIVACIDADE = 'soarespfs87@gmail.com'

const ATUALIZADO_EM = '30 de setembro de 2026'

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
    <p>Esta política explica como o <strong>Studio Slot</strong> trata dados pessoais no
    aplicativo de gestão para fotógrafos (preços, leads, clientes, contratos e financeiro),
    seguindo a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)</strong>.</p>

    <h2>Quem é responsável por quais dados</h2>
    <ul>
      <li><strong>Dados da sua conta</strong> (você, fotógrafo ou fotógrafa que assina o app):
        o Studio Slot é o <strong>controlador</strong>.</li>
      <li><strong>Dados dos seus leads e clientes</strong> que você cadastra no app: <strong>você
        é o controlador</strong> — decide o que cadastrar e para quê. O Studio Slot é
        <strong>operador</strong>: guarda e processa esses dados só para fazer o app funcionar para você,
        seguindo suas instruções, e não usa esses dados para nenhuma outra finalidade.</li>
    </ul>

    <h2>Dados que o app guarda</h2>
    <ul>
      <li><strong>Sua conta:</strong> nome, e-mail, telefone, nome e marca do negócio (logo, cores).</li>
      <li><strong>Seu negócio:</strong> custos, equipamentos, pacotes, preços, lançamentos financeiros e,
        se você preencher, seu nome ou razão social, CPF/CNPJ e endereço para os contratos.</li>
      <li><strong>Seus leads e clientes:</strong> nome, WhatsApp, e-mail, Instagram, data de nascimento,
        CPF e endereço (usados no contrato), histórico de atendimento, compras e contratos gerados.</li>
      <li><strong>Família dos seus clientes:</strong> nome, parentesco e datas (nascimento ou data prevista
        do parto), usados apenas para os lembretes de aniversário, festa e parto.</li>
      <li><strong>Dados técnicos:</strong> o necessário para manter você conectado. Não usamos
        rastreadores de publicidade.</li>
    </ul>

    <h2>Dados de crianças</h2>
    <p>O app permite cadastrar filhos dos seus clientes (nome, parentesco e data de nascimento) para os
    lembretes. Esses dados são tratados no melhor interesse da criança (art. 14 da LGPD): <strong>não
    guardamos fotos nem documentos de crianças</strong>, e os dados só aparecem para você. Cabe a você,
    como controlador, cadastrar só o que o responsável pela criança concordou em compartilhar.</p>

    <h2>Para que usamos</h2>
    <ul>
      <li>Fazer o app funcionar: calcular preços, organizar leads e clientes, gerar contratos,
        mostrar lembretes e o fluxo de caixa.</li>
      <li>Manter sua conta e sua assinatura.</li>
      <li>Cumprir obrigações legais e manter o serviço seguro.</li>
    </ul>
    <p>Nós <strong>não vendemos</strong> dados pessoais e <strong>não entramos em contato</strong> com os
    seus clientes. As mensagens de WhatsApp saem do seu próprio celular.</p>

    <h2>Bases legais</h2>
    <p>Para os dados da sua conta: execução do contrato de assinatura, cumprimento de obrigação legal e
    legítimo interesse em manter o serviço seguro. Para os dados dos seus clientes: a base legal é
    definida por você, como controlador (em geral, a execução do contrato com o seu cliente).</p>

    <h2>Segurança</h2>
    <p>Cada conta só enxerga os próprios dados (regras de acesso no banco de dados), a comunicação é
    criptografada e as cópias de segurança do banco são criptografadas. Nem a equipe da plataforma
    acessa os números do seu negócio ou os dados dos seus clientes pelo app.</p>

    <h2>Com quem compartilhamos</h2>
    <ul>
      <li><strong>Fornecedores que operam a plataforma:</strong> banco de dados e login (Supabase, com
        dados em São Paulo, Brasil), hospedagem do site (Netlify) e cobrança da assinatura (LastLink).</li>
      <li><strong>Autoridades</strong>, quando exigido por lei ou ordem judicial.</li>
    </ul>
    <p>Alguns fornecedores podem processar dados fora do país; nesses casos, exigimos garantias de
    proteção compatíveis com a LGPD.</p>

    <h2>Pagamento da assinatura</h2>
    <p>A assinatura é cobrada pelo LastLink. O Studio Slot não recebe nem guarda dados de cartão.</p>

    <h2>Por quanto tempo guardamos</h2>
    <p>Enquanto sua conta existir. Se você pedir o encerramento da conta, apagamos seus dados e os dos seus
    clientes em até 30 dias, exceto o que a lei obrigar a guardar. Você pode apagar clientes, leads e
    lançamentos a qualquer momento pelo próprio app (contratos assinados só saem junto com a ficha da cliente).</p>

    <h2>Seus direitos (e os dos seus clientes)</h2>
    <p>Você pode pedir confirmação, acesso, correção, exclusão, portabilidade e informações sobre
    compartilhamento dos seus dados. Pedidos de <strong>clientes seus</strong> sobre os dados deles devem
    ser feitos a você, que é o controlador — e nós te ajudamos a atender. Fale com a gente em
    <a href="mailto:${CONTATO_PRIVACIDADE}">${CONTATO_PRIVACIDADE}</a>.</p>

    <h2>Mudanças nesta política</h2>
    <p>Podemos atualizar este texto. Quando a mudança for relevante, avisamos no app. A data no topo
    indica a versão vigente.</p>
  `,
    standalone,
  )
}

export function telaTermos({ standalone = false } = {}) {
  return moldura(
    'Termos de Uso',
    `
    <p>Ao criar uma conta e usar o <strong>Studio Slot</strong>, você concorda com estas condições. Elas
    valem junto com a Política de Privacidade (link no fim da página).</p>

    <h2>O que é o serviço</h2>
    <p>O Studio Slot é um aplicativo de gestão para fotógrafos: precificação de pacotes e campanhas,
    leads, clientes e lembretes, contratos e fluxo de caixa do negócio.</p>

    <h2>Assinatura</h2>
    <p>O acesso é por assinatura do plano <strong>Pro</strong> — R$ 59 por mês ou R$ 590 por ano — cobrada
    pelo LastLink. Não há plano gratuito. O acesso é liberado depois da confirmação do pagamento. Você
    pode cancelar quando quiser pelo LastLink; o acesso continua até o fim do período já pago.
    Mudanças de preço valem só a partir da renovação seguinte e são avisadas com antecedência.</p>

    <h2>Sua conta e seus dados</h2>
    <p>Você é responsável pelos dados que informa, por manter sua senha em segurança e por usar o app de
    forma lícita. Os dados dos seus leads e clientes são seus: você é responsável por ter autorização
    para cadastrá-los (inclusive dados de crianças, com a concordância do responsável) e por atender os
    pedidos deles sobre esses dados.</p>

    <h2>Cálculos e contratos</h2>
    <p>Os preços sugeridos, o fluxo de caixa e os alertas são <strong>ferramentas de apoio</strong> baseadas
    nos números que você informa. Eles não substituem a orientação de um contador. O modelo de contrato
    de exemplo é só um ponto de partida e <strong>não é orientação jurídica</strong>: revise seus contratos
    com um advogado. O app não faz assinatura eletrônica; a assinatura é combinada entre você e o seu cliente.</p>

    <h2>Disponibilidade</h2>
    <p>Buscamos manter o serviço no ar, mas ele pode passar por manutenções e interrupções. Podemos
    alterar ou encerrar funcionalidades, avisando quando a mudança for relevante.</p>

    <h2>Encerramento</h2>
    <p>Você pode pedir o encerramento da conta a qualquer momento. Podemos suspender contas com pagamento
    em atraso ou que usem o serviço de forma ilícita.</p>

    <h2>Alterações destes termos</h2>
    <p>Podemos atualizar estes termos. O uso continuado depois de uma mudança significa que você concorda
    com a nova versão. A data no topo indica a versão vigente.</p>

    <h2>Contato</h2>
    <p>Dúvidas sobre estes termos: <a href="mailto:${CONTATO_PRIVACIDADE}">${CONTATO_PRIVACIDADE}</a>.</p>
  `,
    standalone,
  )
}
