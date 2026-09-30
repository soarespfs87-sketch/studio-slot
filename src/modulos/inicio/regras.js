// ────────────────────────────────────────────────────────────────
//  Regras do Início — funções puras (regras.test.js)
// ────────────────────────────────────────────────────────────────

import { rotuloMotivo } from '../leads/regras.js'

// Mês local ('AAAA-MM') de um timestamp do banco.
const mesLocal = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Métricas do CRM no mês: novos (pela criação), fechados e perdidos (pela
// data de fechamento), conversão = fechados ÷ (fechados + perdidos).
export function metricasCRM(leads, mes) {
  const novos = leads.filter((l) => mesLocal(l.created_at) === mes).length
  const doMes = (etapa) => leads.filter((l) => l.etapa === etapa && (l.fechado_em || '').slice(0, 7) === mes)
  const fechados = doMes('fechado')
  const perdidos = doMes('perdido')
  const decididos = fechados.length + perdidos.length
  const contagem = {}
  for (const l of perdidos) {
    const chave = l.motivo_perda?.startsWith('outro') ? 'outro' : l.motivo_perda
    contagem[chave] = (contagem[chave] || 0) + 1
  }
  const [motivo] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0] || []
  return {
    novos,
    fechados: fechados.length,
    perdidos: perdidos.length,
    conversao: decididos ? (fechados.length / decididos) * 100 : null,
    valorFechado: fechados.reduce((t, l) => t + (l.valor_fechado_centavos || 0), 0),
    motivoMaisComum: motivo ? rotuloMotivo(motivo === 'outro' ? 'outro:' : motivo) : null,
  }
}

// Checklist de primeiro acesso: some quando tudo estiver feito.
export function checklist({ config, custos, equipamentos, servicos, leads }) {
  const passos = [
    { id: 'gerais', texto: 'Preencha os dados gerais (regime, seu salário, margem)', link: '#/precos/base', feito: !!config?.regime },
    { id: 'custos', texto: 'Cadastre seus custos fixos do mês', link: '#/precos/base', feito: (custos || []).some((c) => c.valor_mensal_centavos > 0) },
    { id: 'equip', texto: 'Cadastre seus equipamentos', link: '#/precos/base', feito: (equipamentos || []).length > 0 },
    { id: 'pacote', texto: 'Monte seu primeiro pacote e veja o preço mínimo', link: '#/precos/pacote/novo', feito: (servicos || []).length > 0 },
    { id: 'saldo', texto: 'Informe o saldo do negócio no Financeiro', link: '#/financeiro', feito: config?.saldo_inicial_centavos != null },
    { id: 'lead', texto: 'Cadastre seu primeiro lead', link: '#/leads/novo', feito: (leads || []).length > 0 },
  ]
  const feitos = passos.filter((p) => p.feito).length
  return { passos, feitos, total: passos.length, completo: feitos === passos.length }
}

// Campanhas que valem aparecer: em andamento, ou começando nos próximos 30 dias.
export function campanhasAtivas(servicos, hoje) {
  const em30 = new Date(hoje + 'T12:00:00')
  em30.setDate(em30.getDate() + 30)
  const limite = em30.toISOString().slice(0, 10)
  return (servicos || [])
    .filter((s) => s.tipo === 'campanha' && s.inicio && s.fim && s.fim >= hoje && s.inicio <= limite)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}
