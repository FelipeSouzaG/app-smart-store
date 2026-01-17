import { createContext } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  apiCall: (
    endpoint: string,
    method: string,
    body?: any
  ) => Promise<any | null>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  apiCall: async () => null,
  updateUser: () => {},
});
