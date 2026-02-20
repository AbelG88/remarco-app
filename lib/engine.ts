// src/lib/engine.ts

export const calcularSugerido = (
  precioBase: number, 
  margen: number = 1.3, // Por defecto 30%
  cotizacion: number
) => {
  if (!precioBase || !cotizacion) return 0;
  
  const nuevoCosto = precioBase * cotizacion;
  return nuevoCosto * margen;
};
