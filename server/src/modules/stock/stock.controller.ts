import { Request, Response, NextFunction } from 'express'
import * as stockService from './stock.service'
import * as supplierService from './supplier.service'
import type {
  ProductInput,
  UpdateProductInput,
  StockEntryInput,
  InventoryCheckInput,
  SupplierInput,
  UpdateSupplierInput,
  ProductQueryInput,
  StockEntryQueryInput,
} from './stock.validation'

// ── Products ──────────────────────────────────────────────

export async function getProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters = req.query as unknown as ProductQueryInput
    const result = await stockService.getProducts(filters)

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

export async function createProductHandler(
  req: Request<object, object, ProductInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await stockService.createProduct(req.body)

    res.status(201).json({
      success: true,
      data: product,
      message: 'Tạo sản phẩm thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function updateProductHandler(
  req: Request<{ id: string }, object, UpdateProductInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    const product = await stockService.updateProduct(id, req.body)

    res.status(200).json({
      success: true,
      data: product,
      message: 'Cập nhật sản phẩm thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteProductHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    await stockService.deleteProduct(id)

    res.status(200).json({
      success: true,
      message: 'Xóa sản phẩm thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ── Stock Entries ─────────────────────────────────────────

export async function createStockEntryHandler(
  req: Request<object, object, StockEntryInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để tiếp tục' },
      })
      return
    }

    const entries = await stockService.createStockEntry(req.body, req.user.id)

    res.status(201).json({
      success: true,
      data: entries,
      message: req.body.type === 'IN' ? 'Nhập kho thành công' : 'Xuất kho thủ công thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function getStockEntriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters = req.query as unknown as StockEntryQueryInput
    const result = await stockService.getStockEntries(filters)

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ── Inventory Check ───────────────────────────────────────

export async function inventoryCheckHandler(
  req: Request<object, object, InventoryCheckInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để tiếp tục' },
      })
      return
    }

    const result = await stockService.inventoryCheck(req.body, req.user.id)

    res.status(200).json({
      success: true,
      data: result,
      message: 'Kiểm kê hoàn tất',
    })
  } catch (err) {
    next(err)
  }
}

// ── Low Stock Alerts ──────────────────────────────────────

export async function getLowStockAlertsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const alerts = await stockService.getLowStockAlerts()

    res.status(200).json({
      success: true,
      data: alerts,
    })
  } catch (err) {
    next(err)
  }
}

// ── Suppliers ─────────────────────────────────────────────

export async function getSuppliersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const suppliers = await supplierService.getSuppliers()

    res.status(200).json({
      success: true,
      data: suppliers,
    })
  } catch (err) {
    next(err)
  }
}

export async function createSupplierHandler(
  req: Request<object, object, SupplierInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supplier = await supplierService.createSupplier(req.body)

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Tạo nhà cung cấp thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function updateSupplierHandler(
  req: Request<{ id: string }, object, UpdateSupplierInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    const supplier = await supplierService.updateSupplier(id, req.body)

    res.status(200).json({
      success: true,
      data: supplier,
      message: 'Cập nhật nhà cung cấp thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteSupplierHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    await supplierService.deleteSupplier(id)

    res.status(200).json({
      success: true,
      message: 'Xóa nhà cung cấp thành công',
    })
  } catch (err) {
    next(err)
  }
}
