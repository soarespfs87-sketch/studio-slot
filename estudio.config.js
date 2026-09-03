// ────────────────────────────────────────────────────────────────
//  Identidade do estúdio — valores iniciais
//  A partir da Fase 5, o dono edita tudo isto pelo Painel do Dono
//  (fica salvo no navegador, na chave "config"). Este arquivo passa
//  a ser só o ponto de partida de um estúdio novo.
//  (Na fase Final isso vai passar a vir do banco de dados.)
// ────────────────────────────────────────────────────────────────

export const estudioConfig = {
  slug: 'estudio-lumen', // vira o endereço: studioslot.app/estudio-lumen
  nome: 'Estúdio Lúmen',
  descricao: 'Sala e cenários para ensaios fotográficos no coração da cidade.',
  regrasGerais:
    'Chegue com 10 minutos de antecedência. A montagem e a desmontagem do seu set precisam caber dentro do horário reservado.',
  politicaCancelamento:
    'Cancelamento gratuito até 72h antes da sessão. Depois disso, taxa de 50% do valor.',
  contato: {
    telefone: '(11) 90000-0000',
    endereco: 'Rua da Luz, 123 — São Paulo, SP',
  },

  // Janela de funcionamento do estúdio — usada para montar a agenda.
  horarioFuncionamento: { abre: '08:00', fecha: '20:00' },

  // Feriados (AAAA-MM-DD): nesses dias vale a faixa de preço "feriado".
  feriados: ['2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25'],

  // A paleta do estúdio. O app lê isto e transforma em cores da interface.
  tema: {
    primaria: '#C2410C', // botões, destaques, preço
    fundo: '#1C1917', // fundo da tela
    superficie: '#FDFCFB', // cartões e áreas de conteúdo
    textoSuave: '#78716C', // textos secundários
  },

  // Marca do estúdio (o dono edita no Painel).
  // logo: endereço de uma imagem que aparece no topo do app, ou null
  //   para usar o ícone de abertura de lente + o nome em texto.
  logo: null,
  // logoComNome: true se a logo já traz o nome escrito — aí o texto
  //   do nome some do topo, pra não repetir.
  logoComNome: false,
  // icone: imagem quadrada usada como ícone do app no celular / aba do
  //   navegador. Se null, cai na logo; se as duas forem null, ícone padrão.
  icone: null,
}
