import { useState, useEffect, useCallback } from 'react';
import { contactsApi, ContactResponse, ContactCreate } from '../services/api';

export function useContacts() {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await contactsApi.list(0, 500);
      setContacts(response.contacts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const createContact = async (data: ContactCreate) => {
    const newContact = await contactsApi.create(data);
    await fetchContacts();
    return newContact;
  };

  const updateContact = async (id: string, data: Partial<ContactCreate>) => {
    const updated = await contactsApi.update(id, data);
    await fetchContacts();
    return updated;
  };

  const deleteContact = async (id: string) => {
    await contactsApi.delete(id);
    await fetchContacts();
  };

  return {
    contacts,
    isLoading,
    error,
    refresh: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}
