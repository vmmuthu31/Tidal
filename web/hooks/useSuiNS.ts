"use client";

import { useState, useEffect, useRef } from "react";
import {
  resolveName,
  getName,
  isSuiNSName,
  type SuiNSNameRecord,
} from "@/lib/config/suins";

// ── In-memory cache (lives for the tab session) ───────────────────────────────
const nameCache = new Map<string, string | null>();        // address  → .sui name
const recordCache = new Map<string, SuiNSNameRecord | null>(); // .sui name → record

function clearNameState(setSuiName: (value: string | null) => void): void {
  setSuiName(null);
}

function clearRecordState(setRecord: (value: SuiNSNameRecord | null) => void): void {
  setRecord(null);
}

function setCachedNameState(
  setSuiName: (value: string | null) => void,
  cachedName: string | null,
): void {
  setSuiName(cachedName);
}

function setCachedRecordState(
  setRecord: (value: SuiNSNameRecord | null) => void,
  cachedRecord: SuiNSNameRecord | null,
): void {
  setRecord(cachedRecord);
}

function setInputNeutralState(
  setResolvedAddress: (value: string | null) => void,
  setSuiName: (value: string | null) => void,
  setInputError: (value: string | null) => void,
): void {
  setResolvedAddress(null);
  setSuiName(null);
  setInputError(null);
}

function setResolvedFromAddress(
  setResolvedAddress: (value: string | null) => void,
  setSuiName: (value: string | null) => void,
  setInputError: (value: string | null) => void,
  address: string,
): void {
  setResolvedAddress(address);
  setSuiName(null);
  setInputError(null);
}

function beginResolvingState(
  setResolving: (value: boolean) => void,
  setInputError: (value: string | null) => void,
): void {
  setResolving(true);
  setInputError(null);
}

function setCachedResolvedState(
  setResolvedAddress: (value: string | null) => void,
  setSuiName: (value: string | null) => void,
  setInputError: (value: string | null) => void,
  setResolving: (value: boolean) => void,
  cachedAddress: string | null,
  resolvedName: string,
): void {
  if (cachedAddress) {
    setResolvedAddress(cachedAddress);
    setSuiName(resolvedName);
  } else {
    setResolvedAddress(null);
    setInputError(`"${resolvedName}" has no target address`);
  }
  setResolving(false);
}

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
      clearNameState(setSuiName);
      return;
    }

    // Return cached result immediately
    if (nameCache.has(address)) {
      setCachedNameState(setSuiName, nameCache.get(address) ?? null);
      return;
    }

    const fetchName = async (): Promise<void> => {
      console.log("[useSuiNSName] fetching for address:", address);
      setLoading(true);
      const name = await getName(address);
      console.log("[useSuiNSName] got name:", name, "for address:", address);
      nameCache.set(address, name);
      setSuiName(name);
      setLoading(false);
    };

    void fetchName();
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
      clearRecordState(setRecord);
      return;
    }

    if (recordCache.has(name)) {
      setCachedRecordState(setRecord, recordCache.get(name) ?? null);
      return;
    }

    const fetchRecord = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const resolved = await resolveName(name);
        recordCache.set(name, resolved);
        setRecord(resolved);
      } catch {
        setError("Failed to resolve name");
      } finally {
        setLoading(false);
      }
    };

    void fetchRecord();
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
      setInputNeutralState(setResolvedAddress, setSuiName, setInputError);
      return;
    }

    // Plain Sui address — pass through unchanged
    if (trimmed.startsWith("0x") && !isSuiNSName(trimmed)) {
      setResolvedFromAddress(setResolvedAddress, setSuiName, setInputError, trimmed);
      return;
    }

    // .sui name — resolve after debounce
    if (isSuiNSName(trimmed)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      beginResolvingState(setResolving, setInputError);

      // Check cache first
      if (recordCache.has(trimmed)) {
        const cached = recordCache.get(trimmed);
        setCachedResolvedState(
          setResolvedAddress,
          setSuiName,
          setInputError,
          setResolving,
          cached?.address ?? null,
          trimmed,
        );
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
    setInputNeutralState(setResolvedAddress, setSuiName, setInputError);
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
