<script lang="ts">
	// Revenue and burn specified directly per month so break-even is visually exact.
	// Sub revenue targets → members = subRev / (0.25 × 11) displayed for reference.
	// Break-even: Feb 2028 (index 21) — revenue bar equals/exceeds burn bar.

	type Row = {
		date: string;
		subRev: number;   // subscription revenue (base)
		eventRev: number; // event revenue spike
		burn: number;     // base burn (excl. event cost)
		eventCost: number;
		note: string;
	};

	const rows: Row[] = [
		// Phase 1 — Lean launch (normalized burn €7.2k: 2×€3k founders + €400 infra + €800 mkt)
		{ date: "May '26", subRev:   500, eventRev:    0, burn:  7200, eventCost:    0, note: "Launch"         },
		{ date: "Jun '26", subRev:   750, eventRev:    0, burn:  7200, eventCost:    0, note: ""               },
		{ date: "Jul '26", subRev:  1100, eventRev:    0, burn:  7200, eventCost:    0, note: ""               },
		{ date: "Aug '26", subRev:  1500, eventRev:    0, burn:  7200, eventCost:    0, note: ""               },
		{ date: "Sep '26", subRev:  2000, eventRev:    0, burn:  7200, eventCost:    0, note: "\u20ac400k raise"},
		// Phase 2 — Marketing experiments (smooth slope €8k → €11k, no hire yet)
		{ date: "Oct '26", subRev:  2300, eventRev:    0, burn:  8000, eventCost:    0, note: ""               },
		{ date: "Nov '26", subRev:  2750, eventRev:    0, burn:  8800, eventCost:    0, note: ""               },
		{ date: "Dec '26", subRev:  3500, eventRev:    0, burn:  9600, eventCost:    0, note: ""               },
		{ date: "Jan '27", subRev:  6000, eventRev:    0, burn: 10200, eventCost:    0, note: "Growth accel."  },
		{ date: "Feb '27", subRev:  7500, eventRev:    0, burn: 10800, eventCost:    0, note: ""               },
		{ date: "Mar '27", subRev:  9000, eventRev:    0, burn: 11000, eventCost:    0, note: ""               },
		// Phase 3 — Hire ramps in over 3 months (part-month → full cost by Jun)
		{ date: "Apr '27", subRev: 10500, eventRev:    0, burn: 12500, eventCost:    0, note: "First hire"     },
		{ date: "May '27", subRev: 12000, eventRev:    0, burn: 14500, eventCost:    0, note: ""               },
		{ date: "Jun '27", subRev: 13500, eventRev:    0, burn: 16500, eventCost:    0, note: ""               },
		{ date: "Jul '27", subRev: 14500, eventRev:    0, burn: 18000, eventCost:    0, note: ""               },
		{ date: "Aug '27", subRev: 15000, eventRev:    0, burn: 18500, eventCost:    0, note: ""               },
		{ date: "Sep '27", subRev: 15500, eventRev:    0, burn: 19000, eventCost:    0, note: ""               },
		{ date: "Oct '27", subRev: 15800, eventRev: 2500, burn: 19000, eventCost: 1250, note: "Event 1"        },
		{ date: "Nov '27", subRev: 15800, eventRev:    0, burn: 18500, eventCost:    0, note: ""               },
		{ date: "Dec '27", subRev: 15900, eventRev: 2500, burn: 18500, eventCost: 1250, note: "Event 2"        },
		{ date: "Jan '28", subRev: 16000, eventRev:    0, burn: 18000, eventCost:    0, note: ""               },
		// Break-even: Feb 2028 — rev=18750 exactly equals burn=18750
		{ date: "Feb '28", subRev: 16250, eventRev: 2500, burn: 17500, eventCost: 1250, note: "Break-even"     },
		{ date: "Mar '28", subRev: 18500, eventRev:    0, burn: 18000, eventCost:    0, note: ""               },
		{ date: "Apr '28", subRev: 19500, eventRev:    0, burn: 18000, eventCost:    0, note: ""               },
	];

	const data = rows.map(r => ({
		...r,
		revenue:   r.subRev + r.eventRev,
		totalBurn: r.burn   + r.eventCost,
	}));

	// Chart geometry
	const yTicks   = [0, 5000, 10000, 15000, 20000, 25000];
	const maxVal   = 25000;
	const chartH   = 320;
	const topPad   = 32;
	const leftPad  = 50;
	const rightPad = 16;
	const barW     = 13;
	const barGap   = 3;
	const groupGap = 9;
	const groupW   = barW * 2 + barGap + groupGap;
	const totalW   = leftPad + data.length * groupW + rightPad;
	const totalH   = topPad + chartH + 56;

	function sy(v: number) { return topPad + chartH - (v / maxVal) * chartH; }
	function fmt(n: number) { return '\u20ac' + (n / 1000).toFixed(0) + 'k'; }

	function download() {
		const svg = document.querySelector('.chart') as SVGSVGElement;
		const xml = new XMLSerializer().serializeToString(svg);
		const scale = 3;
		const canvas = document.createElement('canvas');
		canvas.width  = svg.viewBox.baseVal.width  * scale;
		canvas.height = svg.viewBox.baseVal.height * scale;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			const a = document.createElement('a');
			a.download = 'dyad-projections.png';
			a.href = canvas.toDataURL('image/png');
			a.click();
		};
		img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
	}

	// Annotation x positions
	const fundraiseX = leftPad + 4 * groupW + barW;  // Sep '26 (index 4)
	const accelX     = leftPad + 8 * groupW + barW;  // Jan '27 (index 8)
	const beX        = leftPad + 21 * groupW + barW; // Feb '28 (index 21)
</script>

<svelte:head><title>Dyad — Financial Projections 2026–2028</title></svelte:head>

<div class="page">
	<svg width={totalW} height={totalH} viewBox="0 0 {totalW} {totalH}" class="chart">

		<!-- Grid + Y-axis labels -->
		{#each yTicks as tick}
			{@const y = sy(tick)}
			<line x1={leftPad} x2={totalW - rightPad} y1={y} y2={y}
				stroke={tick === 0 ? '#bbb' : '#e4e0dc'} stroke-width="1" />
			<text x={leftPad - 8} y={y + 4} text-anchor="end"
				font-size="11" fill="#aaa" font-family="'SangBleu Sunrise', serif"
			>{fmt(tick)}</text>
		{/each}

		<!-- Bars -->
		{#each data as d, i}
			{@const gx    = leftPad + i * groupW}
			{@const burnH = (d.totalBurn / maxVal) * chartH}
			{@const revH  = (d.revenue   / maxVal) * chartH}

			<rect x={gx}              y={sy(d.totalBurn)} width={barW} height={burnH} fill="#ccc9c5" />
			<rect x={gx + barW + barGap} y={sy(d.revenue)}   width={barW} height={revH}  fill="#1a1a1a" />

			<!-- X label every 2 months -->
			{#if i % 2 === 0}
				<text x={gx + barW} y={topPad + chartH + 20} text-anchor="middle"
					font-size="10" fill="#aaa" font-family="'SangBleu Sunrise', serif"
				>{d.date}</text>
			{/if}
		{/each}

		<!-- Annotation: Fundraise Sep 2026 -->
		<line x1={fundraiseX} x2={fundraiseX} y1={4} y2={chartH}
			stroke="#999" stroke-width="1" stroke-dasharray="3 3" />
		<text x={fundraiseX + 5} y={16} font-size="9.5" fill="#888"
			font-family="'SangBleu Sunrise', serif">Fundraise</text>
		<text x={fundraiseX + 5} y={28} font-size="9.5" fill="#888"
			font-family="'SangBleu Sunrise', serif">Sep 2026</text>

		<!-- Annotation: Fundraise impact Jan 2027 -->
		<line x1={accelX} x2={accelX} y1={4} y2={chartH}
			stroke="#999" stroke-width="1" stroke-dasharray="3 3" />
		<text x={accelX + 5} y={16} font-size="9.5" fill="#888"
			font-family="'SangBleu Sunrise', serif">Fundraise impact</text>
		<text x={accelX + 5} y={28} font-size="9.5" fill="#888"
			font-family="'SangBleu Sunrise', serif">Jan 2027</text>

		<!-- Annotation: Break-even Feb 2028 -->
		<line x1={beX} x2={beX} y1={4} y2={chartH}
			stroke="#888" stroke-width="1" stroke-dasharray="4 3" />
		<text x={beX + 5} y={16} font-size="9.5" fill="#888"
			font-family="'SangBleu Sunrise', serif">Break-even</text>

	</svg>

	<div class="legend">
		<span class="dot burn"></span>Burn
		<span class="dot revenue"></span>Revenue
	</div>
	<button class="dl" onclick={download}>Download PNG</button>
</div>

<style>
	.page {
		background: #ffffff;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 40px;
		font-family: 'SangBleu Sunrise', serif;
	}

	.chart { display: block; max-width: 100%; overflow: visible; }

	.legend {
		display: flex;
		align-items: center;
		gap: 24px;
		margin-top: 18px;
		font-size: 12px;
		color: #666;
		font-family: 'SangBleu Sunrise', serif;
	}

	.dot {
		display: inline-block;
		width: 13px; height: 13px;
		border-radius: 50%;
		margin-right: 5px;
		vertical-align: middle;
	}
	.dot.burn    { background: #ccc9c5; }
	.dot.revenue { background: #1a1a1a; }

	.dl {
		margin-top: 20px;
		padding: 8px 20px;
		font-family: 'SangBleu Sunrise', serif;
		font-size: 12px;
		background: #1a1a1a;
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		letter-spacing: 0.04em;
	}
	.dl:hover { background: #333; }
</style>
