# FASE 0 — N04 TOOLS / CAPABILITIES

## B1 — Identidade
Primário: tools, chatbot, artefatos e documentos.
Secundários: streaming, context orchestration, Mesh e capability compatibility.
Papel octacore: processador de ferramentas/documentos que expande percepção, conversa, contexto e orquestração.

## B2 — Processadores
| Componente | Path | Responsabilidade | Estado |
|---|---|---|---|
| Nucleus04Processor | lib/soul-core/Nucleus04Processor.ts | processamento de requests/tools | ativo |
| Nucleus04Runtime | lib/soul-core/Nucleus04Runtime.ts | runtime do núcleo | ativo |
| Nucleus04ToolRegistry | lib/soul-core/Nucleus04ToolRegistry.ts | registro de ferramentas | ativo |
| Soul Mesh endpoint | lib/soul-mesh/endpoint.ts + app/api/soul-mesh/route.ts | boundary HTTP Mesh | ativo |
| N04PeerAdapter | lib/soul-mesh/N04PeerAdapter.ts | chamadas aos peers | ativo quando configurado |
| N04PeerDiscovery | lib/soul-mesh/N04PeerDiscovery.ts | handshake/discovery | ativo quando configurado |

## B3 — Endpoints
| Método | Path/capability | Estado |
|---|---|---|
| POST | /api/soul-mesh | LIVE quando deploy/auth válidos |
| request | mesh.ping / mesh.health / core.health | EXECUTABLE |
| request | mesh.describe | EXECUTABLE |

## B4 — Funções públicas
| Módulo | Função | Assinatura resumida | Consumidores |
|---|---|---|---|
| endpoint | validateMeshMessage | (message) => asserts | route/runtime |
| endpoint | createN04MeshHandler | (context?) => handler | route/tests |
| N04PeerAdapter | createN04Request | (target, capability, payload) | outbound |
| N04PeerAdapter | sendFromN04 | (...) => Promise | Mesh |
| N04PeerDiscovery | handshake | (nucleus, baseUrl) => Promise | commissioning |

## B5 — Eventos
A fronteira primária é Soul Mesh request/response/event. Lista fechada de eventos internos não foi enumerada pela interface do conector: PENDING.

## B6 — Eventos escutados
Inbound Mesh é processado por app/api/soul-mesh/route.ts → createN04MeshHandler → Nucleus04Runtime. Eventos internos adicionais: PENDING.

## B7 — Externos
Next.js/Vercel, Postgres/Drizzle, Vercel Blob, OpenTelemetry, AI SDK/XAI e Redis opcional.

## B8 — Inter-núcleo
N01, N02, N03, N05, N06 e N07 via HTTP Soul Mesh 1.1.0. SARA permanece boundary externo quando usado.

## B9 — Ferramentas adormecidas
| Ferramenta | Precisa de | Estado |
|---|---|---|
| peer calls | SOUL_MESH_N0X_URL + auth | BLOCKED_ENV |
| contextual tools | sessão de usuário válida | BLOCKED_ENV/CONTEXT |
| SARA paths | URL/token | BLOCKED_ENV |
| Clareira federada | N01 + Mesh URL/auth | BLOCKED_ENV |

## B10 — Executáveis
Nucleus04 runtime, native health, mesh.describe e capabilities aceitas pelo processor são executáveis localmente quando as dependências obrigatórias existem.

## B11 — Expansão por conexão
| Ao conectar | Ganha | Perde | Neutro |
|---|---|---|---|
| N03 | percepção → tools | nenhuma autoridade | Mesh |
| N02 | conversa → execução | nenhuma | UI |
| N05 | inference dispatch → tools | nenhuma | ownership |
| N06 | contexto → execução contextual | nenhuma | tools |
| N07 | orchestration → tools | nenhuma | runtime local |
| N01 | Mesh/runtime/Clareira | nenhuma | tool ownership |
| SARA | audit/regeneration | nenhuma | documents |

Inventário recursivo completo de todos exports continua PENDING enquanto a árvore integral/checkout não estiver disponível no conector.
