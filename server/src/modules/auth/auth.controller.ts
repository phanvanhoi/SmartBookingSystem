import { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'
import { LoginInput, ChangePasswordInput } from './auth.validation'

export async function loginHandler(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body
    const result = await authService.login(username, password)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function getMeHandler(
  req: Request,
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

    const user = await authService.getMe(req.user.id)

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (err) {
    next(err)
  }
}

export async function changePasswordHandler(
  req: Request<object, object, ChangePasswordInput>,
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

    const { currentPassword, newPassword } = req.body
    await authService.changePassword(req.user.id, currentPassword, newPassword)

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    })
  } catch (err) {
    next(err)
  }
}
