import { drawChart1 } from "./chart1.js";
import { drawChart2 } from "./chart2.js";
import { drawChart3 } from "./chart3.js";

const d3 = window["d3"];

const DATA_PATH = "data/df_weather_fixed_utf8.csv";
const NUMERIC_COLUMNS = [
  "day.avgtemp_c",
  "day.avghumidity",
  "day.totalprecip_mm"
];

const parseDateISO = d3.timeParse("%Y-%m-%d");
const parseDateSlash = d3.timeParse("%m/%d/%Y");
const parseDateDMYSlash = d3.timeParse("%d/%m/%Y");

function isMissing(value) {
  if (value === null || value === undefined) return true;

  const normalized = String(value).trim().toLowerCase();

  return (
    normalized === "" ||
    normalized === "na" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "-"
  );
}

function toNumber(value) {
  if (isMissing(value)) return null;

  const numberValue = Number(String(value).trim().replace(",", "."));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toDate(value) {
  if (isMissing(value)) return null;

  const raw = String(value).trim();

  return parseDateISO(raw) || parseDateSlash(raw) || parseDateDMYSlash(raw) || null;
}

function normalizeText(value) {
  if (isMissing(value)) return "Unknown";

  return String(value)
    .replace(/\[.*?\]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFC");
}

function cleanWeatherData(rawData) {
  return rawData
    .map((row, index) => {
      const cleanedRow = { ...row };

      cleanedRow.__row_id = index + 1;
      cleanedRow.date = toDate(row.date);

      NUMERIC_COLUMNS.forEach(column => {
        cleanedRow[column] = toNumber(row[column]);
      });

      cleanedRow["location.region"] = normalizeText(row["location.region"]);
      cleanedRow["location.name"] = normalizeText(row["location.name"]);
      cleanedRow["location.country"] = normalizeText(row["location.country"]);
      cleanedRow["day.condition.text"] = normalizeText(row["day.condition.text"]);

      return cleanedRow;
    })
    .filter(row =>
      row.date instanceof Date &&
      !Number.isNaN(row.date.getTime()) &&
      row["location.region"] !== "Unknown" &&
      row["day.avgtemp_c"] !== null
    );
}

function renderDashboard(data) {
  drawChart1(data);
  drawChart2(data);
  drawChart3(data);
}

function getRegions(data) {
  return Array.from(new Set(data.map(d => d["location.region"]))).sort();
}

function createRegionFilter(data) {
  const regions = getRegions(data);
  const filter = d3.select("#region-checkbox-group");

  filter
    .selectAll("label.region-checkbox")
    .data(regions)
    .join("label")
    .attr("class", "region-checkbox")
    .each(function (region) {
      const item = d3.select(this);

      item.html("");
      item.append("input")
        .attr("type", "checkbox")
        .attr("value", region)
        .property("checked", true)
        .on("change", updateDashboard);

      item.append("span").text(region);
    });
}

function getSelectedRegions() {
  return d3.selectAll("#region-checkbox-group input:checked")
    .nodes()
    .map(input => input.value);
}

function updateDashboard() {
  const selectedRegions = getSelectedRegions();
  const sourceData = window.weatherDashboardData || [];
  const filteredData = sourceData.filter(d => selectedRegions.includes(d["location.region"]));

  d3.select("#custom-tooltip").style("display", "none");
  renderDashboard(filteredData);
}

function showError(error) {
  console.error("Cannot load or process data:", error);

  d3.select(".dashboard-shell")
    .insert("div", ":first-child")
    .attr("class", "error-box")
    .html(`
      <strong>Data loading error.</strong><br/>
      Check CSV path: <code>${DATA_PATH}</code>
    `);
}

async function main() {
  try {
    const rawData = await d3.csv(DATA_PATH);
    const data = cleanWeatherData(rawData);

    createRegionFilter(data);
    renderDashboard(data);

    window.weatherDashboardData = data;
    window.updateDashboard = updateDashboard;
  } catch (error) {
    showError(error);
  }
}

main();
