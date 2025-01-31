import { Pool } from "./entities/Pool";
import { WalletStorage } from "./entities/WalletStorage";
import { Watcher } from "./entities/Watcher";
import { WalletNetwork } from "./types";

const NETWORK: WalletNetwork = "testnet"; // Network type for wallets (e.g., testnet or bitcoin)
const OWNER = "owner"; // Identifier for the owner's wallet
const RECEIVER = "receiver"; // Identifier for the receiver's wallet
const THIRTY_MINS = 30 * 60 * 1000; // Maximum time to wait (30 minutes in milliseconds)

const main = async () => {
  // Initialize wallet storage
  const walletStorage = new WalletStorage();

  // Load the owner's and receiver's wallets from storage
  const ownerWallet = walletStorage.load(OWNER, NETWORK);
  const receiverWallet = walletStorage.load(RECEIVER, NETWORK);

  // Get the addresses of the owner's and receiver's wallets
  const ownerAddress = ownerWallet.getAddress();
  const receiverAddress = receiverWallet.getAddress();

  // Initialize the pool for managing blockchain interactions
  const pool = new Pool(NETWORK);

  // Retrieve wallet balances for both the owner and the receiver
  const ownerBalance = await pool.getWalletBalance(ownerAddress);
  const receiverBalance = await pool.getWalletBalance(receiverAddress);

  // Determine which wallet has a higher balance
  const ownerBalanceIsMore = ownerBalance > receiverBalance;

  // Set the source (from) and destination (to) wallets and balances based on comparison
  const fromAddress = ownerBalanceIsMore ? ownerAddress : receiverAddress;
  const fromBalance = ownerBalanceIsMore ? ownerBalance : receiverBalance;
  const fromWallet = ownerBalanceIsMore ? ownerWallet : receiverWallet;
  const toAddress = ownerBalanceIsMore ? receiverAddress : ownerAddress;

  // Get the recommended transaction fees rate
  const { economyFee } = await pool.getRecommendedFees();

  // Calculate the size of the transaction
  const txSize = await pool.calculateTransactionSize(fromAddress);

  // Calculate the fee based on the recommended fee rate and transaction size
  const fee = pool.calculateFee(economyFee, txSize);

  // Calculate the amount to be sent after deducting the fee
  const sum = pool.calculateSum(fromBalance, fee);

  try {
    // Send the transaction and log the transaction ID
    const txid = await pool.sendTx(fromWallet, toAddress, sum, fee);
    console.log(txid);
  } catch (error) {
    // Log any errors that occur during the transaction
    console.error(error);
  }

  // Initialize the watcher to monitor the transaction
  const watcher = new Watcher(THIRTY_MINS);

  // Define the callback function for the watcher
  const callback = async () => {
    try {
      // Check if the transaction is found on the blockchain
      const tx = await pool.findTx(toAddress, THIRTY_MINS, sum);

      if (!tx) {
        // Transaction not found; continue waiting
        console.log("Cannot find TX. Please wait.");
        return false;
      }

      if (!tx.confirmations && tx.matchesSum && !tx.matchesTime) {
        // Transaction exists but is not yet confirmed; continue waiting
        console.log("TX not yet initialized. Please wait.");
        return false;
      }

      if (tx.confirmations && tx.matchesSum && !tx.matchesTime) {
        // Transaction exists and is confirmed but outside the acceptable time frame
        console.log("TX was expired."); // Stop the watcher
        return true;
      }

      if (tx.confirmations && tx.matchesSum && tx.matchesTime) {
        // Transaction is confirmed within the acceptable time frame
        console.log(
          `TX was finded. TXID: ${tx.txid}, confirmations: ${tx.confirmations}.`
        );
        return true; // Stop the watcher
      }
    } catch (error) {
      // Log any errors during transaction checking
      console.error(error);
      return true; // Stop the watcher in case of error
    } finally {
      return true; // Ensure the watcher stops if no conditions are met
    }
  };

  // Start the watcher with the provided callback function
  watcher.start(callback);
};

main();
