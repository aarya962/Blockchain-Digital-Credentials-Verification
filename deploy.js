const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const CredentialVerification = await hre.ethers.getContractFactory(
    "CredentialVerification"
  );

  const contract = await CredentialVerification.deploy();
  await contract.deployed();

  console.log("CredentialVerification deployed to:", contract.address);

  const artifact = await hre.artifacts.readArtifact("CredentialVerification");

  const config = `export const CONTRACT_ADDRESS = "${contract.address}";

export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
`;

  const output = path.join(
    __dirname,
    "../../frontend/src/contractConfig.js"
  );

  fs.writeFileSync(output, config);
  console.log("Frontend contractConfig.js updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
