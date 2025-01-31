import { Wallet } from "@/entities/Wallet";
import * as fs from "fs";

describe("Wallet Class", () => {
  let wallet: Wallet;

  beforeAll(() => {
    wallet = new Wallet("testnet");
  });

  it("generate", () => {
    wallet.generate();

    const address = wallet.getAddress();
    const privkey = wallet.getPrivkey();

    expect(typeof address).toBe("string");
    expect(address.length).toBe(34);

    expect(typeof privkey).toBe("string");
    expect(privkey.length).toBe(52);
  });

  it("load", () => {
    wallet.generate();
    const privkey = wallet.getPrivkey();
    wallet.load(privkey);
    const address = wallet.getAddress();

    expect(typeof address).toBe("string");
    expect(address.length).toBe(34);
  });
});
