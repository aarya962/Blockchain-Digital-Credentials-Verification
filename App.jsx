import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contractConfig";

const EMPTY = {
  credentialId: "",
  studentName: "",
  course: "",
  year: ""
};

function App() {
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [verifyId, setVerifyId] = useState("");
  const [verified, setVerified] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [qrCredential, setQrCredential] = useState(null);

  const walletAvailable = typeof window !== "undefined" && window.ethereum;

  function shortAddress(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  }

  async function getProvider() {
    if (!walletAvailable) {
      throw new Error("MetaMask is not installed.");
    }
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  async function getContract(signer = false) {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Contract not deployed yet. Run the Hardhat deploy command.");
    }

    const provider = await getProvider();
    return new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer ? provider.getSigner() : provider
    );
  }

  async function connectWallet() {
    try {
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const net = await provider.getNetwork();

      setAccount(accounts[0]);
      setNetwork(`${net.name} (${net.chainId})`);
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(error.message || "Could not connect wallet.");
    }
  }

  async function switchToLocalNetwork() {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x7A69",
            chainName: "Hardhat Local",
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: ["http://127.0.0.1:8545"]
          }
        ]
      });
      setStatus("Hardhat Local network added/selected. Connect the wallet again.");
    } catch (error) {
      setStatus(error.message || "Could not add local network.");
    }
  }

  async function issueCredential(event) {
    event.preventDefault();

    try {
      if (!account) {
        await connectWallet();
        return;
      }

      const contract = await getContract(true);

      setStatus("Please confirm the transaction in MetaMask...");

      const tx = await contract.issueCredential(
        form.credentialId.trim(),
        form.studentName.trim(),
        form.course.trim(),
        form.year.trim()
      );

      setStatus("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      const saved = {
        ...form,
        credentialId: form.credentialId.trim(),
        studentName: form.studentName.trim(),
        course: form.course.trim(),
        year: form.year.trim()
      };

      setCredentials((old) => {
        const next = [...old.filter((x) => x.credentialId !== saved.credentialId), saved];
        localStorage.setItem("demoCredentials", JSON.stringify(next));
        return next;
      });

      setForm(EMPTY);
      setStatus("Credential issued successfully.");
    } catch (error) {
      setStatus(error.reason || error.message || "Issue failed.");
    }
  }

  async function verifyCredential(id = verifyId) {
    try {
      if (!id.trim()) {
        setStatus("Enter a credential ID.");
        return;
      }

      const contract = await getContract(false);
      const result = await contract.verifyCredential(id.trim());

      if (!result.found) {
        setVerified({ found: false });
        setStatus("Credential not found.");
        return;
      }

      setVerified({
        found: true,
        valid: result.valid,
        revoked: result.revoked,
        studentName: result.studentName,
        course: result.course,
        year: result.year,
        hash: result.storedHash,
        issuer: result.issuer,
        issuedAt: new Date(Number(result.issuedAt.toString()) * 1000).toLocaleString()
      });

      setStatus("Verification completed.");
    } catch (error) {
      setStatus(error.reason || error.message || "Verification failed.");
    }
  }

  async function revokeCredential(id) {
    try {
      const contract = await getContract(true);

      setStatus("Please confirm the revoke transaction in MetaMask...");

      const tx = await contract.revokeCredential(id);
      await tx.wait();

      setStatus(`Credential ${id} revoked successfully.`);
      await verifyCredential(id);
    } catch (error) {
      setStatus(error.reason || error.message || "Revocation failed.");
    }
  }

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("demoCredentials") || "[]");
    setCredentials(saved);

    if (walletAvailable) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts[0] || "");
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (walletAvailable) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, [walletAvailable]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">🔐 Decentralized Identity</div>
          <div className="brand-sub">Credential Verification System</div>
        </div>

        <div className="wallet-area">
          {network && <span className="network">{network}</span>}
          <button className="wallet-btn" onClick={connectWallet}>
            {account ? shortAddress(account) : "Connect MetaMask"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="badge">BLOCKCHAIN MINI PROJECT</span>
            <h1>Verify digital credentials with blockchain.</h1>
            <p>
              An easy demonstration of issuing, storing, verifying and revoking
              academic credentials using a Solidity smart contract.
            </p>
            <div className="hero-actions">
              <button onClick={() => document.getElementById("verify").scrollIntoView()}>
                Verify Credential
              </button>
              <button className="secondary" onClick={switchToLocalNetwork}>
                Add Hardhat Network
              </button>
            </div>
          </div>

          <div className="flow-card">
            <div className="flow-title">Project Flow</div>
            <div className="flow">🏫 Institution → 🔐 Hash → ⛓️ Blockchain</div>
            <div className="flow">🎓 Student → 📱 QR → 🏢 Verifier</div>
          </div>
        </section>

        {status && <div className="status">{status}</div>}

        <section className="section">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>Institution Dashboard</h2>
              <p>Issue and revoke credentials.</p>
            </div>
          </div>

          <div className="card-grid">
            <form className="card" onSubmit={issueCredential}>
              <h3>Issue Credential</h3>

              <label>Student Name</label>
              <input
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="Rahul Sharma"
                required
              />

              <label>Credential ID</label>
              <input
                value={form.credentialId}
                onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
                placeholder="DEGREE001"
                required
              />

              <label>Course</label>
              <input
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="B.Tech Computer Science"
                required
              />

              <label>Year</label>
              <input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="2026"
                required
              />

              <button type="submit">Issue on Blockchain</button>
            </form>

            <div className="card">
              <h3>Revoke Credential</h3>
              <p className="muted">
                Enter an existing credential ID. Only the institution owner can
                revoke it.
              </p>

              <input
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                placeholder="DEGREE001"
              />

              <button
                className="danger"
                onClick={() => revokeCredential(verifyId.trim())}
              >
                Revoke Credential
              </button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h2>Student Dashboard</h2>
              <p>View locally saved demo credentials and create a QR code.</p>
            </div>
          </div>

          <div className="credential-grid">
            {credentials.length === 0 ? (
              <div className="empty">No credentials issued from this browser yet.</div>
            ) : (
              credentials.map((item) => (
                <div className="credential" key={item.credentialId}>
                  <div className="credential-top">
                    <span className="valid-pill">CREDENTIAL</span>
                    <strong>{item.credentialId}</strong>
                  </div>
                  <h3>{item.studentName}</h3>
                  <p>{item.course}</p>
                  <p>Year: {item.year}</p>
                  <div className="credential-actions">
                    <button
                      onClick={() => {
                        setQrCredential(item);
                        setVerifyId(item.credentialId);
                      }}
                    >
                      Generate QR
                    </button>
                    <button
                      className="secondary"
                      onClick={() => verifyCredential(item.credentialId)}
                    >
                      Check Status
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section" id="verify">
          <div className="section-heading">
            <span>03</span>
            <div>
              <h2>Verification</h2>
              <p>Anyone can check whether a credential is valid.</p>
            </div>
          </div>

          <div className="verify-box">
            <input
              value={verifyId}
              onChange={(e) => setVerifyId(e.target.value)}
              placeholder="Enter Credential ID e.g. DEGREE001"
            />
            <button onClick={() => verifyCredential()}>VERIFY</button>
          </div>

          {verified && (
            <div className={`result ${verified.valid ? "success" : verified.revoked ? "warning" : "failed"}`}>
              {!verified.found ? (
                <>
                  <h3>✗ Credential Not Found</h3>
                  <p>No credential with this ID exists on the blockchain.</p>
                </>
              ) : (
                <>
                  <h3>
                    {verified.valid
                      ? "✓ CERTIFICATE VERIFIED"
                      : verified.revoked
                      ? "⚠ CERTIFICATE REVOKED"
                      : "✗ INVALID CERTIFICATE"}
                  </h3>

                  <div className="details">
                    <div><span>Student</span><strong>{verified.studentName}</strong></div>
                    <div><span>Course</span><strong>{verified.course}</strong></div>
                    <div><span>Year</span><strong>{verified.year}</strong></div>
                    <div><span>Issuer</span><strong>{shortAddress(verified.issuer)}</strong></div>
                    <div><span>Issued</span><strong>{verified.issuedAt}</strong></div>
                    <div className="hash"><span>Blockchain Hash</span><strong>{verified.hash}</strong></div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {qrCredential && (
          <section className="qr-modal">
            <div className="qr-card">
              <button className="close" onClick={() => setQrCredential(null)}>×</button>
              <h2>Credential QR Code</h2>
              <p>Scan or save this code for verification.</p>
              <QRCodeCanvas
                value={`${window.location.origin}/?verify=${encodeURIComponent(qrCredential.credentialId)}`}
                size={220}
                includeMargin
              />
              <h3>{qrCredential.credentialId}</h3>
              <button onClick={() => setQrCredential(null)}>Done</button>
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>Decentralized Identity Verification System • Educational Demo</p>
      </footer>
    </div>
  );
}

export default App;
