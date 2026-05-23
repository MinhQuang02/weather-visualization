const d3 = window["d3"];

function cacheOriginalStyle(selection) {
  selection.each(function () {
    const element = d3.select(this);

    if (!element.attr("data-original-stroke")) {
      element.attr("data-original-stroke", element.attr("stroke") || "none");
    }

    if (!element.attr("data-original-stroke-width")) {
      element.attr("data-original-stroke-width", element.attr("stroke-width") || "0");
    }
  });
}

export function highlightRegion(regionName) {
  const elements = d3.selectAll(".chart-element");

  cacheOriginalStyle(elements);

  elements
    .interrupt()
    .transition()
    .duration(200)
    .attr("opacity", function () {
      if (this.getAttribute("data-hidden") === "true") return 0;
      return this.getAttribute("data-region") === regionName ? 1 : 0.2;
    })
    .attr("stroke", function () {
      const element = d3.select(this);
      const originalStroke = element.attr("data-original-stroke");

      if (this.getAttribute("data-region") !== regionName) {
        return originalStroke;
      }

      return this.tagName.toLowerCase() === "path" ? originalStroke : "#111827";
    })
    .attr("stroke-width", function () {
      const element = d3.select(this);
      const originalWidth = Number(element.attr("data-original-stroke-width")) || 0;

      if (this.getAttribute("data-region") !== regionName) {
        return originalWidth;
      }

      return this.tagName.toLowerCase() === "path"
        ? Math.max(originalWidth + 1.5, 3)
        : Math.max(originalWidth, 2.5);
    });
}

export function resetHighlight() {
  const elements = d3.selectAll(".chart-element");

  cacheOriginalStyle(elements);

  elements
    .interrupt()
    .transition()
    .duration(200)
    .attr("opacity", function () {
      return this.getAttribute("data-hidden") === "true" ? 0 : 1;
    })
    .attr("stroke", function () {
      return d3.select(this).attr("data-original-stroke");
    })
    .attr("stroke-width", function () {
      return d3.select(this).attr("data-original-stroke-width");
    });
}
