"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileOnchainProps {
  profileId: string;
}

export function ProfileOnchain({ profileId }: ProfileOnchainProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onchain activity</CardTitle>
        <CardDescription>
          Token holdings, NFTs, DeFi positions from indexer API ( GET
          /api/profiles/:id/onchain).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Profile: <span className="font-mono">{profileId}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Wire indexer endpoint to display enriched onchain data here.
        </p>
      </CardContent>
    </Card>
  );
}
