import { highlightRegion, resetHighlight } from "./linkedHighlight.js";

const d3 = window["d3"];

export function drawChart1(data) {
  const container = d3.select("#chart-container-1");
  container.html("");

  const tooltip = d3.select("#custom-tooltip");
  const width = container.node().clientWidth || 900;
  const height = container.node().clientHeight || 520;
  const margin = { top: 34, right: 230, bottom: 76, left: 66 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const rows = data.filter(function (row) {
    return (
      row.date instanceof Date &&
      !Number.isNaN(row.date.getTime()) &&
      row["location.region"] &&
      Number.isFinite(Number(row["day.avgtemp_c"]))
    );
  });

  const series = d3.rollups(
    rows,
    values => d3.mean(values, d => Number(d["day.avgtemp_c"])),
    d => d["location.region"],
    d => +d3.timeMonth.floor(d.date)
  )
    .map(([region, months]) => ({
      region,
      values: months
        .map(([month, avgTemp]) => ({ date: new Date(month), avgTemp }))
        .sort((a, b) => d3.ascending(a.date, b.date))
    }))
    .sort((a, b) => d3.ascending(a.region, b.region));

  const points = series.flatMap(d => d.values);
  const regions = series.map(d => d.region);
  const hiddenRegions = new Set();
  const formatMonth = d3.timeFormat("%B %Y");
  const formatTemp = d3.format(".2f");

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  if (!points.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#6b7280")
      .text("No data for selected regions");

    return;
  }

  const xScale = d3.scaleTime()
    .domain(d3.extent(points, d => d.date))
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([
      d3.min(points, d => d.avgTemp) - 1,
      d3.max(points, d => d.avgTemp) + 1
    ])
    .nice()
    .range([innerHeight, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(regions)
    .range(d3.schemeCategory10);

  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.avgTemp))
    .curve(d3.curveMonotoneX);

  chart.append("g")
    .attr("class", "grid-line")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-innerWidth)
        .tickFormat("")
    );

  chart.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(Math.max(3, Math.floor(innerWidth / 120)))
        .tickFormat(d3.timeFormat("%B %Y"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  chart.append("g")
    .attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => `${d}\u00B0C`)
    );

  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Time");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Average temperature (\u00B0C)");

  const seriesGroup = chart.append("g").attr("class", "temperature-series");

  const lines = seriesGroup.selectAll("path.region-line")
    .data(series, d => d.region)
    .join("path")
    .attr("class", "region-line chart-element")
    .attr("data-region", d => d.region)
    .attr("fill", "none")
    .attr("stroke", d => colorScale(d.region))
    .attr("stroke-width", 2)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("d", d => line(d.values));

  const focus = chart.append("circle")
    .attr("r", 4.5)
    .attr("fill", "#ffffff")
    .attr("stroke-width", 2)
    .style("display", "none");

  const bisectMonth = d3.bisector(d => d.date).left;

  const hoverLines = seriesGroup.selectAll("path.region-hover-line")
    .data(series, d => d.region)
    .join("path")
    .attr("class", "region-hover-line")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 14)
    .attr("d", d => line(d.values))
    .style("cursor", "crosshair")
    .on("mouseenter", function (event, d) {
      if (hiddenRegions.has(d.region)) return;

      highlightRegion(d.region);
      focus.attr("stroke", colorScale(d.region)).style("display", null);
      tooltip.style("display", "block");
    })
    .on("mousemove", function (event, d) {
      if (hiddenRegions.has(d.region)) return;

      const [mouseX] = d3.pointer(event, chart.node());
      const date = xScale.invert(Math.max(0, Math.min(innerWidth, mouseX)));
      const index = bisectMonth(d.values, date, 1);
      const previous = d.values[index - 1];
      const next = d.values[index];
      const point = next && previous && (date - previous.date > next.date - date)
        ? next
        : previous || next;

      if (!point) return;

      focus
        .attr("cx", xScale(point.date))
        .attr("cy", yScale(point.avgTemp));

      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>Region:</strong> ${d.region}<br/>
          <strong>Month:</strong> ${formatMonth(point.date)}<br/>
          <strong>Avg temp:</strong> ${formatTemp(point.avgTemp)}\u00B0C
        `);
    })
    .on("mouseleave", function () {
      resetHighlight();
      focus.style("display", "none");
      tooltip.style("display", "none");
    });

  const legend = svg.append("g")
    .attr("class", "chart-legend")
    .attr("transform", `translate(${margin.left + innerWidth + 24}, ${margin.top})`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("font-size", 13)
    .attr("font-weight", 700)
    .attr("fill", "#111827")
    .text("Region");

  const legendItems = legend.selectAll("g.legend-item")
    .data(series, d => d.region)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${22 + i * 22})`)
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      if (hiddenRegions.has(d.region)) {
        hiddenRegions.delete(d.region);
      } else {
        hiddenRegions.add(d.region);
      }

      const isHidden = hiddenRegions.has(d.region);

      lines.filter(lineData => lineData.region === d.region)
        .attr("data-hidden", isHidden ? "true" : null)
        .transition()
        .duration(300)
        .attr("opacity", isHidden ? 0 : 1);

      hoverLines.filter(lineData => lineData.region === d.region)
        .style("pointer-events", isHidden ? "none" : "stroke");

      d3.select(this)
        .transition()
        .duration(300)
        .attr("opacity", isHidden ? 0.4 : 1);
    });

  legendItems.append("rect")
    .attr("width", 13)
    .attr("height", 13)
    .attr("rx", 2)
    .attr("fill", d => colorScale(d.region));

  legendItems.append("text")
    .attr("x", 21)
    .attr("y", 11)
    .attr("font-size", 12)
    .attr("fill", "#374151")
    .text(d => d.region);
}
