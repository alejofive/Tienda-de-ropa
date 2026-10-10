import "./dashboard-skeleton.css";

function Line({ className = "" }: { className?: string }) {
  return <span className={`skeleton-line ${className}`} aria-hidden="true" />;
}

export function DashboardPageSkeleton() {
  return <div className="dashboard-skeleton" role="status" aria-label="Cargando tu tienda">
    <div className="heading skeleton-heading"><div><Line className="skeleton-eyebrow" /><Line className="skeleton-title" /><Line className="skeleton-description" /></div><Line className="skeleton-action" /></div>
    <div className="stats-grid">{Array.from({ length: 4 }, (_, index) => <div className="stat-card skeleton-stat" key={index}>
      <Line className="skeleton-icon" /><Line className="skeleton-label" /><Line className="skeleton-value" /><Line className="skeleton-caption" />
    </div>)}</div>
    <div className="skeleton-quick-actions"><Line /><Line /></div>
    <div className="dashboard-columns">{Array.from({ length: 2 }, (_, index) => <div className="panel skeleton-panel" key={index}>
      <Line className="skeleton-panel-title" />{Array.from({ length: 3 }, (_, row) => <div className="skeleton-row" key={row}><Line className="skeleton-avatar" /><div><Line className="skeleton-row-title" /><Line className="skeleton-row-subtitle" /></div></div>)}
    </div>)}</div>
  </div>;
}

type Section = "session" | "products" | "sales" | "customers" | "reports" | "new-sale" | "product-form" | "customer-form" | "payment-form" | "return-form" | "sale-detail" | "product-detail" | "customer-detail";

const labels: Record<Section, string> = {
  session: "Cargando tu tienda", products: "Cargando productos", sales: "Cargando ventas", customers: "Cargando clientes",
  reports: "Cargando reportes", "new-sale": "Preparando nueva venta", "product-form": "Cargando producto",
  "customer-form": "Preparando cliente", "payment-form": "Cargando abono", "return-form": "Cargando devolución",
  "sale-detail": "Cargando venta", "product-detail": "Cargando producto", "customer-detail": "Cargando cliente",
};

function SkeletonHeading({ action = false }: { action?: boolean }) {
  return <div className="heading skeleton-heading"><div><Line className="skeleton-eyebrow" /><Line className="skeleton-title" /><Line className="skeleton-description" /></div>{action && <Line className="skeleton-action" />}</div>;
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return <div className="skeleton-rows">{Array.from({ length: count }, (_, index) => <div className="skeleton-row" key={index}>
    <Line className="skeleton-avatar" /><div><Line className="skeleton-row-title" /><Line className="skeleton-row-subtitle" /></div><Line className="skeleton-row-amount" />
  </div>)}</div>;
}

function SkeletonPanel({ rows = 3 }: { rows?: number }) {
  return <div className="panel skeleton-panel"><Line className="skeleton-panel-title" /><SkeletonRows count={rows} /></div>;
}

function SkeletonFields({ count = 3 }: { count?: number }) {
  return <div className="skeleton-fields">{Array.from({ length: count }, (_, index) => <div className="skeleton-field" key={index}>
    <Line className="skeleton-label" /><Line className="skeleton-input" />
  </div>)}</div>;
}

export function SectionSkeleton({ section }: { section: Section }) {
  const narrow = ["product-form", "customer-form", "payment-form", "return-form", "product-detail"].includes(section);
  const back = !["session", "products", "sales", "customers", "reports"].includes(section);

  return <div className={`dashboard-skeleton ${narrow ? "narrow-page" : ""}`} role="status" aria-label={labels[section]}>
    {back && <Line className="skeleton-back" />}
    <SkeletonHeading action={["products", "sales", "customers", "sale-detail", "customer-detail"].includes(section)} />

    {section === "session" && <div className="dashboard-columns"><SkeletonPanel /><SkeletonPanel /></div>}

    {section === "products" && <><Line className="skeleton-search" /><div className="product-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-product-card" key={index}>
      <Line className="skeleton-product-photo" /><div><Line className="skeleton-row-title" /><Line className="skeleton-row-subtitle" /><Line className="skeleton-value" /></div>
    </div>)}</div></>}

    {(section === "sales" || section === "customers") && <SkeletonPanel rows={5} />}

    {section === "reports" && <><div className="skeleton-filters"><Line /><Line /><Line /></div><Line className="skeleton-month" />
      <div className="report-grid">{Array.from({ length: 4 }, (_, index) => <div className="report-card skeleton-report-card" key={index}>
        <Line className="skeleton-label" /><Line className="skeleton-value" /><Line className="skeleton-description" />
      </div>)}</div><Line className="skeleton-owed" /></>}

    {section === "new-sale" && <div className="sale-layout"><div className="sale-main"><div className="form-card skeleton-form-card"><Line className="skeleton-panel-title" /><Line className="skeleton-search" /><SkeletonRows count={3} /></div>
      <div className="form-card skeleton-form-card"><Line className="skeleton-panel-title" /><div className="skeleton-filters"><Line /><Line /></div><SkeletonFields count={2} /></div></div>
      <div className="form-card skeleton-form-card"><Line className="skeleton-panel-title" /><SkeletonRows count={2} /><Line className="skeleton-input" /><Line className="skeleton-submit" /></div></div>}

    {section === "product-detail" && <div className="skeleton-product-summary"><Line className="skeleton-product-preview" /><div><Line className="skeleton-value" /><Line className="skeleton-description" /></div></div>}
    {(section === "product-form" || section === "product-detail") && <div className="form-card skeleton-form-card"><Line className="skeleton-panel-title" /><Line className="skeleton-upload" /><SkeletonFields count={3} /><Line className="skeleton-panel-title" /><SkeletonFields count={3} /><Line className="skeleton-submit" /></div>}

    {(section === "customer-form" || section === "payment-form" || section === "return-form") && <div className="form-card skeleton-form-card">
      {section === "return-form" && <SkeletonRows count={2} />}
      {section === "payment-form" && <Line className="skeleton-owed" />}
      <SkeletonFields count={section === "customer-form" ? 2 : 3} /><Line className="skeleton-submit" />
    </div>}

    {section === "sale-detail" && <div className="sale-detail-grid"><SkeletonPanel rows={4} /><SkeletonPanel rows={4} /></div>}
    {section === "customer-detail" && <><div className="customer-top"><div className="panel skeleton-customer-card"><Line className="skeleton-label" /><Line className="skeleton-value" /></div><div className="panel skeleton-customer-card"><Line className="skeleton-avatar" /><Line className="skeleton-row-title" /></div></div><div className="dashboard-columns"><SkeletonPanel /><SkeletonPanel /></div></>}
  </div>;
}

export function DashboardShellSkeleton() {
  return <div className="app-shell">
    <aside className="sidebar skeleton-sidebar" aria-hidden="true"><Line className="skeleton-brand" />{Array.from({ length: 5 }, (_, index) => <Line className="skeleton-menu-item" key={index} />)}</aside>
    <div className="app-content"><header className="topbar" aria-hidden="true"><Line className="skeleton-topbar-title" /><Line className="skeleton-topbar-user" /></header>
      <main className="page"><SectionSkeleton section="session" /></main>
    </div>
    <div className="bottom-nav skeleton-bottom-nav" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <Line key={index} />)}</div>
  </div>;
}
