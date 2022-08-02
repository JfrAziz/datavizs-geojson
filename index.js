import sharp from 'sharp';
import { JSDOM } from 'jsdom';
import { promises as fs } from "fs"
import { select, geoPath, geoMercator } from 'd3';

const renderGeoJSONtoImage = async (filename) => {
  const width = 256

  const height = 256;

  const colors = ['#08e64e', '#00d887', '#00c6a6', '#41b1ae'];

  let geoJSON
  try {
    geoJSON = JSON.parse(await fs.readFile(filename, 'utf8'))
  } catch (error) {
    console.log(error)
    return 0
  }

  const window = (new JSDOM(undefined, { pretendToBeVisual: true })).window;

  window.d3 = select(window.document);

  const svg = window.d3.select('body')
    .append('div').attr('class', 'container')
    .append('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')

  const projection = geoMercator().fitSize([width, height], {
    "type": "FeatureCollection",
    "features": geoJSON.features
  });

  const geoGenerator = geoPath()
    .projection(projection)

  svg.selectAll('path')
    .data(geoJSON.features)
    .join("path")
    .attr("d", geoGenerator)
    .attr('fill', (d, i) => colors[Math.floor(Math.random() * 4)])
    .attr('stroke', '#fff');

  await sharp(Buffer.from(window.d3.select('.container').html())).png().toFile(`${filename}.png`)
}

renderGeoJSONtoImage("Asia/Indonesia.geojson")