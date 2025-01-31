import * as path from "path";
import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { Wallet } from "./Wallet";
import { WalletCredentials, WalletNetwork } from "@/types";

export class WalletStorage {
  private storagePath: string;

  constructor() {
    this.storagePath = `${process.cwd()}/wallets`;

    if (!fs.existsSync(this.storagePath))
      fs.mkdirSync(this.storagePath, { recursive: true });
  }

  load(name: string, network: WalletNetwork): Wallet {
    if (!name) throw new Error("Failed to load wallet: Filename is required.");

    const file = fs.readFileSync(
      path.resolve(`${this.storagePath}/${name}.json`),
      "utf-8"
    );

    const data: WalletCredentials = JSON.parse(file);

    if (!data.privkey)
      throw new Error("Failed to load wallet: Wrong JSON parsing.");

    const wallet = new Wallet(network);
    wallet.load(data.privkey);

    return wallet;
  }

  save(wallet: Wallet, name?: string): string {
    const filename = `${this.storagePath}/${name || uuid()}.json`;

    if (fs.existsSync(filename))
      throw new Error(`File already exists: ${filename}`);

    const data = JSON.stringify({
      address: wallet.getAddress(),
      privkey: wallet.getPrivkey(),
    });

    fs.writeFileSync(filename, data, { flag: "w" });
    return filename;
  }
}
