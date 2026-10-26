// Cloud build only: sign in, loading, and "can't reach the database" screens shown before the app.
import { useState } from "react";
import { ui } from "../store";
import { retryCloud, signIn, signOut } from "../sync";
import shield from "../assets/shield-white.png";

export function CloudGate() {
  return <div className="gate"><div className="card">
    <h1><img src={shield} alt="" /><span>CyberSafely<small>Lead Manager</small></span></h1>
    {ui.cloud === "signin" ? <SignInForm /> : ui.cloud === "error" ? <>
      <p className="over">{ui.cloudErr}</p>
      <div className="row"><button className="b p" onClick={retryCloud}>Try again</button><button className="b" onClick={signOut}>Sign out</button></div>
    </> : <p className="muted">Loading your team's leads…</p>}
  </div></div>;
}

function SignInForm() {
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  return <form onSubmit={async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    setBusy(true); setErr(await signIn(String(f.get("email")).trim(), String(f.get("password")))); setBusy(false);
  }}>
    <label>Email</label><input name="email" type="email" autoComplete="username" required autoFocus />
    <label>Password</label><input name="password" type="password" autoComplete="current-password" required />
    {err ? <p className="over small">{err}</p> : null}
    <button className="b p" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="small muted">Accounts are invite-only. Ask the admin for access.</p>
  </form>;
}
