
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Account } from '../types';
import { getAccounts, createAccount as createAccountService } from '../services/accountService';

interface AccountContextType {
  currentAccount: Account | null;
  accounts: Account[];
  loading: boolean;
  switchAccount: (accountId: string) => void;
  createAccount: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccounts = async () => {
    if (!user) {
        setAccounts([]);
        setCurrentAccount(null);
        setLoading(false);
        return;
    }

    try {
        setLoading(true);
        const userAccounts = await getAccounts(user.uid);
        setAccounts(userAccounts);

        // Logic to select initial account
        const storedAccountId = localStorage.getItem(`selected_account_${user.uid}`);
        
        if (storedAccountId) {
            const found = userAccounts.find(a => a.id === storedAccountId);
            if (found) {
                setCurrentAccount(found);
            } else if (userAccounts.length > 0) {
                setCurrentAccount(userAccounts[0]);
            } else {
                setCurrentAccount(null);
            }
        } else if (userAccounts.length > 0) {
            // Default to first if multiple
            if (userAccounts.length === 1) {
                setCurrentAccount(userAccounts[0]);
                localStorage.setItem(`selected_account_${user.uid}`, userAccounts[0].id);
            } else {
                 // If multiple and no selection, we might leave it null to force selection page
                 setCurrentAccount(null);
            }
        } else {
            setCurrentAccount(null);
        }

    } catch (error) {
        console.error("Failed to load accounts", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, [user]);

  const switchAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account && user) {
      setCurrentAccount(account);
      localStorage.setItem(`selected_account_${user.uid}`, accountId);
    }
  };

  const createAccount = async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
        const newAccount = await createAccountService(data);
        setAccounts(prev => [...prev, newAccount]);
        // Automatically switch to new account
        setCurrentAccount(newAccount);
        if (user) {
            localStorage.setItem(`selected_account_${user.uid}`, newAccount.id);
        }
    } catch (error) {
        throw error;
    }
  };

  return (
    <AccountContext.Provider value={{ 
        currentAccount, 
        accounts, 
        loading, 
        switchAccount, 
        createAccount,
        refreshAccounts
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
