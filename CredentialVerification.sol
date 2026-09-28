// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CredentialVerification {
    address public owner;

    struct Credential {
        string credentialId;
        string studentName;
        string course;
        string year;
        bytes32 dataHash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }

    mapping(string => Credential) private credentials;
    mapping(string => bool) private exists;

    event CredentialIssued(
        string credentialId,
        bytes32 dataHash,
        address issuer
    );

    event CredentialRevoked(
        string credentialId,
        address issuer
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only institution owner can do this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function makeHash(
        string memory credentialId,
        string memory studentName,
        string memory course,
        string memory year
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                credentialId,
                "|",
                studentName,
                "|",
                course,
                "|",
                year
            )
        );
    }

    function issueCredential(
        string memory credentialId,
        string memory studentName,
        string memory course,
        string memory year
    ) public onlyOwner {
        require(bytes(credentialId).length > 0, "Credential ID required");
        require(bytes(studentName).length > 0, "Student name required");
        require(!exists[credentialId], "Credential ID already exists");

        bytes32 hashValue = makeHash(
            credentialId,
            studentName,
            course,
            year
        );

        credentials[credentialId] = Credential({
            credentialId: credentialId,
            studentName: studentName,
            course: course,
            year: year,
            dataHash: hashValue,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false
        });

        exists[credentialId] = true;

        emit CredentialIssued(credentialId, hashValue, msg.sender);
    }

    function verifyCredential(
        string memory credentialId
    )
        public
        view
        returns (
            bool found,
            bool valid,
            bool revoked,
            string memory studentName,
            string memory course,
            string memory year,
            bytes32 storedHash,
            address issuer,
            uint256 issuedAt
        )
    {
        if (!exists[credentialId]) {
            return (
                false,
                false,
                false,
                "",
                "",
                "",
                bytes32(0),
                address(0),
                0
            );
        }

        Credential memory c = credentials[credentialId];

        bytes32 recalculatedHash = makeHash(
            c.credentialId,
            c.studentName,
            c.course,
            c.year
        );

        bool hashMatches = recalculatedHash == c.dataHash;

        return (
            true,
            hashMatches && !c.revoked,
            c.revoked,
            c.studentName,
            c.course,
            c.year,
            c.dataHash,
            c.issuer,
            c.issuedAt
        );
    }

    function revokeCredential(
        string memory credentialId
    ) public onlyOwner {
        require(exists[credentialId], "Credential not found");
        require(!credentials[credentialId].revoked, "Already revoked");

        credentials[credentialId].revoked = true;

        emit CredentialRevoked(credentialId, msg.sender);
    }

    function getCredential(
        string memory credentialId
    ) public view returns (Credential memory) {
        require(exists[credentialId], "Credential not found");
        return credentials[credentialId];
    }
}
