import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { sql, type MenuItem } from "@/db";
import { authClient } from "@/lib/auth-client";
import { getSettingsFn, updateSettingsFn } from "@/lib/settings";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = ["Burgers", "Sides", "Cocktails"];
const empty = {
  name: "",
  description: "",
  price: "",
  category: "Burgers",
  sort_order: "0",
};

const fetchMenuAdmin = createServerFn().handler(async () => {
  const rows = await sql`
    SELECT id, name, description, price, category, sort_order, created_at
    FROM menu_items
    ORDER BY category ASC, sort_order ASC
  `;
  return rows as unknown as MenuItem[];
});

const saveItem = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id?: string;
      row: {
        name: string;
        description: string;
        price: number;
        category: string;
        sort_order: number;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, row } = data;
    if (id) {
      await sql`
        UPDATE menu_items
        SET name = ${row.name},
            description = ${row.description},
            price = ${row.price},
            category = ${row.category},
            sort_order = ${row.sort_order}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        INSERT INTO menu_items (name, description, price, category, sort_order)
        VALUES (${row.name}, ${row.description}, ${row.price}, ${row.category}, ${row.sort_order})
      `;
    }
  });

const deleteItem = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await sql`DELETE FROM menu_items WHERE id = ${id}`;
  });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Menu admin — Smash & Shake" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"LKR" | "USD">("LKR");

  const items = useQuery({
    queryKey: ["menu-admin"],
    queryFn: () => fetchMenuAdmin(),
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await getSettingsFn();
      setSelectedCurrency(data.currency);
      return data;
    },
  });

  const saveCurrencyMutation = useMutation({
    mutationFn: async (currency: "LKR" | "USD") => {
      return await updateSettingsFn({ data: { currency } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setShowCurrencyModal(false);
    },
  });

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordStatus(null);
    try {
      const { error: changeErr } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (changeErr) {
        setPasswordStatus(changeErr.message ?? "Failed to update password");
      } else {
        setPasswordStatus("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordStatus(null);
        }, 1500);
      }
    } catch (err: unknown) {
      setPasswordStatus(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        sort_order: Number(form.sort_order) || 0,
      };
      await saveItem({ data: { ...(editingId ? { id: editingId } : {}), row } });
    },
    onSuccess: () => {
      setForm(empty);
      setEditingId(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["menu-admin"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteItem({ data: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-admin"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
  });

  function edit(i: MenuItem) {
    setEditingId(i.id);
    setForm({
      name: i.name,
      description: i.description,
      price: String(i.price),
      category: i.category,
      sort_order: String(i.sort_order),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSignOut() {
    await authClient.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  }

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <header className="flex flex-wrap items-center justify-between border-b border-border px-6 py-4 gap-3">
        <h1 className="font-display text-4xl text-primary">Menu admin</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/">View menu</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (settingsQuery.data?.currency) {
                setSelectedCurrency(settingsQuery.data.currency);
              }
              setShowCurrencyModal(true);
            }}
          >
            Currency ({settingsQuery.data?.currency ?? "LKR"})
          </Button>
          <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
            Password
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-2xl text-primary mb-4">Currency Setting</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrencyMutation.mutate(selectedCurrency);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-muted-foreground block mb-2">
                  Select Active Currency (Shown on Menu)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-md border border-border bg-background cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="currency"
                      value="LKR"
                      checked={selectedCurrency === "LKR"}
                      onChange={() => setSelectedCurrency("LKR")}
                      className="accent-primary"
                    />
                    <div>
                      <span className="font-medium text-sm">LKR (Default)</span>
                      <p className="text-xs text-muted-foreground">
                        Sri Lankan Rupee (e.g. LKR 1,500.00)
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-md border border-border bg-background cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="currency"
                      value="USD"
                      checked={selectedCurrency === "USD"}
                      onChange={() => setSelectedCurrency("USD")}
                      className="accent-primary"
                    />
                    <div>
                      <span className="font-medium text-sm">USD</span>
                      <p className="text-xs text-muted-foreground">
                        United States Dollar (e.g. $12.50)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saveCurrencyMutation.isPending} className="flex-1">
                  {saveCurrencyMutation.isPending ? "Saving..." : "Save Currency"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCurrencyModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-2xl text-primary mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Current password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New password (min 6 chars)"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {passwordStatus && (
                <p
                  className={`text-xs ${passwordStatus.includes("success") ? "text-primary" : "text-destructive"}`}
                >
                  {passwordStatus}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={changingPassword} className="flex-1">
                  {changingPassword ? "Updating..." : "Save password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordStatus(null);
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-2"
        >
          <h2 className="font-display text-2xl sm:col-span-2">
            {editingId ? "Edit item" : "Add new item"}
          </h2>
          <Input
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder={`Price (in ${settingsQuery.data?.currency ?? "LKR"})`}
            type="number"
            step="0.01"
            min="0"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input
            placeholder="Order (lower shows first)"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />

          <Textarea
            className="sm:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {editingId ? "Save changes" : "Add item"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.data?.map((i: MenuItem) => {
            const formattedPrice = formatPrice(i.price, settingsQuery.data);
            return (
              <li key={i.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {i.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {i.category}
                    </span>
                  </p>
                  <p className="text-sm font-mono font-medium text-primary">{formattedPrice}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => edit(i)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete ${i.name}?`)) remove.mutate(i.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
