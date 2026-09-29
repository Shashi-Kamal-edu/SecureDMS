from __future__ import annotations

"""
Blockchain integration service.

Talks to the DocumentRegistry smart contract (see
blockchain/contracts/DocumentRegistry.sol) over Web3.py. The contract only
ever stores document IDs, hashes, versions, uploader IDs and timestamps --
never the documents themselves.

If the blockchain node (e.g. Ganache) is unreachable, or the contract has
not been deployed / configured, functions raise BlockchainUnavailableError
so the caller can record an honest FAILED status instead of fabricating a
transaction hash.
"""

import json
import os

from app.core.config import settings

_CONTRACT_ABI_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "blockchain", "contracts", "DocumentRegistry.abi.json"
)


class BlockchainUnavailableError(Exception):
    pass


class BlockchainTransactionError(Exception):
    pass


def _load_abi() -> list:
    if not os.path.exists(_CONTRACT_ABI_PATH):
        raise BlockchainUnavailableError(
            "Contract ABI not found. Deploy the contract first with "
            "`python blockchain/deploy.py`, which writes "
            "blockchain/contracts/DocumentRegistry.abi.json."
        )
    with open(_CONTRACT_ABI_PATH, "r") as f:
        return json.load(f)


def _get_web3_and_contract():
    if not settings.BLOCKCHAIN_ENABLED:
        raise BlockchainUnavailableError("Blockchain integration is disabled (BLOCKCHAIN_ENABLED=false).")
    if not settings.CONTRACT_ADDRESS:
        raise BlockchainUnavailableError("CONTRACT_ADDRESS is not configured.")
    if not settings.BLOCKCHAIN_PRIVATE_KEY:
        raise BlockchainUnavailableError("BLOCKCHAIN_PRIVATE_KEY is not configured.")

    try:
        from web3 import Web3
    except Exception as exc:  # pragma: no cover
        raise BlockchainUnavailableError(f"web3.py is not available: {exc}") from exc

    w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL))
    if not w3.is_connected():
        raise BlockchainUnavailableError(
            f"Could not connect to blockchain RPC at {settings.BLOCKCHAIN_RPC_URL}."
        )

    abi = _load_abi()
    contract = w3.eth.contract(address=settings.CONTRACT_ADDRESS, abi=abi)
    return w3, contract


def register_document(
    *, document_id: str, sha256_hash: str, version: int, user_id: str
) -> str:
    """Register (or update) a document hash on-chain.

    Returns the transaction hash as a hex string. Raises
    BlockchainUnavailableError / BlockchainTransactionError on failure --
    never fabricates a tx hash.
    """
    w3, contract = _get_web3_and_contract()

    account = w3.eth.account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
    try:
        nonce = w3.eth.get_transaction_count(account.address)
        txn = contract.functions.registerDocument(
            document_id, sha256_hash, version, user_id
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "gas": 500000,
                "gasPrice": w3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(txn)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            raise BlockchainTransactionError("Transaction reverted on-chain.")
        return tx_hash.hex()
    except BlockchainTransactionError:
        raise
    except Exception as exc:
        raise BlockchainTransactionError(f"Failed to register document on-chain: {exc}") from exc


def get_registered_hash(*, document_id: str, version: int) -> str | None:
    """Read the hash registered on-chain for a given document/version, or
    None if nothing is registered yet."""
    w3, contract = _get_web3_and_contract()
    try:
        result = contract.functions.getDocument(document_id, version).call()
        # Expected tuple layout: (docId, hash, version, userId, timestamp)
        registered_hash = result[1]
        if not registered_hash:
            return None
        return registered_hash
    except Exception as exc:
        raise BlockchainTransactionError(f"Failed to read document from chain: {exc}") from exc
