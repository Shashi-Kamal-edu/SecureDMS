from __future__ import annotations

import json
import os
import subprocess

from app.core.config import settings


_BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

_WORKER_PATH = os.path.join(
    _BASE_DIR,
    "blockchain",
    "worker.py",
)

_BLOCKCHAIN_PYTHON = os.path.join(
    _BASE_DIR,
    "blockchain_venv",
    "Scripts",
    "python.exe",
)

_CONTRACT_ABI_PATH = os.path.join(
    _BASE_DIR,
    "blockchain",
    "contracts",
    "DocumentRegistry.abi.json",
)


class BlockchainUnavailableError(Exception):
    pass


class BlockchainTransactionError(Exception):
    pass


def _check_configuration():
    if not settings.BLOCKCHAIN_ENABLED:
        raise BlockchainUnavailableError(
            "Blockchain integration is disabled "
            "(BLOCKCHAIN_ENABLED=false)."
        )

    if not settings.CONTRACT_ADDRESS:
        raise BlockchainUnavailableError(
            "CONTRACT_ADDRESS is not configured."
        )

    if not settings.BLOCKCHAIN_PRIVATE_KEY:
        raise BlockchainUnavailableError(
            "BLOCKCHAIN_PRIVATE_KEY is not configured."
        )

    if not os.path.exists(_WORKER_PATH):
        raise BlockchainUnavailableError(
            f"Blockchain worker not found: {_WORKER_PATH}"
        )

    if not os.path.exists(_BLOCKCHAIN_PYTHON):
        raise BlockchainUnavailableError(
            f"Blockchain Python environment not found: "
            f"{_BLOCKCHAIN_PYTHON}"
        )

    if not os.path.exists(_CONTRACT_ABI_PATH):
        raise BlockchainUnavailableError(
            "Contract ABI not found. Deploy the contract first."
        )


def _run_worker(*args: str) -> dict:
    _check_configuration()

    env = os.environ.copy()

    env["BLOCKCHAIN_RPC_URL"] = settings.BLOCKCHAIN_RPC_URL
    env["BLOCKCHAIN_PRIVATE_KEY"] = settings.BLOCKCHAIN_PRIVATE_KEY
    env["CONTRACT_ADDRESS"] = settings.CONTRACT_ADDRESS

    command = [
        _BLOCKCHAIN_PYTHON,
        _WORKER_PATH,
        *args,
    ]

    try:
        result = subprocess.run(
            command,
            cwd=_BASE_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
    except subprocess.TimeoutExpired as exc:
        raise BlockchainTransactionError(
            "Blockchain worker timed out."
        ) from exc
    except Exception as exc:
        raise BlockchainTransactionError(
            f"Could not start blockchain worker: {exc}"
        ) from exc

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()

    if not stdout:
        raise BlockchainTransactionError(
            stderr or "Blockchain worker returned no output."
        )

    # Worker prints JSON as its final output.
    try:
        data = json.loads(stdout.splitlines()[-1])
    except json.JSONDecodeError as exc:
        raise BlockchainTransactionError(
            f"Invalid response from blockchain worker: {stdout}"
        ) from exc

    if result.returncode != 0 or not data.get("success"):
        error = data.get("error") or stderr or "Blockchain operation failed."
        raise BlockchainTransactionError(error)

    return data


def register_document(
    *,
    document_id: str,
    sha256_hash: str,
    version: int,
    user_id: str,
) -> str:
    """
    Register a document hash on the blockchain.

    The actual Web3 operation runs inside blockchain_venv
    through blockchain/worker.py.
    """

    data = _run_worker(
        "register",
        document_id,
        sha256_hash,
        str(version),
        user_id,
    )

    tx_hash = data.get("transaction_hash")

    if not tx_hash:
        raise BlockchainTransactionError(
            "Blockchain worker did not return a transaction hash."
        )

    return tx_hash


def get_registered_hash(
    *,
    document_id: str,
    version: int,
) -> str | None:
    """
    Read the registered document hash from the blockchain.
    """

    data = _run_worker(
        "get_hash",
        document_id,
        str(version),
    )

    return data.get("registered_hash")