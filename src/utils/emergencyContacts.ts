
/**
 * Utility for managing emergency contacts in local storage
 */
export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  isPrimary: boolean;
}

const STORAGE_KEY = 'shake-alert-emergency-contacts';

export const getEmergencyContacts = (): EmergencyContact[] => {
  try {
    const contacts = localStorage.getItem(STORAGE_KEY);
    return contacts ? JSON.parse(contacts) : [];
  } catch (error) {
    console.error('Error retrieving emergency contacts:', error);
    return [];
  }
};

export const saveEmergencyContacts = (contacts: EmergencyContact[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (error) {
    console.error('Error saving emergency contacts:', error);
  }
};

export const addEmergencyContact = (contact: Omit<EmergencyContact, 'id'>): EmergencyContact => {
  const contacts = getEmergencyContacts();
  
  // If this is the first contact or it's marked as primary, reset other primaries
  if (contact.isPrimary || contacts.length === 0) {
    contacts.forEach(c => c.isPrimary = false);
  }
  
  // If this is the first contact, set it as primary
  const newContact = {
    ...contact,
    id: Date.now().toString(),
    isPrimary: contact.isPrimary || contacts.length === 0
  };
  
  saveEmergencyContacts([...contacts, newContact]);
  return newContact;
};

export const updateEmergencyContact = (updatedContact: EmergencyContact): void => {
  const contacts = getEmergencyContacts();
  
  // If this contact is being set as primary, reset other primaries
  if (updatedContact.isPrimary) {
    contacts.forEach(c => {
      if (c.id !== updatedContact.id) {
        c.isPrimary = false;
      }
    });
  }
  
  const updatedContacts = contacts.map(contact => 
    contact.id === updatedContact.id ? updatedContact : contact
  );
  
  saveEmergencyContacts(updatedContacts);
};

export const deleteEmergencyContact = (id: string): void => {
  const contacts = getEmergencyContacts();
  const updatedContacts = contacts.filter(contact => contact.id !== id);
  
  // If we deleted the primary contact and have other contacts, set the first one as primary
  if (contacts.find(c => c.id === id)?.isPrimary && updatedContacts.length > 0) {
    updatedContacts[0].isPrimary = true;
  }
  
  saveEmergencyContacts(updatedContacts);
};

export const getPrimaryContact = (): EmergencyContact | null => {
  const contacts = getEmergencyContacts();
  return contacts.find(contact => contact.isPrimary) || (contacts.length > 0 ? contacts[0] : null);
};
