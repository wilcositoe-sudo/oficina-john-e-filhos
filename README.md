# Oficina John e Filhos

Sistema web para organizar o atendimento e a operação de uma oficina mecânica: desde o registo do cliente e do veículo até ao diagnóstico, orçamento, reparação, pagamento, entrega e avaliação do serviço.

## Minimundo

O sistema representa o trabalho quotidiano de uma oficina e as relações entre clientes, veículos, funcionários, mecânicos e ordens de serviço (OS).

- **Cliente:** cria uma conta, regista veículos, pede orçamentos ou agendamentos, acompanha as suas OS, comunica com a oficina, paga e avalia o serviço.
- **Funcionário:** gere o atendimento, consulta pedidos, cria e acompanha OS, prepara orçamentos e coordena as etapas do serviço.
- **Mecânico:** consulta as OS que lhe foram atribuídas, regista diagnóstico, checklist e evidências, e atualiza o progresso da reparação.
- **Administrador:** gere contas e permissões, acompanha relatórios e modera avaliações.

Um fluxo típico de uma OS é:

1. O pedido do cliente ou o atendimento dá origem a uma ordem associada ao cliente e ao seu veículo.
2. A oficina atribui o diagnóstico; o mecânico regista o que encontrou.
3. O funcionário prepara o orçamento e o cliente aprova, rejeita ou pede uma revisão.
4. Após a aprovação, a OS é atribuída para reparação. O mecânico pode registar checklist, evidências e necessidades adicionais.
5. A reparação é concluída, o pagamento é confirmado, o veículo é entregue e o cliente pode avaliar o serviço.

O sistema também inclui CRUD de serviços e peças, gestão de agendamentos, chatbot e caixa de conversas, fotografia de perfil, avaliações associadas ao nome do cliente e relatórios administrativos com indicadores de equipa, clientes e stock. Os pagamentos podem ser simulados com M-Pesa, e-Mola, mKesh ou transferência bancária.

### Relatórios, pagamentos e mapa

Na administração, os relatórios podem ser consultados por período e separados em gestão geral, financeiro, funcionários e operação. O relatório financeiro mostra apenas pagamentos confirmados e respetivos métodos; como o sistema ainda não regista despesas, não calcula lucro. Cada relatório pode ser impresso ou guardado em PDF pelo navegador.

Os pagamentos por M-Pesa, e-Mola, mKesh e conta bancária são simulações: não existe ligação a APIs bancárias nem débito real. Na escolha de entrega ao domicílio, o cliente informa o endereço e pode, com autorização do navegador, guardar coordenadas para a equipa consultar no mapa.

A aba **Mapa** usa OpenStreetMap. O cliente pode autorizar a localização do seu próprio dispositivo para acompanhar a posição durante a sessão e abrir uma rota até à oficina. Funcionários consultam endereços de recolha partilhados no atendimento e entregas associadas às OS. A posição do dispositivo não é transmitida nem persistida no servidor. O marcador da oficina aponta atualmente para o Mercado Municipal de Moatize como referência aproximada, conforme indicado pela oficina; deve ser atualizado para o portão/local exato quando as coordenadas estiverem disponíveis. A morada e as coordenadas estão configuradas em `apps/web/src/lib/oficina.js` e `api/src/modules/chatbot/domain/oficina-config.js`.

## Arquitetura

O backend é organizado por **módulos de negócio**. Cada módulo mantém, tanto quanto possível, as suas rotas HTTP, casos de uso, ports e adapters. O frontend React consome a API HTTP versionada (`/api/v1`).

```text
apps/web (React)
      │ HTTP / JSON
      ▼
api/src/app.js (Express, rotas e tratamento de erros)
      │
      ▼
api/src/composition-root.js
      │ liga rotas, casos de uso e implementações
      ├── módulos de negócio
      │     ├── http/       entrada e validação/encaminhamento HTTP
      │     ├── use-cases/  operações e regras da aplicação
      │     ├── domain/     regras e conceitos do domínio
      │     ├── ports/      contratos esperados pelas operações
      │     └── adapters/   PostgreSQL e integrações externas
      ▼
PostgreSQL e serviços substituíveis
```

### DDD e separação de responsabilidades

A organização segue princípios de **Domain-Driven Design (DDD)** de forma pragmática:

- Os módulos representam capacidades do negócio, como `work-orders`, `auth`, `payments`, `appointments`, `vehicles` e `catalog`.
- Os casos de uso expressam operações do negócio — por exemplo, `criar-os`, `escolher-entrega` e `confirmar-recuperacao` — sem colocar essas decisões diretamente nas rotas Express.
- Regras que devem permanecer consistentes, como as transições de estado da OS, ficam no domínio e são verificadas pelos casos de uso e repositórios.
- Ports descrevem as dependências necessárias; adapters concretos implementam essas dependências usando PostgreSQL, bcrypt ou um fornecedor de pagamento.
- O [composition-root.js](./api/src/composition-root.js) liga as peças da aplicação num ponto explícito, reduzindo dependências construídas dentro das rotas.

Isto é uma aplicação modular inspirada em DDD e arquitetura hexagonal, não uma implementação completa de todos os padrões táticos de DDD: por exemplo, as entidades e operações de persistência ainda usam bastante dados simples e SQL nos adapters.

### DRY e reutilização

O princípio **DRY (Don't Repeat Yourself)** é aplicado onde uma regra ou comportamento é partilhado: módulos comuns, factories de casos de uso, middleware de autenticação/autorização, erros de domínio consistentes, adapters de repositório e componentes reutilizáveis no frontend. A composição central também evita que cada rota volte a criar as suas dependências.

DRY não significa eliminar toda a repetição. Regras diferentes de cada módulo continuam explícitas, em vez de serem escondidas numa abstração genérica difícil de manter.

## Padrões e técnicas aplicados

Os nomes abaixo descrevem o que o código realmente faz; nem toda a técnica corresponde a um padrão GoF formal.

### Criacionais

| Padrão/técnica | Onde e como é usado | Vantagem e limite |
|---|---|---|
| **Factory functions** | Funções como `criarLogin`, `criarCriarOS` e `createPaymentsDependencies` constroem casos de uso e dependências com os adapters recebidos. As composições dos módulos são reunidas no [composition-root.js](./api/src/composition-root.js). | Centraliza a construção e facilita injetar doubles nos testes. São factories simples; não existe uma hierarquia de Abstract Factory. |
| **Builder** | **Não está implementado como padrão no projeto.** As funções de composição recebem dependências e devolvem objetos prontos, sem uma API fluente de etapas (`builder.set...().build()`). | Evita introduzir complexidade onde a construção atual é direta. Se a configuração dos módulos crescer muito, um Builder pode ser avaliado, mas não é necessário hoje. |

### Estruturais

| Padrão/técnica | Onde e como é usado | Vantagem e limite |
|---|---|---|
| **Adapter** | Adapters PostgreSQL como [pg-os-repository.js](./api/src/modules/work-orders/adapters/pg-os-repository.js) traduzem operações dos ports para consultas e convertem resultados para dados usados pelos casos de uso. [bcrypt-password-hasher.js](./api/src/modules/auth/adapters/bcrypt-password-hasher.js) adapta bcrypt ao contrato de hashing. [fake-payment-provider.js](./api/src/modules/payments/adapters/fake-payment-provider.js) implementa o contrato do fornecedor de pagamentos. | Isola detalhes de infraestrutura e permite substituir implementações. O fornecedor de pagamentos atualmente ligado é fake; trocar o adapter não elimina o trabalho de integrar e validar o protocolo real. |
| **Repository** (padrão de arquitetura) | Ports como [OsRepository](./api/src/modules/work-orders/ports/os-repository.js) descrevem operações de persistência; adapters como [pg-os-repository.js](./api/src/modules/work-orders/adapters/pg-os-repository.js) as implementam. | Evita espalhar SQL pelos casos de uso e permite testar regras com repositórios de teste. Alguns adapters ainda concentram consultas e operações extensas, pelo que a separação não remove toda a complexidade de persistência. |
| **Injeção de dependências / composição** | A raiz e as composições dos módulos passam repositórios, hashers, casos de uso e middleware aos routers. | Deixa explícitas as dependências e torna a troca por doubles mais simples. A composição precisa ser atualizada quando novos módulos ou dependências são adicionados. |

### Comportamentais

| Padrão/técnica | Onde e como é usado | Vantagem e limite |
|---|---|---|
| **Máquina de estados** | [estados.js](./api/src/modules/work-orders/domain/estados.js) declara estados, ações e transições permitidas da OS. Casos de uso e operações condicionais do repositório impedem transições inválidas ou baseadas num estado desatualizado. | Torna o fluxo explícito e ajuda a proteger regras de negócio. É uma tabela de transições, não uma implementação GoF com uma classe por estado; novas regras ainda exigem atualizar a tabela e os casos de uso relevantes. |
| **Strategy (ponto de substituição)** | Os casos de uso de pagamentos recebem um `provider` que cumpre o contrato [PaymentProvider](./api/src/modules/payments/ports/payment-provider.js); a composição atual injeta o fake. | Permite integrar outro fornecedor sem acoplar o caso de uso ao SDK desse fornecedor. Ainda não há seleção dinâmica entre estratégias nem integração real ativa. |
| **Middleware / cadeia de processamento HTTP** | Routers Express compõem autenticação, autorização por perfil e tratamento assíncrono antes da operação. | Mantém preocupações transversais fora das regras do caso de uso. A ordem dos middlewares é importante e deve ser preservada nos endpoints. |

O projeto **não usa Observer/WebSockets** para atualização das conversas: a interface consulta mensagens periodicamente (polling). Também não se deve confundir essa atualização com um mecanismo de eventos de domínio.

## Estrutura principal

```text
api/
  migrations/       migrações SQL do PostgreSQL
  src/
    modules/        módulos de negócio e respetivas camadas
    shared/         infraestrutura e conceitos partilhados
    app.js          configuração HTTP
    composition-root.js
  tests/            testes automatizados da API
apps/
  web/              aplicação React/Vite
```

## Tecnologias

- **Frontend:** React e Vite.
- **Backend:** Node.js (versão 22 ou superior) e Express.
- **Persistência:** PostgreSQL (`pg`).
- **Testes da API:** runner nativo `node:test`.
- **Autenticação:** sessões por token e palavras-passe com bcrypt.

## Executar localmente

Pré-requisitos: Node.js 22 ou superior e PostgreSQL. Na raiz do projeto:

```bash
npm install
```

Crie uma base de dados PostgreSQL e configure um ficheiro `.env` na raiz (não o adicione ao Git):

```dotenv
DATABASE_URL=postgresql://utilizador:senha@localhost:5432/oficina_john_filhos
PORT=3000
WEB_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Execute as migrações:

```bash
npm run db:migrate --workspace=api
```

Inicie API e frontend em **terminais separados**:

```bash
npm run dev --workspace=api
```

```bash
npm run dev --workspace=apps/web
```

Por omissão, a API fica em `http://localhost:3000` e o Vite em `http://localhost:5173`. O frontend aceita `VITE_API_URL` para apontar a API para outro endereço; sem essa variável, usa `http://localhost:3000/api/v1`.

## Testes e verificações

```bash
npm test --workspace=api
npm run build --workspace=apps/web
npm run lint --workspace=apps/web
```

## Limitações e evolução

- O adapter de pagamentos atual é **simulado**; falta integração com um fornecedor real, incluindo credenciais, callbacks assinados e validação operacional.
- As fotografias de perfil são gravadas no diretório `UPLOAD_ROOT` (por omissão, `api/uploads`). Em produção, esse caminho precisa de armazenamento persistente partilhado entre instâncias da API.
- Serviços e peças podem ser removidos definitivamente pela gestão do catálogo. Se já estiverem associados a orçamentos ou OS, as linhas históricas e os valores guardados permanecem; apenas a referência ao item do catálogo fica vazia.
- O chat apresenta numa caixa de entrada as conversas do assistente e das OS, com contadores de não lidas. Mensagens de progresso da OS são guardadas como mensagens de sistema; ocultar uma conversa remove-a apenas da lista do utilizador atual, sem apagar o histórico do outro participante.
- Conversas explicitamente marcadas como **sem diagnóstico** expiram 24 horas depois da última mensagem. Conversas com diagnóstico e conversas associadas a OS ficam guardadas até cada participante as remover da sua própria lista.
- A atualização de mensagens usa **polling**, não entrega instantânea baseada em WebSocket ou Server-Sent Events.
- A recuperação de palavra-passe ainda precisa de um serviço de e-mail para produção; o fluxo de token de teste é apenas para desenvolvimento.
- A exportação de relatórios e comprovativos usa a impressão do navegador para guardar em PDF; os documentos identificam-se como gerenciais/internos e não substituem documentos fiscais.
- Os testes automatizados cobrem regras e contratos selecionados, mas não substituem uma validação integrada com PostgreSQL e uma verificação visual dos fluxos completos.
- A cena 3D de autenticação é carregada sob demanda, mas o respetivo bundle ainda é grande e pode ser otimizado.

Estas limitações ajudam a distinguir o que já existe no código do que ainda precisa de integração ou validação antes de uma utilização operacional em produção.