
import React from 'react';
import { Info, HelpCircle, AlertTriangle } from 'lucide-react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Information: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="mr-2 h-5 w-5" />
          Information & Help
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-left">
              <span className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                How does shake detection work?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                When shake detection is enabled, your device's motion sensors detect rapid movements
                resembling a shaking pattern. Once a shake is detected, a countdown begins before
                automatically calling your primary emergency contact.
              </p>
              <p className="text-sm mt-2">
                For best results, use a firm shaking motion with your device. The sensitivity can
                be adjusted in settings.
              </p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-left">
              <span className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Why isn't shake detection working?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>Make sure shake detection is enabled in settings</li>
                <li>On most browsers, device motion requires permission</li>
                <li>Device motion may not work in background or when screen is off</li>
                <li>Some devices have limited motion sensor support</li>
                <li>Try adjusting the sensitivity in settings</li>
              </ul>
              <p className="text-sm mt-2">
                You can always use the manual emergency button if shake detection isn't available.
              </p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-left">
              <span className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Important safety information
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                Shake Alert Connect is designed to help in emergency situations, but it has limitations:
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
                <li>The app requires a working phone connection to make calls</li>
                <li>Internet connection is needed for shake detection to function</li>
                <li>Battery-saving modes may affect the app's performance</li>
                <li>The app cannot guarantee successful emergency contact in all situations</li>
                <li>For life-threatening emergencies, dialing your local emergency number directly is recommended</li>
              </ul>
              <p className="text-sm mt-2 font-medium">
                This app is not a replacement for professional emergency services.
              </p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-left">
              <span className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Privacy information
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                Shake Alert Connect respects your privacy:
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
                <li>All contact information is stored locally on your device</li>
                <li>We do not collect or share your emergency contacts</li>
                <li>No data is sent to external servers</li>
                <li>Motion data is only processed on your device for shake detection</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default Information;
