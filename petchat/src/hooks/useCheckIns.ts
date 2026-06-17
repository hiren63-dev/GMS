import { useState, useEffect } from 'react';
import type { CheckInResponse } from '../types';
import { onCheckInsChange } from '../services/firebase';

export const useCheckIns = () => {
  const [checkIns, setCheckIns] = useState<CheckInResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onCheckInsChange(items => {
      setCheckIns(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { checkIns, loading };
};
