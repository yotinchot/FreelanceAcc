
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Account } from '../types';

// NOTE: We are transitioning away from "settings" collection to "accounts" collection.
// This file now serves as a wrapper or can be deprecated in favor of accountService.
// For backward compatibility with existing components that might call getSellerProfile:

export const getSellerProfile = async (userId: string): Promise<Account | null> => {
   // This function is technically deprecated as we should use getAccount(accountId)
   // But for now, we return null so components rely on AccountContext
   return null; 
};
