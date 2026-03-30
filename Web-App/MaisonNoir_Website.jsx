import { useState, useEffect, useRef } from "react";

// ─── API CONFIG — Laravel Bridge (same as mobile app) ───────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

const API = {
  _token: null,
  getToken() { return this._token || localStorage.getItem("mn_jwt"); },
  setToken(t) { this._token = t; localStorage.setItem("mn_jwt", t); },
  clearToken() { this._token = null; localStorage.removeItem("mn_jwt"); localStorage.removeItem("mn_user"); },
  saveUser(u) { localStorage.setItem("mn_user", JSON.stringify(u)); },
  getUser() { try { return JSON.parse(localStorage.getItem("mn_user")); } catch { return null; } },

  async req(method, path, body, auth = true) {
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };
    if (auth) { const t = this.getToken(); if (t) headers["Authorization"] = `Bearer ${t}`; }
    const res = await fetch(`${API_BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
    return data;
  },

  async login(email, password) {
    const data = await this.req("POST", "/login", { email, password }, false);
    this.setToken(data.token);
    this.saveUser(data.user);
    return data.user;
  },
  async logout() {
    try { await this.req("POST", "/logout"); } catch {}
    this.clearToken();
  },
  async getClients()  { const d = await this.req("GET", "/clients");  return d.data; },
  async getProducts() { const d = await this.req("GET", "/products"); return d.data; },
  async getOrders()   { const d = await this.req("GET", "/orders");   return d.data; },
  async createOrder(partnerId, lines) {
    return this.req("POST", "/orders", {
      partner_id: partnerId,
      lines: lines.map(l => ({ product_id: l.id, qty: l.qty, price_unit: l.price })),
    });
  },
  async getDashboard() { return this.req("GET", "/dashboard"); },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id:1, name:"Veste Signature Noir", ref:"MN-VES-001", price:4800, category:"Vêtements", desc:"Veste tailleur en laine premium, coupe architecturale. La pièce maîtresse de votre garde-robe.", tag:"Bestseller" },
  { id:2, name:"Robe Minuit", ref:"MN-ROB-002", price:6200, category:"Vêtements", desc:"Robe longue en soie naturelle, col bateau, finitions dorées. L'incarnation de l'élégance nocturne.", tag:"Nouveau" },
  { id:3, name:"Costume Élite Homme", ref:"MN-COS-003", price:8500, category:"Vêtements", desc:"Costume deux pièces en laine mérinos, doublure soie. Taillé pour l'excellence.", tag:"" },
  { id:4, name:"Sac Cuir Or", ref:"MN-SAC-004", price:3200, category:"Accessoires", desc:"Sac à main en cuir grainé, fermoir doré. Trois compartiments pour une organisation parfaite.", tag:"" },
  { id:5, name:"Foulard Soie Imprimé", ref:"MN-FOU-005", price:1400, category:"Accessoires", desc:"Foulard 90×90 cm en soie twill, motifs géométriques exclusifs.", tag:"" },
  { id:6, name:"Escarpins Nuit", ref:"MN-ESC-006", price:2900, category:"Chaussures", desc:"Escarpins en cuir verni noir, talon 9 cm, bout carré. Une silhouette affûtée.", tag:"Nouveau" },
  { id:7, name:"Ceinture Cuir Premium", ref:"MN-CEI-007", price:890, category:"Accessoires", desc:"Ceinture en cuir pleine fleur, boucle en métal doré.", tag:"" },
  { id:8, name:"Manteau Long Cachemire", ref:"MN-MAN-008", price:12500, category:"Vêtements", desc:"Manteau long en cachemire pur, coupe droite, boutons nacrés. Le luxe absolu.", tag:"Édition Limitée" },
  { id:9, name:"Pochette Soirée", ref:"MN-POC-009", price:1800, category:"Accessoires", desc:"Pochette minaudière en tissu brodé, fermoir clip doré.", tag:"" },
  { id:10, name:"Pantalon Tailleur", ref:"MN-PAN-010", price:2600, category:"Vêtements", desc:"Pantalon tailleur coupe droite, tissu crêpe haute couture.", tag:"" },
];

const CATEGORIES = ["Tous", "Vêtements", "Accessoires", "Chaussures"];

const fmt = n => new Intl.NumberFormat("fr-MA",{minimumFractionDigits:0,maximumFractionDigits:0}).format(n) + " MAD";

// ─── ICONS (inline SVG) ───────────────────────────────────────────────────────
const Icon = {
  bag: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  minus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#080808; --bg2:#111; --bg3:#1a1a1a;
      --gold:#C9A96E; --gold2:#E8D5A8; --gold3:#9A7A45;
      --ivory:#F0EBE1; --white:#fff;
      --gray:#888; --gray2:#555; --border:rgba(201,169,110,0.15);
    }
    html{scroll-behavior:smooth}
    body,#root{background:var(--bg);color:var(--ivory);font-family:'Montserrat',sans-serif;min-height:100vh}
    h1,h2,h3,h4,h5{font-family:'Cormorant Garamond',serif;font-weight:400}
    button{font-family:'Montserrat',sans-serif;cursor:pointer;border:none}
    input,select,textarea{font-family:'Montserrat',sans-serif;background:transparent;color:var(--ivory);outline:none}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:var(--bg)}
    ::-webkit-scrollbar-thumb{background:var(--gold3);border-radius:2px}
    ::selection{background:var(--gold);color:#000}
    img{display:block;width:100%}

    @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeInFast{from{opacity:0}to{opacity:1}}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

    .anim{animation:fadeIn 0.7s ease forwards}
    .anim2{animation:fadeIn 0.7s ease 0.15s forwards;opacity:0}
    .anim3{animation:fadeIn 0.7s ease 0.3s forwards;opacity:0}

    .btn-gold{
      background:var(--gold);color:#000;border:none;
      padding:13px 32px;font-size:10px;font-weight:600;
      letter-spacing:0.2em;text-transform:uppercase;
      transition:all 0.25s;cursor:pointer
    }
    .btn-gold:hover{background:var(--gold2)}
    .btn-outline{
      background:transparent;color:var(--gold);
      border:1px solid rgba(201,169,110,0.4);
      padding:12px 32px;font-size:10px;font-weight:500;
      letter-spacing:0.18em;text-transform:uppercase;
      transition:all 0.25s;cursor:pointer
    }
    .btn-outline:hover{border-color:var(--gold);background:rgba(201,169,110,0.06)}
    .btn-dark{
      background:var(--bg3);color:var(--ivory);
      border:1px solid var(--border);
      padding:12px 28px;font-size:10px;font-weight:500;
      letter-spacing:0.15em;text-transform:uppercase;
      transition:all 0.25s;cursor:pointer
    }
    .btn-dark:hover{border-color:var(--gold);color:var(--gold)}

    .product-card:hover .product-img-wrap::after{opacity:1}
    .product-card:hover .product-actions{opacity:1;transform:translateY(0)}
    .nav-link{
      font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
      color:var(--gray);text-decoration:none;transition:color 0.2s;background:none;border:none;padding:0
    }
    .nav-link:hover,.nav-link.active{color:var(--ivory)}
    .input-field{
      width:100%;background:rgba(255,255,255,0.04);
      border:1px solid var(--border);color:var(--ivory);
      padding:13px 16px;font-size:12px;letter-spacing:0.05em;
      transition:border 0.2s
    }
    .input-field:focus{border-color:var(--gold)}
    .input-field::placeholder{color:var(--gray2)}
    .overlay-bg{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;animation:fadeInFast 0.2s}
    .divider{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0.3;margin:0}
  `}</style>
);

// ─── MARQUEE BANNER ───────────────────────────────────────────────────────────
const Marquee = () => {
  const text = "  L'ÉLÉGANCE, SCULPTÉE DANS L'OBSCURITÉ  ·  MAISON NOIR  ·  LUXURY READY-TO-WEAR  ·  CASABLANCA · RABAT · MARRAKECH  ·  ";
  return (
    <div style={{ background:"var(--gold)", overflow:"hidden", height:32, display:"flex", alignItems:"center" }}>
      <div style={{ display:"flex", animation:"marquee 20s linear infinite", whiteSpace:"nowrap" }}>
        {[text,text].map((t,i)=>(
          <span key={i} style={{ fontSize:9, fontWeight:600, letterSpacing:"0.25em", color:"#000" }}>{t}</span>
        ))}
      </div>
    </div>
  );
};

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
const Navbar = ({ page, setPage, cartCount, onCartOpen, user, onAuthOpen, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position:"fixed", top:32, left:0, right:0, zIndex:100,
      background: scrolled ? "rgba(8,8,8,0.97)" : "transparent",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      transition:"all 0.4s", padding:"0 48px",
      display:"flex", alignItems:"center", justifyContent:"space-between", height:64,
    }}>
      {/* Left nav */}
      <div style={{ display:"flex", gap:36, alignItems:"center" }}>
        <button className="nav-link" onClick={()=>setPage("home")}>Accueil</button>
        <button className="nav-link" onClick={()=>setPage("shop")}>Collections</button>
        <button className="nav-link" onClick={()=>setPage("shop")}>Boutiques</button>
      </div>

      {/* Logo center */}
      <button onClick={()=>setPage("home")} style={{ background:"none", border:"none", cursor:"pointer", textAlign:"center" }}>
        <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:22, fontWeight:500, color:"var(--gold)", letterSpacing:"0.35em" }}>
          MAISON NOIR
        </div>
        <div style={{ fontSize:7, letterSpacing:"0.6em", color:"var(--gray)", marginTop:2 }}>LUXURY READY-TO-WEAR</div>
      </button>

      {/* Right actions */}
      <div style={{ display:"flex", gap:24, alignItems:"center" }}>
        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontSize:10, color:"var(--gold)", letterSpacing:"0.1em" }}>{user.name}</span>
            <button className="nav-link" onClick={onLogout}>Déconnexion</button>
          </div>
        ) : (
          <button className="nav-link" onClick={onAuthOpen} style={{ display:"flex", alignItems:"center", gap:8 }}>
            {Icon.user}
          </button>
        )}
        <button onClick={onCartOpen} style={{
          background:"none", border:"none", color:"var(--ivory)", cursor:"pointer",
          display:"flex", alignItems:"center", gap:8, position:"relative",
        }}>
          {Icon.bag}
          {cartCount > 0 && (
            <span style={{
              position:"absolute", top:-8, right:-8,
              background:"var(--gold)", color:"#000",
              width:16, height:16, borderRadius:"50%",
              fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center",
            }}>{cartCount}</span>
          )}
        </button>
      </div>
    </nav>
  );
};

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
const HomePage = ({ setPage, addToCart }) => {
  const featured = PRODUCTS.filter(p => p.tag).slice(0,3);
  const categories = [
    { name:"Vêtements", count:"06 pièces" },
    { name:"Accessoires", count:"04 pièces" },
    { name:"Chaussures", count:"01 pièce" },
  ];

  return (
    <div>
      {/* HERO */}
      <section style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden",
        background:"radial-gradient(ellipse at 30% 60%, #1a1208 0%, var(--bg) 65%)",
      }}>
        {/* Grid texture */}
        <div style={{
          position:"absolute", inset:0, opacity:0.035,
          backgroundImage:"linear-gradient(var(--gold) 1px,transparent 1px),linear-gradient(90deg,var(--gold) 1px,transparent 1px)",
          backgroundSize:"80px 80px",
        }}/>

        {/* Decorative vertical lines */}
        {[0.2, 0.8].map(x=>(
          <div key={x} style={{
            position:"absolute", top:0, bottom:0, left:`${x*100}%`, width:1,
            background:"linear-gradient(to bottom,transparent,rgba(201,169,110,0.15),transparent)",
          }}/>
        ))}

        <div style={{ textAlign:"center", position:"relative", padding:"0 24px", maxWidth:900 }}>
          <div className="anim" style={{ fontSize:10, letterSpacing:"0.5em", color:"var(--gold)", textTransform:"uppercase", marginBottom:28 }}>
            Collection 2024 — 2025
          </div>
          <h1 className="anim2" style={{
            fontSize:"clamp(52px, 10vw, 110px)", lineHeight:0.9, color:"var(--ivory)",
            fontFamily:"'Cormorant Garamond', serif", fontWeight:300, marginBottom:12,
          }}>
            L'Obscurité<br />
            <em style={{ color:"var(--gold)", fontStyle:"italic" }}>Magnifiée</em>
          </h1>
          <p className="anim3" style={{
            fontSize:13, color:"var(--gray)", letterSpacing:"0.08em", lineHeight:2,
            maxWidth:480, margin:"28px auto 44px",
          }}>
            Des pièces sculptées dans la nuit marocaine. Une mode qui transcende les saisons, taillée pour celles et ceux qui refusent l'ordinaire.
          </p>
          <div className="anim3" style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-gold" onClick={()=>setPage("shop")}>Découvrir la Collection</button>
            <button className="btn-outline" onClick={()=>setPage("shop")}>Voir les Lookbooks</button>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position:"absolute", bottom:40, left:"50%", transform:"translateX(-50%)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:8,
          fontSize:8, letterSpacing:"0.3em", color:"var(--gray)",
        }}>
          <div style={{ width:1, height:40, background:"linear-gradient(to bottom,transparent,var(--gold))" }}/>
          SCROLL
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section style={{ padding:"100px 48px" }}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <div style={{ fontSize:9, letterSpacing:"0.4em", color:"var(--gold)", textTransform:"uppercase", marginBottom:16 }}>Nos Univers</div>
          <h2 style={{ fontSize:44, color:"var(--ivory)" }}>Explorez les Collections</h2>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, maxWidth:1200, margin:"0 auto" }}>
          {categories.map((cat,i) => (
            <button key={cat.name} onClick={()=>setPage("shop")} style={{
              position:"relative", aspectRatio:"3/4", overflow:"hidden",
              background: i===0?"#141008":i===1?"#0e1014":"#0a100e",
              border:"none", cursor:"pointer", display:"flex", alignItems:"flex-end", padding:32,
              transition:"transform 0.4s",
            }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(0.99)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {/* Abstract pattern */}
              <div style={{
                position:"absolute", inset:0, opacity:0.06,
                background:`radial-gradient(ellipse at ${i*30+20}% 40%,var(--gold),transparent 60%)`,
              }}/>
              <div style={{
                position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                fontSize:120, opacity:0.04, color:"var(--gold)",
                fontFamily:"'Cormorant Garamond',serif", fontWeight:600, userSelect:"none",
              }}>
                {i===0?"V":i===1?"A":"C"}
              </div>
              <div style={{ position:"relative", textAlign:"left" }}>
                <div style={{ fontSize:9, letterSpacing:"0.3em", color:"var(--gold)", marginBottom:8 }}>{cat.count}</div>
                <h3 style={{ fontSize:28, color:"var(--ivory)" }}>{cat.name}</h3>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* FEATURED PRODUCTS */}
      <section style={{ padding:"100px 48px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", maxWidth:1200, margin:"0 auto 48px" }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:"0.4em", color:"var(--gold)", textTransform:"uppercase", marginBottom:12 }}>Sélection</div>
            <h2 style={{ fontSize:40 }}>Pièces Signatures</h2>
          </div>
          <button className="btn-outline" onClick={()=>setPage("shop")}>Tout voir {Icon.arrow}</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24, maxWidth:1200, margin:"0 auto" }}>
          {featured.map(p=><ProductCard key={p.id} p={p} addToCart={addToCart}/>)}
        </div>
      </section>

      {/* BRAND STRIP */}
      <section style={{
        padding:"80px 48px",
        background:"rgba(201,169,110,0.04)",
        borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)",
      }}>
        <div style={{ maxWidth:1000, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:9, letterSpacing:"0.5em", color:"var(--gold)", marginBottom:24 }}>MAISON NOIR · FONDÉE EN 2018 À CASABLANCA</div>
          <h2 style={{ fontSize:"clamp(32px,5vw,56px)", lineHeight:1.2, color:"var(--ivory)", marginBottom:24 }}>
            "L'élégance, sculptée<br/>dans l'obscurité."
          </h2>
          <p style={{ fontSize:13, color:"var(--gray)", lineHeight:2, maxWidth:600, margin:"0 auto 40px" }}>
            Maison Noir est une maison de mode marocaine haut de gamme. Chaque pièce est conçue pour transcender les saisons, alliant le savoir-faire artisanal marocain à une vision contemporaine du luxe.
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:64 }}>
            {[["6","Boutiques"],["12","Commerciaux"],["3","Villes"],["2018","Fondation"]].map(([n,l])=>(
              <div key={l}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, color:"var(--gold)", lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:9, letterSpacing:"0.2em", color:"var(--gray)", marginTop:6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ padding:"80px 48px", textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:"0.4em", color:"var(--gold)", marginBottom:16 }}>EXCLUSIVITÉS</div>
        <h2 style={{ fontSize:36, marginBottom:12 }}>Rejoignez l'Univers Maison Noir</h2>
        <p style={{ fontSize:12, color:"var(--gray)", marginBottom:32 }}>Accès en avant-première aux collections, invitations privées.</p>
        <div style={{ display:"flex", maxWidth:440, margin:"0 auto", gap:0 }}>
          <input placeholder="Votre adresse e-mail" className="input-field" style={{ flex:1, borderRight:"none" }} />
          <button className="btn-gold" style={{ whiteSpace:"nowrap" }}>S'inscrire</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid var(--border)", padding:"48px", background:"var(--bg2)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:48 }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:"var(--gold)", letterSpacing:"0.3em", marginBottom:16 }}>MAISON NOIR</div>
            <p style={{ fontSize:11, color:"var(--gray)", lineHeight:2, maxWidth:260 }}>Luxury Ready-to-Wear · Casablanca, Maroc</p>
          </div>
          {[
            ["Collections",["Vêtements","Accessoires","Chaussures","Lookbook"]],
            ["Maison",["Notre Histoire","Boutiques","Carrières","Presse"]],
            ["Service",["FAQ","Livraison","Retours","Contact"]],
          ].map(([title,links])=>(
            <div key={title}>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"var(--gold)", textTransform:"uppercase", marginBottom:20 }}>{title}</div>
              {links.map(l=>(
                <div key={l} style={{ fontSize:11, color:"var(--gray)", marginBottom:10, letterSpacing:"0.05em" }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth:1200, margin:"40px auto 0", paddingTop:24, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, color:"var(--gray2)" }}>© 2024 Maison Noir · Tous droits réservés</span>
          <span style={{ fontSize:10, color:"var(--gray2)" }}>Casablanca · Rabat · Marrakech</span>
        </div>
      </footer>
    </div>
  );
};

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
const ProductCard = ({ p, addToCart }) => (
  <div className="product-card" style={{ position:"relative" }}>
    {/* Image area */}
    <div className="product-img-wrap" style={{
      aspectRatio:"3/4", position:"relative", overflow:"hidden",
      background:"#111",
    }}>
      {/* Stylised placeholder */}
      <div style={{
        position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
        background:`linear-gradient(135deg,#0f0d08,#1a1710)`,
      }}>
        <div style={{
          fontSize:80, opacity:0.08, color:"var(--gold)",
          fontFamily:"'Cormorant Garamond',serif", fontWeight:600, userSelect:"none",
        }}>
          MN
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%",
          background:"linear-gradient(to bottom,transparent,rgba(0,0,0,0.6))" }}/>
      </div>

      {/* Hover overlay */}
      <div style={{
        position:"absolute", inset:0, background:"rgba(0,0,0,0.35)",
        opacity:0, transition:"opacity 0.3s",
      }} className="product-img-overlay"/>

      {/* Tag */}
      {p.tag && (
        <div style={{
          position:"absolute", top:16, left:16,
          background:"var(--gold)", color:"#000",
          fontSize:8, fontWeight:700, letterSpacing:"0.2em",
          padding:"4px 10px", textTransform:"uppercase",
        }}>{p.tag}</div>
      )}

      {/* Quick add */}
      <div className="product-actions" style={{
        position:"absolute", bottom:0, left:0, right:0,
        opacity:0, transform:"translateY(8px)", transition:"all 0.3s",
        padding:16,
      }}>
        <button className="btn-gold" style={{ width:"100%", padding:"12px" }}
          onClick={()=>addToCart(p)}>
          Ajouter au panier
        </button>
      </div>
    </div>

    {/* Info */}
    <div style={{ padding:"16px 4px 0" }}>
      <div style={{ fontSize:9, letterSpacing:"0.2em", color:"var(--gold3)", textTransform:"uppercase", marginBottom:6 }}>
        {p.category} · {p.ref}
      </div>
      <h3 style={{ fontSize:17, color:"var(--ivory)", marginBottom:6, fontFamily:"'Cormorant Garamond',serif", fontWeight:400, lineHeight:1.2 }}>{p.name}</h3>
      <div style={{ fontSize:14, color:"var(--gold)" }}>{fmt(p.price)}</div>
    </div>
  </div>
);

// ─── SHOP PAGE ────────────────────────────────────────────────────────────────
const ShopPage = ({ addToCart }) => {
  const [activecat, setActivecat] = useState("Tous");
  const [sort, setSort] = useState("default");

  let products = activecat==="Tous" ? PRODUCTS : PRODUCTS.filter(p=>p.category===activecat);
  if (sort==="asc") products = [...products].sort((a,b)=>a.price-b.price);
  if (sort==="desc") products = [...products].sort((a,b)=>b.price-a.price);

  return (
    <div style={{ paddingTop:96 }}>
      {/* Header */}
      <div style={{
        padding:"64px 48px 48px",
        borderBottom:"1px solid var(--border)",
        display:"flex", justifyContent:"space-between", alignItems:"flex-end",
      }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:"0.4em", color:"var(--gold)", textTransform:"uppercase", marginBottom:12 }}>
            Maison Noir
          </div>
          <h1 style={{ fontSize:48, color:"var(--ivory)" }}>Toutes les Collections</h1>
          <p style={{ fontSize:12, color:"var(--gray)", marginTop:8 }}>{products.length} pièces disponibles</p>
        </div>
        <select onChange={e=>setSort(e.target.value)} value={sort} style={{
          background:"var(--bg2)", border:"1px solid var(--border)", color:"var(--ivory)",
          padding:"10px 16px", fontSize:11, letterSpacing:"0.1em",
        }}>
          <option value="default">Trier par — Défaut</option>
          <option value="asc">Prix croissant</option>
          <option value="desc">Prix décroissant</option>
        </select>
      </div>

      <div style={{ display:"flex", minHeight:"80vh" }}>
        {/* Filters sidebar */}
        <div style={{ width:200, borderRight:"1px solid var(--border)", padding:"40px 32px", flexShrink:0 }}>
          <div style={{ fontSize:9, letterSpacing:"0.3em", color:"var(--gold)", textTransform:"uppercase", marginBottom:24 }}>Catégories</div>
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setActivecat(c)} style={{
              display:"block", width:"100%", textAlign:"left", background:"none", border:"none",
              padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)",
              fontSize:11, letterSpacing:"0.1em",
              color: activecat===c ? "var(--gold)" : "var(--gray)",
              cursor:"pointer", transition:"color 0.2s",
            }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex:1, padding:"40px 48px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:32 }}>
            {products.map(p=><ProductCard key={p.id} p={p} addToCart={addToCart}/>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
const CartDrawer = ({ cart, setCart, onClose, user, onAuthOpen, onCheckout }) => {
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);

  const update = (id,delta) => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+delta)}:i));
  const remove = id => setCart(c=>c.filter(i=>i.id!==id));

  return (
    <>
      <div className="overlay-bg" onClick={onClose}/>
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, width:420, zIndex:300,
        background:"var(--bg2)", borderLeft:"1px solid var(--border)",
        display:"flex", flexDirection:"column",
        animation:"slideIn 0.35s ease",
      }}>
        {/* Header */}
        <div style={{ padding:"28px 32px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ fontSize:22, color:"var(--ivory)" }}>Votre Panier</h3>
            <div style={{ fontSize:10, color:"var(--gray)", letterSpacing:"0.1em", marginTop:4 }}>{cart.length} article{cart.length!==1?"s":""}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--gray)", cursor:"pointer" }}>{Icon.x}</button>
        </div>

        {/* Items */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 32px" }}>
          {cart.length===0 ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:"var(--gray)" }}>
              <div style={{ fontSize:40, marginBottom:16, opacity:0.3 }}>{Icon.bag}</div>
              <p style={{ fontSize:12, letterSpacing:"0.1em" }}>Votre panier est vide</p>
            </div>
          ) : cart.map(item=>(
            <div key={item.id} style={{ padding:"20px 0", borderBottom:"1px solid var(--border)", display:"flex", gap:16, alignItems:"flex-start" }}>
              {/* Thumb */}
              <div style={{ width:72, height:90, background:"#1a1710", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:18, opacity:0.2, color:"var(--gold)", fontFamily:"'Cormorant Garamond',serif" }}>MN</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, letterSpacing:"0.15em", color:"var(--gold3)", marginBottom:4 }}>{item.ref}</div>
                <div style={{ fontSize:13, color:"var(--ivory)", marginBottom:8, lineHeight:1.3, fontFamily:"'Cormorant Garamond',serif", fontWeight:400 }}>{item.name}</div>
                <div style={{ fontSize:13, color:"var(--gold)", marginBottom:12 }}>{fmt(item.price)}</div>
                <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                  <button onClick={()=>update(item.id,-1)} style={{ background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--ivory)",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>{Icon.minus}</button>
                  <span style={{ width:36,textAlign:"center",fontSize:12,color:"var(--ivory)",border:"1px solid var(--border)",borderLeft:"none",borderRight:"none",height:28,lineHeight:"28px" }}>{item.qty}</span>
                  <button onClick={()=>update(item.id,1)} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderLeft:"none",color:"var(--ivory)",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>{Icon.plus}</button>
                  <button onClick={()=>remove(item.id)} style={{ background:"none",border:"none",color:"var(--gray2)",cursor:"pointer",marginLeft:12,fontSize:11,letterSpacing:"0.1em" }}>Retirer</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding:"24px 32px", borderTop:"1px solid var(--border)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:11, color:"var(--gray)", letterSpacing:"0.1em" }}>Sous-total</span>
              <span style={{ fontSize:14, color:"var(--ivory)" }}>{fmt(total)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:11, color:"var(--gray)", letterSpacing:"0.1em" }}>Livraison</span>
              <span style={{ fontSize:11, color:"var(--gold)" }}>Offerte</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24, paddingTop:16, borderTop:"1px solid var(--border)" }}>
              <span style={{ fontSize:13, color:"var(--ivory)", fontWeight:600, letterSpacing:"0.1em" }}>Total</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:"var(--gold)" }}>{fmt(total)}</span>
            </div>
            {user ? (
              <button className="btn-gold" style={{ width:"100%", padding:15 }} onClick={onCheckout}>
                Passer la commande
              </button>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:11, color:"var(--gray)", textAlign:"center", marginBottom:4, letterSpacing:"0.05em" }}>
                  Connectez-vous pour finaliser votre commande
                </div>
                <button className="btn-gold" style={{ width:"100%", padding:14 }} onClick={onAuthOpen}>
                  Se connecter / S'inscrire
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
const AuthModal = ({ onClose, onLogin }) => {
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode==="login") {
        // Login through Laravel API — same endpoint as mobile app
        const user = await API.login(form.email, form.password);
        onLogin(user);
      } else {
        if (!form.name || !form.email || !form.password) throw new Error("Tous les champs sont requis.");
        if (form.password!==form.confirm) throw new Error("Les mots de passe ne correspondent pas.");
        throw new Error("La création de compte se fait via l'administration Odoo. Veuillez contacter votre responsable.");
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <>
      <div className="overlay-bg" onClick={onClose}/>
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        zIndex:300, width:440, background:"var(--bg2)",
        border:"1px solid var(--border)", padding:"48px",
        animation:"scaleIn 0.25s ease",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute",top:20,right:20,background:"none",border:"none",color:"var(--gray)",cursor:"pointer" }}>{Icon.x}</button>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"var(--gold)",letterSpacing:"0.35em",marginBottom:4 }}>MAISON NOIR</div>
          <h2 style={{ fontSize:24, color:"var(--ivory)", marginBottom:6 }}>
            {mode==="login" ? "Connexion" : "Créer un compte"}
          </h2>
          <p style={{ fontSize:11, color:"var(--gray)" }}>
            {mode==="login" ? "Accédez à votre espace client" : "Rejoignez l'univers Maison Noir"}
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
          {mode==="signup" && (
            <input className="input-field" placeholder="Nom complet" value={form.name} onChange={set("name")} />
          )}
          <input className="input-field" placeholder="Adresse e-mail" type="email" value={form.email} onChange={set("email")} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          <input className="input-field" placeholder="Mot de passe" type="password" value={form.password} onChange={set("password")} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          {mode==="signup" && (
            <input className="input-field" placeholder="Confirmer le mot de passe" type="password" value={form.confirm} onChange={set("confirm")} />
          )}
        </div>

        {error && (
          <div style={{ background:"rgba(220,80,80,0.1)",border:"1px solid rgba(220,80,80,0.3)",padding:"10px 14px",fontSize:11,color:"#e07070",marginBottom:16,lineHeight:1.5 }}>
            {error}
          </div>
        )}

        <button className="btn-gold" style={{ width:"100%", padding:15, marginBottom:16 }} onClick={handleSubmit}>
          {loading ? "…" : mode==="login" ? "Se connecter" : "Créer le compte"}
        </button>

        <div style={{ textAlign:"center" }}>
          <span style={{ fontSize:11, color:"var(--gray)" }}>
            {mode==="login" ? "Pas encore de compte ? " : "Déjà client ? "}
          </span>
          <button onClick={()=>{ setMode(m=>m==="login"?"signup":"login"); setError(""); }} style={{
            background:"none",border:"none",color:"var(--gold)",fontSize:11,cursor:"pointer",
            textDecoration:"underline",textUnderlineOffset:3,
          }}>
            {mode==="login" ? "S'inscrire" : "Se connecter"}
          </button>
        </div>

        {mode==="login" && (
          <div style={{ textAlign:"center", marginTop:20, padding:"16px",background:"rgba(255,255,255,0.02)",borderRadius:2 }}>
            <div style={{ fontSize:9, letterSpacing:"0.15em", color:"var(--gray2)", marginBottom:4 }}>COMPTE DÉMO</div>
            <div style={{ fontSize:10, color:"var(--gray)" }}>demo@demo.com · demo</div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── ORDER SUCCESS MODAL ──────────────────────────────────────────────────────
const SuccessModal = ({ orderId, total, onClose }) => (
  <>
    <div className="overlay-bg" onClick={onClose}/>
    <div style={{
      position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
      zIndex:300,width:420,background:"var(--bg2)",
      border:"1px solid rgba(201,169,110,0.4)",padding:"56px 48px",textAlign:"center",
      animation:"scaleIn 0.3s ease",
    }}>
      <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(201,169,110,0.1)",border:"1px solid var(--gold)",
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",color:"var(--gold)" }}>
        {Icon.check}
      </div>
      <h2 style={{ fontSize:28,color:"var(--ivory)",marginBottom:8 }}>Commande Confirmée</h2>
      <div style={{ fontSize:11,color:"var(--gold)",letterSpacing:"0.15em",marginBottom:16 }}>
        {orderId || "DEV/2024/0006"}
      </div>
      <p style={{ fontSize:12,color:"var(--gray)",lineHeight:2,marginBottom:8 }}>
        Votre commande d'un montant de
      </p>
      <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:"var(--gold)",marginBottom:24 }}>
        {fmt(total)}
      </div>
      <p style={{ fontSize:11,color:"var(--gray)",lineHeight:2,marginBottom:32 }}>
        a été transmise à notre équipe. Vous recevrez une confirmation par e-mail sous peu.
      </p>
      <button className="btn-gold" style={{ width:"100%",padding:14 }} onClick={onClose}>
        Continuer mes achats
      </button>
    </div>
  </>
);

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(API.getUser); // restore from localStorage
  const [success, setSuccess] = useState(null);

  const addToCart = (product) => {
    setCart(c => {
      const exists = c.find(i=>i.id===product.id);
      return exists ? c.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i) : [...c,{...product,qty:1}];
    });
    setCartOpen(true);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setAuthOpen(false);
  };

  const handleLogout = async () => {
    await API.logout();
    setUser(null);
  };

  const handleCheckout = async () => {
    if (!user) { setAuthOpen(true); return; }
    const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
    try {
      // Same API as mobile: POST /api/orders with { partner_id, lines: [{product_id, qty}] }
      const res = await API.createOrder(
        user.uid ?? user.id ?? 1,
        cart.map(i => ({ id: i.id, qty: i.qty, price: i.price }))
      );
      setSuccess({ orderId: res?.data?.name ?? null, total });
    } catch (err) {
      // Show error but still clear cart to avoid duplicate orders
      setSuccess({ orderId: null, total, error: err.message });
    }
    setCart([]);
    setCartOpen(false);
  };

  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  return (
    <>
      <S/>

      {/* Marquee top */}
      <div style={{ position:"fixed",top:0,left:0,right:0,zIndex:110 }}>
        <Marquee/>
      </div>

      <Navbar
        page={page} setPage={setPage}
        cartCount={cartCount} onCartOpen={()=>setCartOpen(true)}
        user={user} onAuthOpen={()=>setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main>
        {page==="home" && <HomePage setPage={setPage} addToCart={addToCart}/>}
        {page==="shop" && <ShopPage addToCart={addToCart}/>}
      </main>

      {cartOpen && (
        <CartDrawer
          cart={cart} setCart={setCart}
          onClose={()=>setCartOpen(false)}
          user={user} onAuthOpen={()=>{ setAuthOpen(true); }}
          onCheckout={handleCheckout}
        />
      )}

      {authOpen && <AuthModal onClose={()=>setAuthOpen(false)} onLogin={handleLogin}/>}

      {success && (
        <SuccessModal
          orderId={success.orderId} total={success.total}
          onClose={()=>setSuccess(null)}
        />
      )}
    </>
  );
}
