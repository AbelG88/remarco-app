'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { calcularSugerido } from '@/lib/engine'

export default function Home() {
  // --- ESTADOS ---
  const [mepValue, setMepValue] = useState<number>(1250)
  const [ipcMensual, setIpcMensual] = useState<number>(0) // Se carga vía API
  const [margenGlobal, setMargenGlobal] = useState<number>(30)
  
  const [nombre, setNombre] = useState('')
  const [costo, setCosto] = useState('')
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // --- EFECTOS ---
  useEffect(() => {
    fetchDolar()
    fetchProductos()
    fetchIPC() 
  }, [])

  // --- FUNCIONES DE DATOS ---
  async function fetchDolar() {
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/mep');
      const data = await res.json();
      if (data?.venta) setMepValue(Number(data.venta));
    } catch (err) {
      console.error("Fallo DolarAPI, usando backup...");
      try {
        const resAlt = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolar/mep');
        const dataAlt = await resAlt.json();
        if (dataAlt?.venta) setMepValue(dataAlt.venta);
      } catch (e) {
        setMepValue(1250); // Salvavidas final
      }
    }
  }

  async function fetchIPC() {
    try {
      const res = await fetch('https://api.argentinadatos.com/v1/indices/inflacion');
      const data = await res.json();
      // Tomamos el último registro oficial del array (el mes más reciente)
      if (data && data.length > 0) {
        const ultimoDato = data[data.length - 1].valor;
        setIpcMensual(ultimoDato);
      }
    } catch (err) {
      console.error("Error al traer IPC, usando backup");
      setIpcMensual(4.2); 
    }
  }
  
  async function fetchProductos() {
    // Consulta sin .order() para evitar errores si no existe la columna created_at
    const { data, error } = await supabase.from('products').select('*');
    if (!error) {
      setProductos(data || []);
    } else {
      console.error("Error al traer productos:", error.message);
    }
  }

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!costo || parseFloat(costo) <= 0) return alert("Costo inválido");
    
    setLoading(true)
    const { error } = await supabase.from('products').insert([
      { name: nombre, cost_base: parseFloat(costo), currency_ref: 'MEP' }
    ])

    if (!error) {
      setNombre(''); 
      setCosto('');
      fetchProductos(); 
    }
    setLoading(false)
  }

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Seguro que querés borrar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) fetchProductos();
  }

  // --- INTERFAZ ---
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans bg-slate-50 min-h-screen text-slate-900">
      
      {/* INDICADORES DINÁMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card Dólar MEP */}
        <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest text-indigo-100">Dólar MEP Hoy</p>
          <p className="text-3xl font-black">${mepValue.toLocaleString('es-AR')}</p>
        </div>

        {/* Card IPC (API ArgentinaDatos) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inflación Últ. Mes (INDEC)</p>
          <p className="text-3xl font-black text-rose-500">+{ipcMensual}%</p>
        </div>

        {/* Card Margen EDITABLE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Global (%)</p>
          <div className="flex items-center gap-1">
            <input 
              type="number" 
              className="text-3xl font-black text-emerald-500 bg-transparent outline-none w-24"
              value={margenGlobal}
              onChange={(e) => setMargenGlobal(Number(e.target.value))}
            />
            <span className="text-3xl font-black text-emerald-500">%</span>
          </div>
        </div>
      </div>

      <header className="mb-8 flex items-center gap-2">
        <h1 className="text-2xl font-black tracking-tighter uppercase italic">🛡️ Remarco</h1>
        <span className="px-2 py-1 bg-slate-200 text-[10px] font-bold rounded-md">V1.0 LIVE</span>
      </header>

      {/* FORMULARIO DE CARGA */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10">
        <form onSubmit={guardarProducto} className="flex flex-col md:flex-row gap-4">
          <input 
            className="flex-1 p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            placeholder="Nombre del producto..." 
            value={nombre} onChange={(e) => setNombre(e.target.value)} required 
          />
          <input 
            className="w-full md:w-40 p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            type="number" step="0.01" placeholder="Costo USD" 
            value={costo} onChange={(e) => setCosto(e.target.value)} required 
          />
          <button 
            disabled={loading} 
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? '...' : '➕ Agregar'}
          </button>
        </form>
      </section>

      {/* LISTADO DE PRODUCTOS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Costo (USD)</th>
              <th className="p-4 text-xs font-bold text-indigo-600 uppercase tracking-wider text-right bg-indigo-50/30">PVP Sugerido (ARS)</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-20">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-400 italic">No hay productos cargados aún.</td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-700">{p.name}</td>
                  <td className="p-4 text-right text-slate-500 font-mono">${p.cost_base.toFixed(2)}</td>
                  <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50/10 text-lg">
                    ${calcularSugerido(
                      p.cost_base, 
                      1 + (margenGlobal / 100), 
                      mepValue
                    ).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => eliminarProducto(p.id)} 
                      className="text-slate-300 hover:text-rose-500 transition-colors text-xl"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-8 text-center border-t border-slate-200 pt-6">
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
          Cálculo: (Costo * MEP) + % Margen • {new Date().toLocaleDateString('es-AR')}
        </p>
      </footer>
    </div>
  )
}
