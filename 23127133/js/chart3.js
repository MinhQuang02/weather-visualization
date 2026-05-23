import { highlightRegion, resetHighlight } from "./linkedHighlight.js";

const d3 = window["d3"];

export function drawChart3(data) {
  const container = d3.select("#chart-container-3");
  container.html("");

  const tooltip = d3.select("#custom-tooltip");
  const width = container.node().clientWidth || 900;
  const height = container.node().clientHeight || 520;
  const margin = { top: 42, right: 34, bottom: 54, left: 132 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const formatValue = d3.format(".2f");
  const toNumber = value => Number.isFinite(+value) ? +value : null;

  const metrics = [
    { key: "avgTemp", label: "Avg temp", unit: "\u00B0C" },
    { key: "avgHumidity", label: "Avg humidity", unit: "%" },
    { key: "avgPrecip", label: "Avg precip", unit: " mm" }
  ];

  const regionStats = d3.rollups(
    data.filter(d => d["location.region"]),
    values => ({
      avgTemp: d3.mean(values, d => toNumber(d["day.avgtemp_c"])),
      avgHumidity: d3.mean(values, d => toNumber(d["day.avghumidity"])),
      avgPrecip: d3.mean(values, d => toNumber(d["day.totalprecip_mm"]))
    }),
    d => d["location.region"]
  )
    .map(([region, values]) => ({ region, ...values }))
    .filter(d => metrics.every(metric => Number.isFinite(d[metric.key])))
    .sort((a, b) => d3.ascending(a.region, b.region));

  const heatmapData = regionStats.flatMap(region =>
    metrics.map(metric => ({
      region: region.region,
      metric: metric.label,
      metricKey: metric.key,
      value: region[metric.key],
      unit: metric.unit
    }))
  );

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  if (!heatmapData.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#6b7280")
      .text("No data for selected regions");

    return;
  }

  const regions = regionStats.map(d => d.region);
  const metricLabels = metrics.map(d => d.label);
  const valueExtent = d3.extent(heatmapData, d => d.value);
  const colorDomain = valueExtent[0] === valueExtent[1]
    ? [valueExtent[0] - 1, valueExtent[0], valueExtent[1] + 1]
    : [valueExtent[0], (valueExtent[0] + valueExtent[1]) / 2, valueExtent[1]];

  const colorScale = d3.scaleLinear()
    .domain(colorDomain)
    .range(["#2c7bb6", "#ffffbf", "#d7191c"])
    .interpolate(d3.interpolateRgb);

  const getTextColor = value => {
    const color = d3.rgb(colorScale(value));
    const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
    return luminance < 0.58 ? "#ffffff" : "#1f2937";
  };

  const xScale = d3.scaleBand()
    .domain(metricLabels)
    .range([0, innerWidth])
    .paddingInner(0.1)
    .paddingOuter(0.04);

  const yScale = d3.scaleBand()
    .domain(regions)
    .range([0, innerHeight])
    .paddingInner(0.12)
    .paddingOuter(0.04);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  chart.append("g")
    .attr("class", "axis x-axis")
    .call(d3.axisTop(xScale).tickSize(0))
    .call(g => g.select(".domain").remove())
    .selectAll("text")
    .attr("dy", "-0.7em")
    .attr("font-weight", 700)
    .attr("fill", "#374151")
    .style("text-anchor", "middle");

  chart.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).tickSize(0))
    .call(g => g.select(".domain").remove());

  const cells = chart.selectAll("rect.heatmap-cell")
    .data(heatmapData, d => `${d.region}-${d.metricKey}`)
    .join("rect")
    .attr("class", "heatmap-cell chart-element")
    .attr("data-region", d => d.region)
    .attr("x", d => xScale(d.metric))
    .attr("y", d => yScale(d.region))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", d => colorScale(d.value))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      const cx = xScale(d.metric) + xScale.bandwidth() / 2;
      const cy = yScale(d.region) + yScale.bandwidth() / 2;

      highlightRegion(d.region);

      labels
        .transition()
        .duration(200)
        .attr("opacity", label => label.region === d.region ? 1 : 0.2);

      d3.select(this)
        .transition()
        .duration(160)
        .attr("transform", `translate(${cx}, ${cy}) scale(1.025) translate(${-cx}, ${-cy})`);

      tooltip
        .style("display", "block")
        .html(`
          <strong>Region:</strong> ${d.region}<br/>
          <strong>Metric:</strong> ${d.metric}<br/>
          <strong>Value:</strong> ${formatValue(d.value)}${d.unit}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      resetHighlight();

      labels
        .transition()
        .duration(200)
        .attr("opacity", 1);

      d3.select(this)
        .transition()
        .duration(160)
        .attr("transform", null);

      tooltip.style("display", "none");
    });

  const labels = chart.selectAll("text.heatmap-label")
    .data(heatmapData, d => `${d.region}-${d.metricKey}`)
    .join("text")
    .attr("class", "heatmap-label")
    .attr("x", d => xScale(d.metric) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.region) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("fill", d => getTextColor(d.value))
    .style("pointer-events", "none")
    .text(d => formatValue(d.value));

  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 16)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Weather metric");
}
