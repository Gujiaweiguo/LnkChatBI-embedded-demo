const { tokenHandler, requestHandler } = require('../../middleware/requestHandler')

const b64 = (obj) => Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64')

const createMocks = () => ({
  mockReq: { headers: {} },
  mockRes: {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  },
  mockNext: vi.fn(),
})

describe('tokenHandler', () => {
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    ;({ mockReq, mockRes, mockNext } = createMocks())
  })

  it('should leave req.user undefined when no token header is present', () => {
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toBeUndefined()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should set req.user for a valid admin Bearer token', () => {
    mockReq.headers['lnkchatbi-embedded-token'] = `Bearer ${b64({ account: 'admin' })}`
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toEqual({
      uid: 1758078353942,
      account: 'admin',
      name: '管理员',
      role: '系统管理员',
    })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should set req.user for a valid developer Bearer token', () => {
    mockReq.headers['lnkchatbi-embedded-token'] = `Bearer ${b64({ account: 'developer' })}`
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toEqual({
      uid: 1758078367197,
      account: 'developer',
      name: '开发者',
      role: '普通研发',
    })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should leave req.user undefined for an unknown account', () => {
    mockReq.headers['lnkchatbi-embedded-token'] = `Bearer ${b64({ account: 'unknown' })}`
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toBeUndefined()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should catch malformed base64 and call next() silently', () => {
    mockReq.headers['lnkchatbi-embedded-token'] = 'Bearer !!!not-base64!!!'
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toBeUndefined()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should catch valid base64 that is not valid JSON', () => {
    const badJson = Buffer.from('not-json-at-all', 'utf-8').toString('base64')
    mockReq.headers['lnkchatbi-embedded-token'] = `Bearer ${badJson}`
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toBeUndefined()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should leave req.user undefined when token lacks Bearer prefix', () => {
    mockReq.headers['lnkchatbi-embedded-token'] = b64({ account: 'admin' })
    tokenHandler(mockReq, mockRes, mockNext)
    expect(mockReq.user).toBeUndefined()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })
})

describe('requestHandler', () => {
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    ;({ mockReq, mockRes, mockNext } = createMocks())
  })

  it('should call next() immediately when err is null', () => {
    requestHandler(null, mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should call next() immediately when err is undefined', () => {
    requestHandler(undefined, mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should return 409 for PostgreSQL unique violation (code 23505)', () => {
    const err = new Error('dup')
    err.code = '23505'
    err.detail = 'Key (email)=(a@b.com) already exists.'

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(409)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Duplicate entry violates unique constraint',
      error: err.detail,
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 for PostgreSQL FK violation (code 23503)', () => {
    const err = new Error('fk')
    err.code = '23503'
    err.detail = 'Key is not present in table.'

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Foreign key constraint violation',
      error: err.detail,
    })
  })

  it('should return 400 for ValidationError (err.name)', () => {
    const err = new Error('validation')
    err.name = 'ValidationError'

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: undefined,
    })
  })

  it('should return 400 when err.errors is an array', () => {
    const err = new Error('multi')
    err.errors = [
      { field: 'email', message: 'Invalid email' },
      { field: 'name', message: 'Required' },
    ]

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    })
  })

  it('should return the error status when err.status is set', () => {
    const err = new Error('Forbidden')
    err.status = 403

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden',
    })
  })

  it('should return 500 for generic error with no status', () => {
    const err = new Error('Something went wrong')

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong',
    })
  })

  it('should fall back to err.statusCode if err.status is absent', () => {
    const err = new Error('Gone')
    err.statusCode = 410

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(410)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Gone',
    })
  })

  it('should prefer err.status over err.statusCode', () => {
    const err = new Error('Conflict')
    err.status = 409
    err.statusCode = 500

    requestHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(409)
  })
})
