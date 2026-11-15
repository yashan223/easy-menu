import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { sql, type MenuItem } from "@/db";
import { getSettingsFn } from "@/lib/settings";
import { formatPrice } from "@/lib/currency";

const fetchMenu = createServerFn().handler(async () => {
  const rows = await sql`
    SELECT id, name, description, price, category, sort_order, image_url, created_at
    FROM menu_items
    ORDER BY sort_order ASC
  `;
  return rows as unknown as MenuItem[];
});

const menuQuery = queryOptions({
  queryKey: ["menu"],
  queryFn: () => fetchMenu(),
});

const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => getSettingsFn(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smash & Shake — Burgers & Cocktails Menu" },
      {
        name: "description",
        content: "Smashed burgers, crispy sides and craft cocktails.",
      },
      { property: "og:title", content: "Smash & Shake — Burgers & Cocktails Menu" },
      {
        property: "og:description",
        content: "Smashed burgers, crispy sides and craft cocktails.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(menuQuery),
      context.queryClient.ensureQueryData(settingsQuery),
    ]);
  },
  component: Index,
});

const DEFAULT_ORDER = ["Burgers", "Sides", "Cocktails"];

function Index() {
  const { data } = useSuspenseQuery(menuQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);

  const categories = Array.from(
    new Set([...DEFAULT_ORDER, ...data.map((i: MenuItem) => i.category)]),
  ).filter((cat) => data.some((i: MenuItem) => i.category === cat));

  return (
    <main className="min-h-screen bg-black text-foreground font-sans py-6 sm:py-12 px-3 sm:px-6 flex justify-center items-start">
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-primary/30 rounded-2xl shadow-2xl p-6 sm:p-10 md:p-14 overflow-hidden">
        {/* Subtle inner border for classic menu card aesthetic */}
        <div className="pointer-events-none absolute inset-2 sm:inset-3 rounded-xl border border-primary/20" />

        {/* Vintage corner flourishes */}
        <div className="pointer-events-none absolute top-4 left-4 h-4 w-4 border-t-2 border-l-2 border-primary/60" />
        <div className="pointer-events-none absolute top-4 right-4 h-4 w-4 border-t-2 border-r-2 border-primary/60" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-primary/60" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-primary/60" />

        {/* Menu Card Header */}
        <header className="relative text-center pb-8 pt-2">
          <div className="text-primary/70 text-xs tracking-[0.3em] uppercase mb-2">
            ★ Craft Burgers &amp; Cocktails ★
          </div>
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl tracking-widest text-primary uppercase drop-shadow-md">
            Smash &amp; Shake
          </h1>
          <div className="flex items-center justify-center gap-3 my-3">
            <span className="h-px w-12 bg-primary/40" />
            <span className="text-primary/70 text-xs">✦</span>
            <span className="h-px w-12 bg-primary/40" />
          </div>
          <p className="text-xs sm:text-sm tracking-[0.25em] text-muted-foreground uppercase">
            Signature Food &amp; Drink Menu
          </p>
        </header>

        {/* Menu Categories */}
        {categories.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-lg">Our kitchen is preparing the menu.</p>
            <p className="mt-2 text-xs">
              Check back shortly or visit the{" "}
              <Link to="/admin" className="text-primary underline">
                Admin Portal
              </Link>{" "}
              to add menu items.
            </p>
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {categories.map((cat) => {
              const categoryItems = data.filter((i: MenuItem) => i.category === cat);
              return (
                <section key={cat} className="relative">
                  {/* Category Title with flanking decorative lines */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/60" />
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-widest text-primary uppercase px-3">
                      {cat}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-primary/60" />
                  </div>

                  {/* Menu Items List */}
                  <div className="grid gap-4 sm:gap-6">
                    {categoryItems.map((item: MenuItem) => {
                      const priceFormatted = formatPrice(item.price, settings);
                      return (
                        <article
                          key={item.id}
                          className="group flex items-start gap-4 p-3 rounded-lg border border-border/40 hover:border-primary/40 bg-card/30 transition-colors"
                        >
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              width={80}
                              height={80}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border border-primary/20 flex-shrink-0 shadow-md"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <h3 className="font-display text-xl sm:text-2xl tracking-wide text-foreground group-hover:text-primary transition-colors truncate">
                                {item.name}
                              </h3>
                              <div className="flex-1 border-b border-dotted border-border/80 mx-2 -translate-y-1 hidden sm:block" />
                              <span className="font-mono text-base sm:text-lg font-semibold text-primary whitespace-nowrap">
                                {priceFormatted}
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Menu Card Footer */}
        <footer className="mt-16 pt-8 border-t border-primary/20 text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            All dishes freshly crafted to order
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>© Smash &amp; Shake</span>
            <span>·</span>
            <Link
              to="/admin"
              className="hover:text-primary transition-colors underline underline-offset-4"
            >
              Admin Portal
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
