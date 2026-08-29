# N04 — Auditoria estrutural final

## Escopo consolidado

N04 deve permanecer como IA independente, especializada em cognição/aplicação, com agentes e capabilities próprios, usando a Soul Mesh somente como camada de interoperabilidade entre os seis núcleos.

## Verificação

- Identidade N04: ATENDIDO.
- Protocolo comum `soul-mesh/1`: ATENDIDO.
- N01–N06 como identidades válidas: ATENDIDO.
- Entrada Mesh: EXISTENTE.
- Saída Mesh: EXISTENTE.
- Descoberta de peers: EXISTENTE.
- Delegação: EXISTENTE.
- Correlação: EXISTENTE por `correlationId`.
- Negociação de transporte: EXISTENTE.
- Agentes independentes: EXISTENTE.
- Capability registry: EXISTENTE.
- Bridge entre capabilities e runtime real: EXISTENTE.
- Provider-neutral AI boundary: EXISTENTE.
- API paralela: NÃO INTRODUZIDA.
- Capacidades declaradas sem execução: devem permanecer explicitamente distinguíveis de handlers executáveis.
- HMAC: arquitetura SOUL exige HMAC + timestamp + nonce; o transporte atual de N04 ainda usa Bearer token. Não marcar HMAC como concluído sem implementação/verificação real.

## Correção de direção

O `N04MeshBootstrap` já descobre N01/N02/N03/N05/N06 por handshake e o `N04OutboundMesh` já usa o protocolo comum. Portanto, não duplicar discovery, outbound ou transporte.

O próximo endurecimento necessário é substituir a alegação implícita de segurança por um mecanismo verificável de envelope autenticado, mantendo o transporte existente. HMAC-SHA256 é viável no runtime Node através de `node:crypto`; comparação de MAC deve ser constant-time com `timingSafeEqual`.

## Estado

Estrutural: 90%.

10% pendente: endurecimento de autenticação conforme contrato final + comissionamento E2E. O segundo depende dos runtimes ativos e não deve ser falsificado por teste estático.
