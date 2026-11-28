// src/app/cliente/_layout.tsx
import ProtectedLayout from "../../components/ProtectedLayout"

export default function ClienteLayout() {
  return <ProtectedLayout tipoPermitido="cliente" />
}