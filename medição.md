# Dossiê de Reinício — Projeto **Medição de Rotas**

> Objetivo: este arquivo concentra os parâmetros, decisões e detalhes já implementados para reiniciar o projeto do zero sem perder contexto.

---

## 1) Identidade do projeto

- **Nome funcional:** Medição de Rotas.
- **Propósito:** registrar viagens de motoristas por folha mensal, permitir aprovação por gestor e exportar medição/faturamento em Excel.
- **Perfis de usuário:**
  - `gestor`
  - `motorista`

---

## 2) Stack técnica consolidada

### Frontend
- React 18 + Vite 5.
- PWA com `vite-plugin-pwa` (modo standalone, auto-update).
- Persistência offline local via IndexedDB (`idb`).

### Backend
- Node.js + Express 4.
- Banco SQLite com `better-sqlite3`.
- Autenticação JWT (`jsonwebtoken`) + hash de senha (`bcryptjs`).
- Exportação Excel com `exceljs`.

### Banco de dados
- SQLite arquivo local: `backend/medicao.db`.
- `PRAGMA journal_mode = WAL` habilitado.

---

## 3) Estrutura de diretórios (alto nível)

- `frontend/` → aplicação React (interface gestor/motorista, PWA e fluxo offline).
- `backend/` → API, autenticação, regras de negócio e exportação Excel.
- `INSTALAR.md` → guia de instalação e operação inicial.

---

## 4) Parâmetros de execução

### Backend
- Porta padrão: **3001** (`PORT` opcional por ambiente).
- Inicialização: `node src/index.js`.
- Variável de ambiente relevante:
  - `JWT_SECRET` (se ausente, cai no padrão `medicao-secret-mvp`).

### Frontend
- Dev server Vite padrão: **5173**.
- Proxy de API no desenvolvimento:
  - `/api` → `http://localhost:3001`.
- Comandos:
  - `npm run dev`
  - `npm run build`
  - `npm run preview`

---

## 5) Modelo de dados (estado implementado)

## Tabela `usuarios`
- `id` (PK)
- `nome`
- `email` (único)
- `senha` (hash bcrypt)
- `perfil` (`motorista` | `gestor`)
- `criado_em`

## Tabela `contratos`
- `id` (PK)
- `nome`
- `cliente`
- `ativo` (default 1)
- `criado_em`

## Tabela `veiculos`
- `id` (PK)
- `placa` (única)
- `descricao`
- `ativo` (default 1)

## Tabela `folhas`
- `id` (PK)
- `mes`
- `ano`
- `contrato_id` (FK)
- `veiculo_id` (FK)
- `rota`
- `criado_em`

## Tabela `registros`
- `id` (PK)
- `uuid` (único) → usado para sincronização offline
- `folha_id` (FK)
- `motorista_id` (FK)
- `data`
- `tipo_turno` (`RI` | `TE` | `NULL`)
- `finalidade`
- `horario_saida`
- `horario_chegada`
- `km_inicial`
- `km_final`
- `km_rodado` (campo virtual: `km_final - km_inicial`)
- `abastecimento`
- `substituto_id` (FK opcional)
- `observacao`
- `aprovado` (default 0)
- `criado_em`
- `sincronizado_em`

---

## 6) Regras de negócio já implementadas

1. **Login por JWT** com validade de 30 dias.
2. **Controle de acesso por perfil**:
   - rotas protegidas por token;
   - ações de aprovação e setup restritas ao gestor.
3. **Folha mensal única** por combinação:
   - `mes + ano + contrato_id + veiculo_id`.
4. **Registro offline-first** (motorista):
   - tenta enviar online;
   - se falhar/offline, salva em fila local IndexedDB.
5. **Sincronização automática**:
   - ao entrar online;
   - em intervalo periódico (30s);
   - via endpoint de sync em lote (`/registros/sync`).
6. **Aprovação de registro** feita pelo gestor (`aprovado = 1`).
7. **Exportação Excel de faturamento** por folha:
   - com cabeçalho de contrato/cliente/veículo/rota;
   - total de KM;
   - total de horas calculado por diferença saída/chegada;
   - destaque visual para turno `TE`.

---

## 7) Fluxo funcional por perfil

### Motorista
1. Faz login.
2. Seleciona uma folha existente ou cria uma nova (com contrato, veículo, mês/ano e rota).
3. Registra viagem diária (horários, KM, finalidade, turno e extras opcionais).
4. Se sem internet, o registro entra em fila pendente.
5. Ao reconectar, o app sincroniza automaticamente.

### Gestor
1. Faz login.
2. Filtra folhas por mês/ano.
3. Abre folha para ver registros.
4. Aprova pendências de registros.
5. Baixa Excel de faturamento da folha.

---

## 8) Contratos de API (snapshot)

Base: `/api`

### Auth
- `POST /auth/login`
- `POST /auth/registrar`

### Dados de apoio
- `GET /contratos`
- `POST /contratos` (gestor)
- `GET /veiculos`
- `POST /veiculos` (gestor)
- `GET /motoristas`

### Folhas
- `GET /folhas?mes=&ano=`
- `POST /folhas`

### Registros
- `GET /registros?folha_id=&data=&motorista_id=`
- `POST /registros/sync` (sincronização em lote)
- `PATCH /registros/:id/aprovar` (gestor)

### Exportação
- `GET /export/faturamento/:folha_id` (gestor)

### Saúde
- `GET /api/health` → `{ ok: true }`

---

## 9) Offline/PWA (estado atual)

- IndexedDB `medicao-offline` com stores:
  - `fila_sync` (key `uuid`, índice `por_folha`)
  - `cache` (dados auxiliares)
- Estratégia de cache Workbox:
  - `NetworkFirst` para `/api` (exceto `/api/export`).
- Manifest PWA:
  - nome: `Medição de Rotas`
  - tema: `#1D9E75`
  - ícones: `icon-192.png` e `icon-512.png`

---

## 10) Seeds e setup inicial disponíveis

Arquivo: `backend/setup.js`

Dados pré-configurados no setup:
- Usuário gestor padrão.
- 3 usuários motoristas padrão.
- 1 contrato inicial (`Bayer Abril`).
- 1 veículo inicial (`PEF7B61`).

> Observação: o setup foi desenhado para execução inicial e aceita reexecução, ignorando itens já existentes quando houver conflito.

---

## 11) Segurança e pontos de atenção para o reinício

1. Endpoint `POST /auth/registrar` está aberto e marcado no código como "setup inicial" (deve ser protegido no hardening).
2. `JWT_SECRET` tem fallback fixo no código (ideal exigir obrigatório em produção).
3. Banco SQLite local funciona para MVP; para escala maior, avaliar migração (PostgreSQL etc.).
4. Não há suíte formal de testes automatizados no snapshot atual.

---

## 12) Checklist para reconstrução sem falhas

1. Subir backend e frontend nas portas padrão (3001/5173).
2. Criar usuários/perfis e dados-base (contratos/veículos).
3. Confirmar criação/seleção de folha no frontend motorista.
4. Registrar viagem online e offline.
5. Validar sincronização automática dos pendentes.
6. Validar aprovação do gestor.
7. Validar exportação de Excel por folha.
8. Validar healthcheck `/api/health`.

---

## 13) Critério de "mesmo ponto"

Considerar que chegamos ao mesmo ponto atual quando:
- login por perfil funciona;
- motorista registra e sincroniza (inclusive offline);
- gestor visualiza/aprova;
- Excel de faturamento é gerado com totais;
- dados persistem no SQLite com estrutura acima.

---

## 14) Arquivos-fonte de referência rápida

- Backend entrypoint: `backend/src/index.js`
- Rotas auth: `backend/src/routes/auth.js`
- Rotas dados: `backend/src/routes/dados.js`
- Exportação Excel: `backend/src/routes/excel.js`
- Banco/schema: `backend/src/models/db.js`
- Setup seed: `backend/setup.js`
- App principal frontend: `frontend/src/App.jsx`
- Painel gestor: `frontend/src/pages/Gestor.jsx`
- App motorista: `frontend/src/pages/Motorista.jsx`
- Criação de registro: `frontend/src/components/NovoRegistro.jsx`
- Seleção/criação de folha: `frontend/src/components/SelecionarFolha.jsx`
- Camada API frontend: `frontend/src/utils/api.js`
- Offline IndexedDB: `frontend/src/utils/offline.js`
- Sync automático: `frontend/src/hooks/useSyncOffline.js`
- Instruções operacionais: `INSTALAR.md`

---

## 15) Recomendação de uso deste dossiê

Ao iniciar o novo projeto:
1. usar este arquivo como contrato funcional e técnico;
2. reproduzir primeiro o **modelo de dados** e **contratos de API**;
3. implementar os dois fluxos (motorista/gestor);
4. só então otimizar UX/escala.

Assim, o recomeço mantém paridade com o sistema atual e reduz risco de regressão funcional.
