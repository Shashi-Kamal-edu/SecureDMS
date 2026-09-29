"""
Compiles and deploys DocumentRegistry.sol to a local EVM node (e.g.
Ganache) using Web3.py and py-solc-x.

Usage:
    python blockchain/deploy.py

Requires the following environment variables (see .env.example):
    BLOCKCHAIN_RPC_URL      e.g. http://127.0.0.1:7545
    BLOCKCHAIN_PRIVATE_KEY  private key of a funded account on that node

On success, writes:
    blockchain/contracts/DocumentRegistry.abi.json
and prints the deployed CONTRACT_ADDRESS to set in your .env file.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

CONTRACT_SOURCE_PATH = os.path.join(os.path.dirname(__file__), "contracts", "DocumentRegistry.sol")
ABI_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "contracts", "DocumentRegistry.abi.json")
SOLC_VERSION = "0.8.19"


def compile_contract() -> dict:
    try:
        import solcx
    except ImportError as exc:
        raise SystemExit(
            "py-solc-x is required to compile the contract. "
            "Install it with `pip install py-solc-x`."
        ) from exc

    installed = solcx.get_installed_solc_versions()
    if not any(str(v) == SOLC_VERSION for v in installed):
        print(f"Installing solc {SOLC_VERSION} ...")
        solcx.install_solc(SOLC_VERSION)
    solcx.set_solc_version(SOLC_VERSION)

    with open(CONTRACT_SOURCE_PATH, "r") as f:
        source = f.read()

    compiled = solcx.compile_source(
        source,
        output_values=["abi", "bin"],
        solc_version=SOLC_VERSION,
    )
    contract_key = [k for k in compiled if k.endswith(":DocumentRegistry")][0]
    return compiled[contract_key]


def deploy():
    rpc_url = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:7545")
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY")

    if not private_key:
        raise SystemExit(
            "BLOCKCHAIN_PRIVATE_KEY is not set. Set it in your .env before deploying. "
            "NEVER hard-code a private key in source."
        )

    try:
        from web3 import Web3
    except ImportError as exc:
        raise SystemExit("web3.py is required. Install it with `pip install web3`.") from exc

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise SystemExit(
            f"Could not connect to blockchain node at {rpc_url}. "
            "Make sure Ganache (or another local EVM) is running."
        )

    compiled = compile_contract()
    abi = compiled["abi"]
    bytecode = compiled["bin"]

    account = w3.eth.account.from_key(private_key)
    print(f"Deploying from account: {account.address}")

    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)
    txn = Contract.constructor().build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "gas": 3_000_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(txn)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"Deployment transaction sent: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    contract_address = receipt.contractAddress
    print(f"Contract deployed at: {contract_address}")

    with open(ABI_OUTPUT_PATH, "w") as f:
        json.dump(abi, f, indent=2)
    print(f"ABI written to: {ABI_OUTPUT_PATH}")

    print("\nSet this in your .env file:")
    print(f"CONTRACT_ADDRESS={contract_address}")

    return contract_address


if __name__ == "__main__":
    deploy()
