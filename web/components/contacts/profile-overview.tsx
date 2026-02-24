"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileOverviewProps {
  profileId: string;
}

export function ProfileOverview({ profileId }: ProfileOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Profile ID: <span className="font-mono">{profileId}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Use the Notes, Files, Interactions, and Onchain tabs to manage data
          and view activity.
        </p>
      </CardContent>
    </Card>
  );
}
