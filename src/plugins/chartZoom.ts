import { ChartZoom } from "../chartZoom";
import core from "../core";
import { MinMax } from "../core/renderModel";
import { AxisZoomOptions, ResolvedZoomOptions, TimeChartPlugins, ZoomOptions } from "../options";
import { TimeChartPlugin } from ".";
import { ScaleLinear } from "d3-scale";

export class TimeChartZoom {
    constructor(chart: core<TimeChartPlugins>, public options: ResolvedZoomOptions) {
        this.registerZoom(chart)
    }

    private applyAutoRange(o: {scale: ScaleLinear<number, number>, autoRange: boolean, minDomain?: number, maxDomain?: number} | undefined, dataRange: MinMax | null) {
        if (!o)
            return;
        if (!o.autoRange) {
            delete o.minDomain;
            delete o.maxDomain;
            return;
        }
        let [min, max] = o.scale.domain();
        if (dataRange) {
            min = Math.min(min, dataRange.min);
            max = Math.max(max, dataRange.max);
        }
        o.minDomain = min;
        o.maxDomain = max;
    }

    private registerZoom(chart: core<TimeChartPlugins>) {
        const o = this.options;
        const z = new ChartZoom(chart.el, o);
        chart.model.updated.on(() => {
            this.applyAutoRange(o.x, chart.model.xRange);

            (chart.model.yRanges ?? []).forEach((yRange, i) => {
                if (!o.ys) return;
                this.applyAutoRange(o.ys[i], yRange);
            });

            z.update();
        });
        z.onScaleUpdated(() => {
            chart.options.xRange = null;
            chart.options.yRanges.forEach(yRange => yRange = null);
            chart.options.realTime = false;
            chart.update();
        });
    }
}

const defaults = {
    autoRange: true,
} as const;

export class TimeChartZoomPlugin implements TimeChartPlugin<TimeChartZoom> {
    constructor(private options?: ZoomOptions) {
    }

    private resolveOptions(chart: core<TimeChartPlugins>): ResolvedZoomOptions {
        const o = this.options ?? {};
        return new Proxy(o, {
            get: (target, prop) => {
                switch (prop) {
                    case 'x':
                    case 'ys':
                        const op = target[prop];
                        if (!op)
                            return op;
                        switch (prop) {
                            case 'x': {
                                return new Proxy (op, {
                                    get: (target, prop2) => {
                                        if (prop2 === 'scale')
                                            return chart.model.xScale;
                                        return (target as any)[prop2] ?? (defaults as any)[prop2];
                                    }
                                });
                                break;
                            }
                            case 'ys': {
                                return new Proxy (op, {
                                    get: (target, index) => {
                                        let idx = Number(index);
                                        if (isNaN(idx)) {
                                            return (target as any)[index];
                                        }
                                        return new Proxy((target as AxisZoomOptions[])[idx], {
                                            get: (target, prop2) => {
                                                if (prop2 === 'scale')
                                                    return chart.model.yScales[idx];
                                                return (target as any)[prop2] ?? (defaults as any)[prop2];
                                            }
                                        });
                                    }
                                });
                            }
                        };
                    case 'eventElement':
                        return chart.contentBoxDetector.node;
                    default:
                        return (target as any)[prop];
                }
            }
        }) as ResolvedZoomOptions;
    }

    apply(chart: core<TimeChartPlugins>) {
        return new TimeChartZoom(chart, this.resolveOptions(chart));
    }
}
