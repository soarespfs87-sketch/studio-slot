// Vagas vendidas (leads fechados) e recebido (entradas pagas) por pacote/campanha.
export function calcularVendas(leads, lancamentos) {
  const v = {}
  const de = (id) => (v[id] ||= { vendidas: 0, faturado: 0, investimentoLancado: false })
  for (const l of leads || []) if (l.etapa === 'fechado' && l.servico_id) de(l.servico_id).vendidas++
  for (const x of lancamentos || []) {
    if (!x.servico_id) continue
    if (x.grupo === 'receita_op' && x.status === 'pago') de(x.servico_id).faturado += x.valor_centavos
    if (x.grupo === 'despesa_nao_op' && x.categoria === 'Investimento') de(x.servico_id).investimentoLancado = true
  }
  return v
}
