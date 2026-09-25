from pathlib import Path
import csv
import matplotlib.pyplot as plt

ROOT = Path("/home/ubuntu/agentpay-mobile-app-restored")
DATA = ROOT / "reports" / "agentpay_sicuro_module_status.csv"
OUTPUT = ROOT / "reports" / "agentpay_sicuro_conformita_sicurezza.png"

with DATA.open(newline="", encoding="utf-8") as source:
    rows = list(csv.DictReader(source))

labels = [row["categoria"] for row in rows]
counts = [int(row["moduli"]) for row in rows]
percentages = [int(row["percentuale"]) for row in rows]
colors = ["#22C55E", "#F59E0B", "#EF4444"]

plt.style.use("seaborn-v0_8-whitegrid")
plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.titleweight"] = "bold"
plt.rcParams["figure.dpi"] = 160

fig, ax = plt.subplots(figsize=(11, 6.4))
fig.patch.set_facecolor("#FFFFFF")
ax.set_facecolor("#FFFFFF")

bars = ax.barh(labels, counts, color=colors, height=0.58)
ax.invert_yaxis()
ax.set_xlim(0, 25)
ax.set_xlabel("Numero di moduli valutati")
ax.set_title("AgentPay-Sicuro — conformità e sicurezza dei 25 moduli esclusivi", loc="left", pad=18, fontsize=16)
ax.text(
    0,
    1.01,
    "Classificazione dell’audit statico: 22 moduli read-only idonei, 1 da adattare, 2 da escludere.",
    transform=ax.transAxes,
    fontsize=10.5,
    color="#687076",
)

for bar, count, percentage in zip(bars, counts, percentages):
    ax.text(
        count + 0.4,
        bar.get_y() + bar.get_height() / 2,
        f"{count} moduli  ·  {percentage}%",
        va="center",
        ha="left",
        fontsize=11,
        fontweight="bold",
        color="#11181C",
    )

ax.spines[["top", "right", "left"]].set_visible(False)
ax.tick_params(axis="y", length=0, labelsize=11)
ax.tick_params(axis="x", colors="#687076")
ax.grid(axis="x", color="#E5E7EB", linewidth=0.8)
ax.grid(axis="y", visible=False)

fig.text(
    0.125,
    0.025,
    "Rilievo separato: 2 indicatori potenzialmente sensibili nel candidato devono essere trattati come segreti da ruotare; non sono inclusi nel conteggio dei 25 moduli.",
    fontsize=9.5,
    color="#687076",
)
fig.tight_layout(rect=(0, 0.07, 1, 1))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUTPUT, bbox_inches="tight", facecolor=fig.get_facecolor())
print(OUTPUT)
