## Painel Admin SmartCell — Etapa 2

Vou recriar o admin.html original como um painel real no app, ligado ao banco do Lovable Cloud. Mesma estrutura, mesmo visual (sidebar preta com detalhes dourados), com as 8 seções do original.

### Layout

```text
┌──────────────┬──────────────────────────────┐
│              │  ☰  📊 Dashboard      25/06  │
│   SmartCell  ├──────────────────────────────┤
│   Admin      │                              │
│              │                              │
│  📊 Dashboard│   Conteúdo da seção          │
│  💵 Vendas   │   selecionada                │
│  📦 Produtos │                              │
│  🏷️ Categorias│                             │
│  🛒 Pedidos  │                              │
│  💰 Financeiro│                             │
│  ℹ️ Sobre    │                              │
│  ⚙️ Config   │                              │
│              │                              │
│  👤 Carlos   │                              │
│     [Sair]   │                              │
└──────────────┴──────────────────────────────┘
```

Sidebar fixa (recolhível no mobile), header com título dinâmico da seção e data, conteúdo trocado por seção.

### Seções

1. **Dashboard** — cards: total de pedidos, receita do mês, produtos ativos, estoque baixo. Lista dos últimos 5 pedidos. Gráfico simples de vendas dos últimos 7 dias (Chart.js).
2. **Vendas** — tabela de pedidos pagos com filtro por data, total, e botão para ver recibo.
3. **Produtos** — formulário CRUD com nome, preço, preço promocional, categoria, estoque, descrição, **upload de até 5 imagens** (Lovable Storage, bucket `product-images`). Tabela com busca, edição inline e exclusão. Toggle ativo/inativo.
4. **Categorias** — CRUD com nome, slug auto-gerado, descrição e ícone (Font Awesome).
5. **Pedidos** — todos os pedidos com filtro por status (pendente/pago/enviado/entregue/cancelado), detalhes do cliente, itens e total. Botão para mudar status.
6. **Financeiro** — abas Visão Geral / Produtos / Despesas / Relatórios. Calcula receita, custo (via novo campo `cost_price` em products), lucro bruto e margem. CRUD de despesas em nova tabela.
7. **Sobre** — edita textos e estatísticas que aparecem na vitrine.
8. **Configurações** — nome da loja, logo, contato, WhatsApp, endereço e horário.

### Banco — alterações

Migração nova:

- `products`: adicionar `cost_price NUMERIC` (custo) para cálculo de lucro.
- `expenses` (nova): `id`, `description`, `amount`, `category`, `date`, `notes`, com RLS só para admin.
- `store_settings` (nova, linha única): nome, logo, slogan, e-mail, telefone, WhatsApp, endereço, horário, imagem suporte, textos e estatísticas do "Sobre".
- Tudo com GRANTs corretos e policies `has_role(auth.uid(), 'admin')`.

### Detalhes técnicos

- Layout em `src/routes/_authenticated/admin.tsx` reescrito do zero como shell com sidebar + outlet.
- Subrotas: `admin.dashboard.tsx`, `admin.sales.tsx`, `admin.products.tsx`, `admin.categories.tsx`, `admin.orders.tsx`, `admin.finance.tsx`, `admin.about.tsx`, `admin.settings.tsx`.
- Componente `ProductForm` com `<input type="file" multiple accept="image/*">` → `supabase.storage.from('product-images').upload(...)` → grava URLs públicas em `products.images`.
- Server functions só onde precisa de privilégio (mudar status de pedido). Para CRUD de produto/categoria/despesa/config, o cliente Supabase autenticado basta — RLS já garante que só admin escreve.
- Gate de admin: redireciona para `/` se o usuário logado não tem role admin (checagem com `has_role` via select em `user_roles`).
- Chart.js já tem libs pequenas; uso `react-chartjs-2` + `chart.js` (`bun add`).
- Toda string em português, paleta preto/dourado mantida do design system existente.

### Fora desta etapa

- Exportar PDF/Excel (vinha com jsPDF/XLSX no original) — posso adicionar depois se quiser.
- Recibo imprimível (html2canvas) — depois.
- Mercado Pago + checkout — Etapa 3, como combinado.
