import { create } from "zustand";

interface Platillo {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  cantidad: number;
  nota?: string; // 🔥 se agregó campo nota
}

interface CarritoStore {
  carrito: Platillo[];
  agregar: (p: Platillo) => void;
  eliminar: (id: number) => void;
  limpiar: () => void;
  aumentar: (id: number) => void;
  disminuir: (id: number) => void;
  actualizarCantidad: (id: number, nuevaCantidad: number) => void;
  actualizarNota: (id: number, nuevaNota: string) => void; // 🔥 nueva acción
}

const useCarrito = create<CarritoStore>((set) => ({
  carrito: [],

  // 🟢 Agregar platillo (si existe, aumenta cantidad)
  agregar: (p) =>
    set((state) => {
      const existe = state.carrito.find((item) => item.id === p.id);
      if (existe) {
        return {
          carrito: state.carrito.map((item) =>
            item.id === p.id
              ? { ...item, cantidad: (item.cantidad || 1) + 1 }
              : item
          ),
        };
      }
      return { carrito: [...state.carrito, { ...p, cantidad: 1 }] };
    }),

  // ❌ Eliminar platillo completamente
  eliminar: (id) =>
    set((state) => ({
      carrito: state.carrito.filter((p) => p.id !== id),
    })),

  // 🧹 Vaciar todo el carrito
  limpiar: () => set({ carrito: [] }),

  // ➕ Aumentar cantidad
  aumentar: (id) =>
    set((state) => ({
      carrito: state.carrito.map((p) =>
        p.id === id ? { ...p, cantidad: (p.cantidad || 1) + 1 } : p
      ),
    })),

  // ➖ Disminuir cantidad (si llega a 0, se elimina)
  disminuir: (id) =>
    set((state) => ({
      carrito: state.carrito
        .map((p) =>
          p.id === id ? { ...p, cantidad: (p.cantidad || 1) - 1 } : p
        )
        .filter((p) => (p.cantidad || 1) > 0),
    })),

  // 🔁 Actualizar cantidad manualmente (usado por los botones ±)
  actualizarCantidad: (id, nuevaCantidad) =>
    set((state) => ({
      carrito: state.carrito.map((item) =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      ),
    })),

  // 📝 Actualizar nota personalizada
  actualizarNota: (id, nuevaNota) =>
    set((state) => ({
      carrito: state.carrito.map((item) =>
        item.id === id ? { ...item, nota: nuevaNota } : item
      ),
    })),
}));

export default useCarrito;
