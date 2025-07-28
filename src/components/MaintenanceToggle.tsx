import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

export default function MaintenanceToggle() {
  const { maintenanceStatus, isMaintenanceMode, refreshMaintenanceStatus } = useMaintenance();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(maintenanceStatus?.maintenance_message || '');
  const [title, setTitle] = useState(maintenanceStatus?.maintenance_title || '');

  const toggleMaintenance = async (enable: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_maintenance_mode', {
        p_enable: enable,
        p_message: message,
        p_title: title
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshMaintenanceStatus();
      
      toast({
        title: enable ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enable 
          ? "Website is now in maintenance mode. Users will see the maintenance overlay."
          : "Website is now accessible to users.",
        variant: enable ? "default" : "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to toggle maintenance mode",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wrench className="h-5 w-5" />
          <span>Maintenance Mode</span>
        </CardTitle>
        <CardDescription>
          Toggle maintenance mode to temporarily disable the website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Label htmlFor="maintenance-toggle">Maintenance Mode</Label>
          <div className="flex items-center space-x-2">
            {isMaintenanceMode ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <Switch
              id="maintenance-toggle"
              checked={isMaintenanceMode}
              onCheckedChange={toggleMaintenance}
              disabled={loading}
            />
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="maintenance-title">Maintenance Title</Label>
          <Input
            id="maintenance-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Under Maintenance"
            disabled={loading}
          />
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="maintenance-message">Maintenance Message</Label>
          <Textarea
            id="maintenance-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Website is currently under maintenance. Please check back soon."
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Current Status */}
        {maintenanceStatus && (
          <div className="text-sm text-gray-500 space-y-1">
            <div>
              Status: {isMaintenanceMode ? 'Enabled' : 'Disabled'}
            </div>
            {maintenanceStatus.started_at && (
              <div>
                Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
              </div>
            )}
            {maintenanceStatus.ended_at && !isMaintenanceMode && (
              <div>
                Ended: {new Date(maintenanceStatus.ended_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMaintenance(true)}
            disabled={loading || isMaintenanceMode}
            className="flex-1"
          >
            Enable
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMaintenance(false)}
            disabled={loading || !isMaintenanceMode}
            className="flex-1"
          >
            Disable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}