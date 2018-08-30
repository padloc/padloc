import { BigInteger } from "../vendor/jsbn";
import { Base64String, bytesToHex, hexToBytes, bytesToBase64, base64ToBytes } from "./encoding";
import { getProvider, HashParams } from "./crypto";

function concat(...arrs: Uint8Array[]): Uint8Array {
    const length = arrs.reduce((len, arr) => len + arr.length, 0);
    const res = new Uint8Array(length);
    let offset = 0;
    for (const arr of arrs) {
        res.set(arr, offset);
        offset += arr.length;
    }
    return res;
}

async function digest(hash = "SHA-256", ...input: Uint8Array[]): Promise<Uint8Array> {
    const b64 = await getProvider().hash(bytesToBase64(concat(...input)), { algorithm: hash } as HashParams);
    return base64ToBytes(b64);
}

function i2b(i: BigInteger): Uint8Array {
    let hex = i.toString(16);
    if (hex.length % 2) {
        hex = "0" + hex;
    }
    return hexToBytes(hex);
}

function b2i(b: Uint8Array): BigInteger {
    return new BigInteger(bytesToHex(b), 16);
}

async function randomBytes(len: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(len);
    await window.crypto.getRandomValues(bytes);
    return bytes;
}

export class Client {
    get v() {
        return this._v ? bytesToBase64(i2b(this._v)) : null;
    }

    get A() {
        return this._A ? bytesToBase64(i2b(this._A)) : null;
    }

    get K() {
        return this._K ? bytesToBase64(i2b(this._K)) : null;
    }

    get M1() {
        return this._M1 ? bytesToBase64(i2b(this._M1)) : null;
    }

    get M2() {
        return this._M2 ? bytesToBase64(i2b(this._M2)) : null;
    }

    private _srp: SRP;
    private _x?: BigInteger;
    private _v?: BigInteger;
    private _a?: BigInteger;
    private _A?: BigInteger;
    private _B?: BigInteger;
    private _K?: BigInteger;
    private _M1?: BigInteger;
    private _M2?: BigInteger;

    constructor(length: SRPGroupLength = 4096) {
        this._srp = new SRP(length);
    }

    async initialize(secret: Base64String) {
        this._x = b2i(base64ToBytes(secret));
        this._v = this._srp.v(this._x);
        this._a = b2i(await randomBytes(32));
        this._A = this._srp.A(this._a);
    }

    async setB(B: Base64String) {
        if (!this._x || !this._a || !this._A) {
            throw "not initialized";
        }
        this._B = b2i(base64ToBytes(B));
        this._K = await this._getKey();
        this._M1 = await this._srp.M1(this._A, this._B, this._K);
        this._M2 = await this._srp.M1(this._A, this._M1, this._K);
    }

    private async _getKey(): Promise<BigInteger> {
        if (!this._x || !this._a || !this._A || !this._B) {
            throw "not initialized";
        }

        if (this._srp.isZeroWhenModN(this._B)) {
            throw "Invalid B value";
        }

        const u = await this._srp.u(this._A, this._B);
        const S = await this._srp.clientS(this._B, this._x, this._a, u);
        const K = await this._srp.K(S);
        return K;
    }
}

export class Server {
    get B() {
        return this._B ? bytesToBase64(i2b(this._B)) : null;
    }

    get K() {
        return this._K ? bytesToBase64(i2b(this._K)) : null;
    }

    get M1() {
        return this._M1 ? bytesToBase64(i2b(this._M1)) : null;
    }

    get M2() {
        return this._M2 ? bytesToBase64(i2b(this._M2)) : null;
    }

    private _srp: SRP;
    private _v?: BigInteger;
    private _b?: BigInteger;
    private _B?: BigInteger;
    private _A?: BigInteger;
    private _K?: BigInteger;
    private _M1?: BigInteger;
    private _M2?: BigInteger;

    constructor(length: SRPGroupLength = 4096) {
        this._srp = new SRP(length);
    }

    async initialize(verifier: Base64String) {
        this._v = b2i(base64ToBytes(verifier));
        this._b = b2i(await randomBytes(32));
        this._B = await this._srp.B(this._v, this._b);
    }

    async setA(A: Base64String) {
        if (!this._v || !this._b || !this._B) {
            throw "not initialized";
        }
        this._A = b2i(base64ToBytes(A));
        this._K = await this._getKey();
        this._M1 = await this._srp.M1(this._A, this._B, this._K);
        this._M2 = await this._srp.M1(this._A, this._M1, this._K);
    }

    private async _getKey() {
        if (!this._v || !this._b || !this._B || !this._A) {
            throw "not initialized";
        }

        if (this._srp.isZeroWhenModN(this._A)) {
            throw "Invalid A value";
        }

        const u = await this._srp.u(this._A, this._B);
        const S = this._srp.serverS(this._A, this._v, u, this._b);
        const K = await this._srp.K(S);
        return K;
    }
}

export class SRP {
    private _params: SRPParams;

    constructor(length: SRPGroupLength) {
        this._params = getParams(length);
    }

    async H(...inp: BigInteger[]): Promise<BigInteger> {
        const hash = await digest(this._params.hash, ...inp.map(i => i2b(i)));
        return b2i(hash);
    }

    // v = g ^ x % N
    v(x: BigInteger): BigInteger {
        return this._params.g.modPow(x, this._params.N);
    }

    // A = g ^ a % N
    A(a: BigInteger) {
        return this._params.g.modPow(a, this._params.N);
    }

    // B = (k * v + g ^ b % N) % N
    async B(v: BigInteger, b: BigInteger): Promise<BigInteger> {
        const k = await this.k();
        return k
            .multiply(v)
            .add(this._params.g.modPow(b, this._params.N))
            .mod(this._params.N);
    }

    // u = H(A | B)
    async u(A: BigInteger, B: BigInteger): Promise<BigInteger> {
        return await this.H(A, B);
    }

    //  S = (B - k * (g ^ x % N)) ^ (a + u * x) % N
    async clientS(B: BigInteger, x: BigInteger, a: BigInteger, u: BigInteger): Promise<BigInteger> {
        const k = await this.k();
        return B.subtract(k.multiply(this._params.g.modPow(x, this._params.N))).modPow(
            a.add(u.multiply(x)),
            this._params.N
        );
    }

    // S = (A * v ^ u % N) ^ b % N
    serverS(A: BigInteger, v: BigInteger, u: BigInteger, b: BigInteger) {
        return A.multiply(v.modPow(u, this._params.N)).modPow(b, this._params.N);
    }

    // SRP-6a multiplier
    async k(): Promise<BigInteger> {
        return this.H(this._params.N, this._params.g);
    }

    // K = H(S)
    async K(S: BigInteger): Promise<BigInteger> {
        return this.H(S);
    }

    async M1(A: BigInteger, B: BigInteger, K: BigInteger): Promise<BigInteger> {
        return await this.H(A, B, K);
    }

    async M2(A: BigInteger, M1: BigInteger, K: BigInteger): Promise<BigInteger> {
        return await this.H(A, M1, K);
    }

    // This is used to ensure that values are not zero when mod N.
    isZeroWhenModN(n: BigInteger) {
        return n.mod(this._params.N).equals(BigInteger.ZERO);
    }
}

export type SRPGroupLength = 1024 | 1536 | 2048 | 3072 | 4096 | 6144 | 8192;

export interface SRPParams {
    length: SRPGroupLength;
    hash: "SHA-1" | "SHA-256";
    g: BigInteger;
    N: BigInteger;
}

function h2i(hex: string): BigInteger {
    return new BigInteger(hex.replace(" ", ""), 16);
}

export function getParams(length: SRPGroupLength): SRPParams {
    switch (length) {
        case 1024:
            return {
                length: 1024,
                hash: "SHA-1",
                g: h2i("02"),
                N: h2i(
                    "EEAF0AB9 ADB38DD6 9C33F80A FA8FC5E8 60726187 75FF3C0B 9EA2314C 9C256576 D674DF74 96EA81D3 383B4813 D692C6E0 E0D5D8E2 50B98BE4 8E495C1D 6089DAD1 5DC7D7B4 6154D6B6 CE8EF4AD 69B15D49 82559B29 7BCF1885 C529F566 660E57EC 68EDBC3C 05726CC0 2FD4CBF4 976EAA9A FD5138FE 8376435B 9FC61D2F C0EB06E3"
                )
            };

        case 1536:
            return {
                length: 1536,
                hash: "SHA-1",
                g: h2i("02"),
                N: h2i(
                    "9DEF3CAF B939277A B1F12A86 17A47BBB DBA51DF4 99AC4C80 BEEEA961 4B19CC4D 5F4F5F55 6E27CBDE 51C6A94B E4607A29 1558903B A0D0F843 80B655BB 9A22E8DC DF028A7C EC67F0D0 8134B1C8 B9798914 9B609E0B E3BAB63D 47548381 DBC5B1FC 764E3F4B 53DD9DA1 158BFD3E 2B9C8CF5 6EDF0195 39349627 DB2FD53D 24B7C486 65772E43 7D6C7F8C E442734A F7CCB7AE 837C264A E3A9BEB8 7F8A2FE9 B8B5292E 5A021FFF 5E91479E 8CE7A28C 2442C6F3 15180F93 499A234D CF76E3FE D135F9BB"
                )
            };
        case 2048:
            return {
                length: 2048,
                hash: "SHA-256",
                g: h2i("02"),
                N: h2i(
                    "AC6BDB41 324A9A9B F166DE5E 1389582F AF72B665 1987EE07 FC319294 3DB56050 A37329CB B4A099ED 8193E075 7767A13D D52312AB 4B03310D CD7F48A9 DA04FD50 E8083969 EDB767B0 CF609517 9A163AB3 661A05FB D5FAAAE8 2918A996 2F0B93B8 55F97993 EC975EEA A80D740A DBF4FF74 7359D041 D5C33EA7 1D281E44 6B14773B CA97B43A 23FB8016 76BD207A 436C6481 F1D2B907 8717461A 5B9D32E6 88F87748 544523B5 24B0D57D 5EA77A27 75D2ECFA 032CFBDB F52FB378 61602790 04E57AE6 AF874E73 03CE5329 9CCC041C 7BC308D8 2A5698F3 A8D0C382 71AE35F8 E9DBFBB6 94B5C803 D89F7AE4 35DE236D 525F5475 9B65E372 FCD68EF2 0FA7111F 9E4AFF73"
                )
            };
        case 3072:
            return {
                length: 3072,
                hash: "SHA-256",
                g: h2i("05"),
                N: h2i(
                    "FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1 29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245 E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D C2007CB8 A163BF05 98DA4836 1C55D39A 69163FA8 FD24CF5F 83655D23 DCA3AD96 1C62F356 208552BB 9ED52907 7096966D 670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9 DE2BCBF6 95581718 3995497C EA956AE5 15D22618 98FA0510 15728E5A 8AAAC42D AD33170D 04507A33 A85521AB DF1CBA64 ECFB8504 58DBEF0A 8AEA7157 5D060C7D B3970F85 A6E1E4C7 ABF5AE8C DB0933D7 1E8C94E0 4A25619D CEE3D226 1AD2EE6B F12FFA06 D98A0864 D8760273 3EC86A64 521F2B18 177B200C BBE11757 7A615D6C 770988C0 BAD946E2 08E24FA0 74E5AB31 43DB5BFC E0FD108E 4B82D120 A93AD2CA FFFFFFFF FFFFFFFF"
                )
            };
        case 4096:
            return {
                length: 4096,
                hash: "SHA-256",
                g: h2i("05"),
                N: h2i(
                    "FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1 29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245 E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D C2007CB8 A163BF05 98DA4836 1C55D39A 69163FA8 FD24CF5F 83655D23 DCA3AD96 1C62F356 208552BB 9ED52907 7096966D 670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9 DE2BCBF6 95581718 3995497C EA956AE5 15D22618 98FA0510 15728E5A 8AAAC42D AD33170D 04507A33 A85521AB DF1CBA64 ECFB8504 58DBEF0A 8AEA7157 5D060C7D B3970F85 A6E1E4C7 ABF5AE8C DB0933D7 1E8C94E0 4A25619D CEE3D226 1AD2EE6B F12FFA06 D98A0864 D8760273 3EC86A64 521F2B18 177B200C BBE11757 7A615D6C 770988C0 BAD946E2 08E24FA0 74E5AB31 43DB5BFC E0FD108E 4B82D120 A9210801 1A723C12 A787E6D7 88719A10 BDBA5B26 99C32718 6AF4E23C 1A946834 B6150BDA 2583E9CA 2AD44CE8 DBBBC2DB 04DE8EF9 2E8EFC14 1FBECAA6 287C5947 4E6BC05D 99B2964F A090C3A2 233BA186 515BE7ED 1F612970 CEE2D7AF B81BDD76 2170481C D0069127 D5B05AA9 93B4EA98 8D8FDDC1 86FFB7DC 90A6C08F 4DF435C9 34063199 FFFFFFFF FFFFFFFF"
                )
            };
        case 6144:
            return {
                length: 6144,
                hash: "SHA-256",
                g: h2i("05"),
                N: h2i(
                    "FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1 29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245 E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D C2007CB8 A163BF05 98DA4836 1C55D39A 69163FA8 FD24CF5F 83655D23 DCA3AD96 1C62F356 208552BB 9ED52907 7096966D 670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9 DE2BCBF6 95581718 3995497C EA956AE5 15D22618 98FA0510 15728E5A 8AAAC42D AD33170D 04507A33 A85521AB DF1CBA64 ECFB8504 58DBEF0A 8AEA7157 5D060C7D B3970F85 A6E1E4C7 ABF5AE8C DB0933D7 1E8C94E0 4A25619D CEE3D226 1AD2EE6B F12FFA06 D98A0864 D8760273 3EC86A64 521F2B18 177B200C BBE11757 7A615D6C 770988C0 BAD946E2 08E24FA0 74E5AB31 43DB5BFC E0FD108E 4B82D120 A9210801 1A723C12 A787E6D7 88719A10 BDBA5B26 99C32718 6AF4E23C 1A946834 B6150BDA 2583E9CA 2AD44CE8 DBBBC2DB 04DE8EF9 2E8EFC14 1FBECAA6 287C5947 4E6BC05D 99B2964F A090C3A2 233BA186 515BE7ED 1F612970 CEE2D7AF B81BDD76 2170481C D0069127 D5B05AA9 93B4EA98 8D8FDDC1 86FFB7DC 90A6C08F 4DF435C9 34028492 36C3FAB4 D27C7026 C1D4DCB2 602646DE C9751E76 3DBA37BD F8FF9406 AD9E530E E5DB382F 413001AE B06A53ED 9027D831 179727B0 865A8918 DA3EDBEB CF9B14ED 44CE6CBA CED4BB1B DB7F1447 E6CC254B 33205151 2BD7AF42 6FB8F401 378CD2BF 5983CA01 C64B92EC F032EA15 D1721D03 F482D7CE 6E74FEF6 D55E702F 46980C82 B5A84031 900B1C9E 59E7C97F BEC7E8F3 23A97A7E 36CC88BE 0F1D45B7 FF585AC5 4BD407B2 2B4154AA CC8F6D7E BF48E1D8 14CC5ED2 0F8037E0 A79715EE F29BE328 06A1D58B B7C5DA76 F550AA3D 8A1FBFF0 EB19CCB1 A313D55C DA56C9EC 2EF29632 387FE8D7 6E3C0468 043E8F66 3F4860EE 12BF2D5B 0B7474D6 E694F91E 6DCC4024 FFFFFFFF FFFFFFFF"
                )
            };
        case 8192:
            return {
                length: 8192,
                hash: "SHA-256",
                g: h2i("13"),
                N: h2i(
                    "FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1 29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245 E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D C2007CB8 A163BF05 98DA4836 1C55D39A 69163FA8 FD24CF5F 83655D23 DCA3AD96 1C62F356 208552BB 9ED52907 7096966D 670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9 DE2BCBF6 95581718 3995497C EA956AE5 15D22618 98FA0510 15728E5A 8AAAC42D AD33170D 04507A33 A85521AB DF1CBA64 ECFB8504 58DBEF0A 8AEA7157 5D060C7D B3970F85 A6E1E4C7 ABF5AE8C DB0933D7 1E8C94E0 4A25619D CEE3D226 1AD2EE6B F12FFA06 D98A0864 D8760273 3EC86A64 521F2B18 177B200C BBE11757 7A615D6C 770988C0 BAD946E2 08E24FA0 74E5AB31 43DB5BFC E0FD108E 4B82D120 A9210801 1A723C12 A787E6D7 88719A10 BDBA5B26 99C32718 6AF4E23C 1A946834 B6150BDA 2583E9CA 2AD44CE8 DBBBC2DB 04DE8EF9 2E8EFC14 1FBECAA6 287C5947 4E6BC05D 99B2964F A090C3A2 233BA186 515BE7ED 1F612970 CEE2D7AF B81BDD76 2170481C D0069127 D5B05AA9 93B4EA98 8D8FDDC1 86FFB7DC 90A6C08F 4DF435C9 34028492 36C3FAB4 D27C7026 C1D4DCB2 602646DE C9751E76 3DBA37BD F8FF9406 AD9E530E E5DB382F 413001AE B06A53ED 9027D831 179727B0 865A8918 DA3EDBEB CF9B14ED 44CE6CBA CED4BB1B DB7F1447 E6CC254B 33205151 2BD7AF42 6FB8F401 378CD2BF 5983CA01 C64B92EC F032EA15 D1721D03 F482D7CE 6E74FEF6 D55E702F 46980C82 B5A84031 900B1C9E 59E7C97F BEC7E8F3 23A97A7E 36CC88BE 0F1D45B7 FF585AC5 4BD407B2 2B4154AA CC8F6D7E BF48E1D8 14CC5ED2 0F8037E0 A79715EE F29BE328 06A1D58B B7C5DA76 F550AA3D 8A1FBFF0 EB19CCB1 A313D55C DA56C9EC 2EF29632 387FE8D7 6E3C0468 043E8F66 3F4860EE 12BF2D5B 0B7474D6 E694F91E 6DBE1159 74A3926F 12FEE5E4 38777CB6 A932DF8C D8BEC4D0 73B931BA 3BC832B6 8D9DD300 741FA7BF 8AFC47ED 2576F693 6BA42466 3AAB639C 5AE4F568 3423B474 2BF1C978 238F16CB E39D652D E3FDB8BE FC848AD9 22222E04 A4037C07 13EB57A8 1A23F0C7 3473FC64 6CEA306B 4BCBC886 2F8385DD FA9D4B7F A2C087E8 79683303 ED5BDD3A 062B3CF5 B3A278A6 6D2A13F8 3F44F82D DF310EE0 74AB6A36 4597E899 A0255DC1 64F31CC5 0846851D F9AB4819 5DED7EA1 B1D510BD 7EE74D73 FAF36BC3 1ECFA268 359046F4 EB879F92 4009438B 481C6CD7 889A002E D5EE382B C9190DA6 FC026E47 9558E447 5677E9AA 9E3050E2 765694DF C81F56E8 80B96E71 60C980DD 98EDD3DF FFFFFFFF FFFFFFFF"
                )
            };

        default:
            throw "invalid group length";
    }
}
