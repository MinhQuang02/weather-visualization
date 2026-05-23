import { highlightRegion, resetHighlight } from "./linkedHighlight.js";

const d3 = window["d3"];

export function drawChart2(data) {
  const container = d3.select("#chart-container-2");
  container.html("");

  const tooltip = d3.select("#custom-tooltip");
  const width = container.node().clientWidth || 900;
  const height = container.node().clientHeight || 520;
  const margin = { top: 28, right: 112, bottom: 52, left: 132 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const formatTemp = d3.format(".3f");

  const regionData = d3.rollups(
    data.filter(d => d["location.region"] && Number.isFinite(d["day.avgtemp_c"])),
    values => d3.mean(values, d => d["day.avgtemp_c"]),
    d => d["location.region"]
  )
    .map(([region, avgTemp]) => ({ region, avgTemp }))
    .filter(d => Number.isFinite(d.avgTemp))
    .sort((a, b) => d3.descending(a.avgTemp, b.avgTemp));

  const maxTemp = d3.max(regionData, d => d.avgTemp) || 1;
  const tempExtent = d3.extent(regionData, d => d.avgTemp);

  const yScale = d3.scaleBand()
    .domain(regionData.map(d => d.region))
    .range([0, innerHeight])
    .padding(0.36);

  const xScale = d3.scaleLinear()
    .domain([0, maxTemp])
    .nice()
    .range([0, innerWidth]);

  const colorScale = d3.scaleLinear()
    .domain(tempExtent[0] === tempExtent[1]
      ? [tempExtent[0] - 1, tempExtent[0], tempExtent[1] + 1]
      : [tempExtent[0], (tempExtent[0] + tempExtent[1]) / 2, tempExtent[1]])
    .range(["#2c7bb6", "#ffffbf", "#d7191c"])
    .interpolate(d3.interpolateRgb);

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  if (!regionData.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#6b7280")
      .text("No data for selected regions");

    return;
  }

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  chart.append("g")
    .attr("class", "grid-line")
    .call(
      d3.axisBottom(xScale)
        .ticks(6)
        .tickSize(innerHeight)
        .tickFormat("")
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke-width", 0.7).attr("opacity", 0.55));

  chart.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(d => `${d}\u00B0C`)
    );

  chart.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).tickSize(0))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("dx", "-0.35em"));

  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 16)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Average temperature (\u00B0C)");

  chart.selectAll("rect.region-bar")
    .data(regionData, d => d.region)
    .join("rect")
    .attr("class", "region-bar chart-element")
    .attr("data-region", d => d.region)
    .attr("x", 0)
    .attr("y", d => yScale(d.region))
    .attr("height", yScale.bandwidth())
    .attr("rx", 5)
    .attr("fill", d => colorScale(d.avgTemp))
    .attr("width", 0)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      highlightRegion(d.region);
      tooltip
        .style("display", "block")
        .html(`
          <strong>Region:</strong> ${d.region}<br/>
          <strong>Avg temp:</strong> ${formatTemp(d.avgTemp)}\u00B0C
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function () {
      resetHighlight();
      tooltip.style("display", "none");
    })
    .transition()
    .duration(750)
    .ease(d3.easeCubicOut)
    .attr("width", d => xScale(d.avgTemp));

  chart.selectAll("text.bar-label")
    .data(regionData, d => d.region)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.avgTemp) + 8)
    .attr("y", d => yScale(d.region) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("fill", "#374151")
    .text(d => `${formatTemp(d.avgTemp)}\u00B0C`);
}
