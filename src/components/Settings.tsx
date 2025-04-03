
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface SettingsProps {
  isShakeEnabled: boolean;
  onShakeEnabledChange: (enabled: boolean) => void;
}

interface AppSettings {
  shakeEnabled: boolean;
  shakeThreshold: number;
  countdownDuration: number;
}

const SETTINGS_KEY = 'shake-alert-settings';

const defaultSettings: AppSettings = {
  shakeEnabled: true,
  shakeThreshold: 15,
  countdownDuration: 5,
};

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

const Settings: React.FC<SettingsProps> = ({ isShakeEnabled, onShakeEnabledChange }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const savedSettings = loadSettings();
    setSettings(savedSettings);
    onShakeEnabledChange(savedSettings.shakeEnabled);
  }, [onShakeEnabledChange]);
  
  const handleShakeEnabledChange = (enabled: boolean) => {
    setSettings({ ...settings, shakeEnabled: enabled });
    setHasChanges(true);
  };
  
  const handleShakeThresholdChange = (value: number[]) => {
    setSettings({ ...settings, shakeThreshold: value[0] });
    setHasChanges(true);
  };
  
  const handleCountdownChange = (value: number[]) => {
    setSettings({ ...settings, countdownDuration: value[0] });
    setHasChanges(true);
  };
  
  const handleSaveSettings = () => {
    saveSettings(settings);
    onShakeEnabledChange(settings.shakeEnabled);
    setHasChanges(false);
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    });
  };
  
  const handleResetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <SettingsIcon className="mr-2 h-5 w-5" />
          App Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="shake-detection" className="text-base">Shake Detection</Label>
              <p className="text-sm text-muted-foreground">
                Enable emergency calls when device is shaken
              </p>
            </div>
            <Switch 
              id="shake-detection" 
              checked={settings.shakeEnabled}
              onCheckedChange={handleShakeEnabledChange}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="shake-threshold" className="text-base">Shake Sensitivity</Label>
              <span className="text-sm font-medium">
                {settings.shakeThreshold < 10 ? 'High' : 
                 settings.shakeThreshold < 20 ? 'Medium' : 'Low'}
              </span>
            </div>
            <Slider
              id="shake-threshold"
              disabled={!settings.shakeEnabled}
              value={[settings.shakeThreshold]}
              min={5}
              max={25}
              step={1}
              onValueChange={handleShakeThresholdChange}
            />
            <p className="text-xs text-muted-foreground">
              Higher sensitivity may trigger more easily, lower sensitivity requires stronger shaking
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="countdown-duration" className="text-base">Countdown Duration</Label>
              <span className="text-sm font-medium">{settings.countdownDuration} seconds</span>
            </div>
            <Slider
              id="countdown-duration"
              value={[settings.countdownDuration]}
              min={3}
              max={10}
              step={1}
              onValueChange={handleCountdownChange}
            />
            <p className="text-xs text-muted-foreground">
              Time before emergency call is placed after shake is detected
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleResetSettings}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
        <Button 
          size="sm"
          onClick={handleSaveSettings}
          disabled={!hasChanges}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Settings;
