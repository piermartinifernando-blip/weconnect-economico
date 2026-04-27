import { useState, useEffect, useCallback } from 'react'

export function useQuery(queryFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await queryFn()
    if (result.error) {
      setError(result.error)
      setData(null)
    } else {
      setData(result.data)
    }
    setLoading(false)
  }, deps)

  useEffect(() => { execute() }, [execute])

  return { data, loading, error, retry: execute }
}

export function useMultiQuery(queries) {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    const entries = Object.entries(queries)
    const settled = await Promise.all(
      entries.map(async ([key, fn]) => {
        const result = await fn()
        return [key, result]
      })
    )
    const out = {}
    let firstError = null
    for (const [key, result] of settled) {
      if (result.error && !firstError) firstError = result.error
      out[key] = result.data
    }
    setResults(out)
    if (firstError) setError(firstError)
    setLoading(false)
  }, [])

  useEffect(() => { execute() }, [execute])

  return { ...results, loading, error, retry: execute }
}
