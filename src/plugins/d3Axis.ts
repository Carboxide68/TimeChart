import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { format } from 'd3-format';
import { select } from "d3-selection";
import { TimeChartPlugin } from ".";

export const d3Axis: TimeChartPlugin = {
    apply(chart) {
        // Multiple Yaxis
        const mult = chart.model.yScales.length > 1;
        const d3Svg = select(chart.svgLayer.svgNode)
        const xg = d3Svg.append('g');
        const ygs = [d3Svg.append('g')];
        mult && ygs.push(d3Svg.append('g'));

        const xAxis = axisBottom(chart.model.xScale);
        const yAxes = [axisLeft(chart.model.yScales[0])];
        mult && yAxes.push(axisRight(chart.model.yScales[1]));

        function update() {
            const xs = chart.model.xScale;
            const xts = chart.options.xScaleType()
                .domain(xs.domain().map(d => d + chart.options.baseTime))
                .range(xs.range());
            xAxis.scale(xts);
            xg.call(xAxis);

            for (let i = 0; i < yAxes.length; i++) {
                const yAxis = yAxes[i];
                const yScale = chart.model.yScales[i];
                const yg = ygs[i];
                yAxis.scale(yScale);
                yAxis.tickFormat(format(".3s"))
                yg.call(yAxis);
            }
        }

        chart.model.updated.on(update);

        chart.model.resized.on((w, h) => {
            const op = chart.options;
            xg.attr('transform', `translate(0, ${h - op.paddingBottom})`);
            ygs[0].attr('transform', `translate(${op.paddingLeft}, 0)`);
            mult && ygs[1].attr('transform', `translate(${w - op.paddingRight}, 0)`);

            update()
        });
    }
}
