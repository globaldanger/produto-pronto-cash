# Repaginação profissional SmartCell

Escopo grande dividido em 4 blocos entregues em sequência. Você aprova o plano e eu executo tudo.

## 1. Design editorial-luxo (fundação visual)

Tipografia nova: **Instrument Serif** nos títulos + **Work Sans** no corpo. Paleta atual (preto/dourado) mantida, mas refinada com tokens semânticos consistentes, sombras suaves, espaçamento generoso e microinterações.

- Header fixo com blur, logo centralizada, menu superior enxuto (Loja / Sobre / Meus pedidos / Rastrear).
- **Menu do cliente** redesenhado: dropdown premium com avatar, atalhos (Meus pedidos, Endereços, Favoritos, Sair), badges de status.
- Home reorganizada em bandas full-width: hero editorial → categorias em bento → destaques → depoimentos → sobre → FAQ → footer rico.
- Cards de produto com hover suave, badge de tag, preço em display serif.
- Página do produto com galeria zoom, breadcrumb, aba de descrição/especificações/frete, produtos relacionados.
- Checkout e comprovante repaginados no mesmo idioma visual.

## 2. Templates temáticos (novo módulo)

Sistema no admin em **Configurações → Tema da loja**. Ativa um pacote e o site inteiro muda cores de acento, banners, ícones decorativos e microcopy.

Pacotes: São João, Copa do Mundo, Ano Novo, Natal, Black Friday, Carnaval, Dia das Mães, Padrão. Cada tema traz:
- Paleta de acento (mantém preto base, troca dourado por cor do tema).
- Elemento decorativo (bandeirinhas SVG, bola, fogos, floco, neon, confete, coração).
- Banner temático animado no topo da home.
- Countdown opcional (Black Friday/Copa).
- Data de expiração automática (agenda ativar/desativar).

## 3. Novas funções admin

- **Cupons de desconto**: %, valor fixo, frete grátis, mínimo de compra, validade, limite de uso; aplicáveis no checkout.
- **Programa de fidelidade**: pontos por real gasto, resgate em desconto, saldo visível ao cliente.
- **Reviews de clientes**: nota + comentário no produto após compra paga, moderação no admin, média exibida.
- **Notificações WhatsApp**: link `wa.me` gerado com mensagem de status pedido; botão "Notificar cliente" no admin. (SMS/API completa fica em fase 2 opcional.)
- **Relatórios avançados**: gráficos de vendas 30/90 dias, top produtos, ticket médio, taxa de conversão, comparação de canais.
- **Kanban de pedidos**: colunas Pago → Preparando → Pronto → Entregue, arrastar para mudar status.
- **Etiquetas visuais**: Novo, Promo, Últimas unidades, Frete grátis — aparecem no card do produto.
- **Frete por CEP**: tabela por faixa de CEP com valor e prazo; opção de retirada continua grátis.
- **Central do cliente** ampliada: endereços salvos, favoritos, histórico com filtros, reordenar compra.

## 4. Detalhes técnicos

- Migrations novas: `coupons`, `loyalty_points`, `product_reviews`, `shipping_rates`, `favorites`, `customer_addresses`, colunas `theme_key/theme_expires_at/product_tags` em `store_settings`/`products`, campo `kanban_status` em `orders`.
- Tudo com RLS (cliente vê o próprio, admin/funcionário gerencia).
- Server functions para cupons/fidelidade/reviews (validação server-side, sem burlar client).
- Kanban usa `@dnd-kit/core` (já compatível).
- Fontes carregadas via `<link>` no `__root.tsx`.
- Nenhuma quebra do checkout Mercado Pago atual.

## Ordem de execução

1. Fundação design (fontes, tokens, header/menu cliente, home, produto, checkout).
2. Templates temáticos + admin de tema.
3. Migrations + admin (cupons, fidelidade, reviews, frete, etiquetas, kanban, relatórios).
4. Central do cliente ampliada.
5. Publica.

Aprova pra eu começar?
