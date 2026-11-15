import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Tag,
  Coins,
  KeyRound,
  LogOut,
  ExternalLink,
  Search,
  X,
  FolderPlus,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { sql, type MenuItem } from "@/db";
import { authClient } from "@/lib/auth-client";
import { getSettingsFn, updateSettingsFn } from "@/lib/settings";
import { formatPrice } from "@/lib/currency";
import {
  fetchCategoriesFn,
  addCategoryFn,
  deleteCategoryFn,
  type Category,
} from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    meta: [{ title: "Menu Dashboard — Smash & Shake" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"LKR" | "USD">("LKR");

  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const items = useQuery({
    queryKey: ["menu-admin"],
    queryFn: () => fetchMenuAdmin(),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategoriesFn(),
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

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => addCategoryFn({ data: name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryInput("");
      setCategoryError(null);
    },
    onError: (err: Error) => setCategoryError(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (name: string) => deleteCategoryFn({ data: name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCategoryError(null);
    },
    onError: (err: Error) => setCategoryError(err.message),
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
      setIsFormOpen(false);
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
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelForm() {
    setEditingId(null);
    setForm(empty);
    setIsFormOpen(false);
    setError(null);
  }

  async function handleSignOut() {
    await authClient.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  }

  const allItems = useMemo(() => items.data ?? [], [items.data]);
  const allCategories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryNames = useMemo(() => allCategories.map((c: Category) => c.name), [allCategories]);

  const availableCategories = useMemo(
    () => (categoryNames.length > 0 ? categoryNames : ["Burgers", "Sides", "Cocktails"]),
    [categoryNames],
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory =
        selectedCategoryTab === "All" || item.category === selectedCategoryTab;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allItems, selectedCategoryTab, searchQuery]);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-wide text-primary leading-none truncate">
              SMASH &amp; SHAKE
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
              Admin Dashboard
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Menu Navigation
          </p>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-primary/15 text-primary border border-primary/25 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-4 w-4" />
              <span>Menu Items</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
              {allItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCategoriesModal(true);
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-secondary" />
              <span>Categories</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
              {availableCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (settingsQuery.data?.currency) {
                setSelectedCurrency(settingsQuery.data.currency);
              }
              setShowCurrencyModal(true);
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Coins className="h-4 w-4 text-primary" />
              <span>Currency</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-semibold">
              {settingsQuery.data?.currency ?? "LKR"}
            </span>
          </button>

          <Link
            to="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4" />
              <span>View Live Menu</span>
            </div>
          </Link>
        </nav>
      </div>

      <div className="pt-6 border-t border-border/80 space-y-2">
        <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Signed in as Sole Admin</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowPasswordModal(true);
            setMobileSidebarOpen(false);
          }}
          className="w-full justify-start gap-2.5 text-xs h-9"
        >
          <KeyRound className="h-4 w-4" />
          Change Password
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2.5 text-xs h-9 hover:text-destructive hover:border-destructive/40"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-[#080808] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <span className="font-display text-xl text-primary tracking-wide">SMASH &amp; SHAKE</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <aside
            className="w-72 bg-[#090909] border-r border-border h-full p-5 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 border-r border-border bg-[#080808] p-5 h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </aside>

      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 space-y-8 overflow-y-auto">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground tracking-wide">
              Menu Dashboard
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage dishes, prices, categories, and live availability.
            </p>
          </div>

          <Button
            onClick={() => {
              if (isFormOpen && !editingId) {
                setIsFormOpen(false);
              } else {
                setEditingId(null);
                setForm({
                  ...empty,
                  category:
                    selectedCategoryTab !== "All"
                      ? selectedCategoryTab
                      : (availableCategories[0] ?? "Burgers"),
                });
                setIsFormOpen(true);
              }
            }}
            className="gap-2 font-semibold shadow-md self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen && !editingId ? "Close Form" : "Add New Dish"}
          </Button>
        </section>

        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80">
            {["All", ...availableCategories].map((cat) => {
              const count =
                cat === "All" ? allItems.length : allItems.filter((i) => i.category === cat).length;
              const isActive = selectedCategoryTab === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryTab(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-black/20 text-primary-foreground font-bold"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </section>

        {isFormOpen && (
          <section className="rounded-xl border border-primary/40 bg-card p-6 shadow-xl relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div>
                <h2 className="font-display text-2xl text-primary">
                  {editingId ? "Edit Menu Dish" : "Create New Menu Dish"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editingId
                    ? "Update pricing, description, category, or order."
                    : "Fill in the details to publish a new dish to your live menu."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-foreground block mb-1">Dish Name</label>
                <Input
                  placeholder="e.g. Classic Double Smash"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoriesModal(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> New
                  </button>
                </div>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Price ({settingsQuery.data?.currency ?? "LKR"})
                </label>
                <Input
                  placeholder="e.g. 1500"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Sort Order (Lower shows first)
                </label>
                <Input
                  placeholder="0"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Ingredients, toppings, allergy notes..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              {error && <p className="text-sm text-destructive sm:col-span-full">{error}</p>}

              <div className="flex gap-2 sm:col-span-full pt-2">
                <Button type="submit" disabled={save.isPending}>
                  {editingId ? "Save Changes" : "Publish Dish"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        )}

        <section>
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
              <UtensilsCrossed className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg text-foreground">No menu items found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different search term.`
                  : "No dishes exist in this category yet. Click 'Add New Dish' to create one."}
              </p>
              {!isFormOpen && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      ...empty,
                      category:
                        selectedCategoryTab !== "All"
                          ? selectedCategoryTab
                          : (availableCategories[0] ?? "Burgers"),
                    });
                    setIsFormOpen(true);
                  }}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add First Dish
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredItems.map((item: MenuItem) => {
                const formattedPrice = formatPrice(item.price, settingsQuery.data);
                return (
                  <article
                    key={item.id}
                    className="group rounded-xl border border-border bg-card p-5 shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {item.category}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground font-medium">
                          Order #{item.sort_order}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                          {item.name}
                        </h3>
                        <span className="font-mono text-base font-bold text-primary whitespace-nowrap">
                          {formattedPrice}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                        {item.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => edit(item)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delete ${item.name}?`)) remove.mutate(item.id);
                        }}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="font-display text-2xl text-primary">Manage Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategoriesModal(false);
                  setCategoryError(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newCategoryInput.trim()) {
                  addCategoryMutation.mutate(newCategoryInput.trim());
                }
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="New category name (e.g. Desserts)"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                required
                className="h-10 text-sm"
              />
              <Button
                type="submit"
                disabled={addCategoryMutation.isPending || !newCategoryInput.trim()}
                className="gap-1.5 text-xs whitespace-nowrap"
              >
                <FolderPlus className="h-4 w-4" />
                Add
              </Button>
            </form>

            {categoryError && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {categoryError}
              </p>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-2">
                Existing Categories ({availableCategories.length})
              </p>
              {availableCategories.map((catName) => {
                const count = allItems.filter((i) => i.category === catName).length;
                return (
                  <div
                    key={catName}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-sm text-foreground">{catName}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                        {count} {count === 1 ? "dish" : "dishes"}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deleteCategoryMutation.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete category "${catName}"? ${count > 0 ? `(Warning: ${count} dishes are currently using it)` : ""}`,
                          )
                        ) {
                          deleteCategoryMutation.mutate(catName);
                        }
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title={count > 0 ? "Reassign items before deleting" : "Delete category"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCategoriesModal(false);
                  setCategoryError(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-display text-2xl text-primary mb-4">Currency Setting</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrencyMutation.mutate(selectedCurrency);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-medium">
                  Select Active Currency (Shown on Live Menu &amp; Cards)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:border-primary transition-colors">
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
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:border-primary transition-colors">
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
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
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
    </div>
  );
}
