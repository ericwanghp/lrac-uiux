"use client";

import { Mail, Monitor, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/types/settings";
import { panelClassName, rowClassName } from "@/components/settings/settings-types";

interface NotificationsTabProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function NotificationsTab({ settings, updateSetting }: NotificationsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Monitor className="h-4 w-4" />
                Desktop Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show desktop notifications for important events
              </p>
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => updateSetting("desktopNotifications", checked)}
            />
          </div>

          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Volume2 className="h-4 w-4" />
                Sound
              </Label>
              <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
            />
          </div>

          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates for critical events
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
            />
          </div>

          <div className="py-4">
            <Label className="mb-3 block text-foreground">Notification Level</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["all", "important", "critical"] as const).map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={settings.notificationLevel === level ? "default" : "outline"}
                  onClick={() => updateSetting("notificationLevel", level)}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {settings.notificationLevel === "all" && "Receive all notifications"}
              {settings.notificationLevel === "important" && "Only important notifications"}
              {settings.notificationLevel === "critical" && "Only critical notifications"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
