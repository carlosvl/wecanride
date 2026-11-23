#!/usr/bin/env python3
"""Export community login license charts as PNGs plus a printable HTML report."""

from __future__ import annotations

import base64
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "community-licenses"
CHARTS = OUT / "charts"

MONTHS = ["Feb 26–28", "Mar", "Apr", "May", "Jun", "Jul", "Aug 1–26"]
CLIENT_ONLY = [6, 9, 11, 8, 7, 13, 11]
VOLUNTEER_ONLY = [6, 23, 13, 22, 45, 24, 61]
BOTH = [0, 3, 4, 3, 1, 2, 0]
NEITHER = [3, 9, 18, 12, 12, 11, 35]
PROSPECT = [1, 2, 4, 2, 6, 5, 19]
UNFLAGGED = [2, 7, 14, 10, 6, 6, 16]
ALL_UNIQUE = [15, 44, 46, 45, 65, 50, 107]
NO_VOL = [9, 21, 33, 23, 20, 26, 46]

COLORS = {
    "client": "#2563EB",
    "volunteer": "#059669",
    "both": "#D97706",
    "neither": "#6B7280",
    "prospect": "#7C3AED",
    "unflagged": "#9CA3AF",
    "all": "#1D4ED8",
    "novol": "#047857",
    "line80": "#B45309",
    "line160": "#1D4ED8",
}

CAPTION = "Unique people per calendar month · WCR production LoginHistory · 26 Feb 2026 – 26 Aug 2026"


def style_axes(ax, ylabel: str) -> None:
    ax.set_ylabel(ylabel)
    ax.set_xlabel("Month")
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", linestyle="-", linewidth=0.6, color="#E5E7EB")
    ax.set_axisbelow(True)
    ax.tick_params(colors="#374151")


def save(fig, name: str) -> Path:
    path = CHARTS / name
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def chart_all_roles() -> Path:
    fig, ax = plt.subplots(figsize=(10.5, 5.2))
    x = range(len(MONTHS))
    stacks = [
        ("Client only", CLIENT_ONLY, COLORS["client"]),
        ("Volunteer only", VOLUNTEER_ONLY, COLORS["volunteer"]),
        ("Client and volunteer", BOTH, COLORS["both"]),
        ("Neither flag", NEITHER, COLORS["neither"]),
    ]
    bottom = [0] * len(MONTHS)
    for label, values, color in stacks:
        ax.bar(x, values, bottom=bottom, label=label, color=color, width=0.72)
        bottom = [b + v for b, v in zip(bottom, values)]
    ax.axhline(80, color=COLORS["line80"], linestyle="--", linewidth=1.2, label="80 CCP owned")
    ax.axhline(160, color=COLORS["line160"], linestyle="--", linewidth=1.2, label="160 if volunteers stay")
    ax.set_xticks(list(x), MONTHS)
    ax.set_title("Unique community logins by month and Contact role")
    style_axes(ax, "Unique people")
    ax.legend(frameon=False, ncol=3, loc="upper left")
    fig.text(0.01, -0.02, CAPTION, fontsize=8, color="#6B7280")
    return save(fig, "unique-logins-by-role.png")


def chart_all_vs_no_vol() -> Path:
    fig, ax = plt.subplots(figsize=(10.5, 5.2))
    x = list(range(len(MONTHS)))
    ax.plot(x, ALL_UNIQUE, marker="o", color=COLORS["all"], linewidth=2.2, label="All unique community logins")
    ax.plot(x, NO_VOL, marker="o", color=COLORS["novol"], linewidth=2.2, label="Without volunteer-only logins")
    ax.fill_between(x, ALL_UNIQUE, alpha=0.08, color=COLORS["all"])
    ax.fill_between(x, NO_VOL, alpha=0.10, color=COLORS["novol"])
    ax.axhline(80, color=COLORS["line80"], linestyle="--", linewidth=1.2, label="80 CCP if volunteers stop")
    ax.axhline(160, color=COLORS["line160"], linestyle="--", linewidth=1.2, label="160 CCP if volunteers stay")
    for i, (a, b) in enumerate(zip(ALL_UNIQUE, NO_VOL)):
        ax.annotate(str(a), (i, a), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=8, color=COLORS["all"])
        ax.annotate(str(b), (i, b), textcoords="offset points", xytext=(0, -12), ha="center", fontsize=8, color=COLORS["novol"])
    ax.set_xticks(x, MONTHS)
    ax.set_ylim(0, 180)
    ax.set_title("All unique logins vs logins if volunteers stop")
    style_axes(ax, "Unique people")
    ax.legend(frameon=False, loc="upper left")
    fig.text(0.01, -0.02, CAPTION, fontsize=8, color="#6B7280")
    return save(fig, "all-vs-no-volunteers.png")


def chart_no_volunteers() -> Path:
    fig, ax = plt.subplots(figsize=(10.5, 5.2))
    x = range(len(MONTHS))
    stacks = [
        ("Client only", CLIENT_ONLY, COLORS["client"]),
        ("Client and volunteer", BOTH, COLORS["both"]),
        ("Prospect only", PROSPECT, COLORS["prospect"]),
        ("Unflagged", UNFLAGGED, COLORS["unflagged"]),
    ]
    bottom = [0] * len(MONTHS)
    for label, values, color in stacks:
        ax.bar(x, values, bottom=bottom, label=label, color=color, width=0.72)
        bottom = [b + v for b, v in zip(bottom, values)]
    ax.axhline(80, color=COLORS["line80"], linestyle="--", linewidth=1.2, label="80 CCP already owned")
    ax.set_xticks(list(x), MONTHS)
    ax.set_title("Unique logins remaining if volunteer-only users stop signing in")
    style_axes(ax, "Unique people")
    ax.legend(frameon=False, ncol=3, loc="upper left")
    fig.text(0.01, -0.02, CAPTION + " · peak remaining 46 in August", fontsize=8, color="#6B7280")
    return save(fig, "no-volunteer-remaining.png")


def chart_role_mix() -> Path:
    labels = [
        "Volunteer only",
        "Client only",
        "Client and volunteer",
        "Prospect only",
        "Unflagged or unmatched",
    ]
    values = [146, 45, 6, 36, 52]
    colors = [
        COLORS["volunteer"],
        COLORS["client"],
        COLORS["both"],
        COLORS["prospect"],
        COLORS["unflagged"],
    ]
    fig, ax = plt.subplots(figsize=(10.5, 4.4))
    bars = ax.barh(labels[::-1], values[::-1], color=colors[::-1], height=0.62)
    ax.bar_label(bars, padding=4, fontsize=9)
    ax.set_xlabel("Distinct people who logged in (6 months)")
    ax.set_title("Who logged in over six months (285 unique people)")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="x", linestyle="-", linewidth=0.6, color="#E5E7EB")
    ax.set_axisbelow(True)
    fig.text(0.01, -0.04, "Deactivated users included · names omitted", fontsize=8, color="#6B7280")
    return save(fig, "six-month-role-mix.png")


def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def write_html(images: dict[str, Path]) -> Path:
    imgs = {k: b64(v) for k, v in images.items()}
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>We Can Ride — Community login license estimate</title>
  <style>
    :root {{
      --ink: #111827;
      --muted: #4B5563;
      --line: #E5E7EB;
      --bg: #F9FAFB;
      --blue: #1D4ED8;
      --green: #047857;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0 auto;
      max-width: 900px;
      padding: 40px 28px 64px;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.45;
    }}
    h1 {{ font-size: 26px; margin: 0 0 8px; }}
    h2 {{ font-size: 18px; margin: 36px 0 10px; }}
    p, li {{ color: var(--muted); }}
    .lede {{ font-size: 15px; margin-bottom: 24px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 28px; }}
    .card {{
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px 18px;
      background: var(--bg);
    }}
    .card strong {{ display: block; font-size: 28px; color: var(--ink); margin: 4px 0 2px; }}
    .card.green strong {{ color: var(--green); }}
    .card.blue strong {{ color: var(--blue); }}
    .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 12px 0 8px;
    }}
    th, td {{
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
    }}
    th {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); }}
    td.num, th.num {{ text-align: right; }}
    img {{ width: 100%; height: auto; margin: 8px 0 4px; }}
    .caption {{ font-size: 11px; color: #6B7280; margin: 0 0 20px; }}
    .note {{
      border-left: 3px solid #D97706;
      padding: 8px 14px;
      background: #FFFBEB;
      color: #78350F;
      font-size: 13px;
    }}
    @media print {{
      body {{ padding: 12px; }}
      .card {{ break-inside: avoid; }}
      img {{ break-inside: avoid; }}
    }}
  </style>
</head>
<body>
  <h1>We Can Ride — Community login licenses</h1>
  <p class="lede">
    Unique Experience Cloud logins from 26 February 2026 through 26 August 2026.
    These are unique people per calendar month, not every sign-in. Names omitted.
    Deactivated users are included.
  </p>

  <div class="grid">
    <div class="card blue">
      <div class="label">If volunteers keep logging in</div>
      <strong>160 CCP Login</strong>
      Peak 107 unique people in August (month still open).
    </div>
    <div class="card green">
      <div class="label">If volunteers stop logging in</div>
      <strong>80 CCP Login</strong>
      Peak falls to 46. You already own 80 — no extra purchase.
    </div>
  </div>

  <h2>Unique community logins by month</h2>
  <p>Login-based licenses count each person once per month. February is three days; August is through the 26th.</p>
  <img src="data:image/png;base64,{imgs['all_roles']}" alt="Stacked bars of unique community logins by Contact role" />
  <p class="caption">Dashed lines are Customer Community Plus Login pool sizes (80 owned today, 160 recommended if volunteers stay).</p>

  <h2>All logins vs logins if volunteers stop</h2>
  <img src="data:image/png;base64,{imgs['compare']}" alt="Line chart comparing all unique logins to logins without volunteers" />
  <p class="caption">Green series removes Volunteer-only contacts. Dual-flagged clients still count.</p>

  <h2>If volunteers stop logging in</h2>
  <p>
    Volunteer-only contacts were 146 of 285 distinct people (51%) and 61 of August’s 107 unique logins.
    Remaining peak is 46 unique people. That leftover mix is mostly prospects and unflagged contacts, not clients.
  </p>
  <img src="data:image/png;base64,{imgs['novol']}" alt="Stacked bars of unique logins remaining without volunteer-only users" />
  <p class="caption">August remaining 46 = 11 clients, 19 prospects, 16 unflagged.</p>

  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th class="num">All unique</th>
        <th class="num">Without volunteer-only</th>
        <th class="num">Client only</th>
        <th class="num">Prospect</th>
        <th class="num">Unflagged</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Feb 26–28 (partial)</td><td class="num">15</td><td class="num">9</td><td class="num">6</td><td class="num">1</td><td class="num">2</td></tr>
      <tr><td>March</td><td class="num">44</td><td class="num">21</td><td class="num">9</td><td class="num">2</td><td class="num">7</td></tr>
      <tr><td>April</td><td class="num">46</td><td class="num">33</td><td class="num">11</td><td class="num">4</td><td class="num">14</td></tr>
      <tr><td>May</td><td class="num">45</td><td class="num">23</td><td class="num">8</td><td class="num">2</td><td class="num">10</td></tr>
      <tr><td>June</td><td class="num">65</td><td class="num">20</td><td class="num">7</td><td class="num">6</td><td class="num">6</td></tr>
      <tr><td>July</td><td class="num">50</td><td class="num">26</td><td class="num">13</td><td class="num">5</td><td class="num">6</td></tr>
      <tr><td>August 1–26 (MTD)</td><td class="num">107</td><td class="num">46</td><td class="num">11</td><td class="num">19</td><td class="num">16</td></tr>
    </tbody>
  </table>

  <h2>Who logged in over six months</h2>
  <img src="data:image/png;base64,{imgs['mix']}" alt="Horizontal bar chart of 285 unique people by Contact role" />
  <p class="caption">150 still active, 135 now deactivated. 285 is a six-month headcount, not a monthly license count.</p>

  <h2>What you own vs what you use</h2>
  <table>
    <thead>
      <tr>
        <th>License</th>
        <th class="num">Purchased</th>
        <th class="num">Assigned active users</th>
        <th class="num">Unique logins this month</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Partner Community Login</td><td class="num">500</td><td class="num">423</td><td class="num">104</td></tr>
      <tr><td>Customer Community Plus Login</td><td class="num">80</td><td class="num">61</td><td class="num">14</td></tr>
    </tbody>
  </table>
  <p class="caption">Buy against unique monthly logins, not assigned users. 330 active Partner users have never logged in.</p>

  <h2>What to tell Salesforce</h2>
  <table>
    <thead>
      <tr><th>Option</th><th>Licenses</th><th>Why</th></tr>
    </thead>
    <tbody>
      <tr><td>Volunteers stay</td><td>160 CCP Login</td><td>Peak 107 + buffer. Replaces 500 Partner + 80 CCP.</td></tr>
      <tr><td>Volunteers stop</td><td>80 CCP Login</td><td>Peak 46. Same 80 already owned.</td></tr>
      <tr><td>Floor if volunteers stay</td><td>120 CCP Login</td><td>Covers August MTD with little room.</td></tr>
      <tr><td>Floor if volunteers stop</td><td>60 CCP Login</td><td>Three packs of 20 over a peak of 46.</td></tr>
    </tbody>
  </table>

  <p class="note">
    Login history only goes back about six months, so fall 2025 paperwork is not in this window.
    August is not a complete month. Do not buy 285, 484, or 1,181 — those are people who exist,
    not unique logins in one month.
  </p>
</body>
</html>
"""
    path = OUT / "community-login-license-estimate.html"
    path.write_text(html, encoding="utf-8")
    return path


def main() -> None:
    CHARTS.mkdir(parents=True, exist_ok=True)
    images = {
        "all_roles": chart_all_roles(),
        "compare": chart_all_vs_no_vol(),
        "novol": chart_no_volunteers(),
        "mix": chart_role_mix(),
    }
    html = write_html(images)
    print(f"charts: {CHARTS}")
    print(f"html: {html}")
    for p in images.values():
        print(f"  {p.name}")


if __name__ == "__main__":
    main()
