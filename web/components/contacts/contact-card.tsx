"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContactCardProps {
  contact: {
    id: string;
    walletAddress: string;
    twitter?: string;
  };
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-sm truncate"
              title={contact.walletAddress}
            >
              {contact.walletAddress.slice(0, 10)}…
              {contact.walletAddress.slice(-6)}
            </span>
            {contact.twitter && (
              <Badge variant="secondary">{contact.twitter}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">View profile →</p>
        </CardContent>
      </Card>
    </Link>
  );
}
