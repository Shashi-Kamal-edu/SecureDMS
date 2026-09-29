from __future__ import annotations

import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ABI_PATH = os.path.join(
    BASE_DIR,
    "blockchain",
    "contracts",
    "DocumentRegistry.abi.json",
)


def get_web3_and_contract():
    try:
        from web3 import Web3
    except Exception as exc:
        raise RuntimeError(f"web3.py is not available: {exc}") from exc

    rpc_url = os.getenv(
        "BLOCKCHAIN_RPC_URL",
        "http://127.0.0.1:7545",
    )

    contract_address = os.getenv("CONTRACT_ADDRESS", "")
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")

    if not contract_address:
        raise RuntimeError("CONTRACT_ADDRESS is not configured.")

    if not private_key:
        raise RuntimeError("BLOCKCHAIN_PRIVATE_KEY is not configured.")

    w3 = Web3(Web3.HTTPProvider(rpc_url))

    if not w3.is_connected():
        raise RuntimeError(
            f"Could not connect to blockchain RPC at {rpc_url}."
        )

    if not os.path.exists(ABI_PATH):
        raise RuntimeError(
            f"Contract ABI not found: {ABI_PATH}"
        )

    with open(ABI_PATH, "r", encoding="utf-8") as f:
        abi = json.load(f)

    contract = w3.eth.contract(
        address=contract_address,
        abi=abi,
    )

    return w3, contract, private_key


def register_document(
    document_id: str,
    sha256_hash: str,
    version: int,
    user_id: str,
):
    w3, contract, private_key = get_web3_and_contract()

    account = w3.eth.account.from_key(private_key)

    nonce = w3.eth.get_transaction_count(
        account.address
    )

    txn = contract.functions.registerDocument(
        document_id,
        sha256_hash,
        version,
        user_id,
    ).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "gas": 500000,
            "gasPrice": w3.eth.gas_price,
        }
    )

    signed = account.sign_transaction(txn)

    # Web3.py 6.x uses rawTransaction.
    if hasattr(signed, "rawTransaction"):
        raw_transaction = signed.rawTransaction
    else:
        raw_transaction = signed.raw_transaction

    tx_hash = w3.eth.send_raw_transaction(
        raw_transaction
    )

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash,
        timeout=120,
    )

    if receipt.status != 1:
        raise RuntimeError(
            "Transaction reverted on-chain."
        )

    return tx_hash.hex()


def get_registered_hash(
    document_id: str,
    version: int,
):
    _, contract, _ = get_web3_and_contract()

    result = contract.functions.getDocument(
        document_id,
        version,
    ).call()

    registered_hash = result[1]

    if not registered_hash:
        return None

    return registered_hash


def main():
    if len(sys.argv) < 2:
        raise RuntimeError(
            "Missing blockchain operation."
        )

    operation = sys.argv[1]

    if operation == "register":
        if len(sys.argv) != 6:
            raise RuntimeError(
                "Usage: worker.py register "
                "<document_id> <sha256_hash> <version> <user_id>"
            )

        document_id = sys.argv[2]
        sha256_hash = sys.argv[3]
        version = int(sys.argv[4])
        user_id = sys.argv[5]

        tx_hash = register_document(
            document_id=document_id,
            sha256_hash=sha256_hash,
            version=version,
            user_id=user_id,
        )

        print(
            json.dumps(
                {
                    "success": True,
                    "transaction_hash": tx_hash,
                }
            )
        )

    elif operation == "get_hash":
        if len(sys.argv) != 4:
            raise RuntimeError(
                "Usage: worker.py get_hash "
                "<document_id> <version>"
            )

        document_id = sys.argv[2]
        version = int(sys.argv[3])

        registered_hash = get_registered_hash(
            document_id=document_id,
            version=version,
        )

        print(
            json.dumps(
                {
                    "success": True,
                    "registered_hash": registered_hash,
                }
            )
        )

    else:
        raise RuntimeError(
            f"Unknown operation: {operation}"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": str(exc),
                }
            )
        )
        sys.exit(1)