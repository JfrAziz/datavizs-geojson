import path from "path"
import sharp from 'sharp';
import { JSDOM } from 'jsdom';
import crypto from "crypto"
import { select, geoPath, geoMercator } from 'd3';
import { promises as fs, readdirSync, writeFileSync } from "fs"


const removeDotPrefix = (str) => str.split('.').join("")

const removeExtension = (str) => str.split('.').slice(0, -1).join('.')

const underScoreToSpace = (str) => str.split('_').join(" ")

const createGeoJSONImage = async (filename) => {
  const WIDTH = 256

  const HEIGHT = 256;

  const COLORS = ['#63e6be', '#38d9a9', '#20c997', '#12b886'];

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
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .append('g')

  const projection = geoMercator().fitSize([WIDTH, HEIGHT], {
    "type": "FeatureCollection",
    "features": geoJSON.features
  });

  const geoGenerator = geoPath()
    .projection(projection)

  svg.selectAll('path')
    .data(geoJSON.features)
    .join("path")
    .attr("d", geoGenerator)
    .attr('fill', (d, i) => COLORS[i % 4])
    .attr('stroke', '#fff');
  

  await sharp(Buffer.from(window.d3.select('.container').html())).png().toFile(`${removeExtension(filename)}.png`)
}

const createIndexGeoJSON = (dir) => {
  const exclude = ["node_modules", ".gitignore", ".git", "index.js", "package.json", "package-lock.json", ".vercel"];

  // list all files in the directory
  try {
    const filesOrFolders = readdirSync(dir, { withFileTypes: true }).filter(file => !exclude.includes(file.name));

    const folders = filesOrFolders.filter(file => file.isDirectory())

    const files = filesOrFolders.filter(file => path.extname(file.name) === ".geojson")

    const lessDotPrefix = removeDotPrefix(dir)

    let result = []

    folders.forEach(folder => {
      result.push({
        id: crypto.createHash('md5').update(`${lessDotPrefix}/${folder.name}`).digest('hex'),
        name: folder.name,
        type: "folder",
        endpoint: `${lessDotPrefix}/${folder.name}`
      })

      createIndexGeoJSON(`${dir}/${folder.name}`)
    })

    files.forEach(file => {
      createGeoJSONImage(`${dir}/${file.name}`)

      console.log(`Build GeoJSON Image: ${lessDotPrefix}/${file.name}`)

      result.push({
        id: crypto.createHash('md5').update(`${lessDotPrefix}/${file.name}`).digest('hex'),
        name: underScoreToSpace(removeExtension(file.name)),
        type: "geojson",
        thumbnail: `${lessDotPrefix}/${removeExtension(file.name)}.png`,
        endpoint: `${lessDotPrefix}/${file.name}`
      })
    })

    writeFileSync(`${dir}/index.json`, JSON.stringify(result))

  } catch (err) {
    console.log(err);
  }
}

createIndexGeoJSON(".")