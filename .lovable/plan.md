
# Plano — SmartCell na Lovable

Vou portar os três HTMLs (Index/Loja, Admin, Login) para rotas React mantendo o visual preto + dourado, e ligar tudo no Lovable Cloud (banco + auth + storage). Pagamento será **Pix via Mercado Pago** (geração de QR Code + webhook que confirma o pedido).

Como o escopo é grande, vou entregar em **4 etapas**, e cada etapa será um build verificável antes de seguir.

---

## Etapa 1 — Fundação (esta entrega)

1. Ativar **Lovable Cloud** (banco PostgreSQL + auth + storage de imagens).
2. Criar o **design system** (preto `#000`, dourado `#D4AF37`, accent `#B8860B`, fonte Inter) no `src/styles.css`.
3. Criar schema do banco:
   - `profiles` (id, nome, telefone, role) ligado a `auth.users`
   - `user_roles` (admin/cliente) — tabela separada por segurança
   - `categories` (id, nome, slug, icon)
   - `products` (id, nome, descrição, preço, estoque, categoria, destaque, ativo, imagens[])
   - `orders` (id, user_id, total, status: pending/paid/cancelled, mp_payment_id, pix_qr_code, pix_copia_cola)
   - `order_items` (order_id, product_id, qty, price)
   - RLS em todas as tabelas + GRANTs corretos
   - Bucket público `product-images` no Storage
4. Rotas mínimas funcionando:
   - `/` — Loja (vitrine de produtos do banco)
   - `/auth` — Login/cadastro (email+senha, com Google opcional na etapa 3)
   - `/_authenticated/admin` — Painel (gate por role `admin`)
   - `/produto/$id` — Detalhe do produto

## Etapa 2 — Admin completo

- CRUD de categorias e produtos com **upload de múltiplas imagens** (Lovable Storage).
- Listagem de pedidos com status Pix.
- Dashboard com totais (vendas, pedidos pendentes, produtos).

## Etapa 3 — Loja + carrinho + checkout Pix

- Carrinho (persistido em `localStorage` para visitantes, mesclado ao logar).
- Página de checkout → cria pedido `pending` → chama edge route → gera Pix no Mercado Pago.
- Tela mostra QR Code + Pix copia-e-cola + status (polling).
- Área do cliente: `/_authenticated/meus-pedidos`.

## Etapa 4 — Webhook Mercado Pago

- Rota pública `/api/public/mp-webhook` valida assinatura, consulta pagamento, marca pedido como `paid`, baixa estoque.
- Você vai precisar fornecer 2 secrets quando chegarmos lá: `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` (te explico onde pegar).

---

## Detalhes técnicos

- Stack: TanStack Start + React + Tailwind v4 + shadcn + Lovable Cloud (Supabase por baixo).
- Roles: tabela `user_roles` separada + função `has_role()` SECURITY DEFINER (padrão seguro, sem escalonamento).
- Storage: bucket público `product-images`, RLS permite upload só para admin.
- Mercado Pago: API `POST /v1/payments` com `payment_method_id: "pix"`; webhook em `/api/public/mp-webhook` (URL fixa `project--<id>.lovable.app`).
- Os HTMLs antigos serão **referência visual** — não vou copiar JS deles (era tudo localStorage), o estado real fica no banco.

---

## O que preciso de você ao longo do caminho

1. **Agora**: confirmar este plano para eu iniciar a Etapa 1.
2. **Etapa 3/4**: o **Access Token de Produção do Mercado Pago** (eu te mostro como gerar em mercadopago.com.br → Suas integrações).
3. Se quiser logo: o **logo SmartCell** (envie como imagem) — caso contrário uso um placeholder com ícone.

Posso começar?
