import { Link, useRouter } from "@tanstack/react-router";
import { useCart } from "@/stores/cart";

export function CartDrawer() {
  const { items, isOpen, toggle, setQty, remove, total } = useCart();
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={() => toggle(false)} />
      <aside className="flex w-full max-w-md flex-col border-l border-border bg-card text-foreground">
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">
            <i className="fa-solid fa-cart-shopping mr-2 text-primary" /> Seu carrinho
          </h2>
          <button onClick={() => toggle(false)} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <i className="fa-solid fa-cart-shopping mb-3 text-4xl" />
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.productId} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-card">
                    {i.image ? (
                      <img src={i.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <i className="fa-solid fa-image" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="line-clamp-2 text-sm font-semibold">{i.name}</div>
                    <div className="mt-1 text-sm text-primary">R$ {i.price.toFixed(2)}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setQty(i.productId, i.quantity - 1)}
                        className="h-7 w-7 rounded border border-border hover:border-primary"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button
                        onClick={() => setQty(i.productId, i.quantity + 1)}
                        disabled={i.quantity >= i.stock}
                        className="h-7 w-7 rounded border border-border hover:border-primary disabled:opacity-40"
                      >
                        +
                      </button>
                      <button
                        onClick={() => remove(i.productId)}
                        className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">R$ {total().toFixed(2)}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => {
              toggle(false);
              router.navigate({ to: "/checkout" });
            }}
            className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Finalizar compra
          </button>
          <Link
            to="/"
            onClick={() => toggle(false)}
            className="mt-2 block text-center text-xs text-muted-foreground hover:text-primary"
          >
            Continuar comprando
          </Link>
        </footer>
      </aside>
    </div>
  );
}