export interface TxMatch {
  confirmations: number;
  matchesSum: boolean;
  matchesTime: boolean;
  txid: string;
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface WalletCredentials {
  address: string | null;
  privkey: string | null;
}

export type WalletNetwork = "bitcoin" | "testnet";

export interface UTXO {
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  txid: string;
  vout: number;
  value: number;
}
