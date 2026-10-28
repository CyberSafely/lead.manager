// Shown instead of a view when the selected list has no records yet.
import { setView, ui } from "../store";
import { newLead } from "../actions";

export function Empty() {
  const ds = ui.ds;
  const [title, body, imp, add] =
    ds === "affiliate" ? ["No affiliates yet", <>Import a list of social media accounts in <b>Data</b> while <b>Affiliates</b> is selected at the top. Columns: <code>Name</code> <code>Username</code> <code>Platform</code> <code>Follower Count</code> <code>Link</code>.</>, "Import affiliates", "Add an affiliate"]
    : ds === "user" ? ["No users yet", <>Import your app users in <b>Data</b> while <b>Users</b> is selected at the top. Columns: <code>Name</code> and <code>Email</code>. Clean the export first with <code>scripts/clean-users.py</code>.</>, "Import users", "Add a user"]
    : ds === "pta" ? ["No PTA contacts yet", <>Import your PTA list in <b>Data</b> while <b>PTA</b> is selected at the top. Columns: <code>Name</code> and <code>Email</code>. A title line above the header (like "PTA DATASET") is skipped.</>, "Import PTA contacts", "Add a PTA contact"]
    : ds === "campaign" ? ["No campaign contacts yet", <>Export the people who opened or clicked a newsletter from HubSpot as CSV, then import them in <b>Data</b> with a campaign name (e.g. "Sept 2026 newsletter"). Name and email are enough.</>, "Import a newsletter list", "Add a contact"]
    : ds === "cto" ? ["No CTOs yet", <>Import your district technology leaders CSV in <b>Data</b> while <b>CTOs</b> is selected at the top. Same columns as overseers: District ID, District, First Name, Last Name, Email, Phone Number, Job Title.</>, "Import CTOs", "Add a CTO"]
    : ds === "overseer" ? ["No overseers yet", <>Import your district overseers CSV in <b>Data</b> while <b>Overseers</b> is selected at the top. Columns: District ID, District, First Name, Last Name, Email, Phone Number, Job Title.</>, "Import overseers", "Add an overseer"]
    : ["No schools yet", <>Export your Missouri principals from HubSpot as CSV, then import them in <b>Data</b>. You can also add one by hand.</>, "Import from HubSpot", "Add a school"];
  return <div className="card"><h2 style={{ marginTop: 0 }}>{title}</h2>
    <p>{body}</p>
    <div className="row"><button className="b p" onClick={() => setView("data")}>{imp}</button><button className="b" onClick={newLead}>{add}</button></div></div>;
}
