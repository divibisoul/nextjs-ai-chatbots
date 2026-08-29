# Soul AI Mesh — Diretriz Arquitetural Cooperativa

## Status
Diretriz somativa do N4. Não cancela, remove ou invalida implementações anteriores.

## Princípio
N01–N06 são seis IAs independentes. Cada núcleo mantém seus próprios agentes e capacidades. A Soul Mesh é a camada comum de comunicação cooperativa entre elas.

A Mesh deve permitir que os núcleos:
- descubram outros núcleos;
- solicitem trabalho;
- executem capacidades locais;
- respondam resultados;
- deleguem tarefas a outro núcleo quando apropriado;
- mantenham `correlationId` entre solicitação e resposta.

## Sem API paralela
A comunicação entre IAs deve usar a Soul Mesh existente. Não criar uma segunda arquitetura de API para substituir a Mesh. Endpoints HTTP existentes podem funcionar como transporte/gateway da Mesh, preservando compatibilidade.

## Contrato mínimo de cada núcleo
Cada N01–N06 deve possuir, ou ser conectado progressivamente a:
1. entrada Mesh;
2. identidade do núcleo;
3. agentes/capacidades executáveis;
4. saída Mesh;
5. resposta correlacionada;
6. descoberta de peers;
7. delegação de trabalho;
8. correlação ponta a ponta.

## Modelo cooperativo
`N1 → N2 → N3 → N4 → N6 → N1` é um exemplo de fluxo cooperativo, não uma sequência fixa. Qualquer núcleo pode solicitar ou responder trabalho conforme as capacidades descobertas.

## Regra de evolução
Auditar o código existente antes de adicionar mecanismos. Reutilizar e conectar implementações reais sempre que existirem. Falhas encontradas devem ser corrigidas ou transformadas em adaptações explícitas, sem apagar funcionalidades existentes.

## Aplicação ao N4
Esta diretriz é adicional ao fechamento estrutural do N4: handlers, Worker Pool, cache, K6, registro, resiliência, CI e documentação continuam válidos. O N4 deve expor suas capacidades como serviços de uma IA independente e consumi-las pela Soul Mesh.

## Próxima referência arquitetural
O circuito N01↔N02 deve ser auditado como primeiro circuito IA↔IA. O padrão resultante deve orientar a integração posterior de N03, N04, N05 e N06, sem modificar outros núcleos durante o trabalho exclusivo no N4.
