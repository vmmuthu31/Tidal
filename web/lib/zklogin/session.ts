/**
 * A lightweight session storage manager designed specifically for
 * the zkLogin OAuth redirect flow.
 */

export interface ZkLoginSessionData {
    ephemeralPrivateKey: string; // Bech32 encoded string
    randomness: string;
    maxEpoch: string;
    nonce: string;
    userSalt?: string;
    pendingUserName?: string;
    inviteToken?: string;   // set when user arrives from an invite link
}

export interface CachedProofData {
    zkProof: any;
    jwtToken: string;
    address: string;
    userSalt: string;
    maxEpoch: number;
    randomness: string;
    ephemeralPrivateKey: string;
}

const SESSION_KEY = "suicrm-zklogin-session";
const PROOF_KEY = "suicrm-zklogin-proof";

export class SessionManager {
    static saveSession(session: ZkLoginSessionData) {
        if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    }

    static getSession(): ZkLoginSessionData | null {
        if (typeof window === "undefined") return null;
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }

    static clearSession() {
        if (typeof window !== "undefined") {
            localStorage.removeItem(SESSION_KEY);
        }
    }

    static saveProof(proofData: CachedProofData) {
        if (typeof window !== "undefined") {
            localStorage.setItem(PROOF_KEY, JSON.stringify(proofData));
        }
    }

    static getProof(): CachedProofData | null {
        if (typeof window === "undefined") return null;
        const data = localStorage.getItem(PROOF_KEY);
        return data ? JSON.parse(data) : null;
    }

    static clearProof() {
        if (typeof window !== "undefined") {
            localStorage.removeItem(PROOF_KEY);
        }
    }

    static clearAll() {
        this.clearSession();
        this.clearProof();
    }
}
