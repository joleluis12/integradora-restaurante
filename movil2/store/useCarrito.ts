import { create } from "zustand";

interface Platillo {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  cantidad: number;
  nota?: string;
}

interface CarritoStore {
  carrito: Platillo[];
  agregar: (p: Platillo) => void;
  eliminar: (id: number) => void;
  limpiar: () => void;
  aumentar: (id: number) => void;
  disminuir: (id: number) => void;
  actualizarCantidad: (id: number, nuevaCantidad: number) => void;
  actualizarNota: (id: number, nuevaNota: string) => void;
}

const useCarrito = create<CarritoStore>((set) => ({
  carrito: [],

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

  eliminar: (id) =>
    set((state) => ({
      carrito: state.carrito.filter((p) => p.id !== id),
    })),

  limpiar: () => set({ carrito: [] }),

  aumentar: (id) =>
    set((state) => ({
      carrito: state.carrito.map((p) =>
        p.id === id ? { ...p, cantidad: (p.cantidad || 1) + 1 } : p
      ),
    })),

  disminuir: (id) =>
    set((state) => ({
      carrito: state.carrito
        .map((p) =>
          p.id === id ? { ...p, cantidad: (p.cantidad || 1) - 1 } : p
        )
        .filter((p) => (p.cantidad || 1) > 0),
    })),

  actualizarCantidad: (id, nuevaCantidad) =>
    set((state) => ({
      carrito: state.carrito.map((item) =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      ),
    })),

  actualizarNota: (id, nuevaNota) =>
    set((state) => ({
      carrito: state.carrito.map((item) =>
        item.id === id ? { ...item, nota: nuevaNota } : item
      ),
    })),
}));

export default useCarrito;
