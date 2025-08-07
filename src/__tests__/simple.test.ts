import { describe, it, expect } from '@jest/globals'

describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
    expect(true).toBe(true)
  })

  it('should handle arrays', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj).toHaveProperty('name')
    expect(obj.name).toBe('test')
    expect(obj.value).toBe(42)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('async result')
    const result = await promise
    expect(result).toBe('async result')
  })

  it('should handle mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
