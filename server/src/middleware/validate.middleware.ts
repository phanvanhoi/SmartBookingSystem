import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

type ValidationSource = 'body' | 'query' | 'params'

interface ValidationErrorDetail {
  field: string
  message: string
}

interface ValidationErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
  details: ValidationErrorDetail[]
}

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response<ValidationErrorResponse>, next: NextFunction): void => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))

      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
        },
        details: errors,
      })
      return
    }

    if (source === 'body') {
      req.body = result.data
    } else if (source === 'query') {
      // query is read-only by type but safe to reassign at runtime
      Object.assign(req.query, result.data)
    } else {
      Object.assign(req.params, result.data)
    }

    next()
  }
}
