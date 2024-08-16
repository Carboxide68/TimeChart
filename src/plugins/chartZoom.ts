import { ChartZoom } from "../chartZoom";
import core from "../core";
import { ResolvedZoomOptions, TimeChartPlugins, ZoomOptions } from "../options";
import { TimeChartPlugin } from ".";
import { MinMax } from "../utils";
import { ScaleLinear } from "d3-scale";

export class TimeChartZoom {
    constructor(chart: core<TimeChartPlugins>, public options: ResolvedZoomOptions) {
        this.registerZoom(chart)
    }

    private applyAutoRange(o: {domain: MinMax, autoRange: boolean, minDomain?: number, maxDomain?: number} | undefined, dataRange: MinMax | null) {
        if (!o)
            return;
        if (!o.autoRange) {
            delete o.minDomain;
            delete o.maxDomain;
            return;
        }
        let [min, max] = [o.domain.min, o.domain.max];
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

            if (o.ys) {
                (chart.model.yRanges ?? [null]).forEach((yRange, i) => {
                    this.applyAutoRange(o.ys![i], yRange);
                });
            z.update();
            }
        });
        z.onScaleUpdated(() => {
            if (chart.options.xRange !== 'synced')
                chart.options.xRange = null;
            chart.options.yRanges.forEach(yR => yR = null);
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
                    case 'x': {
                        const op = target[prop];
                        if (!op) return op;
                        return new Proxy(op, {
                            get: (target, prop2) => {
                                if (prop2 === 'domain') return chart.model.xDomain;
                                if (prop2 === 'range') return chart.model.xScreen;
                                return (target as any)[prop2] ?? (defaults as any)[prop2];
                            }

                        });
                    }
                    case 'ys': {
                        const op = target.ys;
                        if (!op) return op;
                        return new Proxy(op, {
                            get: (target, prop) => {
                                if (!isNaN(Number(prop))) {
                                    const t = target[Number(prop)];
                                    if (!t) return t;
                                    return new Proxy(target[Number(prop)], {
                                        get: (target, prop2) => {
                                            const idx = Number(prop);
                                            if (prop2 === 'domain') return chart.model.yDomains[idx];
                                            if (prop2 === 'range') return chart.model.yScreen;
                                            return (target as any)[prop2] ?? (defaults as any)[prop2];
                                    }
                                    })
                                } else return (target as any)[prop] ?? (defaults as any)[prop];
                            }
                            
                        })
                    }
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
