
const colors = [
  "red", "green", "blue",
];

const labels = {
  "red": "Red zone!",
  "green": "Nature zone",
  "blue": "The sea",
};

window.addEventListener('load', (_) => {
  const el = document.getElementById('chart');
  const el2 = document.getElementById('chart2');
  const data = [];
  const data2 = [];
  let data3 = [];
  let x = 0;
  for (let it = 0; it < 100; it++) {
      x += Math.random();
      data.push({x: it, y: 100000});
      data2.push({x: it, y: x});
      if (Math.random() > 0.5) continue;
      data3.push({x: it, y: colors[Math.floor(Math.random() * colors.length)]});
  }
  data3[0].y = "red";
  data3[1].y = "green";
  data3[2].y = "blue";
  const chart = new TimeChart(el, {
      series: [[
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
      ],[
        {
          data: data3,
          name: 'States',
          lineType: TimeChart.LineType.State,
          labels: labels,
        },
      ]],
      xScaleType: d3.scaleLinear,
      tooltip: {enabled: true},
      zoom: {
        x: {
          autoRange: true,
        },
        ys: [{
          autoRange: true,
          autoRange: true,
          autoRange: true,
        }],
      },

  });
  const chart2 = new TimeChart(el2, {
      series: [[
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
      ],[
        {
          data: data3,
          name: 'States',
          lineType: TimeChart.LineType.State,
          labels: labels,
        },
      ]],
      xScaleType: d3.scaleLinear,
      tooltip: {enabled: true},
      zoom: {
        x: {
          autoRange: true,
        },
        ys: [{
          autoRange: true,
          autoRange: true,
          autoRange: true,
        }],
      },
  });
  const xdomain = {min: 0, max: 100};
  chart.syncX(xdomain);
  chart2.syncX(xdomain);
  //chart.onResize()
  //chart2.onResize()
});
