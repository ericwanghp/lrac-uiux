"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { panelClassName, rowClassName } from "@/components/settings/settings-types";

export function IntegrationsTab() {
  return (
    <div className="space-y-6 animate-fade-in-up p-4 sm:p-6">
      <Card className={panelClassName}>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Manage third-party integrations and connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={rowClassName}>
            <div className="flex items-center gap-4">
              <div className="admin-icon-surface h-12 w-12">
                <svg
                  className="h-6 w-6 text-foreground"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  Connect to GitHub repositories
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              Connect
            </Button>
          </div>

          <div className={rowClassName}>
            <div className="flex items-center gap-4">
              <div className="admin-icon-surface h-12 w-12">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-8.46 7.75-3.684-2.804a1.498 1.498 0 0 0-1.925.09L.273 8.477A1.5 1.5 0 0 0 0 9.611v4.778a1.5 1.5 0 0 0 .273.876l2.162 2.235a1.5 1.5 0 0 0 1.925.09l3.684-2.804 8.46 7.75a1.494 1.494 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 18.56V5.44a1.5 1.5 0 0 0-.85-1.353zM9 15.586L3 11.59V8.41l6-3.997v11.173zm6-3.998l3-2.002v2.828l-3 2.002v-2.828zm0-6.001l3 2.002v2.828l-3-2.002V5.587z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">VS Code</p>
                <p className="text-sm text-muted-foreground">
                  Connect to VS Code editor
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              Connect
            </Button>
          </div>

          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="admin-icon-surface h-12 w-12">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">API Keys</p>
                <p className="text-sm text-muted-foreground">
                  Manage API keys for integrations
                </p>
              </div>
            </div>
            <Button size="sm" className="gradient-primary text-white">
              Manage API Keys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
