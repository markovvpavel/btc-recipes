# BTC Recipes

![Cover Image](path/to/your/cover-image.jpg)

This project is a Bitcoin wallet and transaction pool management system. It allows users to create wallets, manage transactions, and monitor the payment status from customers without knowing the transaction ID. The system waits for up to 30 minutes to confirm the transaction and verify that the payment has been received.

## Modules

### 1. **Wallet.ts**
Handles wallet creation and management, including the generation of private keys and addresses. It also provides functionality to load an existing wallet from a private key.

- **Methods:**
  - `generate()`: Creates a new Bitcoin wallet and returns the private key and address.
  - `load(privateKey: string)`: Loads an existing wallet from the provided private key.

### 2. **Pool.ts**
Manages Bitcoin transactions and the transaction pool. It facilitates sending Bitcoin from one wallet to another and calculates transaction fees based on UTXOs.

- **Methods:**
  - `sendTx(sender: Wallet, receiverAddress: string, amount: number, fee: number)`: Sends a Bitcoin transaction from the sender's wallet to the receiver address, taking into account the specified fee.
  - `findTx(address: string, timeout: number, amount: number)`: Finds a transaction that matches the given address and amount, using the specified timeout period.

### 3. **Watcher.ts**
Monitors the transaction status and checks for confirmation. It continuously verifies whether the payment has been received and if the transaction meets the expected conditions (e.g., amount, time, confirmation).

- **Methods:**
  - `start(callback: Function)`: Starts watching the transaction and executes the callback function periodically to check the transaction status.

### 4. **WalletStorage.ts**
Handles saving and loading wallet data to and from files. This module provides persistent storage for wallet credentials.

## Task Completed in `index.ts`

The goal of `index.ts` is to handle the process of waiting for a payment from a customer when the transaction ID is unknown. The system ensures that the process does not take longer than 30 minutes.

### **Steps Implemented in `index.ts`**

1. **Generate or Load Wallet:**
   - The wallet is either generated for the customer or loaded if the customer provides a private key.
   - The wallet address is used to receive payments from the customer.

2. **Send Bitcoin Transaction:**
   - A transaction is sent from the sender wallet to the customer's address using the `Pool.sendTx()` method, with a specified fee.

3. **Monitor the Transaction:**
   - The `Watcher.start()` method is invoked to monitor the transaction. The system waits for the customer’s payment to arrive.
   - The watcher periodically checks the status of the transaction, verifying the amount and the time limit.

4. **Timeout Handling:**
   - If the transaction is not confirmed within 30 minutes, the watcher will stop monitoring and notify the system.

5. **Transaction Confirmation:**
   - If the transaction is confirmed and matches the expected criteria (correct amount and within the time window), the payment is considered successful.
