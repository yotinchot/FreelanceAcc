
import { supabase } from './supabase';
import { Account } from '../types';

const TABLE_NAME = 'accounts';

export const getAccounts = async (userId: string): Promise<Account[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      type: item.account_type, 
      name: item.business_name, 
      taxId: item.tax_id,
      address: item.address,
      phone: item.phone,
      email: item.email,
      createdAt: new Date(item.created_at),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
    })) as Account[];
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
};

export const createAccount = async (accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
  try {
    const timestamp = new Date().toISOString();
    
    const payload = {
      user_id: accountData.user_id,
      account_type: accountData.type,
      business_name: accountData.name,
      tax_id: accountData.taxId || null,
      address: accountData.address || null,
      phone: accountData.phone || null,
      email: accountData.email || null,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return {
        id: data.id,
        user_id: data.user_id,
        type: data.account_type,
        name: data.business_name,
        taxId: data.tax_id,
        address: data.address,
        phone: data.phone,
        email: data.email,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
    } as Account;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

export const updateAccount = async (id: string, accountData: Partial<Account>): Promise<void> => {
  try {
    const payload: any = {
        updated_at: new Date().toISOString()
    };
    
    if (accountData.name !== undefined) payload.business_name = accountData.name;
    if (accountData.type !== undefined) payload.account_type = accountData.type;
    if (accountData.taxId !== undefined) payload.tax_id = accountData.taxId || null;
    if (accountData.address !== undefined) payload.address = accountData.address || null;
    if (accountData.phone !== undefined) payload.phone = accountData.phone || null;
    if (accountData.email !== undefined) payload.email = accountData.email || null;

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
};
