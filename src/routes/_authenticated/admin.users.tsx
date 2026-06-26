import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const setRole = useServerFn(setUserRole);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Apenas administradores acessam esta área.</p>;
  }

  async function change(userId: string, role: "admin"|"funcionario"|"cliente") {
    try {
      await setRole({ data: { userId, role } });
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina o papel de cada usuário. <strong>Cliente</strong> só compra; <strong>funcionário</strong> opera PDV, produtos e pedidos; <strong>admin</strong> tem tudo.
      </p>
      {isLoading ? <p>Carregando...</p> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-center">Papel atual</th>
                <th className="px-4 py-3 text-right">Alterar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-semibold">{u.full_name || "(sem nome)"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${u.role === "admin" ? "bg-primary/15 text-primary" : u.role === "funcionario" ? "bg-accent/15 text-accent" : "bg-surface text-muted-foreground"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => change(u.id, e.target.value as any)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="cliente">cliente</option>
                      <option value="funcionario">funcionário</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Novos cadastros pelo <Link to="/auth" className="text-primary hover:underline">site</Link> entram como cliente.
      </p>
    </div>
  );
}