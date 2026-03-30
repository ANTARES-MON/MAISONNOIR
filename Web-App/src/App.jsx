import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Users, Tag, ShoppingCart, Plus, X, Menu,
  ChevronLeft, ChevronRight, Search, AlertCircle, RefreshCw,
  ArrowLeft, CheckCircle2, Loader2, TrendingUp, Package,
  UserCircle, LogOut, Trash2
} from 'lucide-react';

// ─── ODOO CONFIG ─────────────────────────────────────────────────────────────
const ODOO_BASE = '/odoo';
const ODOO_DB   = 'maisonnoir';

const odooFetch = async (path, body) => {
  const res = await fetch(`${ODOO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    credentials: 'include',
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), ...body }),
  });
  if (!res.ok) throw new Error(`Serveur Odoo indisponible (HTTP ${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Erreur Odoo');
  return data.result;
};

const odoo = {
  async authenticate(login, password) {
    const result = await odooFetch('/web/session/authenticate', {
      params: { db: ODOO_DB, login, password },
    });
    if (!result?.uid) throw new Error('Identifiants incorrects ou utilisateur introuvable.');
    return result;
  },

  async call(model, method, args = [[]], kwargs = {}) {
    const silentContext = {
      mail_create_nosubscribe: true,
      mail_create_nolog: true,
      tracking_disable: true,
      lang: 'fr_FR',
    };
    const finalKwargs = {
      ...kwargs,
      context: { ...silentContext, ...(kwargs.context || {}) }
    };
    return odooFetch('/web/dataset/call_kw', {
      params: { model, method, args, kwargs: finalKwargs },
    });
  },

  async checkIsManager(uid, email) {
    try {
      // Try reading all groups the user belongs to
      const groups = await this.call('res.groups', 'search_read', [[
        ['users', 'in', [uid]],
      ]], { fields: ['full_name', 'name'], limit: 100 });

      const isManager = groups.some(g => {
        const full = (g.full_name || '').toLowerCase();
        const name = (g.name || '').toLowerCase();
        return full.includes('manager') || name.includes('manager') ||
               full.includes('gestionnaire') || full.includes('sales / administrator');
      });
      if (isManager) return true;
    } catch (_) { /* fall through to email check */ }

    // Fallback: email-based role detection
    const e = (email || '').toLowerCase();
    return e.includes('o.bennis') || e.includes('manager') || e.includes('directeur');
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = v =>
  new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0) + ' MAD';

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS = {
  draft:  { label: 'Brouillon', cls: 'badge-draft' },
  sent:   { label: 'Envoyée',   cls: 'badge-confirmed' },
  sale:   { label: 'Confirmée', cls: 'badge-confirmed' },
  done:   { label: 'Terminée',  cls: 'badge-confirmed' },
  cancel: { label: 'Annulée',   cls: 'badge-cancelled' },
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Spinner = ({ size = 24, fullPage = false }) => (
  <div style={fullPage ? { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340 } : { display: 'inline-flex' }}>
    <Loader2 size={size} style={{ color: 'var(--brand-text)', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const ErrorBox = ({ message, onRetry }) => (
  <div style={{
    background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.25)',
    borderRadius: 8, padding: '20px 24px', color: '#e07070',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <AlertCircle size={18} style={{ flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Erreur de connexion</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{message}</div>
      </div>
    </div>
    {onRetry && (
      <button className="btn-ghost" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 12 }}>
        <RefreshCw size={14} /> Réessayer
      </button>
    )}
  </div>
);

const EmptyState = ({ Icon: IconComp, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--gray)' }}>
    {IconComp && <IconComp size={40} style={{ margin: '0 auto 16px', opacity: 0.3, color: 'var(--brand-text)' }} />}
    <div style={{ fontSize: 16, color: 'var(--ivory)', marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>{title}</div>
    <div style={{ fontSize: 13 }}>{subtitle}</div>
  </div>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const session   = await odoo.authenticate(email, password);
      const isManager = await odoo.checkIsManager(session.uid, email);
      onLogin({ uid: session.uid, name: session.name, email, isManager });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', background: '#0A0A0A', overflow: 'hidden' }}>

      {/* Radial base gradient */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 70%, rgba(73,17,28,0.45) 0%, transparent 55%), radial-gradient(ellipse at 80% 15%, rgba(73,17,28,0.25) 0%, transparent 50%), radial-gradient(ellipse at 55% 50%, rgba(10,5,6,1) 30%, #0A0A0A 100%)', pointerEvents: 'none' }} />

      {/* Fine grid */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.045, backgroundImage: 'linear-gradient(rgba(184,80,96,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(184,80,96,0.6) 1px,transparent 1px)', backgroundSize: '68px 68px', pointerEvents: 'none' }} />

      {/* Glow orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '8%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(73,17,28,0.28) 0%, transparent 70%)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '8%', right: '6%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,80,96,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Vertical accent lines */}
      <div style={{ position: 'fixed', top: 0, bottom: 0, left: '18%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(184,80,96,0.18), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, bottom: 0, right: '18%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(73,17,28,0.35), transparent)', pointerEvents: 'none' }} />

      {/* Brand watermark */}
      <div style={{ position: 'fixed', bottom: '6%', left: '50%', transform: 'translateX(-50%)', fontFamily: "'Playfair Display', serif", fontSize: 11, letterSpacing: '0.6em', color: 'rgba(184,80,96,0.12)', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>
        MAISON NOIR · LUXURY READY-TO-WEAR · CASABLANCA
      </div>

      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: 'fadeUp 0.45s ease',
        background: 'rgba(22,22,22,0.97)', backdropFilter: 'blur(20px)', borderRadius: 12,
        padding: '56px 48px', border: '1px solid var(--border)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(73,17,28,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: 'var(--brand-text)', letterSpacing: '0.25em', marginBottom: 6 }}>
            MAISON NOIR
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.5em', color: 'var(--gray)', textTransform: 'uppercase' }}>PORTAIL COLLABORATEURS</div>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--brand-text), transparent)', opacity: 0.3, marginTop: 24 }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.25)', borderRadius: 6, padding: '12px 16px', color: '#e07070', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>Adresse e-mail</label>
            <input type="email" value={email} placeholder="prenom.nom@maisonnoir.ma" onChange={e => setEmail(e.target.value)} required autoFocus style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>Mot de passe</label>
            <input type="password" value={password} placeholder="••••••••••" onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
          </div>
        </div>

        <button type="submit" className="btn-brand" style={{ width: '100%', padding: '14px 0', fontSize: 12, letterSpacing: '0.2em' }} disabled={loading}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Connexion…</span>
            : 'SE CONNECTER'
          }
        </button>


      </form>
    </div>
  );
};

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
const DashboardPage = ({ user }) => {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [clients, products, ordersCount, orders] = await Promise.all([
        odoo.call('res.partner',       'search_count', [[['customer_rank', '>', 0]]]),
        odoo.call('product.template',  'search_count', [[['sale_ok', '=', true]]]),
        odoo.call('sale.order',        'search_count', [[]]),
        odoo.call('sale.order', 'search_read', [[]], {
          fields: ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id'],
          order: 'id desc', limit: 10,
        }),
      ]);
      const revenue = orders
        .filter(o => ['sale', 'done'].includes(o.state))
        .reduce((s, o) => s + (o.amount_total || 0), 0);
      setStats({ clients, products, orders: ordersCount, revenue });
      setRecent(orders);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner fullPage />;
  if (error)   return <ErrorBox message={error} onRetry={load} />;

  const cards = [
    { label: 'Revenu Confirmé', value: fmt(stats.revenue), Icon: TrendingUp, highlight: true },
    { label: 'Total Commandes', value: stats.orders,       Icon: ShoppingCart },
    { label: 'Clients Actifs',  value: stats.clients,      Icon: Users },
    { label: 'Produits',        value: stats.products,     Icon: Package },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 8 }}>Vue d'ensemble</div>
        <h2 style={{ fontSize: 32 }}>Tableau de Bord</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 48 }}>
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <c.Icon size={22} style={{ color: 'var(--brand-text)', opacity: 0.8 }} />
            <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontFamily: "'Playfair Display', serif", color: c.highlight ? 'var(--brand-text)' : 'var(--ivory)', fontWeight: 600 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 style={{ fontSize: 20 }}>Dernières Commandes</h3>
        <span style={{ fontSize: 11, color: 'var(--gray)' }}>{recent.length} affichées</span>
      </div>

      <div className="table-container">
        <table>
          <thead><tr>
            <th>Référence</th><th>Client</th><th>Commercial</th><th>Date</th><th style={{ textAlign: 'right' }}>Montant</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {recent.map(o => {
              const s = STATUS[o.state] || { label: o.state, cls: 'badge-draft' };
              return (
                <tr key={o.id}>
                  <td style={{ color: 'var(--brand-text)', fontWeight: 700 }}>{o.name}</td>
                  <td>{o.partner_id?.[1] || '—'}</td>
                  <td style={{ color: 'var(--gray)' }}>{o.user_id?.[1] || '—'}</td>
                  <td style={{ color: 'var(--gray)' }}>{fmtDate(o.date_order)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(o.amount_total)}</td>
                  <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {recent.length === 0 && <EmptyState Icon={ShoppingCart} title="Aucune commande" subtitle="Les commandes apparaîtront ici" />}
      </div>
    </div>
  );
};

// ─── CLIENTS PAGE ────────────────────────────────────────────────────────────
const ClientsPage = ({ onViewOrders }) => {
  const [data,    setData]    = useState(null);
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await odoo.call('res.partner', 'search_read', [[['customer_rank', '>', 0]]], {
        fields: ['name', 'email', 'phone', 'city', 'sale_order_count'],
        order: 'name asc', limit: 200,
      });
      setData(result);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner fullPage />;
  if (error)   return <ErrorBox message={error} onRetry={load} />;

  const filtered = data.filter(c =>
    c.name?.toLowerCase().includes(q.toLowerCase()) ||
    c.email?.toLowerCase().includes(q.toLowerCase()) ||
    c.city?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 8 }}>Base de données</div>
          <h2 style={{ fontSize: 32 }}>Clients Odoo</h2>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>{data.length} clients au total</p>
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={15} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher un client…" value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', paddingLeft: 42 }} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead><tr>
            <th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th>Cmds</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onViewOrders(c)}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(73,17,28,0.2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--brand-text)', fontWeight: 700, flexShrink: 0 }}>
                      {c.name?.charAt(0).toUpperCase()}
                    </div>
                    {c.name}
                  </div>
                </td>
                <td style={{ color: 'var(--gray)' }}>{c.email || '—'}</td>
                <td style={{ color: 'var(--gray)' }}>{c.phone || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>
                  <span style={{ background: 'rgba(73,17,28,0.15)', color: 'var(--brand-text)', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    {c.sale_order_count || 0}
                  </span>
                </td>
                <td style={{ color: 'var(--brand-text)' }}><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState Icon={Users} title="Aucun client trouvé" subtitle="Essayez une autre recherche" />}
      </div>
    </div>
  );
};

// ─── CLIENT ORDERS PANEL ──────────────────────────────────────────────────────
const ClientOrdersPanel = ({ client, onBack }) => {
  const [orders,  setOrders]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await odoo.call('sale.order', 'search_read', [[['partner_id', '=', client.id]]], {
          fields: ['name', 'amount_total', 'state', 'date_order', 'user_id'],
          order: 'id desc', limit: 50,
        });
        setOrders(r);
      } catch (e) { setError(e.message); }
      setLoading(false);
    })();
  }, [client.id]);

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <button onClick={onBack} style={{ background: 'none', color: 'var(--brand-text)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, cursor: 'pointer', border: 'none' }}>
        <ArrowLeft size={16} /> Retour aux clients
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(73,17,28,0.2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--brand-text)', fontWeight: 700 }}>
          {client.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: 26 }}>{client.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>{client.email || ''}{client.city ? (client.email ? ' · ' : '') + client.city : ''}</div>
        </div>
      </div>
      {loading && <Spinner fullPage />}
      {error   && <ErrorBox message={error} />}
      {orders  && (
        <div className="table-container">
          <table>
            <thead><tr><th>Référence</th><th>Commercial</th><th>Date</th><th style={{ textAlign: 'right' }}>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {orders.map(o => {
                const s = STATUS[o.state] || { label: o.state, cls: 'badge-draft' };
                return (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--brand-text)', fontWeight: 700 }}>{o.name}</td>
                    <td style={{ color: 'var(--gray)' }}>{o.user_id?.[1] || '—'}</td>
                    <td style={{ color: 'var(--gray)' }}>{fmtDate(o.date_order)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(o.amount_total)}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && <EmptyState Icon={ShoppingCart} title="Aucune commande" subtitle="Ce client n'a pas encore de commandes" />}
        </div>
      )}
    </div>
  );
};

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
const ProductsPage = () => {
  const [data,     setData]     = useState(null);
  const [q,        setQ]        = useState('');
  const [category, setCategory] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await odoo.call('product.template', 'search_read', [[['sale_ok', '=', true]]], {
        fields: ['name', 'categ_id', 'list_price', 'default_code'],
        order: 'name asc', limit: 500,
      });
      setData(r);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner fullPage />;
  if (error)   return <ErrorBox message={error} onRetry={load} />;

  const categories = [...new Set(data.map(p => p.categ_id?.[1]).filter(Boolean))].sort();
  const filtered = data.filter(p => {
    const matchQ   = !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.default_code?.toLowerCase().includes(q.toLowerCase());
    const matchCat = !category || p.categ_id?.[1] === category;
    return matchQ && matchCat;
  });

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 8 }}>Catalogue</div>
          <h2 style={{ fontSize: 32 }}>Produits</h2>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>{filtered.length} produits affichés</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Nom ou référence…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 42, width: 240 }} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Référence</th><th>Nom</th><th>Catégorie</th><th style={{ textAlign: 'right' }}>Prix MAD</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={{ color: 'var(--gray)', fontFamily: 'monospace', fontSize: 12 }}>{p.default_code || `MN-${p.id}`}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><span style={{ background: 'rgba(73,17,28,0.12)', color: 'var(--brand-text)', padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{p.categ_id?.[1] || '—'}</span></td>
                <td style={{ textAlign: 'right', color: 'var(--brand-text)', fontWeight: 700, fontSize: 15 }}>{fmt(p.list_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState Icon={Tag} title="Aucun produit trouvé" subtitle="Essayez une autre recherche" />}
      </div>
    </div>
  );
};

// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
const OrdersPage = ({ user }) => {
  const [data,         setData]         = useState(null);
  const [q,            setQ]            = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const domain = user.isManager ? [[]] : [[['user_id', '=', user.uid]]];
      const r = await odoo.call('sale.order', 'search_read', domain, {
        fields: ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id'],
        order: 'id desc', limit: 200,
      });
      setData(r);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner fullPage />;
  if (error)   return <ErrorBox message={error} onRetry={load} />;

  const filtered = data.filter(o => {
    const matchQ = !q || o.name?.toLowerCase().includes(q.toLowerCase()) || o.partner_id?.[1]?.toLowerCase().includes(q.toLowerCase());
    const matchS = !statusFilter || o.state === statusFilter;
    return matchQ && matchS;
  });
  const statCount = s => data.filter(o => o.state === s).length;

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 8 }}>
            {user.isManager ? 'Toutes les ventes' : 'Mes ventes'}
          </div>
          <h2 style={{ fontSize: 32 }}>Commandes</h2>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>{data.length} commandes</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Réf ou client…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 200 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon ({statCount('draft')})</option>
            <option value="sale">Confirmée ({statCount('sale')})</option>
            <option value="done">Terminée ({statCount('done')})</option>
            <option value="cancel">Annulée ({statCount('cancel')})</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {Object.entries(STATUS).map(([key, s]) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={`badge ${s.cls}`}
            style={{ cursor: 'pointer', opacity: statusFilter && statusFilter !== key ? 0.35 : 1, transition: 'opacity 0.2s', border: 'none' }}
          >
            {s.label} · {statCount(key)}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead><tr>
            <th>Référence</th><th>Client</th>
            {user.isManager && <th>Commercial</th>}
            <th>Date</th><th style={{ textAlign: 'right' }}>Montant</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => {
              const s = STATUS[o.state] || { label: o.state, cls: 'badge-draft' };
              return (
                <tr key={o.id}>
                  <td style={{ color: 'var(--brand-text)', fontWeight: 700 }}>{o.name}</td>
                  <td>{o.partner_id?.[1] || '—'}</td>
                  {user.isManager && <td style={{ color: 'var(--gray)' }}>{o.user_id?.[1] || '—'}</td>}
                  <td style={{ color: 'var(--gray)' }}>{fmtDate(o.date_order)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(o.amount_total)}</td>
                  <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState Icon={ShoppingCart} title="Aucune commande" subtitle="Aucune commande ne correspond à vos critères" />}
      </div>
    </div>
  );
};

// ─── NEW ORDER PAGE ───────────────────────────────────────────────────────────
const NewOrderPage = ({ user, onSuccess }) => {
  const [clients,     setClients]     = useState([]);
  const [products,    setProducts]    = useState([]);
  const [partnerId,   setPartner]     = useState('');
  const [lines,       setLines]       = useState([{ productId: '', qty: 1 }]);
  const [loading,     setLoading]     = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success,     setSuccess]     = useState(null);
  const [error,       setError]       = useState('');

  useEffect(() => {
    Promise.all([
      odoo.call('res.partner',  'search_read', [[['customer_rank', '>', 0]]], { fields: ['name', 'id'], order: 'name asc', limit: 500 }),
      odoo.call('product.product', 'search_read', [[['sale_ok', '=', true]]], { fields: ['name', 'id', 'list_price', 'default_code'], order: 'name asc', limit: 500 }),
    ]).then(([c, p]) => { setClients(c); setProducts(p); setLoadingData(false); })
      .catch(e => { setError(e.message); setLoadingData(false); });
  }, []);

  const getProduct = id => products.find(p => String(p.id) === String(id));

  const updateLine = (i, field, value) =>
    setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const removeLine = i =>
    setLines(lines.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => {
    const p = getProduct(l.productId);
    return s + (p ? p.list_price * (l.qty || 0) : 0);
  }, 0);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!partnerId) { setError('Veuillez sélectionner un client.'); return; }
    if (lines.some(l => !l.productId)) { setError('Tous les produits doivent être sélectionnés.'); return; }
    setLoading(true); setError('');
    try {
      const orderLines = lines.map(l => [0, 0, {
        product_id: parseInt(l.productId),
        product_uom_qty: l.qty || 1,
        price_unit: getProduct(l.productId)?.list_price || 0,
      }]);
      await odoo.call('sale.order', 'create', [[{
        partner_id: parseInt(partnerId),
        user_id: user.uid,
        order_line: orderLines,
      }]]);
      setSuccess({ total, clientName: clients.find(c => String(c.id) === String(partnerId))?.name });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (success) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, animation: 'fadeUp 0.4s ease' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(46,204,113,0.1)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
          <CheckCircle2 size={36} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>Commande Créée !</h2>
        <p style={{ color: 'var(--gray)', marginBottom: 8 }}>Pour <strong style={{ color: 'var(--ivory)' }}>{success.clientName}</strong></p>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--brand-text)', margin: '16px 0 32px' }}>{fmt(success.total)}</div>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 32 }}>La commande a été enregistrée dans Odoo avec succès.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-brand" onClick={onSuccess}>Voir les commandes</button>
          <button className="btn-ghost" onClick={() => { setSuccess(null); setLines([{ productId: '', qty: 1 }]); setPartner(''); }}>Nouvelle commande</button>
        </div>
      </div>
    </div>
  );

  if (loadingData) return <Spinner fullPage />;

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 860 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 8 }}>Odoo</div>
        <h2 style={{ fontSize: 32 }}>Nouvelle Commande</h2>
      </div>

      {error && (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '12px 20px', color: '#e07070', fontSize: 13, marginBottom: 24 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Client */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 12 }}>Client *</label>
          <select value={partnerId} onChange={e => setPartner(e.target.value)} style={{ width: '100%' }} required>
            <option value="">Sélectionner un client Odoo…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Order lines */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'var(--brand-text)', textTransform: 'uppercase', marginBottom: 20 }}>Lignes de commande *</label>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 140px 36px', gap: 10, marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>#</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>PRODUIT</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textAlign: 'center' }}>QTÉ</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textAlign: 'right' }}>TOTAL</div>
            <div></div>
          </div>

          {lines.map((ln, i) => {
            const prod = getProduct(ln.productId);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 140px 36px', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--gray)', paddingLeft: 2 }}>{i + 1}.</div>
                <select value={ln.productId} onChange={e => updateLine(i, 'productId', e.target.value)} required style={{ minWidth: 0 }}>
                  <option value="">Choisir un produit…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.default_code ? ` [${p.default_code}]` : ''} — {fmt(p.list_price)}
                    </option>
                  ))}
                </select>
                <input
                  type="number" min="1" value={ln.qty}
                  onChange={e => updateLine(i, 'qty', parseInt(e.target.value) || 1)}
                  style={{ textAlign: 'center', width: '100%' }}
                  required
                />
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: prod ? 'var(--brand-text)' : 'var(--gray)' }}>
                  {prod ? fmt(prod.list_price * (ln.qty || 0)) : '—'}
                </div>
                <button
                  type="button" onClick={() => removeLine(i)}
                  style={{ background: 'none', color: lines.length > 1 ? 'var(--gray2)' : 'transparent', border: 'none', cursor: lines.length > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'color 0.2s' }}
                  disabled={lines.length <= 1}
                  onMouseEnter={e => { if (lines.length > 1) e.currentTarget.style.color = '#e07070'; }}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--gray2)'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}

          <button type="button" onClick={() => setLines([...lines, { productId: '', qty: 1 }])}
            style={{ background: 'none', color: 'var(--brand-text)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', border: 'none', letterSpacing: '0.1em' }}>
            <Plus size={15} /> Ajouter une ligne
          </button>
        </div>

        {/* Total */}
        <div style={{ background: 'rgba(73,17,28,0.08)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--gray)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Total estimé</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--brand-text)', fontWeight: 600 }}>{fmt(total)}</span>
        </div>

        <button type="submit" className="btn-brand" style={{ width: '100%', padding: 16, fontSize: 12, letterSpacing: '0.2em' }} disabled={loading}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Enregistrement…</span>
            : 'ENREGISTRER LA COMMANDE'
          }
        </button>
      </form>
    </div>
  );
};

// ─── SIDEBAR NAV ITEMS ────────────────────────────────────────────────────────
// Dashboard is ONLY shown to managers, completely hidden from commercial
const getNavItems = (isManager) => {
  const items = [];
  if (isManager) {
    items.push({ id: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard });
  }
  items.push(
    { id: 'clients',  label: 'Clients',        Icon: Users },
    { id: 'products', label: 'Produits',        Icon: Tag },
    { id: 'orders',   label: 'Commandes',       Icon: ShoppingCart },
    { id: 'neworder', label: 'Nouvelle vente',  Icon: Plus },
  );
  return items;
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,         setUser]         = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('mn_user')); } catch { return null; }
  });
  const [page,         setPage]         = useState(() => {
    const u = (() => { try { return JSON.parse(sessionStorage.getItem('mn_user')); } catch { return null; } })();
    return u ? (u.isManager ? 'dashboard' : 'clients') : 'login';
  });
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [clientOrders, setClientOrders] = useState(null);

  const handleLogin = u => {
    sessionStorage.setItem('mn_user', JSON.stringify(u));
    setUser(u);
    setPage(u.isManager ? 'dashboard' : 'clients');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mn_user');
    setUser(null);
    setPage('login');
    setClientOrders(null);
  };

  const navigate = id => {
    setPage(id);
    setClientOrders(null);
    setSidebarOpen(false);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const navItems = getNavItems(user.isManager);
  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90 }} />
      )}

      {/* ── SIDEBAR ── */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Brand + Desktop collapse toggle */}
        <div style={{ padding: collapsed ? '0 0 24px' : '0 24px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', overflow: 'hidden' }}>
          {!collapsed && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: 'var(--brand-text)', letterSpacing: '0.2em', whiteSpace: 'nowrap' }}>
              MAISON NOIR
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="sidebar-collapse-btn"
            title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`sidebar-link ${page === item.id && !clientOrders ? 'active' : ''} ${collapsed ? 'sidebar-link-collapsed' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <item.Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{ padding: collapsed ? '20px 0' : '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: collapsed ? 'center' : 'stretch' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(73,17,28,0.2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--brand-text)', fontWeight: 700, flexShrink: 0 }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ivory)', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 9, color: 'var(--brand-text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {user.isManager ? '★ Manager' : 'Commercial'}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{
              background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.18)',
              color: 'var(--red)', padding: collapsed ? '7px' : '8px 12px', borderRadius: 6, fontSize: 11,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.2s', width: '100%',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(231,76,60,0.07)'}
          >
            <LogOut size={13} />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className={`layout-main ${collapsed ? 'layout-main-collapsed' : ''}`}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--ivory)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: 'var(--brand-text)', letterSpacing: '0.2em' }}>MAISON NOIR</div>
          <div style={{ width: 30 }} />
        </div>

        {page === 'dashboard' && user.isManager  && <DashboardPage user={user} />}
        {page === 'clients'   && !clientOrders   && <ClientsPage user={user} onViewOrders={c => setClientOrders(c)} />}
        {page === 'clients'   && clientOrders    && <ClientOrdersPanel client={clientOrders} onBack={() => setClientOrders(null)} />}
        {page === 'products'  && <ProductsPage />}
        {page === 'orders'    && <OrdersPage user={user} />}
        {page === 'neworder'  && <NewOrderPage user={user} onSuccess={() => navigate('orders')} />}
      </main>
    </>
  );
}
