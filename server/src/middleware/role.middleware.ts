import { Request, Response, NextFunction } from 'express'
import { UserRole } from '../types/index'
import { ROLE_HIERARCHY } from '../utils/constants'

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập để tiếp tục',
        },
      })
      return
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0

    // User is allowed if their level is >= the minimum required level among the specified roles
    const minRequiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] ?? 0))

    if (userLevel >= minRequiredLevel) {
      next()
      return
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này',
      },
    })
  }
}
