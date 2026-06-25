import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-border bg-card p-8 text-center">
      <i className="fa-solid fa-mobile-screen text-6xl text-primary" />
      <div>
        <h1 className="text-2xl font-bold">SmartCell Admin</h1>
        <p className="text-sm text-muted-foreground">Painel de gestão da loja</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-left text-sm">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Versão</div>
          <div className="font-semibold">2.0.0</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Última atualização</div>
          <div className="font-semibold">{new Date().toLocaleDateString("pt-BR")}</div>
        </div>
      </div>
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Sistema completo de e-commerce com pagamento via Pix do Mercado Pago,
        gestão de produtos, estoque, pedidos e financeiro.
      </p>
    </div>
  );
}