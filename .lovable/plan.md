# Plano — Carrinho, Checkout, Pedidos do Cliente, PDV e Configurações

Vou entregar em **4 blocos**, todos nesta rodada.

---

## Bloco 1 — Carrinho + Checkout online (cliente)

**Carrinho** (estado global via Zustand + localStorage):
- Botão "Adicionar ao carrinho" com **seletor de quantidade** na vitrine (`/`) e em `/produto/$id`.
- **Ícone de carrinho** no header (badge com qtd) abrindo um Drawer lateral com itens, +/-, remover, subtotal.

**Checkout** (`/checkout`):
- Requer login (redireciona para `/auth`).
- Formulário: nome, telefone, endereço, observações (pré-preenchido do profile).
- Resumo do pedido + total.
- Botão **"Pagar com Pix"** → cria `order` + `order_items` e gera cobrança no Mercado Pago via server function (usa `mercadopago_access_token` das `store_settings`).
- Página `/checkout/sucesso/$id` mostra QR Code Pix + código copia-e-cola + polling do status.

**Webhook MP** já estava planejado: rota `src/routes/api/public/mp-webhook.ts` confirma `paid_at`, status `paid`, dá baixa no estoque.

## Bloco 2 — Meus Pedidos (cliente)

- `/meus-pedidos` (protegido): lista de pedidos do usuário, status colorido, total, data.
- `/meus-pedidos/$id`: detalhes, itens, endereço, status, QR Code se ainda pendente, botão cancelar (se `pending`).
- Link "Meus pedidos" no header quando logado.

## Bloco 3 — PDV (loja física) + Comprovantes + Gestão de vendas

**Novidades de schema** (1 migração):
- `orders.channel` enum `online | fisica` (default `online`).
- `orders.payment_method` text (`pix`, `dinheiro`, `cartao`, `outro`).
- `orders.refunded_at` timestamptz, `orders.cancel_reason` text.
- Novo status no enum `order_status`: `refunded`.

**PDV** (`/admin/pdv`):
- Busca de produtos, adiciona ao "carrinho de balcão" com quantidade.
- Campos: cliente (opcional), forma de pagamento, desconto.
- Botão "Finalizar venda" cria order com `channel='fisica'`, status `paid`, baixa estoque imediatamente.
- Após salvar, abre o **comprovante** em nova aba para imprimir.

**Comprovante** (`/comprovante/$id`):
- Layout otimizado para impressão (formato cupom, CSS `@media print`).
- Dados da loja (do `store_settings`), itens, total, forma de pagamento, cliente, data.
- Funciona para vendas online E físicas.
- Botão "Imprimir".

**Gestão em `/admin/orders`**:
- Filtro por canal (online/física), status, busca.
- Botão **Ver comprovante** (abre `/comprovante/$id`).
- Botão **Editar venda** (modal: edita cliente, observações, itens — recalcula total).
- Botão **Cancelar venda** (modal pedindo motivo, devolve estoque se já estava `paid`).
- Botão **Reembolsar** (status `refunded`, devolve estoque, registra data).

## Bloco 4 — Configurações ampliadas + Conteúdo da loja editável

**Schema** (mesma migração do Bloco 3):
- `store_settings.store_header_image` text
- `store_settings.about_hero_image` text
- `store_settings.about_gallery` text[] (imagens da loja)

**`/admin/settings`** ganha aba/seção **Aparência**:
- Upload de **imagem do header**.
- Upload de **logo** (já existe coluna, faltava UI).
- Upload de **imagem hero do "Sobre"**.
- Upload múltiplo da **galeria da loja**.
- Edição dos textos "Sobre" (`about_text1`, `about_text2`) e stats — colunas já existem, faltava UI.

**`/` (home)**: passa a renderizar a imagem do header, e uma seção "Sobre nossa loja" com os textos + galeria editáveis.

---

## Detalhes técnicos

- **Carrinho**: `src/stores/cart.ts` com Zustand `persist`. Tipos: `{ productId, name, image, price, quantity }`.
- **Mercado Pago Pix**: server function `createPixPayment` em `src/lib/payments.functions.ts`, `POST /v1/payments` com `payment_method_id: 'pix'`. Token lido de `store_settings` (não env, pois é por loja).
- **Webhook**: `/api/public/mp-webhook` valida `data.id`, busca pagamento na API MP, atualiza order por `mp_payment_id`.
- **Upload header/galeria**: reutiliza `uploadProductImage` generalizando para outros prefixos no mesmo bucket.
- **Comprovante imprimível**: rota pública leve, busca via server fn pública (somente dados não sensíveis ou exige login do dono/admin).
- **Estoque**: helpers `decrementStock(items)` / `restoreStock(items)` chamados em paid/cancel/refund.

Pronto pra construir tudo. Posso seguir?
