import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { WalletCredentials, WalletNetwork } from "@/types";

const ECPair = ECPairFactory(ecc);

export class Wallet {
  private address: string | null = null;
  private privkey: string | null = null;
  private network: bitcoin.networks.Network = bitcoin.networks.bitcoin;

  constructor(network: WalletNetwork) {
    if (network === "bitcoin") this.network = bitcoin.networks.bitcoin;
    if (network === "testnet") this.network = bitcoin.networks.testnet;
  }

  generate(): WalletCredentials {
    const keyPair = ECPair.makeRandom({ network: this.network });
    const pubkey = Buffer.from(keyPair.publicKey);
    const privkey = keyPair.toWIF();

    const { address } = bitcoin.payments.p2pkh({
      pubkey,
      network: this.network,
    });

    if (!address)
      throw new Error("Failed to generate wallet: Not valid address");

    this.address = address;
    this.privkey = privkey;

    return { address, privkey };
  }

  load(privkey: string): WalletCredentials {
    if (!privkey)
      throw new Error("Private key is required to load the wallet.");

    const keyPair = ECPair.fromWIF(privkey, this.network);
    const pubkey = Buffer.from(keyPair.publicKey);

    const { address } = bitcoin.payments.p2pkh({
      pubkey,
      network: this.network,
    });

    if (!address) throw new Error("Failed to load wallet: Not valid address");

    this.address = address;
    this.privkey = privkey;

    return { address, privkey };
  }

  getAddress(): string {
    if (!this.address) throw new Error("Address is not initialized.");
    return this.address;
  }

  getPrivkey(): string {
    if (!this.privkey) throw new Error("Private key is not initialized.");
    return this.privkey;
  }
}
