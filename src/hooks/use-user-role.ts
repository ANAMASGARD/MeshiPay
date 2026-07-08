import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const ROLE_KEY = '@meshipay/user_role';

export type UserRole = 'sender' | 'receiver';

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ROLE_KEY)
      .then((value) => {
        if (!cancelled) {
          setRoleState(value === 'sender' || value === 'receiver' ? value : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoleState(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRole = useCallback(async (next: UserRole) => {
    await AsyncStorage.setItem(ROLE_KEY, next);
    setRoleState(next);
  }, []);

  const clearRole = useCallback(async () => {
    await AsyncStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  }, []);

  return { role, loading, setRole, clearRole };
}
