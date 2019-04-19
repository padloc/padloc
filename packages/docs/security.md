# Padloc Security Whitepaper

This document provides a high level overview of the security design and
architecture of the **Padloc** application.

## Security Principles

### Simplicity

While the secure processing, storage and sharing of sensitive data necessarily
involves a certain degree of complexity, Padloc tries to hide this complexity
from the end user as much as possible. In other words, users should be able to
use the application securely without understanding (or even being aware of) the
underlying security principles. At the same time, the applications inner
workings and security mechanisms should be easily verifiable by those who have
the technical knowledge to do so, which brings us to...

### Transparency

It is a widely know fact among security experts that [Security through
Obscurity](https://en.wikipedia.org/wiki/security_through_obscurity) is not
only ineffective, but can in fact be harmful if used to cover up otherwise
sloppy security practices. We believe that full transparency is not only the
best foundation for trust, but also allows us and other independent reviewers
to discover and fix any potential security flaws and efficiently as quickly as
possible.

### No Trust Required

While Padlocs open source nature is helpful in uncovering unintended
vulnerabilities in the source code, it is, by itself, insufficient for
verifying that the code actually deployed in production is not altered in a way
that may compromise the security of the application either intentionally or
unintentionally. This is why we take additional steps to make sure that some
parts of the architecture can in fact be verified in production, while others
do not need to be verified by design (see [Possible Attack-Vectors And
Mitigations](#possible-attach-vectors-and-mitigations)). This means that unlike
other products, Padloc does not require explicit trust between the end user
and the host.

## Encryption

Robust data encryption is the foundation of Padlocs security architecture.
Padloc utilizes three basic encryption schemes.

### Simple Symmetric Encryption

This is the most basic encryption scheme used in Padloc. Simple encryption
employs a symmetric cipher to encrypt the provided data with
a randomly generated key. The encrypted data, along with the encryption
parameters needed for decryption, is stored in a container object, which
can then be stored or transmitted securely. Padloc currently uses the AES
cipher in GCM mode, but other options may be added in the future.

#### Encryption

1. Choose a random encryption key `k`
2. Choose a random initialization vector `iv` and additional data `a` (for
   authenticated encryption modes)
3. Generate the encrypted data `c = AES_encrypt(k, p, iv, a)` from the plain text `p`
4. Store `c`, `iv` and `a` in the container `C`

```
                 ┌───────────┐                 ┏━━━━━━━━━━━━━━━━┓
   =========     │           │                 ┃Simple Container┃       ╔═══════════╗
   == key ==─────┘           ▼                 ┃                ┃       ║ encrypted ║
   =========            ┌─────────┐            ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃       ╚═══════════╝
                        │ encrypt │            ┃   encryption  │┃       ┌ ─ ─ ─ ─ ─ ┐
                  ┌────▶│  (AES)  │────────────▶│  parameters   ┃           plain
                  │     └─────────┘            ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃       └ ─ ─ ─ ─ ─ ┘
==============    │          │                 ┃╔══════════════╗┃       =============
= plain text =────┘          └─────────────────▶║encrypted data║┃       = ephemeral =
==============                                 ┃╚══════════════╝┃       =============
                                               ┗━━━━━━━━━━━━━━━━┛
```

#### Decryption

1. Let `k` be the key used for encryption.
2. Retrieve `iv`, `a` and `c` from `C`
3. Generate the plain text `p = AES_decrypt(k, c, iv, a)`

### Password-Based Encryption

In the password-based encryption scheme (based on the [PBES2
standard](https://tools.ietf.org/html/rfc2898#section-6.2)) an encryption key
is derived from a user password using the
[PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) key derivation function.

#### Encryption

1. Choose a password `p`
2. Choose an iteration count `i` and random salt `s`
3. Generate `k = PBDKF2(p, s, i)`
4. Choose a random initialization vector `iv` and additional data `a` (for
   authenticated encryption modes)
5. Generate the encrypted data `c = AES_encrypt(k, p, iv, a)` from the plain text `p`
6. Store `s`, `i`, `c`, `iv` and `a` in the container `C`

```
 ============           ┌────────┐              ┏━━━━━━━━━━━━━━━━┓
 = password =──────────▶│ PBKDF2 │───────┐      ┃ Password-Based ┃
 ============           └────────┘       │      ┃   Container    ┃
                             │           │      ┃                ┃
                             │           │      ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃
                             ▼           │      ┃     PBKDF2    │┃
                         =========       └──────▶│  parameters   ┃
                         == key ==              ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃
                         =========              ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃
                             │                  ┃   encryption  │┃
                             ▼           ┌──────▶│  parameters   ┃
                        ┌─────────┐      │      ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃
==============          │ encrypt │      │      ┃╔══════════════╗┃
= plain text =─────────▶│  (AES)  │──────┘┌─────▶║encrypted data║┃
==============          └─────────┘       │     ┃╚══════════════╝┃
                             │            │     ┗━━━━━━━━━━━━━━━━┛
                             │            │
                             └────────────┘
```

#### Decryption

1. Let `p` be the password used for encryption
2. Retrieve `s`, `i` from `C`
3. Generate `k = PBDKF2(p, s, i)`
4. Retrieve `iv`, `a` and `c` from `C`
5. Generate the plain text `p = AES_decrypt(k, c, iv, a)`

### Shared-Key Encryption

Shared-key encryption is used to securely share sensitive data between
a number of independent accessors without the need for them to share a
common password. This encryption scheme is loosely based on the [JSON Web
Encryption](https://tools.ietf.org/html/rfc7516) specification where a shared
symmetric encryption key is individually encrypted with each accessors public
key and stored alongside the encrypted data. Accessors can then access the data
by using their private key to decrypt the AES encryption key which is in turn
used to decrypt the original data.

#### Encryption

1. Generate a random encryption key `k`
2. Choose a random initialization vector `iv` and additional data `a` (for
   authenticated encryption modes)
3. Generate the encrypted data `c = AES_encrypt(k, p, iv, a)` from the plain text `p`
4. Let `[A_1, A_2, ..., A_n], A_n = { id_n, pub_n }` be a number of desired accessors
   where `pub_n` is the accessors public key and `id_n` a unique identifier.
5. For each accessor, generate `K_n = RSA_encrypt(pub_n, k)`
6. Store `c`, `iv`, `a`, and `K = [{ id_1, K_1}, ..., {id_n, K_n}]` in container `C`

```
┏━━━━━━━━━━━━━━┓                ┌───────────────────────────────────────────────────────────┐
┃  Accessor A  ┃                │                                                           │
┃              ┃                ▼                ┏━━━━━━━━━━━━━━━━┓                         │
┃┌ ─ ─ ─ ─ ─ ─ ┃           ┌─────────┐           ┃Shared Container┃   ==============        │
┃  public key │─────┐      │ encrypt │           ┃                ┃   = plain text =        │
┃└ ─ ─ ─ ─ ─ ─ ┃    └─────▶│  (RSA)  │─────┐     ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃   ==============        │
┃╔════════════╗┃           └─────────┘     │     ┃   encrypted   │┃          │              │
┃║private key ║┃                           └─────▶│   key (A)     ┃          ▼              │
┃╚════════════╝┃                                 ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃     ┌─────────┐         │
┗━━━━━━━━━━━━━━┛                                 ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃     │ encrypt │     =========
                                                 ┃   encrypted   │┃ ┌───│  (AES)  │◀────== key ==
                                           ┌─────▶│   key (B)     ┃ │   └─────────┘     =========
                                           │     ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃ │        │              │
┏━━━━━━━━━━━━━━┓                           │     ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃ │        │              │
┃  Accessor B  ┃                           │     ┃   encryption  │┃ │        │              │
┃              ┃                           │     ┃│  parameters   ◀─┘        │              │
┃┌ ─ ─ ─ ─ ─ ─ ┃           ┌─────────┐     │     ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃          │              │
┃  public key │─────┐      │ encrypt │     │     ┃╔══════════════╗┃          │              │
┃└ ─ ─ ─ ─ ─ ─ ┃    └─────▶│  (RSA)  │─────┘     ┃║encrypted data║◀──────────┘              │
┃╔════════════╗┃           └─────────┘           ┃╚══════════════╝┃                         │
┃║private key ║┃                ▲                ┗━━━━━━━━━━━━━━━━┛                         │
┃╚════════════╝┃                │                                                           │
┗━━━━━━━━━━━━━━┛                └───────────────────────────────────────────────────────────┘
```

#### Decryption

1. Let `id_n`, `priv_n` be the id and private key of one of the accessors used
   during encryption.
2. Retrieve `K` from `C`, find the encrypted key `K_n` for `id_n`.
3. Generate `k = RSA_decrypt(priv_n, K_n)`
4. Retrieve `iv`, `a` and `c` from `C`
5. Generate the plain text `p = AES_decrypt(k, c, iv, a)`

```
                                   ┌─────────┐
┏━━━━━━━━━━━━━━┓                   │ decrypt │                  ┏━━━━━━━━━━━━━━━━┓
┃  Accessor A  ┃        ┌─────────▶│  (RSA)  │◀────────┐        ┃Shared Container┃
┃              ┃        │          └─────────┘         │        ┃                ┃
┃┌ ─ ─ ─ ─ ─ ─ ┃        │               │              │        ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃
┃  public key │┃        │               │              │        ┃   encrypted   │┃
┃└ ─ ─ ─ ─ ─ ─ ┃        │    =========  │              └─────────│   key (A)     ┃
┃╔════════════╗┃        │    == key ==◀─┘                       ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃
┃║private key ║─────────┘    =========        ┌───────────┐     ┃┌ ─ ─ ─ ─ ─ ─ ─ ┃
┃╚════════════╝┃                 │            │           │     ┃   encryption  │┃
┗━━━━━━━━━━━━━━┛                 │            ▼           └──────│  parameters   ┃
                                 │       ┌─────────┐            ┃ ─ ─ ─ ─ ─ ─ ─ ┘┃
                                 │       │ decrypt │            ┃╔══════════════╗┃
                                 └──────▶│  (AES)  │◀────────────║encrypted data║┃
                                         └─────────┘            ┃╚══════════════╝┃
                                              │                 ┗━━━━━━━━━━━━━━━━┛
                                              ▼
                                       ==============
                                       = plain text =
                                       ==============
```

## Client-Server Architecture And The Zero-Trust Principle

[[TODO]]

## The Account Object And Master Password

The **Account** object represents an individual Padloc user and is central to
Padlocs encryption and authentication mechanisms. Each **Account** holds the
following information:

-   The users **email address** is not only used as a communication channel but,
    more importantly, serves as a unique, human-verifiable identifier for each
    Padloc user.
-   A RSA **private key** and **public key** pair is used in places where a user
    needs to be granted access to data protected via the [Shared-Key Encryption
    Scheme](#shared-key-encryption).
-   A HMAC key used for signing and verifing organization details (see
    [Organizations And Shared Vaults / Adding Members](#adding-members)
-   A unique, immutable id
-   A (display) name

The Accounts **private key** and **organization signing key** are considered
secret and should only ever be accessible to the Account owner themselves.
They are therefore encrypted at rest using the [Password-Based Encryption
Scheme](#password-based-encryption) with the users [**Master Password**](#the-master-password)
serving as the secret passphrase.

```
                                 ┏━━━━━━━━━━━━━━━━━━━━━┓
                                 ┃       Account       ┃        ╔═══════════╗
                                 ┃                     ┃        ║ encrypted ║
                                 ┃ ┌ ─ ┐┌ ─ ─ ┐┌ ─ ─ ┐ ┃        ╚═══════════╝
                                 ┃  id   name   email  ┃        ┌ ─ ─ ─ ─ ─ ┐
                                 ┃ └ ─ ┘└ ─ ─ ┘└ ─ ─ ┘ ┃            plain
===================              ┃ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐ ┃        └ ─ ─ ─ ─ ─ ┘
= Master Password =───────┐      ┃     public key      ┃        =============
===================       │      ┃ └ ─ ─ ─ ─ ─ ─ ─ ─ ┘ ┃        = ephemeral =
                          │      ┃ ╔═════════════════╗ ┃        =============
                      decrypts   ┃ ║ ┌─────────────┐ ║ ┃
                          │      ┃ ║ │ private key │ ║ ┃
                          │      ┃ ║ └─────────────┘ ║ ┃
                          └───────▶║ ┌─────────────┐ ║ ┃
                                 ┃ ║ │ signing key │ ║ ┃
                                 ┃ ║ └─────────────┘ ║ ┃
                                 ┃ ╚═════════════════╝ ┃
                                 ┗━━━━━━━━━━━━━━━━━━━━━┛
```

## Vaults

A password managers core functionality is the secure storage of sensitive data
like passwords, credit card details and or any other kind or data a user may
want to protect from prying eyes. In Padloc, this data is stored within so-called
**Vaults**.

A Vault is basically a container object that employs the [Shared-Key
Encryption Scheme](#shared-key-encryption) to encrypt and store sensitive data
in a way that makes it accessible to only a number of specific users, represented
by their corresponding **Account** objects.

```
┏━━━━━━━━━━━━━━━┓                 ┏━━━━━━━━━━━━━━┓
┃    Account    ┃                 ┃    Vault     ┃
┃               ┃                 ┃              ┃
┃ ┌ ─ ─ ─ ─ ─ ┐ ┃                 ┃ ╔══════════╗ ┃
┃  public key  ──────encrypts──────▶║vault data║ ┃
┃ └ ─ ─ ─ ─ ─ ┘ ┃                 ┃ ╚══════════╝ ┃
┃ ╔═══════════╗ ┃                 ┃       ▲      ┃
┃ ║private key║──────decrypts─────────────┘      ┃
┃ ╚═══════════╝ ┃                 ┃              ┃
┗━━━━━━━━━━━━━━━┛                 ┗━━━━━━━━━━━━━━┛
```

Each Padloc user owns a private vault to which only they have access. In
addition to this, **Shared Vaults** can be used to share sensitive data between
multiple members within an **Organization**. For more details on this, see the
[Organizations And Shared Vaults](#organizations-and-shared-vaults) section.

## Organizations And Shared Vaults

**Shared Vaults** can be used to securely share sensitive data between multiple
users. These vaults are provisioned and managed as part of **Organizations**,
which deal with permission management as well as public key and identity
verification.

### Vault Access Management

The previous sections describe how Vault data can be shared securely between
multiple known accounts. An additional challenge lies in deciding who shall
have access to a given vault as well as obtaining and verifying each accessors
public key before encryption.

The organisation structure depicted below determines which member shall have
access to a given vault. Members can either be assigned to a **Vault** directly
or indirectly via a **Group**.

```
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│              │           ╱│              │╲           │              │
│   Account    │┼─────────○─│  Membership  │──┼────────┼│ Organization │
│              │           ╲│              │╱           │              │
└──────────────┘            └───┬──────┬───┘            └──────────────┘
                               ╲│╱    ╲│╱                       ┼
                                ○      ○                        ○
                                │      │                       ╱│╲
                                │      │                ┌──────────────┐
                                │      │               ╱│              │
                                │      └──────────────○─│    Group     │
                                │                      ╲│              │
                                ○                       └──────────────┘
                               ╱│╲                             ╲│╱
                        ┌──────────────┐                        ○
                        │              │╲                       │
                        │ Shared Vault │─○──────────────────────┘
                        │              │╱
                        └──────────────┘
```

Every time a **Vault** participant encrypts the vault data, they perform
the following steps:

1. Determine accessors based on organization structure.
2. Verify each accessors identity and public key (see [Verifying
   Members](#verifying-members))
3. Encrypt the data using the steps outlined in [Shared-Key Encryption](#shared-key-encryption)

Each participating member can now access the Vault data using their own private
key.

### Metadata And Cryptographic Keys

In addition to Group and Member data, **Organizations** also hold the following
information:

-   The organization **id** is a random, unique identier assigned to it by the
    server
-   The organization **name** is chosen by the organization owner and is mainly
    used for display purposes
-   A RSA **public key** and **private key** pair that is used to sign and
    verify public keys and identifying information of its members. See [Signing
    Member Information](#adding-members) and [Verifying
    Members](#verifying-members) for details.
-   An AES key (in the following called "**invites key**") used to encrypt the
    invite verification code during [key
    exchange](#trustless-server-mediated-key-exchange)

The organizations **private key** and **invites key** are considered secret
and need therefore be encrypted at rest. For this, the organization acts as a
[Shared Crypto Container](#shared-key-encryption) with the [organization
owners](#owner) acting as accessors.

```
┏━━━━━━━━━━━━━━━┓                ┏━━━━━━━━━━━━━━━━━━━━┓
┃ Organization  ┃                ┃    Organization    ┃
┃     Owner     ┃                ┃                    ┃
┃               ┃                ┃  ╔═══════════════╗ ┃
┃ ┌ ─ ─ ─ ─ ─ ┐ ┃                ┃  ║┌─────────────┐║ ┃
┃  public key  ──────encrypts──────▶║│ private key │║ ┃
┃ └ ─ ─ ─ ─ ─ ┘ ┃                ┃  ║└─────────────┘║ ┃
┃ ╔═══════════╗ ┃                ┃  ║┌─────────────┐║ ┃
┃ ║private key║──────decrypts──────▶║│ invites key │║ ┃
┃ ╚═══════════╝ ┃                ┃  ║└─────────────┘║ ┃
┗━━━━━━━━━━━━━━━┛                ┃  ╚═══════════════╝ ┃
                                 ┗━━━━━━━━━━━━━━━━━━━━┛
```

### Public Key Exchange And Verification

As with all cryptographic schemes that involve public-key encryption, a major
challenge when dealing with shared vaults is securely exchanging and verifying
the public keys and associated identities of all involved parties. This
undertaking is complicated further by the fact that, although all communication
and data transfer is generally mediated by a central server, Padlocs [Zero-Trust
Principle](#no-trust-required) requires that this server (or any party
potentially listening in on the connection) is never in the position to
directly access any sensitive data or trick a participant into granting them
access either directly or indirectly.

Instead of exchanging keys between all organization members directly, Padloc
uses a simple verification chain where the public keys and identfying
information of all members are signed and verified with a dedicated RSA key
pair owned by the organization (see [Metadata and Cryptographic
Keys](#metadata-and-cryptographic-keys)). The corresponding public key must in
turn be signed and verified by each member using their individual, dedicated HMAC key.

#### Trustless Server-Mediated Key Exchange

Before a new member can be added to an Organization, a key exchange has to take
place between the organization (represented by the organization owner) and the
new member. The key exchange is performed as follows:

1. The **organization owner `O`** chooses a **random passphrase `p`**, a **random salt `s`**
   and an **iteration count `i`** as well as a random, unique exchange id.
2. **`p`**, **`s`** and **`i`** are used to generate the **HMAC key `x = PBKDF2(p, s, i)`**.
3. **`O`** signs the **organizations public key `pub_o`** with **`x`**: **`sig_o = HMAC(x, pub_o)`**
4. **`O`** sends **`s`**, **`i`**, **`pub_o`** and **`sig_o`** to the server **`S`**, along with the
   exchange id and the recipients email address.
5. The server stores the received values and sends the invitation link (which
   includes the exchange id) to **`I`** via email.
6. **`I`** uses the exchange id to request **`s`**, **`i`**, **`pub_o`** and **`sig_o`** from **`S`**.
7. **`I`** requests **`p`** from **`O`** via a separate (and optimally secure) channel of their
   choice. This can be in person, via phone or any by other means.
8. **`I`** generates **`x = PBKDF2(p, s, i)`** using the obtained information.
9. **`I`** verifies **`pub_o`** using **`x`** and **`sig_o`**.
10. Upon successful verification, **`I`** signs their own **public key `pub_i`** using
    **`x`**: **`sig_i = HMAC(x, pub_i)`**
11. **`I`** sends **`pub_i`** and **`sig_i`** to **`S`**, which forwards them to **`O`**.
12. **`O`** verifies **`pub_i`** using **`sig_i`** and **`x`**.

```
                 ┌─────────────┐      ┌──────────┐      ┌───────────┐
                 │Org Owner (O)│      │Server (S)│      │Invitee (I)│
                 └──────┬──────┘      └────┬─────┘      └─────┬─────┘
┌─────────────────────┐ │                  │                  │
│p = [passphrase]     │ │ s, i, id, email, │                  │
│s = [random salt]    │ │   pub_o, sig_o   │  id (via email)  │
│i = [iteration count]│ │─────────────────▶│─────────────────▷│
│x = PBKDF2(p,s,i)    │ │                  │                  │
│pub_o = [public key] │ │                  │        id        │
│sig_o = HMAC(x,pub_o)│ │                  │◀─────────────────│
│id = [invite id]     │ │                  │      s, i,       │
│email = [inv. email] │ │                  │   pub_o, sig_o   │
└─────────────────────┘ │                  │─ ─ ─ ─ ─ ─ ─ ─ ─▶│
                        │                  │                  │
                        │                  │   p (in person)  │ ┌─────────────────────┐
                        │────────────────────────────────────▷│ │pub_i = [public key] │
                        │                  │                  │ │x = PBKDF2(p,s,i)    │
    ┌─────────────────┐ │   pub_i, sig_i   │   pub_i, sig_i   │ │x => verify sig_o    │
    │x => verify sig_i│ │◀─────────────────│◀─────────────────│ │sig_i = HMAC(x,pub_i)│
    └─────────────────┘ │                  │                  │ └─────────────────────┘
                        │                  │                  │
                        │                  │                  │
                        │                  │                  │
                        ▼                  ▼                  ▼
```

##### Notes:

-   In practice, the members account id and email and the organization id are
    included in the respective signatures to protect these from tempering as
    well.

-   Since `p` needs to be sufficiently short to be conveniently entered by
    hand, it can potentially be guessed by eavesdroppers which would allow them
    to successfully perform a man-in-the-middle attach by injecting their own
    public key. This is mitigated by using a sufficiently large iteration count `i`
    and invalidating key exchanges after a certain amount of time.

-   Using a separate, direct communication channel for communicating the secret
    passphrase not only mitigates the risk of man-in-the-middle attacks but
    also means that the server `S` does not need to be explicitly trusted.
    Furthermore, the risk of phishing attacks by a third party (including a
    malicious server admin) is greatly reduced since a direct, personal
    interaction between the parties is required.

-   Since some time may pass between steps **1.** and **7.**, **`p`** needs to be
    stored securely for later reference. This is done by encrypting it with a
    dedicated AES "invites key" which is only accessible to organization owners.
    (See [Metadata and Cryptographic Keys](#metadata-and-cryptographic-keys).

#### Adding Members

Once the new member and organization have successfully exchanged public keys,
these need to be stored in a way that allows both parties to be verify them later.
The invitees public key (along with their identifying information) is signed
by the organizations private key (only available to the organization owner) while
the organizations public key is signed by the invitees own, dedicated HMAC key.

```
┏━━━━━━━━━━━━━━┓
┃Member Account┃
┃              ┃          ┌────────┐
┃╔════════════╗┃          │  sign  │
┃║signing key ║──────────▶│ (HMAC) │◀────┐
┃╚════════════╝┃          └────────┘     │
┃┌ ─ ─ ─ ─ ─ ─ ┃               │         │
┃  public key │─────────────┐  │         │
┃└ ─ ─ ─ ─ ─ ─ ┃            │  │         │
┗━━━━━━━━━━━━━━┛            │  │         │
                            │  │         │    ┏━━━━━━━━━━━━━━┓
┏━━━━━━━━━━━━━━┓            │  │         │    ┃ Organization ┃
┃  Membership  ┃            │  │         │    ┃              ┃
┃              ┃            │  │         │    ┃┌ ─ ─ ─ ─ ─ ─ ┃
┃┌ ─ ─ ─ ─ ─ ─ ┃            │  │         └─────  public key │┃
┃ organization│┃            │  │              ┃└ ─ ─ ─ ─ ─ ─ ┃
┃│ signature   ◀────────────│──┘              ┃╔════════════╗┃
┃ ─ ─ ─ ─ ─ ─ ┘┃            ▼            ┌─────║private key ║┃
┃┌ ─ ─ ─ ─ ─ ─ ┃          ┌────────┐     │    ┃╚════════════╝┃
┃    member   │┃          │  sign  │     │    ┗━━━━━━━━━━━━━━┛
┃│ signature   ◀──────────│ (RSA)  │◀────┘
┃ ─ ─ ─ ─ ─ ─ ┘┃          └────────┘
┗━━━━━━━━━━━━━━┛
```

#### Verifying Members

Using the signatures described in the previous section, an organization member
can verify the public key of any other member as follows.

1. Verify the organizations public key using the organization signature created
   with their own HMAC key
2. Verify the other members public key using the organizations public key.

```
┏━━━━━━━━━━━━━━┓                  ┏━━━━━━━━━━━━━━┓                 ┏━━━━━━━━━━━━━━┓
┃  Account A   ┃                  ┃     Org      ┃                 ┃  Account B   ┃
┃              ┃    ┌────────┐    ┃              ┃    ┌────────┐   ┃              ┃
┃╔════════════╗┃    │ verify │    ┃┌ ─ ─ ─ ─ ─ ─ ┃    │ verify │   ┃┌ ─ ─ ─ ─ ─ ─ ┃
┃║signing key ║────▶│ (HMAC) │◀────  public key │────▶│ (RSA)  │◀───  public key │┃
┃╚════════════╝┃    └────────┘    ┃└ ─ ─ ─ ─ ─ ─ ┃    └────────┘   ┃└ ─ ─ ─ ─ ─ ─ ┃
┗━━━━━━━━━━━━━━┛         ▲        ┃╔════════════╗┃         ▲       ┗━━━━━━━━━━━━━━┛
                         │        ┃║private key ║┃         │       ┏━━━━━━━━━━━━━━┓
┏━━━━━━━━━━━━━━┓         │        ┃╚════════════╝┃         │       ┃ Membership B ┃
┃ Membership A ┃         │        ┗━━━━━━━━━━━━━━┛         │       ┃              ┃
┃              ┃         │                                 │       ┃┌ ─ ─ ─ ─ ─ ─ ┃
┃┌ ─ ─ ─ ─ ─ ─ ┃         │                                 │       ┃    member   │┃
┃ organization│┃         │                                 └────────│ signature   ┃
┃│ signature   ┣─────────┘                                         ┃ ─ ─ ─ ─ ─ ─ ┘┃
┃ ─ ─ ─ ─ ─ ─ ┘┃                                                   ┗━━━━━━━━━━━━━━┛
┗━━━━━━━━━━━━━━┛
```

#### Organization Roles and Privileges

There are three distinct organization roles: **Owner**, **Admin** and basic
**Member**. Each role comes with a different set of privileges. Some privileges
are enforced cryptographically while others are enforced solely by the server.

##### Basic Member

A basic organization member has the following privileges.

1. Read the public data of other members, including id, email, public key and
   assigned vaults and groups.
2. Read vault data of assigned vaults
3. Update vault data of assigned vaults where write permissions have been
   granted explicitly

All of these privileges are enforced by the server (e.g. a vaults encrypted
data will only be provided to a member if they are assigned to that vault)
while access to the plain text data stored in vaults is also restricted
cryptographically through the encryption mechanism described in [Vaults](#vaults).

##### Admin

In addition to the privileges granted to basic members, admins also have the following
privileges:

1. Create and delete Vaults
2. Assign vault access to groups and members directly
3. Create, delete and manage groups

##### Owner

In addition to the privileges granted to basic members and admins, organization
owners also have the following privileges:

1. Add/remove organization members
2. Update a members id, email, public key or role
3. Update the organizations public/private key pair

As described in a [previous section](#adding-members), adding a new member to
the organization requires access to the organizations private key. As described in
[Metadata and Cryptographic Keys](#metadata-and-cryptographic-keys), this access
is restricted cryptographically to organization owners.

## Authentication And Data Transfer

Even though all sensitive information in **padloc** is end-to-end encrypted and
theoretically secure even in case of an insecure connection or even a
compromised server, **padloc** still uses a robust authentication scheme to limit
access to user data, ensure payload integrity and enforce user permissions.
A variation of the [Secure Remote
Password](https://tools.ietf.org/html/rfc2945) protocol is used to authenticate
users and establish a secure connection between client and server without
exposing the users master password.

### User Signup

Whenever a user creates a Padloc account, the following steps take place:

1. Let **`u`** and **`p`** be the users **email address** and **master password**, respectively.
2. The **client `C`** sends **`u`** to the server **`S`**.
3. The server sends an email **verification code `c`** to the users email address.
4. **`C`** chooses a **random salt `s`** and **iteration count `i`**
5. **`C`** generates **`x = PBKDF2(p, s, i)`** and the **password verifier `v = v(x)`**\*
6. **`C`** sends **`u`**, **`v`**, **`s`**, **`i`** and **`c`** to **`S`**
7. **`S`** verifies **`c`** and, if successful, stores **`u`**, **`v`**, **`s`** and **`i`** for later use.

The signup process is now complete and the stored values can be used to
verify the users identity and to negotiate a common session key.

```
                  ┌──────────┐     ┌──────────┐
                  │Client (C)│     │Server (S)│
                  └─────┬────┘     └────┬─────┘
  ┌───────────────────┐ │               │
  │u = [email address]│ │       u       │
  └───────────────────┘ │──────────────▶│ ┌───────────────────────┐
                        │               │ │c = [verification code]│
                        │               │ └───────────────────────┘
┌─────────────────────┐ │ c (via email) │
│p = [master password]│ │◁ ─ ─ ─ ─ ─ ─ ─│
│s = [random salt]    │ │               │
│i = [iteration count]│ │               │
│x = PBKDF2(p,s,i)    │ │ u, v, s, i, c │ ┌───────────────────┐
│v = v(x)*            │ │──────────────▶│ │=> verify c        │
└─────────────────────┘ │               │ │=> store u, v, s, i│
                        │               │ └───────────────────┘
                        │               │
                        ▼               ▼
```

### Session Negotiation

In order to "log into" an existing account, a common session key needs to be
negotiated. This happens as follows:

1. Let **`u`** and **`p`** be the users **email address** and **master
   password**, respectively.
2. The client **`C`** generates the random values **`a`** and **`A`**\*
3. **`C`** sends **`u`** and **`A`** to the Server `S`.
4. **`S`** looks up **`s`** and **`i`** based on **`u`** and generates the
   random values **`b`** and **`B`**\*.
5. **`S`** sends **`s`**, **`i`** and **`B`** to **`C`**.
6. **`C`** generates **`x = PBKDF2(p, s, i)`**, **`K = K_client(x, a, B)`** and
   **`M = M(A, B, K)`**\*.
7. **`C`** sends **`M`** to **`S`**.
8. **`S`** generates its own **`K' = K_server(v, b, A)`** and **`M' = M(A, B, K')`**\*.
9. **`S`** verifies that **`M == M'`** and therefore **`K == K'`**. If
   verification fails, the session negotiation is aborted.
10. If successful, **`S`** stores **`K`** under the session id **`sid`**.
11. **`S`** sends **`sid`** to **`C`**, which also stores it along with **`K`**
    for later use.

Client and server now have a common and secret session key **`K`** which
can be used for authenticating subsequent requests.

```
                    ┌──────────┐     ┌──────────┐
                    │Client (C)│     │Server (S)│
                    └─────┬────┘     └────┬─────┘
    ┌───────────────────┐ │               │
    │u = [email address]│ │     u, A      │
    │a, A = [random*]   │ │──────────────▶│
    └───────────────────┘ │               │ ┌────────────────┐
                          │               │ │b, B = [random*]│
┌───────────────────────┐ │    s, i, B    │ └────────────────┘
│p = [master password]  │ │◁ ─ ─ ─ ─ ─ ─ ─│
│x = PBKDF2(p,s,i)      │ │               │
│K = K_client(x, a, B)* │ │               │
│M = M(A, B, K)*        │ │       M       │ ┌───────────────────────┐
└───────────────────────┘ │──────────────▶│ │K' = K_server(v, b, A)*│
                          │               │ │M' = M(A, B, K')       │
                          │               │ │=> verify M == M'      │
        ┌───────────────┐ │      sid      │ │S = [session id]       │
        │=> store sid, K│ │◀ ─ ─ ─ ─ ─ ─ ─│ │=> store sid, K        │
        └───────────────┘ │               │ └───────────────────────┘
                          │               │
                          ▼               ▼
```

### Request Authentication

Using the common session key **`K`** Client and Server can now authenticate
each request as follows:

1. Let **`sid`** and **`K`** be the previously negotiated session id and key.
2. Let **`req`** be the intended request body and **`t1`** the time stamp at
   the time of the request.
3. **`C`** generates the signature **`sig1 = HMAC(K, sid|t1|req)`**.
4. **`C`** sends **`req`**, **`sid`**, **`t1`** and **`sig1`** to **`S`**.
5. **`S`** verifies **`req`**, **`sid`** and **`t1`** using **`sig1`**. If
   verification fails, or if **`t1`** is older than a predetermined maximum
   request age, the request is rejected.
6. Let **`res`** be the response body and **`t2`** the time stamp at the time
   of the response.
7. **`S`** generates **`sig2 = HMAC(K, sid|t2|res)`**.
8. **`S`** sends **`res`**, **`t2`** and **`sig2`** to **`C`**.
9. **`C`** verifies **`res`**, **`sid`** and **`t2`** using **`sig2`**. If
   verification fails, or if **`t2`** is older than a predetermined maximum
   response age, the response is rejected.

```
                       ┌──────────┐     ┌──────────┐
                       │Client (C)│     │Server (S)│
                       └─────┬────┘     └────┬─────┘
┌──────────────────────────┐ │               │
│req = [request body]      │ │   req, sid,   │
│t1 = [timestamp]          │ │   t1, sig1    │ ┌──────────────────────────┐
│sig1 = HMAC(K, sid|t1|req)│ │──────────────▶│ │=> verify sig1            │
└──────────────────────────┘ │               │ │res = [response body]     │
                             │               │ │t2 = [timestamp]          │
            ┌──────────────┐ │ res, t2, sig2 │ │sig2 = HMAC(K, sid|t2|res)│
            │=> verify sig2│ │◁ ─ ─ ─ ─ ─ ─ ─│ └──────────────────────────┘
            └──────────────┘ │               │
                             │               │
                             ▼               ▼
```

**\*** For details on how **`v`**, **`a`**, **`A`**, **`b`**, **`B`**, **`K`**
and **`M`** are generated, refer to [the SRP
specification](https://tools.ietf.org/html/rfc2945#section-3)

### Notes

-   Even though **`v`** is based on **`p`**, it can not be used to guess the password in
    case someone eavesdrops on the connection or if the server is compromised.
    See [section 4 of the SRP
    specification](https://tools.ietf.org/html/rfc2945#section-4) for details.
-   The session key **`K`** cannot be sniffed out since it is never transmitted. It
    could theoretically be guessed from the request signature but with a key size
    of 256 bits this is not really feasible either.
-   The salt and iteration count used for generating **`x`** as well as the
    resulting authentication key are completely independent of the
    corresponding values used for encrypting the accounts private key, even though
    the derivation scheme and base passphrase are the same.
-   Request authentication works both ways. Not only can the server verify the
    users identity and knowledge of their master password, the client can also
    verify the identity of the server.
-   The described authentication mechanism not only allows for identity
    verification, but also prevents tempering with the request/response body or
    timestamp.
-   Rejecting request and responses older than a certain age mitigates the risk
    of replay attacks.

## Possible Attack Vectors and Mitigations

This section covers various possible attack vectors and mitigation steps taken.

### Man-In-The-Middle Attacks

A [man-in-the-middle
attack](https://en.wikipedia.org/wiki/Man-in-the-middle_attack) is an attack
where the attacker secretly relays the communication between two parties in
order to eavesdrop on the connection and/or temper with messages in transit.

MITM attacks may be launched in a multitude of ways, and even with technlogies
like TLS, it is very hard to completely rule out that other parties may be
listening in on the connection or even trying temper with the messages
exchanged. Therefore, steps should be taken not only to mitigate the risk of a
successful MITM attack, but also to ensure that even in case of an insecure
connection, an attacker may never get access to any sensitive information or
compromise the security of the application in any other way.

-   Communication between the Padloc client and server is always secured through
    [Transport Layer Security](https://en.wikipedia.org/wiki/Transport_Layer_Security).
-   No sensitive information is ever transmitted in plain text.
-   Transmitted data is protected from tempering through Padlocs strong [Authentication Mechanism](#authentication-and-data-transfer).
-   Padlocs [Key Exchange Mechanism](#trustless-server-mediated-key-exchange) is designed to be secure even over an untrusted connection.

### Phishing

With the addition of [Organizations And Shared
Vaults](#organizations-and-shared-vaults) in Padloc 3, phishing has become a
potential attack vector as well. Attackers may try to lure Padloc users into
sharing sensitive information by inviting them to misleadingly named
organizations which can be mistaken for an employer or friend. Users could then
accidentally share data within vaults assigned to them.

However, the procedure for inviting and adding a new member to an organization
is designed in a way that makes this very hard to accomplish, since it requires
direct, personal coordination between both parties. See [Trustless
Server-Mediated Key Exchange](#trustless-server-mediated-key-exchange) for more
details.

### Guessing Master Passwords

Padloc uses a combination of various [strong encryption
algorithms](#cryptographic-primitives-and-parameters) to protect all sensitive
data and cryptographic keys both at rest and during transmission. The **master
password** acts as a universal key for this encryption scheme.

Master passwords are never stored anywhere and should only ever be known by the
Padloc user themself. Unfortunately, since this means that in the majority of
use cases the user will have to commit this password to memory, the "key space" of
feasible passwords is relatively limited. Additionally, since master passwords
are ultimately chosen by the user, no guarantee can be made to the strength or
randomness of these passwords.

This means that master password are a prime-target for guessing attacks of all
sorts and steps should be taken to make these attacks either infeasible or, at
a very minimum, too costly to be worthwhile.

[[TODO]]

### User Enumeration

[[TODO]]

### Password spraying

[[TODO]]

### Denial Of Service

[[TODO]]

### Compromised Server

[[TODO]]

## Cryptographic Algorithms And Configurations

### Symmetric Encryption

For all symmetric encryption operations, the [AES
Cipher](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) is used in
[GCM mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode) with a key size
of **256 bits**.

**Areas of use:**

-   [Simple Symmetric Encryption](#simple-symmetric-encryption)
-   [Password-Based Encryption](#password-based-encryption)
-   [Shared-Key Encryption](#shared-key-encryption)

### Asymmetric Encryption

For asymmetric encryption operations, the
[RSA-OAEP](https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding)
algorithm is used with a **modulus length** of **2048 bits** and the [SHA-256 hash
function](https://en.wikipedia.org/wiki/SHA-2).

**Areas of use:**

-   [Shared-Key Encryption](#shared-key-encryption)

### Symmetric Signature Schemes

For symmetric signature creation and verification, the [HMAC](https://en.wikipedia.org/wiki/HMAC) algorithm is used with a **key length** of **256 bits** and the [SHA-256 hash
function](https://en.wikipedia.org/wiki/SHA-2).

**Areas of use:**

-   [Request Authentication](#request-authentication)
-   [Adding Members](#adding-members)
-   [Verifying Members](#verying-members)
-   [Trustless Server-Mediated Key Exchange](#trustless-server-mediated-key-exchange).

### Asymmetric Signature Schems

For asymmetric signature creation and verification, the [RSA-PSS](https://en.wikipedia.org/wiki/Probabilistic_signature_scheme) algorithm is
used with a **modulus length** of **2048 bits**, a **salt length** of **256 bits** and the [SHA-256 hash
function](https://en.wikipedia.org/wiki/SHA-2).

**Areas of use:**

-   [Adding Members](#adding-members)
-   [Verifying Members](#verying-members)

### Password-Based Key Derivation

For password-based key derivation, the
[PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) algorithm is used with the
[SHA-256 hash function](https://en.wikipedia.org/wiki/SHA-2) and a **salt length**
of **128 bits**. The iteration count varies by area of use.

**Areas of use:**

-   [Password-Based Encryption](#password-based-encryption)
-   [User Signup](#user-signup)
-   [Session Negotiation](#session-negotiation)
-   [Trustless Server-Mediated Key Exchange](#trustless-server-mediated-key-exchange).
