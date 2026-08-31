#!/usr/bin/env python3
"""Sync synqulan-audit.html feature tables + summary strip from SYNQULAN_JUNE26_SPEC_STATUS.md."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec_path = ROOT / "docs/SYNQULAN_JUNE26_SPEC_STATUS.md"
html_path = ROOT / "synqulan-audit.html"

spec = spec_path.read_text()
block = re.search(r"## 1\. Cap System.*?## 8\. Screen-by-screen", spec, re.S).group(0)

sections: list[dict] = []
current: dict | None = None
for line in block.splitlines():
    if line.startswith("## "):
        if current:
            sections.append(current)
        current = {"title": line, "rows": []}
    elif current and line.startswith("|"):
        parts = re.split(r"(?<!\\)\|", line)
        if len(parts) >= 5:
            cell = parts[1].strip()
            if "`[x]`" in cell:
                status = "x"
            elif "`[~]`" in cell:
                status = "~"
            elif "`[ ]`" in cell:
                status = " "
            else:
                continue
            current["rows"].append(
                {
                    "status": status,
                    "feature": parts[2].strip(),
                    "requirement": parts[3].strip(),
                    "backend": parts[4].strip().rstrip("|").strip(),
                }
            )
if current:
    sections.append(current)

feature_labels = {
    "Five-level ladder": "Five-level ladder",
    "Top-tier rename (Sky Blue)": "Top-tier rename",
    "Green → Yellow → Red (score-driven)": "Green&rarr;Yellow&rarr;Red: algorithmic",
    "Red → Black: hours + admin gate": "Red&rarr;Black: hours + admin gate",
    "Sky Blue: invitation-only, dual verification": "Sky Blue: invitation-only, dual verification",
    "Revenue % hidden, configurable": "Revenue % hidden, configurable",
    "Illustrated cap: style & placement": "Illustrated cap: style &amp; placement",
    "Volunteer / mentor opt-in flag": "Volunteer/mentor opt-in flag",
    "Opportunities / projects": "Opportunities / projects",
    "Hours bank & carry forward": "Hours bank &amp; carry forward",
    'Contribution types + "Other"': "Contribution types + &ldquo;Other&rdquo;",
    "In-platform mentorship call (highest trust)": "In-platform mentorship call (highest trust)",
    "Partner-verified (NGO)": "Partner-verified (NGO)",
    "Counterparty confirmation": "Counterparty confirmation",
    "Self-reported + endorsement gate": "Self-reported + endorsement gate",
    "Admin review at Black threshold": "Admin review at Black threshold",
    "Follow (one-way)": "Follow (one-way)",
    "Connect (mutual)": "Connect (mutual)",
    "Messaging gated by mutual Connect": "Messaging gated by mutual Connect",
    "General vs Mentorship chat": "General vs. Mentorship chat",
    "Verified session call vs General call": "Verified session call vs. General call",
    "Advertising revenue-share": "Advertising revenue-share",
    "Recruitment / talent-sourcing": "Recruitment / talent-sourcing",
    "Corporate / CSR subscriptions": "Corporate / CSR subscriptions",
    "Training & course marketplace": "Training &amp; course marketplace",
    "Sponsored opportunities & projects": "Sponsored opportunities &amp; projects",
    "Bridge gig transaction fee": "Bridge gig transaction fee",
    "Anonymised impact-data insights": "Anonymised impact-data insights",
    "Projects seeking help": "Projects seeking help",
    "Members listing expertise": "Members listing their own expertise",
    "Paid gigs": "Paid gigs",
    "Reputation-passport profile": "Reputation-passport profile",
    "Personal dashboard": "Personal dashboard",
    "Recognition leaderboard": "Recognition leaderboard",
    "Explore as a guest": "Explore as a guest",
    "Landing pages (individual / business)": "Landing pages (individual / business)",
}

pill = {"x": ("yes", "Implemented"), "~": ("part", "Partial"), " ": ("no", "Missing")}


def md_to_html(text: str) -> str:
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return text.replace("→", "&rarr;").replace("—", "&mdash;")


def render_tbody(rows: list[dict]) -> str:
    lines = ["        <tbody>"]
    for row in rows:
        label = feature_labels.get(row["feature"], row["feature"])
        kind, status_label = pill[row["status"]]
        req = md_to_html(row["requirement"])
        backend = md_to_html(row["backend"])
        lines.extend(
            [
                "          <tr>",
                f'            <td class="feature">{label}</td>',
                f"            <td>{req}</td>",
                f"            <td>{backend}</td>",
                f'            <td class="status"><span class="pill pill--{kind}">{status_label}</span></td>',
                "          </tr>",
            ]
        )
    lines.append("        </tbody>")
    return "\n".join(lines)


all_rows = [r for s in sections for r in s["rows"]]
yes = sum(1 for r in all_rows if r["status"] == "x")
part = sum(1 for r in all_rows if r["status"] == "~")
no = sum(1 for r in all_rows if r["status"] == " ")

html = html_path.read_text()
tbodies = list(re.finditer(r"<tbody>.*?</tbody>", html, re.S))
new_tbodies = [render_tbody(s["rows"]) for s in sections[:7]]

parts: list[str] = []
last = 0
for i, m in enumerate(tbodies[:7]):
    parts.append(html[last : m.start()])
    parts.append(new_tbodies[i])
    last = m.end()
parts.append(html[last:])
html = "".join(parts)

html = re.sub(r"(<div class=\"stat-cell green\"><span class=\"n\">)\d+", rf"\g<1>{yes}", html)
html = re.sub(r"(<div class=\"stat-cell yellow\"><span class=\"n\">)\d+", rf"\g<1>{part}", html)
html = re.sub(r"(<div class=\"stat-cell red\"><span class=\"n\">)\d+", rf"\g<1>{no}", html)
html = re.sub(r"(<div class=\"stat-cell sky\"><span class=\"n\">)\d+", r"\g<1>0", html)

sync_note = (
    '    <p class="callout" style="margin-top:1rem;"><b>Synced 2026-08-23</b> &mdash; Summary counts and feature statuses match '
    "<code>docs/SYNQULAN_JUNE26_SPEC_STATUS.md</code> (sections 1&ndash;7, 36 features). Prefer that document as source of truth.</p>\n"
)
if "Synced 2026-08-23" not in html:
    html = html.replace(
        "    </div>\n  </div>\n\n  <div class=\"wrap\">\n    <section class=\"section\">\n      <div class=\"sec-head\"><span class=\"sec-num display\">1</span>",
        "    </div>\n" + sync_note + "  </div>\n\n  <div class=\"wrap\">\n    <section class=\"section\">\n      <div class=\"sec-head\"><span class=\"sec-num display\">1</span>",
    )

html = re.sub(
    r"Compiled from a direct read.*?</footer>",
    "Synced with <code>docs/SYNQULAN_JUNE26_SPEC_STATUS.md</code> on 2026-08-23. Feature table statuses and summary strip reflect sections 1&ndash;7 of that document.</footer>",
    html,
    flags=re.S,
)

html_path.write_text(html)
print(f"Synced audit HTML: {yes} implemented, {part} partial, {no} missing (36 total)")
