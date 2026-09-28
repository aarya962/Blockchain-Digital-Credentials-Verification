const { expect } = require("chai");

describe("CredentialVerification", function () {
  let contract;
  let owner;
  let other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory(
      "CredentialVerification"
    );

    contract = await Factory.deploy();
    await contract.deployed();
  });

  it("issues and verifies a credential", async function () {
    await contract.issueCredential(
      "DEGREE001",
      "Rahul Sharma",
      "B.Tech Computer Science",
      "2026"
    );

    const result = await contract.verifyCredential("DEGREE001");

    expect(result.found).to.equal(true);
    expect(result.valid).to.equal(true);
    expect(result.revoked).to.equal(false);
    expect(result.studentName).to.equal("Rahul Sharma");
  });

  it("rejects duplicate credential IDs", async function () {
    await contract.issueCredential(
      "DEGREE001",
      "Rahul Sharma",
      "B.Tech Computer Science",
      "2026"
    );

    await expect(
      contract.issueCredential(
        "DEGREE001",
        "Another Student",
        "B.Tech",
        "2026"
      )
    ).to.be.revertedWith("Credential ID already exists");
  });

  it("allows the institution owner to revoke", async function () {
    await contract.issueCredential(
      "DEGREE001",
      "Rahul Sharma",
      "B.Tech Computer Science",
      "2026"
    );

    await contract.revokeCredential("DEGREE001");

    const result = await contract.verifyCredential("DEGREE001");

    expect(result.revoked).to.equal(true);
    expect(result.valid).to.equal(false);
  });

  it("does not allow another account to issue credentials", async function () {
    await expect(
      contract.connect(other).issueCredential(
        "DEGREE002",
        "Test Student",
        "BCA",
        "2026"
      )
    ).to.be.revertedWith("Only institution owner can do this");
  });
});
