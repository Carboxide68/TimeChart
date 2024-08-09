import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { format } from 'd3-format';
import { select } from "d3-selection";
import { TimeChartPlugin } from ".";

type MinMax = {min: number, max: number};
function scale(domain: MinMax, range: MinMax) {
    return scaleLinear([domain.min, domain.max], [range.min, range.max]);
}

export const d3Axis: TimeChartPlugin = {
    apply(chart) {
        // Multiple Yaxis
        const mult = chart.model.yDomains.length > 1;
        const d3Svg = select(chart.svgLayer.svgNode)
        const xg = d3Svg.append('g');
        const ygs = [d3Svg.append('g')];
        mult && ygs.push(d3Svg.append('g'));

        const m = chart.model;
        const xScale = scale(m.xDomain, m.xScreen);
        const yScale = scale(m.yDomains[0], m.yScreen);
        const xAxis = axisBottom(xScale);
        const yAxes = [axisLeft(yScale)];
        if (mult) {
            const yScale1 = scale(m.yDomains[1], m.yScreen);
            yAxes.push(axisRight(yScale1));
        }

        function update() {
            const xs = scale(m.xDomain, m.xScreen);
            const xts = chart.options.xScaleType()
                .domain(xs.domain().map(d => d + chart.options.baseTime))
                .range(xs.range());
            xAxis.scale(xts);
            xg.call(xAxis);

            for (let i = 0; i < yAxes.length; i++) {
                const yAxis = yAxes[i];
                const yScale = scale(m.yDomains[i], m.yScreen);
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
