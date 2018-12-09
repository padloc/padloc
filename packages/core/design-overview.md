# Core Design Overview [WIP]

**Last Update: 2018-11-10**

This is a high level overview of the security design and architecture
of the **padloc** core module.

## Core Objects

### Container

`Container` is an abstract class designed to hold, encrypt and serialize
sensitive data. It encapsulates all the logic and parameters needed to
perform encryption and decryption as well as serializing data in a secure
format. All data is encrypted using the AES cipher. There are three different
implementations which differ mainly in how they derive the encryption key.

```ts
abstract class Container {
    encryptedData: string;
    encryptionParams: AESEncryptionParams;

    abstract getKey(): AESKey;

    setData(data: string) {
        this.encryptedData = AESEncrypt(this.getKey(), data);
    }

    getData(): string {
        return AESDecrypt(this.getKey(), this.encryptedData);
    }
}
```

#### SimpleContainer

`SimpleContainer` is the most basic implementation of `Container` where the
raw encryption key is not derived in any way but provided explicitly.

```ts
class SimpleContainer extends Container {
    key: AESKey;

    getKey() {
        return this.key;
    }
}
```

#### PBES2Container

`PBES2Container` employs the
[PBES2](https://tools.ietf.org/html/rfc2898#section-6.2) password-based
encryption scheme where the encryption key is derived from a user password
using the [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) key derivation
function.

```ts
class PBES2Container extends Container {
    password: string;
    keyParams: PBKDF2Params;

    getKey() {
        return PBKDF2(this.password, this.keyParams);
    }
}
```

#### SharedContainer

As the name suggests, this class is designed to make sensitive data accessible
to a number of independent accessors without the need for them to share a
common password. `SharedContainer` is loosely based on the [JSON Web
Encryption](https://tools.ietf.org/html/rfc7516) specification where the shared
symmetric encryption key is individually encrypted with each accessors public
key and stored alongside the encrypted data. Accessors can then access the data
by using their private key to decrypt the AES encryption key which is then used
to decrypt the actual data.

```ts
class SharedContainer extends Container {
    access: {
        id: string;
        privateKey: RSAPrivateKey;
    }

    accessors: {
        id: string;
        encryptedKey: string;
    }[]

    getKey() {
        const encryptedKey = this.accessors.find({ id } => id === this.access.id);
        return RSADecrypt(this.access.privateKey, this.encryptedKey);
    }
}
```

### Account

The account object represents a user within padloc. In addition to basic
information like email address and name, it holds a RSA key pair used for
securely sharing secrets (see [`SharedContainer`](#sharedcontainer)). The
private key is encrypted at rest using the [`PBES2` scheme](#pbes2container)
described above and can be accessed by 'unlocking' the account using its
master password.

```ts
class Account extends PBES2Container {
    email: string;
    name: string;
    publicKey: RSAPublicKey;
    privateKey: RSAPrivateKey;

    unlock(password) {
        this.password = password;
        this.privateKey = this.getData();
    }
}
```

### Vault

Vaults are designed to provide shared, secure access to sensitive data to
without the need of a shared password. In addition to securely holding data,
they manage access, permissions and authentication between a number of Vault
members.

There are two main kinds of Vault members - regular members and administrators.
Regular members have read and write access to vault items while admins also
have access to additional sensitive data required to perform management tasks
like adding members and issuing invites.

Vault members access the vaults sensitive data through the mechanism described
in [`SharedContainer`](#sharedcontainer). Since public keys are stored in
plain text, they need to be protected from tempering. This is done by signing
all public keys with the vaults private key (which is stored securely in a
[`SharedContainer`](#sharedcontainer) only admins have access to) so they can
later be verified by all members using the vaults public key.

Vaults can also have sub-vaults which are protected from tempering in the same
way that members are. The vaults own public key can in turn be verified through
the parent vault. Additionally, a copy of the vaults public key is stored in
the `adminData` container so admins can verify it in absence of a parent vault.

In addition to any shared vaults, every **padloc** user also has a dedicated
personal vault that only they have access to. The personal vault is no different
in functionality from shared vaults except that they may only have exactly one
member (the user).

```ts
class Vault {
    publicKey: string;
    privateKey: string; // <- only admins have access
    items: VaultItem[];

    members: {
        id: string;
        name: string;
        email: string;
        publicKey: RSAPublicKey;
        signedPublicKey: string;
    }[];

    vaults: {
        id: string;
        name: string;
        publicKey: string;
        signedPublicKey: string;
    }[];

    parent: {
        id: string;
        name: string;
        publicKey: string;
    } | null;

    private adminData: SharedContainer; // <- Holds the private key
    private itemsData: SharedContainer; // <- Holds vault data
}
```

## Secure, Trustless Key Exchange

Adam and Eve are both **padloc** users. Adam is an admin of the vault
`V` and wants to add Eve as a member. Before Adam can add Eve to the vault, he
first needs to receive and verify her public key `pE`. Likewise, Eve needs to
receive and verify the vaults public key `pV`. In other words, a secure key
exchange needs to take place between `V` and Eve.

To initiate the key exchange, Adam generates a random secret passphrase `p`.
Then, `x = PBKDF2(p, s, i)` and `p' = AES(k, p)` are derived where `s`
and `i` are the salt and iteration count used in the key derivation and `k` is a
random 256 bit AES key which is stored securely within the vault `V` and only
accessible to vault admins. `x` is used to create a signature `pV' = HMAC(x, pV)`.
Adam now transmits `I = { pV, pV', s, i, p' }` and Eves email address to
the server `S` where they are stored. `p'` can later be used by Adam and other
vault admins to restore `p`.

`S` notifies Eve of the pending invite. After authenticating with the server
using her email address and password (see [Authentication](#authentication)),
Eve receives the information generated by Adam from `S`. To verify `pV`, Eve now
needs the secret `p` generated by Adam. Adam communicates `p` to Eve using a
separate, direct communication channel of their choice like over the phone or
through a secure messenger.

Eve can now derive `x` and use it to verify `pV` and to sign her own public key.
`pE' = HMAC(x, pE)` and `pE` are sent to `S`.

Finally, Adam can retrieve and verify `pE` and `pE'` from `S`. The key exchange
is completed.

#### Notes

-   Since `p` needs to be sufficiently short to be conveniently entered by
    hand, it can potentially be guessed by eavesdroppers using `pV` and `pV'`
    which would allow them to successfully perform a man-in-the-middle attach by
    injecting their own public key. This is mitigated by using a sufficiently large
    iteration count `i` and invalidating key exchanges after a certain amount of
    time.

-   Using a separate, direct communication channel for communicating the secret
    passphrase not only mitigates the risk of man-in-the-middle attacks but
    also means that the server `S` does not need to be explicitly trusted.
    Furthermore, the risk of phishing attacks by a third party (including a
    malicious server admin) is greatly reduced since a direct, personal
    interaction between the parties is required.

## Authentication

Even though all sensitive information in **padloc** is end-to-end encrypted and
theoretically secure even in case of an insecure connection or even a
compromised server, **padloc** still uses a robust authentication scheme to limit
access to user data, ensure payload integrity and enforce user permissions.
Starting with v3.0, a variation of the [Secure Remote
Password](https://tools.ietf.org/html/rfc2945) protocol is used to authenticate
users and establish a secure connection between client and server without
exposing the users master password.

### Account Creation

When a user initially signs up with a **padloc** server, the following steps are
performed:

1. The user chooses an **email address** `U` (which shall act as the user name)
   and a **master password** `p`.
2. The email address is sent to the server. To verify that the user is in fact
   in control of that address, an **email verification code** `c` is sent to
   the users inbox.
3. The app generates an **authentication key** `x = PBKDF2(p, s, i)` from the
   master password using the **PBKDF2** key derivation function. `s` and `i`
   are the randomly generated **salt** and **iteration count**, respectively.
4. The **authentation key** is used to derive the **password verifier**
   `v(x)` according to the **SRP** specification.
5. The client sends `A = { U, v, s, i }` and `c` to the server which
   verifies `c` and, if correct, stores `A` for future session negotiation.

### Session Negotiation

To 'log into' an existing account and negotiate a secure session, the following
steps are performed.

1. The user enters their **email address** `U` and **master password** `p`.
2. The client requests `s` and `i`, based on `U`.
3. The client generates `x = PBKDF2(p, s, i)`
4. Server and client negotiate a common 256 bit session key `K` according to
   the **SRP** specification.

### Request Authentication

Once a session has been established between client and server, a signature
`S = HMAC(K, a | t | b)` is included with every request and response where `a` is
the unique session id, `t` is a timestamp of the send time and `b` is a
serialization of the request body. The signature is then verified by the
receiving party and serves three main purposes:

-   Verify the identity of the server
-   Prevent tempering of the request body
-   Mitigate replay attacks by discarding request with a timestamp older than a
    certain time

### Notes

-   Even though `v` is based on `p`, it can not be used to derive the password in
    case someone eavesdrops on the connection or if the server is compromised.
    See section 4 of the SRP specification for details.
-   The session key `K` cannot be sniffed out since it is never transmitted. It
    could theoretically be guessed from the request signature but with a key size
    of 256 bits this is not really feasible either.
-   The salt and iteration count used for generating `x` as well as the
    resulting authentication key are completely independent of the
    corresponding values used for encrypting the accounts private key, even though
    the derivation scheme and base passphrase are the same.
-   To prevent username enumeration, the server will return randomized
    values for `s` and `i` during step 2 of the session negotiation in case
    no account with the username `U` exists.
