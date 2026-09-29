// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DocumentRegistry
/// @notice Stores tamper-evident fingerprints of documents managed by the
///         Secure Digital Document Management System. This contract NEVER
///         stores the documents themselves -- only their SHA-256 hash,
///         version number, the uploading user's ID and a timestamp.
contract DocumentRegistry {
    struct DocumentRecord {
        string documentId;
        string documentHash; // SHA-256 hex digest
        uint256 version;
        string userId;
        uint256 timestamp;
        bool exists;
    }

    // documentId => version => record
    mapping(string => mapping(uint256 => DocumentRecord)) private records;

    address public owner;

    event DocumentRegistered(
        string indexed documentId,
        uint256 version,
        string documentHash,
        string userId,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register a new document hash for a given version.
    /// @dev Reverts if this exact document/version has already been
    ///      registered, since a version's hash must be immutable once set.
    function registerDocument(
        string calldata documentId,
        string calldata documentHash,
        uint256 version,
        string calldata userId
    ) external {
        require(bytes(documentId).length > 0, "documentId required");
        require(bytes(documentHash).length > 0, "documentHash required");
        require(!records[documentId][version].exists, "version already registered");

        records[documentId][version] = DocumentRecord({
            documentId: documentId,
            documentHash: documentHash,
            version: version,
            userId: userId,
            timestamp: block.timestamp,
            exists: true
        });

        emit DocumentRegistered(documentId, version, documentHash, userId, block.timestamp);
    }

    /// @notice Fetch a registered document record.
    function getDocument(string calldata documentId, uint256 version)
        external
        view
        returns (
            string memory,
            string memory,
            uint256,
            string memory,
            uint256
        )
    {
        DocumentRecord memory record = records[documentId][version];
        return (
            record.documentId,
            record.documentHash,
            record.version,
            record.userId,
            record.timestamp
        );
    }

    /// @notice Verify whether a given hash matches the on-chain record for
    ///         a document/version.
    function verifyDocument(
        string calldata documentId,
        uint256 version,
        string calldata candidateHash
    ) external view returns (bool) {
        DocumentRecord memory record = records[documentId][version];
        if (!record.exists) {
            return false;
        }
        return keccak256(bytes(record.documentHash)) == keccak256(bytes(candidateHash));
    }
}
