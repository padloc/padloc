type Base64String = string;

// Valid Key Types ( https://tools.ietf.org/html/rfc7518#section-6.1)
type KeyType = "RSA" | "oct";

// Valid Key Use Value (https://tools.ietf.org/html/rfc7517#section-4.2)
type PublicKeyUse = "sig" | "enc";

// Valid Key Operations (https://tools.ietf.org/html/rfc7517#section-4.3)
type KeyOperation = "sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits";

// Key Management Algorithms (https://tools.ietf.org/html/rfc7518#section-4.1)
type WrappingAlgorithm = "RSA-OAEP" | "dir";

// Encryption Algorithms
type EncryptionAlgorithm = "A256GCM";

export type Algorithm = WrappingAlgorithm | EncryptionAlgorithm;

// JSON Web Key (https://tools.ietf.org/html/rfc7517)
export interface JWKBase {
    kty: KeyType;
    alg: Algorithm;
    use?: PublicKeyUse;
    key_ops?: KeyOperation[];
    kid?: string;
}

// RSA private or public key (https://tools.ietf.org/html/rfc7518#section-6.3)
export interface RSAKey extends JWKBase {
    kty: "RSA";
}

export type AsymmetricKey = RSAKey;
export type PublicKey = RSAPublicKey;
export type PrivateKey = RSAPrivateKey;

// RSA public key (https://tools.ietf.org/html/rfc7518#section-6.3.1)
export interface RSAPrivateKey extends RSAKey {
    // module
    n: Base64String;
    // exponent
    e: Base64String;
}

// RSA private key (https://tools.ietf.org/html/rfc7518#section-6.3.2)
export interface RSAPublicKey extends RSAKey {
    // private exponent
    d: Base64String;
    // first prime factor
    p: Base64String;
    // second prime factor
    q: Base64String;
    // first factor CRT Exponent
    dp: Base64String;
    // second factor CRT Exponent
    dq: Base64String;
    // first CRT coefficient
    qi: Base64String;
    // other primes info
    oth?: {
        // prime factor
        r: Base64String;
        // factor CRT component
        d: Base64String;
        // factor CRT coefficient
        t: Base64String;
    }[];
}

// Symmetric Key (https://tools.ietf.org/html/rfc7518#section-6.4)
export interface SymmetricKey extends JWKBase {
    kty: "oct";
    // key value
    k: Base64String;
}

export type JWK = SymmetricKey | PublicKey | PrivateKey;

// JOSE Header (https://tools.ietf.org/html/rfc7515#section-4, https://tools.ietf.org/html/rfc7516#section-4)
export interface Header {
    // algorithm used for wrapping/signing
    alg?: Algorithm;
    // content encryption algorithm
    enc?: Algorithm;
    // compression algorithm
    zip?: string;
    // JWK set url
    jku?: string;
    // public key used for for wrapping/signing
    jwk?: PublicKey;
    // key ID
    kid?: string;
    // certificate url
    x5u?: string;
    // certificate chain
    x5c?: string;
    // certificate thumbprint (SHA-1)
    x5t?: string;
    // certificate thumbprint (SHA-256)
    "x5t#S256"?: string;
    // media type
    typ?: string;
    // content type
    cty?: string;
    // additional critical header fields
    crit?: string[];
}

// JWE recipient (https://tools.ietf.org/html/rfc7516#section-7.2.1)
export interface Recipient {
    header: Header;
    encrypted_key: Base64String;
}

// JSON Web Encryption (https://tools.ietf.org/html/rfc7516#section-7.2.1)
export interface JWE {
    protected?: Base64String;
    unprotected?: Header;
    iv: Base64String;
    ciphertext: Base64String;
    tag?: Base64String;
    aad: Base64String;
    recipients?: Recipient[];
}
