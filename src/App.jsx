import { useEffect, useMemo, useState } from "react";

function computeApiBase() {
  const envUrl = import.meta.env.VITE_BACKEND_URL || "";
  if (envUrl) return envUrl;
  try {
    const u = new URL(window.location.href);
    // If running on port 3000, assume backend on 8000 with same host
    if (u.port === "3000") {
      u.port = "8000";
      return u.origin;
    }
    // Fallback to same origin
    return u.origin;
  } catch {
    return "";
  }
}

const API_BASE = computeApiBase();

function WhatsAppButton({ product }) {
  const phone = import.meta.env.VITE_WHATSAPP_PHONE || ""; // E.g., 15551234567
  const message = useMemo(() => {
    const text = `Hello! I'd like to order: ${product.title} (Price: ${product.price}).`;
    return encodeURIComponent(text);
  }, [product]);
  const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md bg-green-600 text-white px-4 py-2 font-semibold shadow hover:bg-green-700 transition"
    >
      Order Now via WhatsApp
    </a>
  );
}

function DeliveryChart({ delivery }) {
  if (!delivery) return null;
  return (
    <div className="border rounded-lg p-4 bg-white/70">
      <h3 className="font-semibold text-gray-800 mb-2">{delivery.name}</h3>
      <div className="space-y-2">
        {delivery.rates?.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{r.location}</span>
            <span className="font-medium">{r.charge}</span>
          </div>
        ))}
      </div>
      {delivery.notes && (
        <p className="text-xs text-gray-500 mt-3">{delivery.notes}</p>
      )}
    </div>
  );
}

function ProductCard({ item, onOpen }) {
  return (
    <div className="rounded-xl bg-white shadow-sm hover:shadow-md transition p-4 flex flex-col">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-40 object-cover rounded-md mb-3"
        />
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-bold">{item.price}</span>
        <button
          onClick={() => onOpen(item)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View
        </button>
      </div>
    </div>
  );
}

function CategoryTabs({ categories, active, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect("")}
        className={`px-3 py-1 rounded-full border text-sm ${
          active === "" ? "bg-gray-900 text-white" : "bg-white"
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.slug)}
          className={`px-3 py-1 rounded-full border text-sm ${
            active === c.slug ? "bg-gray-900 text-white" : "bg-white"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ onClose }) {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");

  const authedFetch = (url, opts = {}) => {
    return fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token ? { "X-Admin-Token": token } : {}),
      },
    });
  };

  const doLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });
      if (!r.ok) throw new Error("Login failed");
      const data = await r.json();
      setToken(data.token);
      localStorage.setItem("admin_token", data.token);
      setMsg("Logged in");
    } catch (e) {
      setMsg("Invalid credentials");
    }
  };

  // Forms state
  const [cat, setCat] = useState({ name: "", slug: "", description: "" });
  const [prod, setProd] = useState({
    title: "",
    price: "",
    description: "",
    category_slug: "",
    image_url: "",
    in_stock: true,
  });
  const [delivery, setDelivery] = useState({ name: "Standard Delivery", notes: "", rates: [] });
  const [newRate, setNewRate] = useState({ location: "", charge: "" });

  const createCategory = async (e) => {
    e.preventDefault();
    const r = await authedFetch(`${API_BASE}/api/admin/categories`, {
      method: "POST",
      body: JSON.stringify(cat),
    });
    setMsg(r.ok ? "Category created" : "Failed to create category");
  };

  const createProduct = async (e) => {
    e.preventDefault();
    const payload = { ...prod, price: parseFloat(prod.price || 0) };
    const r = await authedFetch(`${API_BASE}/api/admin/products`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg(r.ok ? "Product created" : "Failed to create product");
  };

  const saveDelivery = async (e) => {
    e.preventDefault();
    const payload = { ...delivery, rates: delivery.rates.map((r) => ({ ...r, charge: parseFloat(r.charge) })) };
    const r = await authedFetch(`${API_BASE}/api/admin/delivery`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg(r.ok ? "Delivery chart saved" : "Failed to save delivery chart");
  };

  const addRate = () => {
    if (!newRate.location || !newRate.charge) return;
    setDelivery((d) => ({ ...d, rates: [...d.rates, newRate] }));
    setNewRate({ location: "", charge: "" });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Admin</h2>
        <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
      </div>

      {!token && (
        <form onSubmit={doLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <input className="border rounded px-3 py-2" placeholder="Username" value={login.username} onChange={(e)=>setLogin({...login, username: e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="Password" type="password" value={login.password} onChange={(e)=>setLogin({...login, password: e.target.value})} />
          <button className="bg-gray-900 text-white rounded px-4 py-2">Login</button>
        </form>
      )}

      {token && (
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold mb-2">Create Category</h3>
            <form onSubmit={createCategory} className="grid gap-2 sm:grid-cols-4">
              <input className="border rounded px-3 py-2" placeholder="Name" value={cat.name} onChange={(e)=>setCat({...cat, name: e.target.value})} />
              <input className="border rounded px-3 py-2" placeholder="Slug" value={cat.slug} onChange={(e)=>setCat({...cat, slug: e.target.value})} />
              <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Description" value={cat.description} onChange={(e)=>setCat({...cat, description: e.target.value})} />
              <button className="bg-blue-600 text-white rounded px-4 py-2 sm:col-span-1">Add</button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Create Product</h3>
            <form onSubmit={createProduct} className="grid gap-2 sm:grid-cols-6">
              <input className="border rounded px-3 py-2" placeholder="Title" value={prod.title} onChange={(e)=>setProd({...prod, title: e.target.value})} />
              <input className="border rounded px-3 py-2" placeholder="Price" value={prod.price} onChange={(e)=>setProd({...prod, price: e.target.value})} />
              <input className="border rounded px-3 py-2" placeholder="Category Slug" value={prod.category_slug} onChange={(e)=>setProd({...prod, category_slug: e.target.value})} />
              <input className="border rounded px-3 py-2 sm:col-span-3" placeholder="Image URL" value={prod.image_url} onChange={(e)=>setProd({...prod, image_url: e.target.value})} />
              <textarea className="border rounded px-3 py-2 sm:col-span-6" placeholder="Description" value={prod.description} onChange={(e)=>setProd({...prod, description: e.target.value})} />
              <div className="sm:col-span-6 flex items-center gap-3">
                <input id="inStock" type="checkbox" checked={prod.in_stock} onChange={(e)=>setProd({...prod, in_stock: e.target.checked})} />
                <label htmlFor="inStock">In stock</label>
              </div>
              <button className="bg-blue-600 text-white rounded px-4 py-2 sm:col-span-2">Add Product</button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Delivery Charges</h3>
            <form onSubmit={saveDelivery} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="border rounded px-3 py-2" placeholder="Table Name" value={delivery.name} onChange={(e)=>setDelivery({...delivery, name: e.target.value})} />
                <input className="border rounded px-3 py-2" placeholder="Notes" value={delivery.notes} onChange={(e)=>setDelivery({...delivery, notes: e.target.value})} />
              </div>
              <div className="grid gap-2 sm:grid-cols-5 items-end">
                <input className="border rounded px-3 py-2 sm:col-span-3" placeholder="Location" value={newRate.location} onChange={(e)=>setNewRate({...newRate, location: e.target.value})} />
                <input className="border rounded px-3 py-2 sm:col-span-1" placeholder="Charge" value={newRate.charge} onChange={(e)=>setNewRate({...newRate, charge: e.target.value})} />
                <button type="button" className="bg-gray-900 text-white rounded px-4 py-2" onClick={addRate}>Add Rate</button>
              </div>
              <div className="space-y-2">
                {delivery.rates.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                    <span>{r.location}</span>
                    <span>{r.charge}</span>
                  </div>
                ))}
              </div>
              <button className="bg-blue-600 text-white rounded px-4 py-2">Save Delivery Table</button>
            </form>
          </div>
        </div>
      )}

      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  );
}

function App() {
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("");
  const [products, setProducts] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`).then(r => r.json()).then(setCategories).catch(() => setCategories([]));
    fetch(`${API_BASE}/api/delivery`).then(r => r.json()).then(setDelivery).catch(() => setDelivery(null));
  }, []);

  useEffect(() => {
    const qs = activeCat ? `?category_slug=${encodeURIComponent(activeCat)}` : "";
    fetch(`${API_BASE}/api/products${qs}`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [activeCat]);

  const openProduct = (item) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Polaroid & Gifts</h1>
          <div className="flex items-center gap-4">
            <a href="#products" className="text-sm text-gray-700">Products</a>
            <button className="text-sm text-gray-500 hover:text-gray-700" onClick={()=>setAdminOpen(true)}>Admin</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6" id="products">
        <section className="mb-6">
          <CategoryTabs categories={categories} active={activeCat} onSelect={setActiveCat} />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} item={p} onOpen={openProduct} />
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No products yet.</div>
          )}
        </section>
      </main>

      <Modal open={open} onClose={() => setOpen(false)}>
        {selected && (
          <div className="grid md:grid-cols-2 gap-6 p-4">
            <div>
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt={selected.title}
                  className="w-full h-80 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{selected.title}</h2>
                <p className="text-gray-600 mt-1">{selected.description}</p>
                <div className="mt-3 text-xl font-semibold">{selected.price}</div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Delivery Charges</h3>
                <DeliveryChart delivery={delivery} />
              </div>
              <div>
                <WhatsAppButton product={selected} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={adminOpen} onClose={() => setAdminOpen(false)}>
        <AdminPanel onClose={() => setAdminOpen(false)} />
      </Modal>

      <footer className="py-12 text-center text-sm text-gray-500">© {new Date().getFullYear()} Polaroid & Gifts</footer>
    </div>
  );
}

export default App;
