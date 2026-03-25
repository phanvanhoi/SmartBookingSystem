import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import type { SupplierInput, UpdateSupplierInput } from './stock.validation'

// ── Suppliers ─────────────────────────────────────────────

export async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      notes: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { products: true },
      },
    },
  })

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    address: s.address,
    notes: s.notes,
    isActive: s.isActive,
    createdAt: s.createdAt,
    productCount: s._count.products,
  }))
}

export async function createSupplier(data: SupplierInput) {
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
    },
  })

  return supplier
}

export async function updateSupplier(id: number, data: UpdateSupplierInput) {
  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp')
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  })

  return updated
}

export async function deleteSupplier(id: number) {
  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp')
  }

  await prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  })
}
