'use client';

import { useState } from 'react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
}

function initializeUser(): User | null {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  }
  return null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(initializeUser);
  const loading = false;

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  return { user, loading, login, logout, getToken, isAuthenticated: !!user };
}

