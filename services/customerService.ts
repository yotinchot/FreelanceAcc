
import { supabase } from './supabase';
import { Customer } from '../types';

const TABLE_NAME = 'customers';

export const getCustomers = async (userId: string, accountId?: string): Promise<Customer[]> => {
  if (!accountId) return [];

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      user_id: userId,
      account_id: item.account_id,
      name: item.name,
      taxId: item.tax_id,
      address: item.address,
      phone: item.phone,
      email: item.email,
      createdAt: item.created_at ? new Date(item.created_at) : undefined
    })) as Customer[];
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const payload = {
      user_id: customer.user_id,
      account_id: customer.account_id,
      name: customer.name,
      tax_id: customer.taxId || null,
      address: customer.address || null,
      phone: customer.phone || null,
      email: customer.email || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<void> => {
  try {
    const payload: any = {};
    if (customer.name !== undefined) payload.name = customer.name;
    if (customer.taxId !== undefined) payload.tax_id = customer.taxId || null;
    if (customer.address !== undefined) payload.address = customer.address || null;
    if (customer.phone !== undefined) payload.phone = customer.phone || null;
    if (customer.email !== undefined) payload.email = customer.email || null;

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};
