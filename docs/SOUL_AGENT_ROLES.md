# N04 — agentes e responsabilidades locais

Os agentes abaixo são registrados por `Nucleus04MeshRuntime.ts`.

| Agente | Responsabilidade |
|---|---|
| N04-pilot-agent | Operar o AI Pilot/conversação local, selecionar modelo permitido e gerar texto. |
| N04-tool-agent | Executar ferramentas/documentos/artefatos autorizados, respeitando contexto de sessão quando exigido. |
| N04-orchestration-agent | Manter contexto-orchestration e enviar mensagens Mesh para peers válidos; não vira roteador N07. |
| N04-mesh-agent | Handshake, ping, descrição do N04 e saúde básica do canal Mesh. |

**Não pertence ao N04:** inferência central N05, cognição N06, percepção N03 ou governança/orquestração federada N07.
