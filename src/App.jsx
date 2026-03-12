import { useState, useEffect, useCallback } from "react";

// ============================================================
// WALLET HELPERS
// ============================================================
const CHAINS = {
  "0xa4b1": { name: "Arbitrum One", color: "#81C784" },
  "0x66eee": { name: "Arbitrum Sepolia", color: "#FFB74D" },
  "0x1": { name: "Ethereum", color: "#627EEA" },
};
const shortAddr = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

// ============================================================
// MOCK VAULT DATA — Replace with on-chain reads
// ============================================================
const VAULT_DATA = {
  totalAssets: 15000000,
  totalShares: 14563107,
  idleCapital: 1125000,
  totalDeployed: 13875000,
  sharePrice: 1.03,
  apy: 26.1,
  avgCycleTime: 14.2,
  totalTradesCompleted: 47,
  activeDeployments: 2,
  utilizationPct: 92.5,
};

const ACTIVE_TRADES = [
  { tradeId: "TRD-2026-0002", commodity: "PMS (Gasoline)", amount: 6375000, buyer: "Oando Energy", status: "Funded", daysActive: 3 },
  { tradeId: "TRD-2026-0003", commodity: "AGO (Diesel)", amount: 5400000, buyer: "MRS Oil & Gas", status: "Created", daysActive: 0 },
];

const RECENT_RETURNS = [
  { tradeId: "TRD-2026-0001", commodity: "ULSD 10ppm", principal: 7500000, yield: 112500, returnPct: 1.5, cycleTime: 11, date: "2026-03-01" },
  { tradeId: "TRD-2026-0098", commodity: "Palm Oil", principal: 4200000, yield: 73500, returnPct: 1.75, cycleTime: 16, date: "2026-02-25" },
  { tradeId: "TRD-2026-0095", commodity: "Urea", principal: 3800000, yield: 57000, returnPct: 1.5, cycleTime: 12, date: "2026-02-18" },
  { tradeId: "TRD-2026-0091", commodity: "ULSD 10ppm", principal: 8000000, yield: 160000, returnPct: 2.0, cycleTime: 14, date: "2026-02-10" },
];

// ============================================================
// UTILITY
// ============================================================
const fmt = (n) => { if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`; if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return `$${n.toFixed(2)}`; };
const fmtFull = (n) => `$${n.toLocaleString("en-US")}`;

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({ label, value, sub, accent, large }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: large ? "24px 28px" : "18px 20px", border: "1px solid #E8ECF0", flex: "1 1 180px", minWidth: 160 }}>
      <div style={{ fontSize: 11, color: "#8895A7", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: large ? 32 : 26, fontWeight: 700, color: accent || "#1B2A4A", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#8895A7", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function VaultPage({ wallet, userShares }) {
  const [tab, setTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const sharesForDeposit = VAULT_DATA.sharePrice > 0 ? amountNum / VAULT_DATA.sharePrice : 0;
  const usdcForRedeem = amountNum * VAULT_DATA.sharePrice;
  const userValue = userShares * VAULT_DATA.sharePrice;
  const userYield = userShares * (VAULT_DATA.sharePrice - 1.0);

  const handleAction = () => {
    if (amountNum <= 0) return;
    setProcessing(true);
    setTimeout(() => {
      alert(tab === "deposit"
        ? `Deposit: ${fmtFull(amountNum)} USDC → ${sharesForDeposit.toFixed(2)} rUSDC\n\nIn production this would call vault.deposit() via MetaMask.`
        : `Withdraw: ${amountNum.toFixed(2)} rUSDC → ${fmtFull(usdcForRedeem)} USDC\n\nIn production this would call vault.redeem() via MetaMask.`
      );
      setProcessing(false);
      setAmount("");
    }, 800);
  };

  return (
    <div>
      {/* Hero stats */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#1B2A4A", fontWeight: 700 }}>Vault Overview</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8895A7" }}>Commodity trade finance yield vault</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Vault Assets" value={fmt(VAULT_DATA.totalAssets)} sub="USDC under management" large />
        <StatCard label="Current APY" value={`${VAULT_DATA.apy}%`} sub="Annualised yield" accent="#2E7D32" large />
        <StatCard label="Share Price" value={`${VAULT_DATA.sharePrice.toFixed(4)} USDC`} sub="1 rUSDC =" accent="#7B1FA2" large />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <StatCard label="Utilisation" value={`${VAULT_DATA.utilizationPct}%`} sub={`${fmt(VAULT_DATA.totalDeployed)} deployed`} />
        <StatCard label="Idle Capital" value={fmt(VAULT_DATA.idleCapital)} sub="Available for new trades" />
        <StatCard label="Avg Cycle" value={`${VAULT_DATA.avgCycleTime} days`} sub="Funding to return" />
        <StatCard label="Trades Completed" value={VAULT_DATA.totalTradesCompleted} sub={`${VAULT_DATA.activeDeployments} active`} />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Left: Deposit/Withdraw + Portfolio */}
        <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Deposit / Withdraw card */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 24 }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F4F6F9", borderRadius: 8, padding: 4 }}>
              {["deposit", "withdraw"].map(t => (
                <button key={t} onClick={() => { setTab(t); setAmount(""); }} style={{
                  flex: 1, padding: "10px 0", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#1B2A4A" : "#8895A7",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}>{t === "deposit" ? "Deposit USDC" : "Withdraw"}</button>
              ))}
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8895A7", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {tab === "deposit" ? "USDC Amount" : "rUSDC Shares"}
              </label>
              <div style={{ display: "flex", alignItems: "center", border: "2px solid #E8ECF0", borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2E75B6"} onBlur={e => e.currentTarget.style.borderColor = "#E8ECF0"}>
                <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRight: "1px solid #E8ECF0", fontSize: 13, fontWeight: 700, color: "#8895A7", minWidth: 60, textAlign: "center" }}>
                  {tab === "deposit" ? "USDC" : "rUSDC"}
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  style={{ flex: 1, padding: "14px 16px", border: "none", fontSize: 20, fontWeight: 700, outline: "none", fontFamily: "inherit", color: "#1B2A4A", background: "transparent" }} />
                {tab === "deposit" && wallet && (
                  <button onClick={() => setAmount("100000")} style={{ padding: "8px 12px", marginRight: 8, background: "#F4F6F9", border: "1px solid #E8ECF0", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#8895A7", cursor: "pointer", fontFamily: "inherit" }}>MAX</button>
                )}
              </div>
            </div>

            {/* Conversion preview */}
            {amountNum > 0 && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#8895A7" }}>You {tab === "deposit" ? "receive" : "get back"}</span>
                  <span style={{ color: "#1B2A4A", fontWeight: 700 }}>
                    {tab === "deposit"
                      ? `${sharesForDeposit.toFixed(2)} rUSDC`
                      : `${fmtFull(Math.round(usdcForRedeem))} USDC`
                    }
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#8895A7" }}>Share price</span>
                  <span style={{ color: "#1B2A4A", fontWeight: 600 }}>{VAULT_DATA.sharePrice.toFixed(4)} USDC</span>
                </div>
              </div>
            )}

            {/* Action button */}
            {wallet ? (
              <button onClick={handleAction} disabled={amountNum <= 0 || processing} style={{
                width: "100%", padding: 16, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: amountNum > 0 && !processing ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s",
                background: amountNum > 0 && !processing ? (tab === "deposit" ? "#1B2A4A" : "#7B1FA2") : "#D0D7DE",
                color: amountNum > 0 && !processing ? "#fff" : "#8895A7",
              }}>
                {processing ? "Processing..." : tab === "deposit" ? "Deposit USDC" : "Withdraw USDC"}
              </button>
            ) : (
              <button onClick={() => window.ethereum?.request({ method: "eth_requestAccounts" })} style={{
                width: "100%", padding: 16, background: "rgba(100,181,246,0.15)", color: "#2E75B6", border: "1px solid rgba(100,181,246,0.3)", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Connect Wallet</button>
            )}
          </div>

          {/* Portfolio card (only shown when connected) */}
          {wallet && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>Your Position</h3>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>rUSDC Balance</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#7B1FA2", marginTop: 4 }}>{userShares.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Value</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1B2A4A", marginTop: 4 }}>{fmtFull(Math.round(userValue))}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "#F1F8E9", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Yield Earned</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#2E7D32", marginTop: 4 }}>+{fmtFull(Math.round(userYield))}</div>
                </div>
                <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Your APY</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#2E7D32", marginTop: 4 }}>{VAULT_DATA.apy}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Active trades + Recent returns */}
        <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Deployment bar */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#1B2A4A", fontWeight: 700 }}>Capital Deployment</h3>
            <div style={{ height: 20, borderRadius: 10, background: "#F5F5F5", overflow: "hidden", position: "relative", marginBottom: 8 }}>
              <div style={{ height: "100%", borderRadius: 10, background: "linear-gradient(90deg, #7B1FA2, #1565C0)", width: `${VAULT_DATA.utilizationPct}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8895A7" }}>
              <span>{fmt(VAULT_DATA.totalDeployed)} in trades</span>
              <span>{fmt(VAULT_DATA.idleCapital)} idle</span>
            </div>
          </div>

          {/* Active trades */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#1B2A4A", fontWeight: 700 }}>Active Trades</h3>
            {ACTIVE_TRADES.map(t => (
              <div key={t.tradeId} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span>
                    <span style={{ fontSize: 11, color: "#8895A7", marginLeft: 8 }}>{t.commodity}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7B1FA2" }}>{fmt(t.amount)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8895A7" }}>
                  {t.buyer} \u2022 {t.status} \u2022 {t.daysActive > 0 ? `Day ${t.daysActive}` : "Awaiting funding"}
                </div>
              </div>
            ))}
          </div>

          {/* Recent returns */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#1B2A4A", fontWeight: 700 }}>Recent Returns</h3>
            {RECENT_RETURNS.map(t => (
              <div key={t.tradeId} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span>
                    <span style={{ fontSize: 11, color: "#8895A7", marginLeft: 8 }}>{t.commodity}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>+{fmt(t.yield)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8895A7" }}>
                  {fmt(t.principal)} \u2022 {t.returnPct}% in {t.cycleTime} days \u2022 {t.date}
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ background: "#F8FAFC", borderRadius: 12, border: "1px solid #E8ECF0", padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#1B2A4A", fontWeight: 700 }}>How It Works</h3>
            {[
              ["Deposit USDC", "Your stablecoins enter the vault and you receive rUSDC receipt tokens."],
              ["Capital deploys", "The vault deploys USDC into vetted commodity trade escrows (diesel, palm oil, fertiliser)."],
              ["Trade cycles", "Trades complete in 10\u201320 days. Buyer sells cargo, repays through controlled accounts."],
              ["Yield accrues", "Returns flow back to the vault. Your rUSDC appreciates in value automatically."],
              ["Withdraw anytime", "Redeem rUSDC for your USDC + accumulated yield when idle capital is available."],
            ].map(([title, desc], i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1B2A4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1B2A4A" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#8895A7", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Mock user data
  const userShares = wallet ? 48500 : 0;

  const chain = chainId ? CHAINS[chainId] || { name: `Chain ${parseInt(chainId,16)}`, color: "#E0E0E0" } : null;

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) { alert("Please install MetaMask."); return; }
    setConnecting(true);
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setWallet(accs[0]); setChainId(cid);
    } catch(e) { console.error(e); }
    setConnecting(false);
  }, []);

  const disconnectWallet = () => { setWallet(null); setChainId(null); };

  useEffect(() => {
    if (!window.ethereum) return;
    const ha = (a) => { if (a.length===0) disconnectWallet(); else setWallet(a[0]); };
    const hc = (c) => setChainId(c);
    window.ethereum.on("accountsChanged", ha);
    window.ethereum.on("chainChanged", hc);
    window.ethereum.request({ method: "eth_accounts" }).then(a => { if (a.length>0) { setWallet(a[0]); window.ethereum.request({ method: "eth_chainId" }).then(setChainId); }});
    return () => { window.ethereum.removeListener("accountsChanged", ha); window.ethereum.removeListener("chainChanged", hc); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: "#F4F6F9" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Top nav */}
      <div style={{ background: "#1B2A4A", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>Rheon.</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 16 }}>Yield Vault</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {wallet && chain && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: chain.color, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{chain.name}</span>
            </div>
          )}
          {wallet ? (
            <button onClick={disconnectWallet} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#81C784", display: "inline-block" }} />
              {shortAddr(wallet)}
            </button>
          ) : (
            <button onClick={connectWallet} disabled={connecting} style={{ padding: "8px 20px", background: "#64B5F6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        <VaultPage wallet={wallet} userShares={userShares} />
      </div>
    </div>
  );
}
