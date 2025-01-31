import axios from "axios";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { RecommendedFees, TxMatch, UTXO, WalletNetwork } from "@/types";
import { ECPairFactory } from "ecpair";
import { Wallet } from "./Wallet";

const ECPair = ECPairFactory(ecc);

export class Pool {
  private url: string | null = null;
  private network: bitcoin.networks.Network = bitcoin.networks.bitcoin;

  constructor(network: WalletNetwork) {
    if (network === "bitcoin") {
      this.url = `https://mempool.space/api`;
      this.network = bitcoin.networks.bitcoin;
    }

    if (network === "testnet") {
      this.url = `https://mempool.space/testnet/api`;
      this.network = bitcoin.networks.testnet;
    }
  }

  calculateSum(balance: number, fee: number): number {
    return balance - fee;
  }

  calculateFee(feeRate: number, txSize: number): number {
    return feeRate * txSize;
  }

  async getRecommendedFees(): Promise<RecommendedFees> {
    try {
      const response = await axios.get(`${this.url}/v1/fees/recommended`);
      return response.data;
    } catch (error) {
      throw new Error(`Couldn't fetch recommended fees`);
    }
  }

  async calculateTransactionSize(fromAddress: string): Promise<number> {
    try {
      // Get the UTXOs for the address
      const response = await axios.get(
        `${this.url}/address/${fromAddress}/utxo`
      );
      const utxos = response.data;

      // Each input typically uses 148 bytes
      const inputSize = 148;

      // Each output typically uses 34 bytes
      const outputSize = 34;

      // Transaction overhead (around 10-20 bytes)
      const txOverhead = 10;

      // Calculate the number of inputs (from the number of UTXOs)
      const numInputs = utxos.length;

      // Assuming there are at least 2 outputs (1 for recipient and 1 for change)
      const numOutputs = 2; // You can adjust this depending on your use case

      // Calculate the size of the inputs and outputs
      const inputsSize = numInputs * inputSize;
      const outputsSize = numOutputs * outputSize;

      // Calculate the total transaction size
      const totalTransactionSize = inputsSize + outputsSize + txOverhead;

      return totalTransactionSize;
    } catch (error) {
      console.error("Error calculating transaction size:", error);
      throw new Error("Failed to fetch UTXOs or calculate transaction size.");
    }
  }

  async getWalletBalance(address: string): Promise<number> {
    try {
      const response = await axios.get(`${this.url}/address/${address}`);
      const { chain_stats, mempool_stats } = response.data;

      const confirmedBalance =
        chain_stats.funded_txo_sum - chain_stats.spent_txo_sum;

      const mempoolBalance =
        mempool_stats.funded_txo_sum - mempool_stats.spent_txo_sum;

      return confirmedBalance + mempoolBalance;
    } catch (error) {
      throw new Error(`Couldn't fetch wallet's balance`);
    }
  }

  async getRawTransactionHex(txid: string): Promise<string> {
    try {
      const response = await axios.get(`${this.url}/tx/${txid}/hex`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching raw transaction hex`);
    }
  }

  async findTx(
    address: string,
    time: number,
    sum: number
  ): Promise<TxMatch | null> {
    const response = await axios.get(`${this.url}/address/${address}/utxo`);
    const utxos = response.data;

    if (utxos.length === 0)
      throw new Error("No UTXOs available for this address.");

    const utxo: UTXO | null = utxos.find((utxo: UTXO) => utxo.value === sum);

    if (!utxo) return null;

    let confirmations = 0;

    if (utxo.status.confirmed) {
      const blockHeightResponse = await axios.get(
        `${this.url}/blocks/tip/height`
      );

      const currentBlockHeight = blockHeightResponse.data;
      confirmations = currentBlockHeight - utxo.status.block_height + 1;
    }

    let matchesTime = false;

    if (utxo.status.block_time) {
      const blockDate = new Date(utxo.status.block_time * 1000);
      const currentTime = new Date(
        Date.now() + new Date().getTimezoneOffset() * 60000 + 3 * 60 * 60 * 1000
      );
      const differenceInMs = Math.abs(
        currentTime.getTime() - blockDate.getTime()
      );

      matchesTime = differenceInMs <= time;
    }

    return {
      confirmations,
      matchesSum: utxo !== null,
      matchesTime,
      txid: utxo.txid,
    };
  }

  async sendTx(
    fromWallet: Wallet,
    toAddress: string,
    sum: number,
    fee: number
  ): Promise<string | null> {
    const fromAddress = fromWallet.getAddress();
    const privkey = fromWallet.getPrivkey();

    const utxosResponse = await axios.get(
      `${this.url}/address/${fromAddress}/utxo`
    );
    const utxos = utxosResponse.data;

    if (utxos.length === 0)
      throw new Error("No UTXOs available for this address.");

    const psbt = new bitcoin.Psbt({ network: this.network });

    let inputAmount = 0;

    for (const utxo of utxos) {
      inputAmount += utxo.value;

      const rawTxHex = await this.getRawTransactionHex(utxo.txid);

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
      });
    }

    psbt.addOutput({
      address: toAddress,
      value: sum,
    });

    const change = inputAmount - sum - fee;

    if (change > 0) {
      psbt.addOutput({
        address: fromAddress,
        value: change,
      });
    }

    for (let i = 0; i < utxos.length; i++) {
      const keyPair = ECPair.fromWIF(privkey, this.network);
      psbt.signInput(i, {
        sign: (data: Buffer) => Buffer.from(keyPair.sign(data)),
        publicKey: Buffer.from(keyPair.publicKey),
      });
    }

    for (let i = 0; i < utxos.length; i++) {
      const keyPair = ECPair.fromWIF(privkey, this.network);

      psbt.validateSignaturesOfInput(
        i,
        (pubkey: Buffer, msghash: Buffer, signature: Buffer) =>
          keyPair.verify(msghash, signature)
      );
    }

    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const broadcastResponse = await axios.post(`${this.url}/tx`, txHex);
    const txid = broadcastResponse.data;

    return txid || null;
  }
}
