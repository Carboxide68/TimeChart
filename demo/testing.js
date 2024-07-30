
window.addEventListener('load', (_) => {
  const el = document.getElementById('chart');
  const data = [];
  const data2 = [];
  let x = 0;
  for (let it = 0; it < 100; it++) {
      x += Math.random();
      data.push({x: it, y: 100000});
      data2.push({x: it, y: x});
  }
  const chart = new TimeChart(el, {
      
      series: [
        { 
          data: data, 
          name: 'Random', 
          lineType: TimeChart.LineType.vLine,
          lineWidth: 0.5,
        },
        { 
          data: data2, 
          name: 'Rising',
          lineType: TimeChart.LineType.Line,
        }
      ],
      xScaleType: d3.scaleLinear,
      tooltip: {enabled: true},
      zoom: {
        x: {
          autoRange: true,
        },
      },

  });
});
