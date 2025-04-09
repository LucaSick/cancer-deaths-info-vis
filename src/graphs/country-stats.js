import * as d3 from 'd3'

import FilterValues from "../Utils/filterValues";

console.log(FilterValues.countries);

const populateFilters = () => {
    const yearOptions = [""].concat(FilterValues.years);
    const locationOptions = FilterValues.countries;
    const ageOptions = FilterValues.ages;

    const populateSelect = (id, options) => {
        const select = document.getElementById(id);
        select.innerHTML = // `<option value="">All</option>` +
            options.map(opt => `<option value="${opt}">${opt || 'All'}</option>`).join("");
    };

    populateSelect("yearFilter", yearOptions);
    populateSelect("countryFilter", locationOptions);
    populateSelect("ageFilter", ageOptions);
}

populateFilters()

const loadAndRender = async (country, year, age) => {
    const data = await d3.csv(`/country-stats/country-stats-${country}.csv`, d3.autoType);
    console.log(age);
    // Optional filter
    const filtered = data.filter(d => {
        return (!year || d.year == year) && (!age || age == "All ages" || d.age_name == age);
    });

    // Group by cause_name and sum val
    const grouped = d3.rollups(
        filtered,
        v => d3.sum(v, d => d.val),
        d => d.cause_name
    );

    // Sort (optional)
    grouped.sort((a, b) => b[1] - a[1]);

    // Draw
    renderChart(grouped);
};

function renderChart(data) {
    const svg = d3.select("#chart");
    svg.selectAll("*").remove(); // Clear previous chart

    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 40, right: 20, bottom: 100, left: 80 };

    const x = d3.scaleBand()
      .domain(data.map(d => d[0]))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[1])])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

      const tooltip = d3.select("#tooltip");

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(0) - y(d[1]))
      .attr("width", x.bandwidth())
      .attr("fill", "steelblue")
      .on("mouseover", function (event, d) {
        tooltip.style("display", "block")
          .html(`<strong>${d[0]}</strong><br/>Value: ${d[1].toLocaleString()}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
        d3.select(this).attr("fill", "darkorange");
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
        d3.select(this).attr("fill", "steelblue");
      });
}

document.getElementById("apply-filters").addEventListener("click", () => {
    const country = document.getElementById("countryFilter").value;
    const year = document.getElementById("yearFilter").value;
    const age = document.getElementById("ageFilter").value;

    loadAndRender(country, year, age);
});