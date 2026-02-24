"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddContactForm } from "@/components/forms/add-contact-form";

export default function NewContactPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Contact</h1>
          <p className="text-muted-foreground">
            Create a contact profile. Wallet is required; optional fields like
            Twitter can be added.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>
            Profile will be created onchain and registered to your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
