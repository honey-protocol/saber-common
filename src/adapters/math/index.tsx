import { PublicKey, Transaction } from "@solana/web3.js";
import * as EventEmitter from "eventemitter3";

import { PhantomProvider } from "../phantom";
import { DEFAULT_PUBLIC_KEY, WalletAdapter } from "../types";

interface MathWalletProvider {
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  getAccount: () => Promise<string>;

  isMathWallet: true;
  isPhantom: undefined;
}

declare global {
  interface Window {
    solana?:
      | MathWalletProvider
      | PhantomProvider
      | { isPhantom?: false; isMathWallet?: false };
  }
}

export class MathWalletAdapter extends EventEmitter implements WalletAdapter {
  _publicKey?: PublicKey;
  _onProcess: boolean;
  _connected: boolean;
  constructor() {
    super();
    this._onProcess = false;
    this._connected = false;
  }

  get connected(): boolean {
    return this._connected;
  }

  get autoApprove(): boolean {
    return false;
  }

  public async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (!this._provider) {
      return transactions;
    }

    return await this._provider.signAllTransactions(transactions);
  }

  private get _provider(): MathWalletProvider | undefined {
    if (window?.solana?.isMathWallet) {
      return window.solana;
    }
    return undefined;
  }

  get publicKey(): PublicKey {
    return this._publicKey || DEFAULT_PUBLIC_KEY;
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this._provider) {
      return transaction;
    }

    return this._provider.signTransaction(transaction);
  }

  connect = async (): Promise<void> => {
    if (this._onProcess) {
      return;
    }

    if (!this._provider) {
      window.open("https://mathwallet.org/", "_blank", "noopener noreferrer");
      throw new Error("Math Wallet not installed");
    }

    this._onProcess = true;
    await this._provider
      .getAccount()
      .then((account) => {
        this._publicKey = new PublicKey(account);
        this._connected = true;
        this.emit("connect", this._publicKey);
      })
      .catch(() => {
        this.disconnect();
      })
      .finally(() => {
        this._onProcess = false;
      });
  };

  disconnect(): void {
    if (this._publicKey) {
      this._publicKey = undefined;
      this._connected = false;
      this.emit("disconnect");
    }
  }
}
