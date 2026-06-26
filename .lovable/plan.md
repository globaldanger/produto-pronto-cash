# Plano — Conteúdo do site, Busca, Papéis, Backup e Comprovante editável

Tudo em uma rodada, dividido em 5 blocos.

---

## Bloco 1 — CMS "Conteúdo do site" no admin

Nova seção lateral **Conteúdo** com 4 abas, separada de Configurações (que fica só pra dados da loja + pagamento).

**Schema** (1 migração — adiciona colunas em `store_settings`):
- Home: `home_hero_title`, `home_hero_subtitle`, `home_hero_cta`, `home_banners` (jsonb[] com `{image, title, link}`).
- Sobre: já existem (`about_text1/2`, `about_hero_image`, `about_gallery`) — só ganha UI melhor.
- Produto: `product_page_shipping_text`, `product_page_warranty_text`, `product_page_extra_info` (textos que aparecem em todo produto).
- FAQ: `faq` (jsonb com `[{question, answer}]`).
- Rodapé: `footer_text`, `footer_links` (jsonb), `footer_payment_methods` (texto).
- Comprovante: `receipt_header_text`, `receipt_footer_text`, `receipt_show_logo` (bool).

**UI** (`/admin/content`):
- Tabs: Home / Sobre / Produto / FAQ / Rodapé.
- Editor de banners e FAQ com adicionar/remover/reordenar.
- Reuso de `uploadImage` pra tudo que é imagem.

**Vitrine** (`/`, `/produto/$id`) passa a ler esses campos. Footer global novo em `StoreHeader` ou novo `StoreFooter`.

## Bloco 2 — Busca (lupa)

- **Site (cliente)**: input de busca no `StoreHeader` (ícone lupa que abre overlay). Filtra produtos por nome/descrição/categoria. Mobile-friendly.
- **Admin**: lupa global no topo do layout admin (`admin.tsx`) que busca em produtos, pedidos (id, cliente, telefone) e categorias — resultado como dropdown com link direto.
- Implementação client-side com `ilike` no Supabase (debounced 300ms).

## Bloco 3 — Papéis e permissões

**Schema**:
- Adicionar `'funcionario'` ao enum `app_role`.

**Permissões** (resolvidas por helper `canAccess(role, section)` no front + checagem em RLS de tabelas sensíveis):
- **admin**: tudo.
- **funcionario**: Dashboard básico, **Produtos** (CRUD), **Categorias** (CRUD), **PDV**, **Pedidos** (ver e atualizar status) — bloqueado: Financeiro, Configurações, Conteúdo, Cancelar/Reembolsar, gestão de usuários.
- **cliente**: só loja + meus pedidos.

**Gestão de usuários** (`/admin/users`, só admin):
- Lista usuários com papel atual.
- Botões pra trocar papel: cliente ↔ funcionario ↔ admin.
- Server function `setUserRole` protegida (verifica `has_role(admin)`).

**Atualizar RLS** das tabelas `products`, `categories`, `orders` para aceitar `funcionario` onde faz sentido. `expenses` e `store_settings` permanecem só admin.

## Bloco 4 — Export / Import / Backup

**Nova seção `/admin/backup`** (só admin):

**Export CSV** (botões por entidade):
- Produtos, Pedidos, Despesas, Categorias — gerados client-side com `papaparse` a partir das queries.

**Import CSV de produtos**:
- Upload, preview da tabela, validação (nome/preço/estoque obrigatórios), confirma → bulk insert via server fn.

**Backup completo (JSON)**:
- Botão "Baixar backup" → server fn `exportBackup` agrega todas as tabelas (sem auth.users) e devolve JSON pra download.
- Botão "Restaurar backup" → upload de JSON, confirma com modal de aviso, server fn `importBackup` faz upsert.
- Ambas exigem `has_role(admin)`.

## Bloco 5 — Comprovante editável

**Personalização global** (já no Bloco 1 — campos `receipt_*` nas configs).

**Revisar antes de finalizar venda no PDV**:
- No `/admin/pdv`, antes do "Finalizar venda" abre **modal de revisão**:
  - Lista de itens com edição inline de **quantidade, preço unitário, desconto por item**.
  - Desconto geral, observações livres, escolha do método de pagamento.
  - Pré-visualização do comprovante (renderiza `/comprovante/$id` mock em iframe ou render inline).
  - "Confirmar e finalizar" → cria order com os ajustes.

**Editar comprovante de venda já feita** (admin):
- Em `/admin/orders`, botão "Editar comprovante" abre o mesmo editor → atualiza order/items, recalcula totais, devolve estoque dos itens removidos e debita dos adicionados.

---

## Detalhes técnicos

- Helper `src/lib/permissions.ts` com `usePermissions()` (lê role do user e expõe `can('products.edit')`, etc).
- Sidebar do `/admin` filtra links por permissão.
- Layout admin (`admin.tsx`) verifica `admin|funcionario` em vez de só `admin`.
- Server fns novas em `src/lib/admin.functions.ts`: `setUserRole`, `exportBackup`, `importBackup`, `bulkImportProducts`, `updateOrderItems`.
- CSV via `papaparse` (já leve, ~40kb).
- Busca: hook `useProductSearch(q)` com `useQuery` + `ilike`.

Pronto pra construir tudo. Posso seguir?
