"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  resolveName,
  getName,
  isSuiNSName,
  type SuiNSNameRecord,
} from "@/lib/config/suins";

// ── In-memory cache (lives for the tab session) ───────────────────────────────
const nameCache = new Map<string, string | null>();        // address  → .sui name
const recordCache = new Map<string, SuiNSNameRecord | null>(); // .sui name → record

// ── useSuiNSName ─────────────────────────────────────────────────────────────
/**
 * Reverse lookup: given a Sui address, returns its default .sui name.
 *
 * @example
 *   const { suiName, loading } = useSuiNSName("0xabc...");
 *   // suiName = "alice.sui" | null
 */
export function useSuiNSName(address: string | null | undefined) {
  const [suiName, setSuiName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setSuiName(null);
      return;
    }

    // Return cached result immediately
    if (nameCache.has(address)) {
      setSuiName(nameCache.get(address) ?? null);
      return;
    }

    console.log("[useSuiNSName] fetching for address:", address);
    setLoading(true);
    getName(address).then((name) => {
      console.log("[useSuiNSName] got name:", name, "for address:", address);
      nameCache.set(address, name);
      setSuiName(name);
      setLoading(false);
    });
  }, [address]);

  return { suiName, loading };
}

// ── useSuiNSRecord ────────────────────────────────────────────────────────────
/**
 * Forward lookup: given a .sui name, returns its full NameRecord.
 *
 * @example
 *   const { record, loading } = useSuiNSRecord("alice.sui");
 *   // record.address, record.avatar, record.isExpired …
 */
export function useSuiNSRecord(name: string | null | undefined) {
  const [record, setRecord] = useState<SuiNSNameRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setRecord(null);
      return;
    }

    if (recordCache.has(name)) {
      setRecord(recordCache.get(name) ?? null);
      return;
    }

    setLoading(true);
    setError(null);
    resolveName(name)
      .then((r) => {
        recordCache.set(name, r);
        setRecord(r);
      })
      .catch(() => setError("Failed to resolve name"))
      .finally(() => setLoading(false));
  }, [name]);

  return { record, loading, error };
}

// ── useSuiNSInput ─────────────────────────────────────────────────────────────
/**
 * Smart input resolver: accepts either a raw Sui address or a .sui name.
 * If a .sui name is entered, it resolves to the target Sui address.
 * Useful for address input fields in forms.
 *
 * @example
 *   const { resolvedAddress, suiName, resolving, inputError } = useSuiNSInput(inputValue);
 *   // use resolvedAddress as the canonical Sui address
 */
export function useSuiNSInput(rawInput: string) {
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [suiName, setSuiName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = rawInput.trim();

    if (!trimmed) {
      setResolvedAddress(null);
      setSuiName(null);
      setInputError(null);
      return;
    }

    // Plain Sui address — pass through unchanged
    if (trimmed.startsWith("0x") && !isSuiNSName(trimmed)) {
      setResolvedAddress(trimmed);
      setSuiName(null);
      setInputError(null);
      return;
    }

    // .sui name — resolve after debounce
    if (isSuiNSName(trimmed)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setResolving(true);
      setInputError(null);

      // Check cache first
      if (recordCache.has(trimmed)) {
        const cached = recordCache.get(trimmed);
        if (cached?.address) {
          setResolvedAddress(cached.address);
          setSuiName(trimmed);
        } else {
          setResolvedAddress(null);
          setInputError(`"${trimmed}" has no target address`);
        }
        setResolving(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const r = await resolveName(trimmed);
        recordCache.set(trimmed, r);

        if (!r) {
          setInputError(`"${trimmed}" not found on SuiNS`);
          setResolvedAddress(null);
          setSuiName(null);
        } else if (r.isExpired) {
          setInputError(`"${trimmed}" is an expired name`);
          setResolvedAddress(null);
          setSuiName(null);
        } else if (!r.address) {
          setInputError(`"${trimmed}" has no target address set`);
          setResolvedAddress(null);
          setSuiName(null);
        } else {
          setResolvedAddress(r.address);
          setSuiName(trimmed);
          setInputError(null);
        }
        setResolving(false);
      }, 500);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    // Neither valid address nor .sui name
    setResolvedAddress(null);
    setSuiName(null);
    setInputError(null);
  }, [rawInput]);

  return { resolvedAddress, suiName, resolving, inputError };
}

// ── Imperative API ────────────────────────────────────────────────────────────
/**
 * One-shot resolve for use outside React (e.g. form submit handlers).
 * Returns the Sui address whether the input is a raw address or a .sui name.
 */
export async function resolveInput(rawInput: string): Promise<string | null> {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("0x")) return trimmed;
  if (isSuiNSName(trimmed)) {
    const r = await resolveName(trimmed);
    return r?.address ?? null;
  }
  return null;
}
