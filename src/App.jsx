import { useState, useEffect, useCallback } from "react";

// ============================================================
// WALLET
// ============================================================
const CHAINS = {
  "0xa4b1": { name: "Arbitrum One", color: "#81C784", testnet: false },
  "0x66eee": { name: "Arbitrum Sepolia", color: "#FFB74D", testnet: true },
  "0x1": { name: "Ethereum", color: "#627EEA", testnet: false },
  "0xaa36a7": { name: "Sepolia", color: "#FFB74D", testnet: true },
};
const ARB_SEPOLIA_ID = "0x66eee";
const shortAddr = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

// ============================================================
// MOCK DATA
// ============================================================
const VAULT_DATA = {
  totalAssets: 15000000, totalShares: 14563107, idleCapital: 1125000,
  totalDeployed: 13875000, sharePrice: 1.03, apy: 26.1, avgCycleTime: 14.2,
  totalTradesCompleted: 47, activeDeployments: 2, utilizationPct: 92.5,
};

const ACTIVE_TRADES = [
  { tradeId: "TRD-2026-0002", commodity: "Refined Petroleum", amount: 6375000, region: "West Africa", status: "Funded", daysActive: 3, tenor: 25, inspector: "Bureau Veritas", expiresAt: "2026-03-25" },
  { tradeId: "TRD-2026-0003", commodity: "Refined Petroleum", amount: 5400000, region: "West Africa", status: "Created", daysActive: 0, tenor: 30, inspector: "Intertek", expiresAt: "2026-03-30" },
];

const RECENT_RETURNS = [
  { tradeId: "TRD-2026-0001", commodity: "Refined Petroleum", principal: 7500000, yield: 112500, cycleTime: 11, date: "2026-03-01" },
  { tradeId: "TRD-2026-0098", commodity: "Edible Oils", principal: 4200000, yield: 73500, cycleTime: 16, date: "2026-02-25" },
  { tradeId: "TRD-2026-0095", commodity: "Fertiliser", principal: 3800000, yield: 57000, cycleTime: 12, date: "2026-02-18" },
  { tradeId: "TRD-2026-0091", commodity: "Refined Petroleum", principal: 8000000, yield: 160000, cycleTime: 14, date: "2026-02-10" },
  { tradeId: "TRD-2026-0087", commodity: "Refined Petroleum", principal: 5500000, yield: 82500, cycleTime: 13, date: "2026-02-03" },
];

const TX_HISTORY = [
  { id: "tx-001", type: "Deposit", amount: 500000, shares: 485437, date: "2026-01-15", hash: "0xabc1...7890" },
  { id: "tx-002", type: "Yield", amount: 7500, shares: 0, date: "2026-01-28", hash: null, note: "TRD-2026-0078 returned" },
  { id: "tx-003", type: "Deposit", amount: 250000, shares: 242230, date: "2026-02-01", hash: "0xdef2...1234" },
  { id: "tx-004", type: "Yield", amount: 12800, shares: 0, date: "2026-02-10", hash: null, note: "TRD-2026-0091 returned" },
  { id: "tx-005", type: "Withdrawal", amount: 100000, shares: 97087, date: "2026-02-14", hash: "0xghi3...5678" },
  { id: "tx-006", type: "Yield", amount: 9200, shares: 0, date: "2026-02-18", hash: null, note: "TRD-2026-0095 returned" },
  { id: "tx-007", type: "Yield", amount: 5600, shares: 0, date: "2026-02-25", hash: null, note: "TRD-2026-0098 returned" },
  { id: "tx-008", type: "Deposit", amount: 300000, shares: 291262, date: "2026-02-28", hash: "0xjkl4...9012" },
  { id: "tx-009", type: "Yield", amount: 8500, shares: 0, date: "2026-03-01", hash: null, note: "TRD-2026-0001 returned" },
];

// ============================================================
// UTILS
// ============================================================
const fmt = (n) => { if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`; if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return `$${n}`; };
const fmtFull = (n) => `$${n.toLocaleString("en-US")}`;
const stateColor = { Created: { bg: "#FFF3E0", text: "#E65100", border: "#FFB74D" }, Funded: { bg: "#E3F2FD", text: "#1565C0", border: "#64B5F6" }, Released: { bg: "#E8F5E9", text: "#2E7D32", border: "#81C784" } };
const txColor = { Deposit: { bg: "#E3F2FD", text: "#1565C0" }, Withdrawal: { bg: "#FFF3E0", text: "#E65100" }, Yield: { bg: "#E8F5E9", text: "#2E7D32" } };

// ============================================================
// SHARED COMPONENTS (matching admin exactly)
// ============================================================
function StatCard({ label, value, sub, accent }) {
  return (<div style={{ background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1px solid #E8ECF0", flex: "1 1 180px", minWidth: 160 }}>
    <div style={{ fontSize: 12, color: "#8895A7", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: accent || "#1B2A4A", lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "#8895A7", marginTop: 4 }}>{sub}</div>}
  </div>);
}

function Badge({ state }) {
  const c = stateColor[state] || stateColor.Created;
  return (<span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{state.toUpperCase()}</span>);
}

function TxBadge({ type }) {
  const c = txColor[type] || txColor.Deposit;
  return (<span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, background: c.bg, color: c.text }}>{type.toUpperCase()}</span>);
}

// ============================================================
// VAULT PAGE
// ============================================================
function VaultPage({ wallet, userShares, onConnect }) {
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
        ? `Deposit: ${fmtFull(amountNum)} USDC \u2192 ${sharesForDeposit.toFixed(2)} rUSDC\n\nIn production this calls vault.deposit() via MetaMask.`
        : `Withdraw: ${amountNum.toFixed(2)} rUSDC \u2192 ${fmtFull(Math.round(usdcForRedeem))} USDC\n\nIn production this calls vault.redeem() via MetaMask.`
      );
      setProcessing(false);
      setAmount("");
    }, 800);
  };

  return (<div>
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#1B2A4A", fontWeight: 700 }}>Vault Overview</h2>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8895A7" }}>Commodity trade finance yield vault</p>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
      <StatCard label="Total Vault Assets" value={fmt(VAULT_DATA.totalAssets)} sub="USDC under management" />
      <StatCard label="Current APY" value={`${VAULT_DATA.apy}%`} sub="Annualised yield" accent="#2E7D32" />
      <StatCard label="Share Price" value={`${VAULT_DATA.sharePrice.toFixed(4)}`} sub="USDC per rUSDC" accent="#7B1FA2" />
      <StatCard label="Utilisation" value={`${VAULT_DATA.utilizationPct}%`} sub={`${fmt(VAULT_DATA.totalDeployed)} deployed`} />
    </div>

    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Deposit/Withdraw */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F4F6F9", borderRadius: 8, padding: 4 }}>
            {["deposit", "withdraw"].map(t => (
              <button key={t} onClick={() => { setTab(t); setAmount(""); }} style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                background: tab === t ? "#fff" : "transparent", color: tab === t ? "#1B2A4A" : "#8895A7",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>{t === "deposit" ? "Deposit USDC" : "Withdraw"}</button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8895A7", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {tab === "deposit" ? "USDC Amount" : "rUSDC Shares"}
            </label>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #D0D7DE", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRight: "1px solid #D0D7DE", fontSize: 13, fontWeight: 600, color: "#8895A7", minWidth: 60, textAlign: "center" }}>
                {tab === "deposit" ? "USDC" : "rUSDC"}
              </div>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                style={{ flex: 1, padding: "12px 14px", border: "none", fontSize: 18, fontWeight: 700, outline: "none", fontFamily: "inherit", color: "#1B2A4A", background: "transparent" }} />
            </div>
          </div>

          {amountNum > 0 && (
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#8895A7" }}>You {tab === "deposit" ? "receive" : "get back"}</span>
                <span style={{ color: "#1B2A4A", fontWeight: 700 }}>
                  {tab === "deposit" ? `${sharesForDeposit.toFixed(2)} rUSDC` : `${fmtFull(Math.round(usdcForRedeem))} USDC`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#8895A7" }}>Share price</span>
                <span style={{ color: "#1B2A4A", fontWeight: 600 }}>{VAULT_DATA.sharePrice.toFixed(4)} USDC</span>
              </div>
            </div>
          )}

          {wallet ? (
            <button onClick={handleAction} disabled={amountNum <= 0 || processing} style={{
              width: "100%", padding: 14, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: amountNum > 0 && !processing ? "pointer" : "not-allowed", fontFamily: "inherit",
              background: amountNum > 0 && !processing ? "#1B2A4A" : "#D0D7DE",
              color: amountNum > 0 && !processing ? "#fff" : "#8895A7",
            }}>{processing ? "Processing..." : tab === "deposit" ? "Deposit USDC" : "Withdraw USDC"}</button>
          ) : (
            <button onClick={onConnect} style={{
              width: "100%", padding: 14, background: "rgba(100,181,246,0.15)", color: "#2E75B6", border: "1px solid rgba(100,181,246,0.3)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Connect Wallet</button>
          )}
        </div>

        {/* Portfolio */}
        {wallet && (
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>Your Position</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>rUSDC Balance</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#7B1FA2" }}>{userShares.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Current Value</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1B2A4A" }}>{fmtFull(Math.round(userValue))}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: "#F1F8E9", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Yield Earned</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#2E7D32" }}>+{fmtFull(Math.round(userYield))}</div>
              </div>
              <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Your APY</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#2E7D32" }}>{VAULT_DATA.apy}%</div>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>How It Works</h3>
          {[
            ["Deposit USDC", "Your stablecoins enter the vault and you receive rUSDC receipt tokens."],
            ["Capital deploys", "The vault deploys USDC into vetted commodity trade escrows."],
            ["Trade cycles", "Trades complete in 10\u201320 days. Buyer repays through controlled accounts."],
            ["Yield accrues", "Returns flow back. Your rUSDC appreciates in value automatically."],
            ["Withdraw anytime", "Redeem rUSDC for USDC + yield when idle capital is available."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 4 ? 14 : 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1B2A4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1B2A4A" }}>{title}</div>
                <div style={{ fontSize: 12, color: "#8895A7", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Deployment bar */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>Capital Deployment</h3>
          <div style={{ height: 24, borderRadius: 12, background: "#F5F5F5", overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", borderRadius: 12, background: "linear-gradient(90deg, #7B1FA2, #1565C0)", width: `${VAULT_DATA.utilizationPct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#8895A7" }}>
            <span>{fmt(VAULT_DATA.totalDeployed)} in trades</span>
            <span>{fmt(VAULT_DATA.idleCapital)} idle</span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <StatCard label="Avg Cycle" value={`${VAULT_DATA.avgCycleTime}d`} sub="Funding to return" />
          <StatCard label="Completed" value={VAULT_DATA.totalTradesCompleted} sub={`${VAULT_DATA.activeDeployments} active`} />
        </div>

        {/* Active trades */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>Active Trades</h3>
          {ACTIVE_TRADES.map(t => (
            <div key={t.tradeId} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div><span style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span><span style={{ fontSize: 12, color: "#8895A7", marginLeft: 8 }}>{t.commodity}</span></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#7B1FA2" }}>{fmt(t.amount)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#8895A7" }}>{t.region} \u2022 {t.status} \u2022 {t.daysActive > 0 ? `Day ${t.daysActive}` : "Awaiting funding"}</div>
            </div>
          ))}
        </div>

        {/* Recent returns */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1B2A4A", fontWeight: 700 }}>Recent Returns</h3>
          {RECENT_RETURNS.slice(0, 3).map(t => (
            <div key={t.tradeId} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div><span style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span><span style={{ fontSize: 12, color: "#8895A7", marginLeft: 8 }}>{t.commodity}</span></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>+{fmt(t.yield)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#8895A7" }}>{fmt(t.principal)} deployed \u2022 {t.cycleTime} days \u2022 {t.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>);
}

// ============================================================
// TRADES TRANSPARENCY PAGE
// ============================================================
function TradesPage() {
  return (<div>
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#1B2A4A", fontWeight: 700 }}>Trade Transparency</h2>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8895A7" }}>See exactly where your capital is deployed</p>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
      <StatCard label="Active Trades" value={ACTIVE_TRADES.length} sub="Currently deployed" />
      <StatCard label="Capital Deployed" value={fmt(ACTIVE_TRADES.reduce((s,t) => s + t.amount, 0))} sub="In active escrows" accent="#7B1FA2" />
      <StatCard label="Completed Trades" value={VAULT_DATA.totalTradesCompleted} sub="Lifetime" />
      <StatCard label="Total Yield Earned" value={fmt(RECENT_RETURNS.reduce((s,t) => s + t.yield, 0))} sub="Recent returns" accent="#2E7D32" />
    </div>

    <h3 style={{ fontSize: 15, color: "#1B2A4A", fontWeight: 700, marginBottom: 14 }}>Active Deployments</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
      {ACTIVE_TRADES.map(t => (
        <div key={t.tradeId} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span>
                <Badge state={t.status} />
              </div>
              <div style={{ fontSize: 13, color: "#8895A7" }}>{t.commodity} \u2022 {t.region}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1B2A4A" }}>{fmtFull(t.amount)}</div>
              <div style={{ fontSize: 11, color: "#8895A7" }}>USDC deployed</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#8895A7", marginBottom: 12, flexWrap: "wrap" }}>
            <span><strong style={{ color: "#3D5A80" }}>Region:</strong> {t.region}</span>
            <span><strong style={{ color: "#3D5A80" }}>Inspection:</strong> {t.inspector}</span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              ["Tenor", `${t.tenor} days`],
              ["Day", t.daysActive > 0 ? `${t.daysActive} of ${t.tenor}` : "Pending"],
              ["Expires", t.expiresAt],
            ].map(([l, v]) => (
              <div key={l} style={{ flex: "1 1 100px", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#8895A7", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1B2A4A", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <h3 style={{ fontSize: 15, color: "#1B2A4A", fontWeight: 700, marginBottom: 14 }}>Completed Trades</h3>
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 20 }}>
      {RECENT_RETURNS.map((t, i) => (
        <div key={t.tradeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < RECENT_RETURNS.length - 1 ? "1px solid #f0f0f0" : "none", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{t.tradeId}</span>
              <span style={{ fontSize: 12, color: "#8895A7" }}>{t.commodity}</span>
            </div>
            <div style={{ fontSize: 12, color: "#8895A7", marginTop: 2 }}>{fmt(t.principal)} deployed \u2022 {t.cycleTime} days \u2022 {t.date}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>+{fmtFull(t.yield)}</div>
          </div>
        </div>
      ))}
    </div>
  </div>);
}

// ============================================================
// TRANSACTION HISTORY PAGE
// ============================================================
function HistoryPage({ wallet }) {
  const history = wallet ? TX_HISTORY : [];

  const totalDeposited = history.filter(t => t.type === "Deposit").reduce((s,t) => s + t.amount, 0);
  const totalWithdrawn = history.filter(t => t.type === "Withdrawal").reduce((s,t) => s + t.amount, 0);
  const totalYield = history.filter(t => t.type === "Yield").reduce((s,t) => s + t.amount, 0);

  return (<div>
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#1B2A4A", fontWeight: 700 }}>Transaction History</h2>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8895A7" }}>All vault deposits, withdrawals, and yield events</p>
    </div>

    {!wallet ? (
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "#8895A7", marginBottom: 8 }}>Connect your wallet to view transaction history</div>
      </div>
    ) : (<>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Deposited" value={fmtFull(totalDeposited)} sub={`${history.filter(t=>t.type==="Deposit").length} deposits`} accent="#1565C0" />
        <StatCard label="Total Withdrawn" value={fmtFull(totalWithdrawn)} sub={`${history.filter(t=>t.type==="Withdrawal").length} withdrawals`} accent="#E65100" />
        <StatCard label="Total Yield" value={`+${fmtFull(totalYield)}`} sub={`${history.filter(t=>t.type==="Yield").length} yield events`} accent="#2E7D32" />
        <StatCard label="Net Position" value={fmtFull(totalDeposited - totalWithdrawn + totalYield)} sub="Deposits - withdrawals + yield" />
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0" }}>
        {/* Header */}
        <div style={{ display: "flex", padding: "12px 20px", borderBottom: "1px solid #E8ECF0", background: "#F8FAFC", borderRadius: "10px 10px 0 0" }}>
          {["Date", "Type", "Amount", "Shares", "Details"].map(h => (
            <div key={h} style={{ flex: h === "Details" ? 2 : 1, fontSize: 11, fontWeight: 600, color: "#8895A7", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {[...history].reverse().map((tx, i) => (
          <div key={tx.id} style={{ display: "flex", padding: "14px 20px", borderBottom: i < history.length - 1 ? "1px solid #f5f5f5" : "none", alignItems: "center" }}>
            <div style={{ flex: 1, fontSize: 13, color: "#1B2A4A" }}>{tx.date}</div>
            <div style={{ flex: 1 }}><TxBadge type={tx.type} /></div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: tx.type === "Withdrawal" ? "#E65100" : tx.type === "Yield" ? "#2E7D32" : "#1B2A4A" }}>
              {tx.type === "Withdrawal" ? "-" : tx.type === "Yield" ? "+" : ""}{fmtFull(tx.amount)}
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "#8895A7", fontFamily: "monospace" }}>
              {tx.shares > 0 ? `${tx.type === "Withdrawal" ? "-" : "+"}${tx.shares.toLocaleString()}` : "\u2014"}
            </div>
            <div style={{ flex: 2, fontSize: 12, color: "#8895A7" }}>
              {tx.hash ? <span style={{ fontFamily: "monospace", color: "#2E75B6" }}>{tx.hash}</span> : tx.note || "\u2014"}
            </div>
          </div>
        ))}
      </div>
    </>)}
  </div>);
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("vault");
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const userShares = wallet ? 48500 : 0;
  const chain = chainId ? CHAINS[chainId] || { name: `Chain ${parseInt(chainId,16)}`, color: "#E0E0E0", testnet: false } : null;

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

  const switchToArbSepolia = async () => {
    if (!window.ethereum) return;
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARB_SEPOLIA_ID }] }); }
    catch (e) { if (e.code === 4902) { await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: ARB_SEPOLIA_ID, chainName: "Arbitrum Sepolia", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"], blockExplorerUrls: ["https://sepolia.arbiscan.io"] }] }); }}
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const ha = (a) => { if (a.length===0) disconnectWallet(); else setWallet(a[0]); };
    const hc = (c) => setChainId(c);
    window.ethereum.on("accountsChanged", ha); window.ethereum.on("chainChanged", hc);
    window.ethereum.request({ method: "eth_accounts" }).then(a => { if (a.length>0) { setWallet(a[0]); window.ethereum.request({ method: "eth_chainId" }).then(setChainId); }});
    return () => { window.ethereum.removeListener("accountsChanged", ha); window.ethereum.removeListener("chainChanged", hc); };
  }, []);

  const nav = [
    { id: "vault", label: "Vault", icon: "\u25A0" },
    { id: "trades", label: "Trades", icon: "\u21C4" },
    { id: "history", label: "History", icon: "\u2630" },
  ];

  const renderPage = () => {
    switch (page) {
      case "vault": return <VaultPage wallet={wallet} userShares={userShares} onConnect={connectWallet} />;
      case "trades": return <TradesPage />;
      case "history": return <HistoryPage wallet={wallet} />;
      default: return <VaultPage wallet={wallet} userShares={userShares} onConnect={connectWallet} />;
    }
  };

  return (<div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: "#F4F6F9" }}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

    {/* Sidebar — matching admin exactly */}
    <div style={{ width: 220, background: "#1B2A4A", padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.5, fontFamily: "'Georgia', serif" }}>Rheon.</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>Yield Vault</div>
      </div>

      <div style={{ marginTop: 16 }}>
        {nav.map(n => (
          <div key={n.id} onClick={() => setPage(n.id)} style={{
            padding: "12px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            background: page === n.id ? "rgba(255,255,255,0.1)" : "transparent",
            borderLeft: page === n.id ? "3px solid #64B5F6" : "3px solid transparent",
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 14, color: page === n.id ? "#fff" : "rgba(255,255,255,0.5)" }}>{n.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: page === n.id ? "#fff" : "rgba(255,255,255,0.5)" }}>{n.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {wallet ? (<>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>NETWORK</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: chain?.color || "#E0E0E0", display: "inline-block" }} />
            {chain?.name || "Unknown"}
          </div>
          {chainId !== ARB_SEPOLIA_ID && (
            <button onClick={switchToArbSepolia} style={{ marginTop: 6, padding: "4px 8px", fontSize: 10, background: "rgba(255,183,77,0.2)", color: "#FFB74D", border: "1px solid rgba(255,183,77,0.3)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>Switch to Arb Sepolia</button>
          )}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 10, letterSpacing: 0.5 }}>CONNECTED WALLET</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4, fontFamily: "monospace" }}>{shortAddr(wallet)}</div>
          <button onClick={disconnectWallet} style={{ marginTop: 8, padding: "6px 12px", fontSize: 11, background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>Disconnect</button>
        </>) : (
          <button onClick={connectWallet} disabled={connecting} style={{ width: "100%", padding: "10px 14px", background: connecting ? "rgba(255,255,255,0.05)" : "rgba(100,181,246,0.15)", color: connecting ? "rgba(255,255,255,0.4)" : "#64B5F6", border: "1px solid rgba(100,181,246,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: connecting ? "wait" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </div>

    {/* Main */}
    <div style={{ flex: 1, padding: 28, overflowY: "auto", maxHeight: "100vh" }}>{renderPage()}</div>
  </div>);
}
