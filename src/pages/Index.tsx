
import React, { useState, useEffect } from 'react';
import { Shield, User, Sliders, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmergencyCallButton from '@/components/EmergencyCallButton';
import EmergencyContactsManager from '@/components/EmergencyContactsManager';
import Settings from '@/components/Settings';
import Information from '@/components/Information';
import { getEmergencyContacts } from '@/utils/emergencyContacts';

const Index = () => {
  const [isShakeEnabled, setIsShakeEnabled] = useState(true);
  const [hasContacts, setHasContacts] = useState(false);
  const [activeTab, setActiveTab] = useState('emergency');
  
  useEffect(() => {
    // Check if user has any contacts
    const contacts = getEmergencyContacts();
    setHasContacts(contacts.length > 0);
    
    // If no contacts, default to contacts tab
    if (contacts.length === 0) {
      setActiveTab('contacts');
    }
  }, []);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white py-4 px-6 border-b shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-emergency mr-2" />
            <h1 className="text-xl font-bold">Shake Alert Connect</h1>
          </div>
          <p className="text-sm text-muted-foreground">Emergency Response App</p>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {!hasContacts && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <h2 className="font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Action Required
            </h2>
            <p className="mt-1 text-sm">
              Please add at least one emergency contact to use the emergency call feature.
            </p>
          </div>
        )}
        
        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="emergency" className="flex items-center justify-center">
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Emergency</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center justify-center">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center justify-center">
                <Sliders className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center justify-center">
                <Info className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Info</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="emergency" className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-2xl font-bold mb-6 text-center">Emergency Call</h2>
                <EmergencyCallButton isShakeEnabled={isShakeEnabled && hasContacts} />
                
                {hasContacts ? (
                  <div className="mt-8 p-4 bg-muted rounded-md">
                    <h3 className="font-medium">Ready for emergencies</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isShakeEnabled 
                        ? "Shake your device or press the button above to trigger an emergency call." 
                        : "Shake detection is currently disabled. Use the button above or enable shake detection in settings."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 p-4 bg-muted rounded-md">
                    <h3 className="font-medium text-amber-700">No emergency contacts</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to add at least one emergency contact before using this feature.
                    </p>
                    <button 
                      className="text-sm text-primary mt-2 underline"
                      onClick={() => setActiveTab('contacts')}
                    >
                      Add contacts now
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="contacts" className="space-y-6">
              <EmergencyContactsManager />
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <Settings 
                isShakeEnabled={isShakeEnabled}
                onShakeEnabledChange={setIsShakeEnabled}
              />
            </TabsContent>
            
            <TabsContent value="info" className="space-y-6">
              <Information />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <footer className="border-t py-4 px-6 bg-white mt-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Shake Alert Connect - Emergency Response App
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            For demonstration purposes only. In real emergencies, contact local emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
