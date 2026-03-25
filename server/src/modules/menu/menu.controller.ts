import { Request, Response, NextFunction } from 'express'
import * as menuService from './menu.service'
import { CategoryInput, MenuItemInput } from './menu.validation'

export async function getMenuHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await menuService.getMenu()
    res.status(200).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getCategoriesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await menuService.getCategories()
    res.status(200).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function createCategoryHandler(
  req: Request<object, object, CategoryInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await menuService.createCategory(req.body)
    res.status(201).json({ success: true, data, message: 'Tạo danh mục thành công' })
  } catch (err) {
    next(err)
  }
}

export async function updateCategoryHandler(
  req: Request<{ id: string }, object, CategoryInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    const data = await menuService.updateCategory(id, req.body)
    res.status(200).json({ success: true, data, message: 'Cập nhật danh mục thành công' })
  } catch (err) {
    next(err)
  }
}

export async function deleteCategoryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    await menuService.deleteCategory(id)
    res.status(200).json({ success: true, message: 'Xóa danh mục thành công' })
  } catch (err) {
    next(err)
  }
}

export async function createMenuItemHandler(
  req: Request<object, object, MenuItemInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await menuService.createMenuItem(req.body)
    res.status(201).json({ success: true, data, message: 'Tạo món thành công' })
  } catch (err) {
    next(err)
  }
}

export async function updateMenuItemHandler(
  req: Request<{ id: string }, object, MenuItemInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    const data = await menuService.updateMenuItem(id, req.body)
    res.status(200).json({ success: true, data, message: 'Cập nhật món thành công' })
  } catch (err) {
    next(err)
  }
}

export async function deleteMenuItemHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    await menuService.deleteMenuItem(id)
    res.status(200).json({ success: true, message: 'Xóa món thành công' })
  } catch (err) {
    next(err)
  }
}
