//
var datos = []
var provincias

// Simulatiion
var radio1 = 10
var radio2 = 10
var radio3 = 10
var radio4 = 10
var radioHover = 30
var forceStrength = 0.04
var simulation = d3.forceSimulation()

// Svg
var g
var svg
var yAxisSize = 180
var svgSize = {width: 0, height: 0}
var margin = {top: 50, right: 0, bottom: 0, left: 0}

//
var showActual = false
var clicked = false
var active = d3.select(null)

// Transition effect
var t = d3.transition()
    .duration(3000)
    .ease(d3.easeElastic)

// Set size on function the window size
var container = document.getElementsByClassName('columns')[0]
var height = 2200
var width = container.offsetWidth

svgSize.width = width - margin.left - margin.right
svgSize.height = height - margin.top - margin.bottom

// X scale
var xRange = []
var amountColumns = 6
for (let i = 1; i < (amountColumns + 1); i++) {
  xRange.push((svgSize.width - yAxisSize)/amountColumns * i + yAxisSize)
}

var xScale = d3.scaleOrdinal()
  .range(xRange.slice(0, 5))
  .domain([0, 3, 1, 2, 5])

// Y scale
var yRange = []
var amountLaws = 13
for (let i = 1; i < (amountLaws + 1); i++) {
  yRange.push(svgSize.height/amountLaws * i)
}

var yScale = d3.scaleOrdinal()
  .range(yRange)
  .domain(['Proyecto de legalizacion del aborto',
           'Proyecto de legalizacion del aborto (con modificaciones)',
           'subsidios a huérfanos por femicidio', 'reforma provicional',
           'asignación universal', 'regimen de personal domestico',
           'identidad de género',
           'reproducción medicamente asistida', 'matrimonio igualitario',
           'ley de trata y asistencia a las victimas',
           'educación sexual integral'])

// Map position and scale
var scale
var centerMap
if (window.innerWidth <= 576) {
  scale = 1
  centerMap = [svgSize.width / 5.5, svgSize.height / 5]
} else if (window.innerWidth <= 768) {
  scale = 1
  centerMap = [svgSize.width / 5.5, svgSize.height / 5]
} else if (width <= 992) {
  scale = 1.7
  centerMap = [svgSize.width / 2, svgSize.height / 3.2]
} else {
  scale = 1.5
  centerMap = [svgSize.width / 2, svgSize.height / 3.2]
}

// Define map projection
var projection = d3.geoEquirectangular()
  .center([-63, -42]) // set centre to further North
  .scale([svgSize.width * scale]) // scale to fit group width
  .translate(centerMap) // ensure centred in group

var geoPath = d3.geoPath()
  .projection(projection)

var zoom = d3.zoom()
  .on('zoom', zoomed)

var poroteoUrl = 'https://docs.google.com/spreadsheets/u/1/d/1mOiTT3JIdQPxVLTQ-a3OivQqE15oLvdWMv6I_DpMZak/export?format=csv&id=1mOiTT3JIdQPxVLTQ-a3OivQqE15oLvdWMv6I_DpMZak&gid=1248922160'

d3.json('data/provincias.geojson')
  .then(data => {
    provincias = data

    // Bajo un poco el centroide para salta
    provincias.features.forEach(d => {
      if (d.properties.provincia === 'Salta') {
        d.properties.centroid[0] += 1
        d.properties.centroid[1] -= 0.7
      }
    })

    d3.csv(poroteoUrl)
      .then(dataCsv => {
        //
        dataCsv.forEach(d => {
          var v = d.PosicionFrenteAlOrig === 'A Favor' ? 0 :
            d.PosicionFrenteAlOrig === 'En Contra' ? 3 :
              d.PosicionFrenteAlOrig === 'Se Abstiene' ? 1 :
                d.PosicionFrenteAlOrig === 'Ausente' ? 2 : 5

          var ley_ori = Object.assign({}, translate[d.Senador])
          ley_ori.asunto = 'Proyecto de legalizacion del aborto'
          ley_ori.voto = v
          datos.push(ley_ori)
        })

        dataCsv.forEach(dd => {
          var v = dd.PosicionCON_MODIF === 'A Favor' ? 0 :
            dd.PosicionCON_MODIF === 'En Contra' ? 3 :
              dd.PosicionCON_MODIF === 'Se Abstiene' ? 1 :
                dd.PosicionCON_MODIF === 'Ausente' ? 2 : 5

          var ley_mod = Object.assign({}, translate[dd.Senador])
          ley_mod.asunto = 'Proyecto de legalizacion del aborto (con modificaciones)'
          ley_mod.voto = v
          datos.push(ley_mod)
        })

        d3.json('data/leyes.json')
          .then(graph => {
            // datos = graph
            datos = datos.concat(graph)

            datos = datos.filter(d => {
            	return 'img' in d
            })

            datos.forEach(d => {
              var s = d.img.split('/')
              if (s.length === 3) {
                d.id = s[2].replace('.png', '')
              } else {
                d.id = d.nombre.replace(/ /g, '_')
              }
            })

            calculateCenetrs()
            appendAll()
            plot()
          })
          .catch(error => {
            console.log(error)
          })
      })
  })


function calculateCenetrs () {
  /*
    Centro y radio para las leyes para ambos plots
  */
  datos.forEach(d => {
    d.centro1 = {
      x: xScale(d.voto),
      y: yScale(d.asunto)
    }
  })

  /* Centro para el mapa */
  datos.forEach(d => {
    if (d.distrito === 'Ciudad Autónoma de Buenos Aires') {
      centroide = projection([-55, -36])
    } else {
      var centroide = provincias.features.filter(dd => {
        return dd.properties.provincia === d.distrito
      })[0]['properties']['centroid']

      centroide = projection(centroide)
    }

    d.centro2 = {
      x: centroide[0],
      y: centroide[1]
    }
  })

  // Rdio inicial
  datos.forEach(d => {
    d.radio = radio1
  })

  // Radios para los actuales
  datos.forEach(d => {
    if (d.es_actual) {
      d.radio3 = radio3
    } else {
      d.radio3 = 0
    }
  })

  // Radios para el mapa
  var nombres = []
  datos.forEach(d =>  {
    nombres.push(d.nombre)
  })

  nombres = [ ...new Set(nombres)]

  nombres.forEach(d => {
    var nodosIguales1 = datos.filter(dd => { return d == dd.nombre})

    nodosIguales1.forEach((d, i) => {
      if (i === 0 && d.es_actual) {
        d.radio4 = radio4
        d.radio2 = radio2
      } else if (i === 0) {
        d.radio2 = radio2
        d.radio4 = 0
      } else {
        d.radio2 = 0
        d.radio4 = 0
      }
    })
  })
}


function appendAll () {
  // Append the svg
  svg = d3.select('#graph')
    .attr('width', svgSize.width)
    .attr('height', height)

  // Append a main g
  g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  // Append the map
  g.append('g')
    .attr('class', 'states')
    .selectAll('path')
    .data(provincias.features)
    .enter()
    .append('path')
    .attr('class', 'map')
    .attr('fill', d => { return fillMap(d) })
    .attr('d', geoPath)

  // Append a g for each node
  node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('.node')
    .data(datos)
    .enter().append('g')
    .attr('class', 'node')

  // To each node append a circle
  node.append('circle')
    .attr('fill', d => { return color(d.bloque) })
    .style('stroke', d => { return colorStroke(d.bloque) })

  // To each node append a image
  node.append('image')
    .attr('xlink:href', d => { return d.img })
    .attr('id', d => { return d.id })

  var xAxis = d3.axisBottom(xScale)
    .tickValues(['A FAVOR', 'EN CONTRA', 'SE ABSTIENE', 'EN AUSENCIA', 'SIN POSICION'])

  var yAxis = d3.axisLeft(yScale)
    .tickValues(['', ' ', '  ', 'Proyecto de legalizacion del aborto',
                 'Proyecto de legalizacion del aborto (mod)',
                 'Subsidios a huérfanos por femicidio', 'Reforma Provisional',
                 'Asignación universal', 'Régimen de personal doméstico',
                 'Identidad de género', 'Reproducción médicamente asistida',
                 'Matrimonio igualitario', 'Ley de trata y asistencia a las víctimas',
                 'Educación sexual integral'])

  g.append("rect")
   .attr("x", 0)
   .attr("y", -50)
   .attr("fill", "#ffffff")
   .attr("width", '100%')
   .attr("height", 90)

  // Append the xAxis
  g.append('g')
    .attr('class', 'axis xAxis')
    .attr('transform', 'translate(0,0)')
    .call(xAxis)

  // Append the yAxis
  g.append('g')
    .attr('class', 'axis yAxis')
    .attr('transform', 'translate(' + yAxisSize + ', 0)')
    .call(yAxis)
    .selectAll('.tick text')
    .call(wrap, yAxisSize)
    .on("mouseover", d => { mouseover(d, true) })
    .on("mouseout", d => { mouseout(d) })

  // Remove the domain and lines
  g.selectAll('.axis .domain')
    .remove()

  g.selectAll('.axis .tick line')
    .remove()
}


function zoomOverState (d) {
  /*
    On click over the map make a zoom effect
  */
  if (active.node() === this) return zoomReset()
  active.classed('active', false)
  active = d3.select(this).classed('active', true)

  let bounds = geoPath.bounds(d)
  let dx = bounds[1][0] - bounds[0][0]
  let dy = bounds[1][1] - bounds[0][1]
  let x = (bounds[0][0] + bounds[1][0]) / 2
  let y = (bounds[0][1] + bounds[1][1]) / 2
  let scale = Math.max(1, Math.min(7, 0.7 / Math.max(dx / svgSize.width, dy / svgSize.height)))
  let translate = [svgSize.width / 2 - scale * x, svgSize.height / 4.3 - scale * y]

  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
}


function zoomReset () {
  /*
  Reset the zoom
  */
  active.classed('active', false)
  active = d3.select(null)

  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(0, 50))
}


function zoomed () {
  /*

  */
  g.style('stroke-width', 1.5 / d3.event.transform.k + 'px')
  g.attr('transform', d3.event.transform)

  node.selectAll('image')
    .on('mouseover', d => {})
    .on('click', d => {})
}


function plot() {
  // Show the axis
  g.selectAll('.axis .tick text')
    .transition()
    .attr('opacity', '1')

  // Hide the map
  g.selectAll('.map')
    .attr('opacity', '0')
    .on('click', d => { return {} })

  simulation.nodes(datos).alphaTarget(0.8).restart()
    .force('x', d3.forceX().strength(forceStrength).x(d => { return d.centro1.x }))
    .force('y', d3.forceY().strength(forceStrength).y(d => { return d.centro1.y }))
    .force('collide', d3.forceCollide().radius(d => {
      return d.radio === radio1 ? d.radio : d.radio * 1.8
    }))

  // Add a g to for each node
  node = g.selectAll('.node')

  // Append a circle
  node.selectAll('circle')
    .attr('r', radio1)

  // Append the photos
  node.selectAll('image')
    .attr('x', d => { return -d.radio })
    .attr('y', d => { return -d.radio })
    .attr('width', d => { return d.radio * 2 })
    .attr('height', d => { return d.radio * 2 })
    .on('mouseover', function (d) { mouseover(d, false); imageHoverOver(d, this) })
    .on('mouseleave', function (d) { mouseout(d); imageHoverLeave(d, this) })
    .on('click', d => { return imageClick(d) })


  var btns2op = document.getElementById("btns2")
  btns2op.style.display = "block"

  var svgBg = document.getElementById("graph")
  svgBg.style.background = "linear-gradient(to right, #ffffff 21%, #9BE0B4 21%, #9BE0B4 36%, #F4ABAF 36%, #F4ABAF 51%, #F9F4B7 51%, #F9F4B7 66%, #C2F9F7 66%, #C2F9F7 80%, #FCC5F9 80%, #FCC5F9 100%, #FFFFFF 100%)"
  var dropDown = document.getElementById("whatwhat")
  dropDown.style.display = "none"

  simulation
    .nodes(datos)
    .on('tick', ticked)
}


function plotActuales(){
  simulation.nodes(datos).alphaTarget(1).restart()
    .force('x', d3.forceX().strength(forceStrength).x(d => { return d.centro1.x }))
    .force('y', d3.forceY().strength(forceStrength).y(d => { return d.centro1.y }))
    .force('collide', d3.forceCollide().radius(d => { return d.radio3 }))

  node = g.selectAll('.node')
    .data(datos)

  node.selectAll('circle')
    .attr('r', d => { return d.radio3 })

  // Append the photos
  node.selectAll('image')
    .transition()
    .duration(3000)
    .ease(d3.easeElastic)
    .attr('width', d => { return d.radio3 * 2 })
    .attr('height', d => { return d.radio3 * 2 })
    .attr('x', d => { return -d.radio3 })
    .attr('y', d => { return -d.radio3 })
    .on('mouseover', function (d) { mouseover(d, false); imageHoverOver(d, this) })
    .on('mouseleave', d => { mouseout(d); imageHoverLeave(d, this) })
    .on('click', d => { return imageClick(d) })

  simulation
    .nodes(datos)
    .on('tick', ticked)
}


function plotMap () {
  // Hidden the axis
  g.selectAll('.axis .tick text')
    .transition()
    .attr('opacity', '0')

  // Show the map
  g.selectAll('.map')
    .on('click', zoomOverState)
    .transition()
    .duration(3000)
    .attr('opacity', '1')

  simulation.nodes(datos).alphaTarget(1).restart()
    .force('x', d3.forceX().strength(forceStrength).x(d => { return d.centro2.x }))
    .force('y', d3.forceY().strength(forceStrength).y(d => { return d.centro2.y }))
    .force('collide', d3.forceCollide().radius(d => { return d.radio2 }))

  node = g.selectAll('.node')
    .data(datos)

  node.selectAll('circle')
    .attr('r', d => { return d.radio2 })

  // Append the photos
  node.selectAll('image')
    .on('click', d => {})
    .transition()
    .duration(1000)
    .ease(d3.easeElastic)
    .attr('width', d => { return d.radio2 * 2 })
    .attr('height', d => { return d.radio2 * 2 })
    .attr('x', d => { return -d.radio2 })
    .attr('y', d => { return -d.radio2 })

  //
  var btns2op = document.getElementById("btns2")
  btns2op.style.display = "none"

  var svgBg = document.getElementById("graph")
  svgBg.style.background = "white"

  var dropDown = document.getElementById("whatwhat")
  dropDown.style.display = "block"

  simulation
    .nodes(datos)
    .on('tick', ticked)
}

function plotMapActuales () {
  /*

  */
  simulation.nodes(datos).alphaTarget(1).restart()
    .force('x', d3.forceX().strength(forceStrength).x(d => { return d.centro2.x }))
    .force('y', d3.forceY().strength(forceStrength).y(d => { return d.centro2.y }))
    .force('collide', d3.forceCollide().radius(d => { return d.radio4 }))

  node = g.selectAll('.node')
    .data(datos)

  node.selectAll('circle')
    .attr('r', d => { return d.radio4 })

  // Append the photos
  node.selectAll('image')
    .on('click', d => {})
    .transition()
    .duration(1000)
    .ease(d3.easeElastic)
    .attr('width', d => { return d.radio4 * 2 })
    .attr('height', d => { return d.radio4 * 2 })
    .attr('x', d => { return -d.radio4 })
    .attr('y', d => { return -d.radio4 })

  simulation
    .nodes(datos)
    .on('tick', ticked)
}


function ticked () {
  let t = d3.transition()
    .duration(3000)
    .ease(d3.easeElastic)

  node
    .transition(t)
    .attr('transform', d => {
      return 'translate(' + d.x + ',' + d.y + ')'
    })
}


function color (bloque) {
  return bloque == 'Chubut Somos Todos' ? '#27206d' :
    bloque == 'Coalición Cívica' ? '#2ca02c' :
    bloque == 'Chubut Somos Todos' ? '#519E19' :
    bloque == 'Coalición Cívica' ? '#2ca02c' :
    bloque == 'Federalismo Santafesino' ? '#003685' :
    bloque == 'Federalismo y Liberación' ? '#003685' :
    bloque == 'Frente Cívico por Santiago' ? '#4b088a' :
    bloque == 'Frente Cívico de Córdoba' ? '#2980b9' :
    bloque == 'Frente Cívico por Santiago' ? '#4b088a' :
    bloque == 'Frente Cívico y Social de Catamarca' ? '#4b088a' :
    bloque == 'Frente Popular' ? '#d03c28' :
    bloque == 'Frente Pro' ? '#FDDA33' :
    bloque == 'Fuerza Republicana' ? '#042b4f' :
    bloque == 'GEN' ? '#a5a6a8' :
    bloque == 'Justicialista 8 de Octubre' ? '#0F63A8' :
    bloque == 'Justicialista La Pampa' ? '#0F63A8' :
    bloque == 'Justicialista para el Dialogo de Los Argentinos' ? '#0F63A8' :
    bloque == 'Justicialista San Luis' ? '#bf5b17' :
    bloque == 'Justicialista-Frente para la Victoria' ? '#4eaee8' :
    bloque == 'Justicialista' ? '#0F63A8' :
    bloque == 'Liberal de Corrientes' ? '#2a9afb' :
    bloque == 'Misiones' ? '#EDBB99' :
    bloque == 'Movimiento Popular Fueguino' ? '#3eaef2' :
    bloque == 'Movimiento Popular Neuquino' ? '#3eaef2' :
    bloque == 'Nuevo Encuentro' ? '#43a6bb' :
    bloque == 'PARES' ? '#337137' :
    bloque == 'Pro y Unión por Entre Ríos ' ? '#e7ba52' :
    bloque == 'Proyecto Sur-UNEN' ? '#194850' :
    bloque == 'Renovador de Salta' ? '#3babf2' :
    bloque == 'Santa Fe Federal' ? '#244a02' :
    bloque == 'Socialista' ? '#fa58f4' :
    bloque == 'Unión Cívica Radical' ? '#d62728' :
    bloque == 'Unión por Córdoba' ? '#d62728' :
    bloque == 'Vecinalista - Partido Nuevo' ? '#1f1046' :
    bloque == 'Partido de la Victoria' ? '#4eaee8' : '#e5e5e5';
}


function colorStroke (bloque) {
  return bloque == 'Chubut Somos Todos' ? '#27206d' :
    bloque == 'Coalición Cívica' ? '#2ca02c' :
    bloque == 'Chubut Somos Todos' ? '#519E19' :
    bloque == 'Coalición Cívica' ? '#2ca02c' :
    bloque == 'Federalismo Santafesino' ? '#003685' :
    bloque == 'Federalismo y Liberación' ? '#003685' :
    bloque == 'Frente Cívico por Santiago' ? '#4b088a' :
    bloque == 'Frente Cívico de Córdoba' ? '#2980b9' :
    bloque == 'Frente Cívico por Santiago' ? '#4b088a' :
    bloque == 'Frente Cívico y Social de Catamarca' ? '#4b088a' :
    bloque == 'Frente Popular' ? '#d03c28' :
    bloque == 'Frente Pro' ? '#FDDA33' :
    bloque == 'Fuerza Republicana' ? '#042b4f' :
    bloque == 'GEN' ? '#a5a6a8' :
    bloque == 'Justicialista 8 de Octubre' ? '#0F63A8' :
    bloque == 'Justicialista La Pampa' ? '#0F63A8' :
    bloque == 'Justicialista para el Dialogo de Los Argentinos' ? '#0F63A8' :
    bloque == 'Justicialista San Luis' ? '#bf5b17' :
    bloque == 'Justicialista-Frente para la Victoria' ? '#4eaee8' :
    bloque == 'Justicialista' ? '#0F63A8' :
    bloque == 'Liberal de Corrientes' ? '#2a9afb' :
    bloque == 'Misiones' ? '#EDBB99' :
    bloque == 'Movimiento Popular Fueguino' ? '#3eaef2' :
    bloque == 'Movimiento Popular Neuquino' ? '#3eaef2' :
    bloque == 'Nuevo Encuentro' ? '#43a6bb' :
    bloque == 'PARES' ? '#337137' :
    bloque == 'Pro y Unión por Entre Ríos ' ? '#e7ba52' :
    bloque == 'Proyecto Sur-UNEN' ? '#194850' :
    bloque == 'Renovador de Salta' ? '#3babf2' :
    bloque == 'Santa Fe Federal' ? '#244a02' :
    bloque == 'Socialista' ? '#fa58f4' :
    bloque == 'Unión Cívica Radical' ? '#d62728' :
    bloque == 'Unión por Córdoba' ? '#d62728' :
    bloque == 'Vecinalista - Partido Nuevo' ? '#1f1046' :
    bloque == 'Partido de la Victoria' ? '#4eaee8' : '#e5e5e5';
}


function imageHoverOver (d, that) {
  /*
    On hover over node, make this bigger
  */
  if (clicked === false){
    d.radio = radioHover
    simulation.nodes(datos).alphaTarget(0.1).restart()

    // select element in current context
    // d3.select( this )
    d3.select(that)
      .transition(t)
      .attr('x', d => { return -d.radio })
      .attr('y', d => { return -d.radio })
      .attr('width', d => { return d.radio * 3 })
      .attr('height', d => { return d.radio * 3 })
  }
}


function imageHoverLeave (d, that) {
  /*
    On hover leave over node, make this of normal size
  */
  if (clicked === false) {
    d.radio = radio1
    simulation.nodes(datos).alphaTarget(0.1).restart()

    // d3.select( this )
    d3.select(that)
      .transition()
      .attr('x', d => { return -d.radio })
      .attr('y', d => { return -d.radio })
      .attr('width', d => { return d.radio * 2 })
      .attr('height', d => { return d.radio * 2 })
  }
}


function imageClick (d) {
  var nodosIguales = datos.filter(dd => { return d.nombre == dd.nombre})

  if (clicked === false) {
    nodosIguales.forEach(dd => {
      dd.radio = radioHover
    })

    // select element in current context
    d3.selectAll('#' + d.id)
      .transition(t)
      .attr('x', d => { return -d.radio })
      .attr('y', d => { return -d.radio })
      .attr('width', d => { return d.radio * 3 })
      .attr('height', d => { return d.radio * 3 })

    // set click as true
    clicked = true
  } else {
    if (showActual === true) {
      datos.forEach(d => {
        if (d.es_actual) {
          d.radio = radio3
        } else {
          d.radio = 0
        }
      })
    } else {
      datos.forEach(d => {
        d.radio = radio1
      })
    }

    d3.selectAll('image')
      .transition()
      .attr('x', d => { return -d.radio })
      .attr('y', d => { return -d.radio })
      .attr('width', d => { return d.radio * 2 })
      .attr('height', d => { return d.radio * 2 })

    // set click as false
    clicked = false
  }

  // Restart the simulation to prevent nodes overlaping
  simulation.nodes(datos).alphaTarget(0.1).restart()
}

function mouseover (d, isAxis) {
 /*
   On mouse over highlight the rect and shoe the tooltip
 */
 var xOffSet
 var yOffSet
 var text

 if (isAxis) {
   xOffSet = 0
   yOffSet = 40

   var date = d === 'Matrimonio igualitario' ? '21 de julio 2010' :
    d === 'Identidad de género' ? '23 de mayo 2012':
      d === 'Régimen de personal doméstico' ? '03 de abril 2013' :
        d === 'Reproducción médicamente asistida' ? '25 de julio 2013':
          d === 'Ley de trata y asistencia a las víctimas' ? '29 de abril 2008':
            d === 'Educación sexual integral' ? '23 de octubre 2006':
              d === 'Asignación universal' ? '16 de julio de 2015':
                d === 'Reforma Provisional' ? '26 de diciembre 2017' :
                  d === 'Subsidios a huérfanos por femicidio' ? '31 de mayo 2017' : '2018'

  var des = d === 'Matrimonio igualitario' ? 'Esta ley establece que el matrimonio tendrá los mismos requisitos y efectos, con independencia de que los contrayentes sean del mismo o de diferente sexo.' :
   d === 'Identidad de género' ? 'Esta Ley reconoce el derecho a tener la identidad sexual autopercibida en el documento nacional, autoriza el cambio del sexo y nombre que figuraban anteriormente, así como el acceso a la atención sanitaria integral de personas trans.':
     d === 'Régimen de personal doméstico' ? 'Esta ley regula en todo el territorio de la Nación las relaciones laborales que se entablen con los empleados y empleadas por el trabajo que presten en las casas particulares o en el ámbito de la vida familiar y que no importe para el empleador lucro o beneficio económico directo, cualquiera fuere la cantidad de horas diarias o de jornadas semanales en que sean ocupados para tales labores.' :
       d === 'Reproducción médicamente asistida' ? 'Esta ley tiene por objeto garantizar el acceso integral a los procedimientos y técnicas médico-asistenciales de reproducción médicamente asistida.':
         d === 'Ley de trata y asistencia a las víctimas' ? 'La presente ley tiene por objeto implementar medidas destinadas a prevenir y sancionar la trata de personas, asistir y proteger a sus víctimas. Establece que "el Estado nacional procurará que el primer contacto sea llevado  adelante por profesionales especializados en trata de personas del Ministerio de Justicia y Derechos Humanos" para que las personas víctimas de trata no se sientan condicionadas por la presencia policial en el operativo.':
           d === 'Educación sexual integral' ? 'Establece que todos los ciudadanos tienen derecho a recibir educación sexual integral en los establecimientos educativos públicos, de gestión estatal y privada de las jurisdicciones nacional, provincial, de la Ciudad Autónoma de Buenos Aires y municipal.':
             d === 'Asignación universal' ? 'Esta ley consiste en una prestación monetaria no retributiva de carácter mensual, que se abona a uno solo de los padres, tutor, curador o pariente por consanguinidad hasta el tercer grado, por cada menor de DIECIOCHO (18) años que se encuentre a su cargo o sin límite de edad cuando se trate de un discapacitado.':
               d === 'Reforma Provisional' ? 'Esta reforma cambió la fórmula de movilidad jubilatoria, que alcanza a 17 millones de personas, entre jubilados, pensionados, pensiones no contributivas, beneficiarios de asignaciones familiares y AUH. De una movilidad basada en variación de salarios y recaudación se pasó a una basada en la variación de índices de precios al consumidor y por la variación del RIPTE, un indicador del Ministerio de Trabajo que mide la evolución de los salarios estatales. También se pasó de un régimen semestral a uno trimestral, que redundó en una merma en las jubilaciónes y pensiones.' :
                 d === 'Subsidios a huérfanos por femicidio' ? 'Esta ley crea un régimen de reparación económica para hijos e hijas de víctimas de femicidio. Esa reparación será equivalente a un haber jubilatorio mínimo. Asimismo, se establece que los menores de 21 "tienen derecho a que el Estado nacional les asigne una cobertura integral de salud, la cual debe cubrir todas las necesidades de atención de su salud física y psíquica".' : 'El proyecto que despenaliza el aborto, tiene media sanción de la cámara de Diputados y será sancionada por el Senado el 8 de agosto.'

   text = '<strong>Ley:</strong> ' + d +
          '<br /><strong>Fecha de aprobacion:</strong> ' + date +
          '<br /><strong>Descripcion:</strong> ' + des
 } else {
   xOffSet = 150
   yOffSet = 80
   text = '<strong>Nombre:</strong> ' + d.nombre.replace(/_/g, ' ') +
          '<br /><strong>Bloque:</strong> ' + d.bloque +
          '<br /><strong>Distrito:</strong> ' + d.distrito
 }

 // Update the tooltip position and value
 d3.select('#tooltip')
   .style('left', (d3.event.pageX - xOffSet) + 'px')
   .style('top', (d3.event.pageY + yOffSet) + 'px')
   .select('#value')
   .html(() => { return text })

 // Show the tooltip
 d3.select('#tooltip').classed('hidden', false)
}

function mouseout (d) {
 /*
   On mouse out, remove the highlight
 */
 d3.select('#tooltip').classed('hidden', true)
}

function fillMap (d) {
  var law = document.getElementById('myList').value

  var l = datos.filter(dd => {
    // return dd.distrito === d.properties.provincia
    if (law === 'todas') {
      return dd.distrito === d.properties.provincia
    } else {
      return dd.asunto === law && dd.distrito === d.properties.provincia
    }
  })

  var votosPositivos = l.filter(dd => {
    return dd.voto === 0
  }).length

  return d3.interpolateRdYlGn(votosPositivos / l.length)
}

function wrap (text, width) {
  /*
  Break long label in multiple lines.
  This code was take from https://bl.ocks.org/mbostock/7555321
  Thanks to Mike Bostock!
  */
  text.each(function () {
    let text = d3.select(this)
    let words = text.text().split(/\s+/).reverse()
    let word
    let line = []
    let lineNumber = 0
    let lineHeight = 1.1
    let y = text.attr('y')
    let dy = 0

    let tspan = text.text(null)
      .append('tspan')
      .attr('x', 0)
      .attr('y', y)
      .attr('dy', dy + 'em')

    // eslint-disable-next-line
    while (word = words.pop()) {
      line.push(word)
      tspan.text(line.join(' '))
      if (tspan.node().getComputedTextLength() > width) {
        line.pop()
        tspan.text(line.join(' '))
        line = [word]
        tspan = text.append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word)
      }
    }
  })
}


d3.select('#vista-leyes').on('click', d => {
  plot()
    g.selectAll('.map')
    .attr('opacity', '0')
})

d3.select('#vista-actuales').on('click', d => {
  showActual = true
  plotActuales()
})

d3.select('#vista-histricos').on('click', d => {
  showActual = false
  plot()
})

d3.select('#vista-mapa').on('click', d => {
  plotMap()
})

// Update map colors
d3.select('#myList').on('change', d => {
  g.selectAll('path')
    .transition()
    .duration(500)
    .attr('fill', d => { return fillMap(d) })
})
