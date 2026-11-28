// src/app/barbeiro/_layout.tsx
import ProtectedLayout from "../../components/ProtectedLayout"

export default function BarbeiroLayout() {
  return <ProtectedLayout tipoPermitido="barbeiro" />
}