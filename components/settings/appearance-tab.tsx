"use client";

import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/types/settings";
import { panelClassName, rowClassName } from "@/components/settings/settings-types";

interface AppearanceTabProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function AppearanceTab({ settings, updateSetting }: AppearanceTabProps) {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                {settings.theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                Theme
              </Label>
              <p className="text-sm text-muted-foreground">
                Choose the default shell theme for the full admin console
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={settings.theme === "dark" ? "default" : "outline"}
                onClick={() => updateSetting("theme", "dark")}
                className="min-w-24"
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Button>
              <Button
                size="sm"
                variant={settings.theme === "light" ? "default" : "outline"}
                onClick={() => updateSetting("theme", "light")}
                className="min-w-24"
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Button>
            </div>
          </div>

          <div className="border-b border-border/80 py-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-foreground">Terminal Font Size</Label>
              <span className="text-sm font-medium text-primary">
                {settings.fontSize}px
              </span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={(value) => {
                if (value[0]) {
                  updateSetting("fontSize", value[0]);
                }
              }}
              min={12}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          <div className={rowClassName}>
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Monitor className="h-4 w-4" />
                Compact Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing for denser information display
              </p>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked) => updateSetting("compactMode", checked)}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-foreground">
                <Smartphone className="h-4 w-4" />
                Show Line Numbers
              </Label>
              <p className="text-sm text-muted-foreground">
                Display line numbers in code editors
              </p>
            </div>
            <Switch
              checked={settings.showLineNumbers}
              onCheckedChange={(checked) => updateSetting("showLineNumbers", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
