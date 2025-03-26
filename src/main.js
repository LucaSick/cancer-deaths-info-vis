import * as d3 from 'd3'
import './style.css'

const data = [10, 20, 30, 40, 50]

const width = 300
const height = 100

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height)

svg.selectAll('circle')
  .data(data)
  .enter()
  .append('circle')
  .attr('cx', (d, i) => i * 60 + 30)
  .attr('cy', height / 2)
  .attr('r', d => d / 2)
  .attr('fill', 'steelblue')
