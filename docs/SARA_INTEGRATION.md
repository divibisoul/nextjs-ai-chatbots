# N04 ↔ SARA

## Configuração server-side

- SARA_ENABLE_CHAT=true
- SARA_BASE_URL=https://<sara-host>
- SARA_API_TOKEN=<segredo>

O token nunca deve ser enviado ao cliente browser nem commitado.

## Fluxo

1. usuário envia mensagem;
2. N04 autentica e persiste a mensagem como hoje;
3. quando SARA_ENABLE_CHAT=true, N04 envia o texto ao `POST /v1/cycle`;
4. N04 valida a resposta HTTP e a presença de cycle_id/final_state;
5. o estado regenerado é anexado ao contexto do modelo;
6. o streaming nativo N04 permanece responsável pela UX.

Além do ciclo já usado pelo chat, o cliente server-side do N04 agora expõe, de forma aditiva, `sara.health`, `sara.capabilities`, `sara.state`, `sara.audit`, `sara.regenerate` e `sara.trace`. Essas operações permitem usar a mesma camada regenerativa para auditoria, governança, estado e rastreabilidade sem transferir para N04 a propriedade das funções do SARA.

## Falhas

SARA ausente com integração habilitada => 503.
SARA configurado mas indisponível/inválido => 502.
Nenhuma resposta regenerada é inventada.

### Clareira frontier
Este núcleo pode consultar, de forma somente leitura, a operação SARA `sara.clareira.audit` (`GET /v1/clareira/audit`). O resultado é evidência derivada do fluxo ERU → MMD → RGO → Tríade → Clareira; não concede autoridade para mutar outro núcleo.

