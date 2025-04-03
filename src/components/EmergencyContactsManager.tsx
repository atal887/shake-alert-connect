
import React, { useState, useEffect } from 'react';
import { User, Phone, Star, Trash, StarOff, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  EmergencyContact, 
  getEmergencyContacts, 
  addEmergencyContact, 
  updateEmergencyContact, 
  deleteEmergencyContact 
} from '@/utils/emergencyContacts';
import { useToast } from '@/components/ui/use-toast';

const EmergencyContactsManager: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const { toast } = useToast();
  
  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);
  
  const loadContacts = () => {
    const savedContacts = getEmergencyContacts();
    setContacts(savedContacts);
  };
  
  const handleAddContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter both name and phone number",
        variant: "destructive",
      });
      return;
    }
    
    // Basic phone number validation
    const phonePattern = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phonePattern.test(newPhone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    if (editingContact) {
      // Update existing contact
      const updated = {
        ...editingContact,
        name: newName,
        phoneNumber: newPhone,
        isPrimary: newIsPrimary,
      };
      updateEmergencyContact(updated);
      toast({
        title: "Contact updated",
        description: `${newName} has been updated`,
      });
    } else {
      // Add new contact
      addEmergencyContact({
        name: newName,
        phoneNumber: newPhone,
        isPrimary: newIsPrimary,
      });
      toast({
        title: "Contact added",
        description: `${newName} has been added to your emergency contacts`,
      });
    }
    
    // Reset form and reload contacts
    resetForm();
    loadContacts();
  };
  
  const handleDeleteContact = (id: string) => {
    deleteEmergencyContact(id);
    loadContacts();
    toast({
      title: "Contact deleted",
      description: "The contact has been removed from your emergency contacts",
    });
  };
  
  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setNewName(contact.name);
    setNewPhone(contact.phoneNumber);
    setNewIsPrimary(contact.isPrimary);
  };
  
  const resetForm = () => {
    setEditingContact(null);
    setNewName('');
    setNewPhone('');
    setNewIsPrimary(false);
  };
  
  const setPrimaryContact = (contact: EmergencyContact) => {
    const updated = { ...contact, isPrimary: true };
    updateEmergencyContact(updated);
    loadContacts();
    toast({
      title: "Primary contact set",
      description: `${contact.name} is now your primary emergency contact`,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center p-6 bg-muted/30 rounded-md">
              <p>No emergency contacts added yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add contacts who should be called in an emergency.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center">
                    {contact.isPrimary ? (
                      <Star className="h-5 w-5 mr-2 text-warningYellow flex-shrink-0" />
                    ) : (
                      <User className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" /> {contact.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {!contact.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryContact(contact)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4 text-warningYellow" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                      title="Edit contact"
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          title="Delete contact"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.name} from your emergency contacts?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                {contacts.length === 0 ? "Add Your First Contact" : "Add New Contact"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
                </DialogTitle>
                <DialogDescription>
                  {editingContact 
                    ? "Update the details of your emergency contact." 
                    : "Add a new contact who should be called in an emergency."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="primary"
                    checked={newIsPrimary}
                    onCheckedChange={(checked) => setNewIsPrimary(checked === true)}
                  />
                  <Label htmlFor="primary" className="cursor-pointer">
                    Set as primary emergency contact
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleAddContact}>
                    {editingContact ? "Save Changes" : "Add Contact"}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmergencyContactsManager;
