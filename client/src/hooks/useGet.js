import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

export default function useGet(path, { params = null, immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetcher = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path, { params: opts.params || params });
      if (!mounted.current) return;
      setData(res);
      return res;
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path, JSON.stringify(params)]);

  useEffect(() => {
    mounted.current = true;
    if (immediate) fetcher();
    return () => { mounted.current = false; };
  }, [fetcher]);

  return { data, loading, error, refetch: fetcher };
}
