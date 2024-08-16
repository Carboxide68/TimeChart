import { ScaleLinear, scaleLinear } from "d3-scale";
import { ResolvedCoreOptions, LineType } from '../options';
import { EventDispatcher } from '../utils';

export interface DataPoint {
    x: number;
    y: number;
}

export interface MinMax { min: number; max: number; }

function calcMinMaxY(arr: DataPoint[], start: number, end: number): MinMax {
    let max = -Infinity;
    let min = Infinity;
    for (let i = start; i < end; i++) {
        const v = arr[i].y;
        if (v > max) max = v;
        if (v < min) min = v;
    }
    return { max, min };
}

function unionMinMax(...items: MinMax[]) {
    return {
        min: Math.min(...items.map(i => i.min)),
        max: Math.max(...items.map(i => i.max)),
    };
}

export class RenderModel {
    xScale = scaleLinear();
    yScales: ScaleLinear<number, number, never>[];
    xRange: MinMax | null = null;
    yRanges: MinMax[] | null = null;

    constructor(private options: ResolvedCoreOptions) {
        this.yScales = [];
        this.yScales = this.options.series.map(_ => scaleLinear());
        if (options.xRange !== 'auto' && options.xRange) {
            this.xScale.domain([options.xRange.min, options.xRange.max])
        }
        options.yRanges.forEach( (yRange, i) => {
            if (yRange && yRange !== 'auto') {
                this.yScales[i].domain([yRange.min, yRange.max])
            }
        });
    }

    resized = new EventDispatcher<(width: number, height: number) => void>();
    resize(width: number, height: number) {
        const op = this.options;
        this.xScale.range([op.renderPaddingLeft, width - op.renderPaddingRight]);
        this.yScales.map((yScale) => (yScale.range([height - op.renderPaddingBottom, op.renderPaddingTop])));

        this.resized.dispatch(width, height)
        this.requestRedraw()
    }

    updated = new EventDispatcher();
    disposing = new EventDispatcher();
    readonly abortController = new AbortController();

    dispose() {
        if (!this.abortController.signal.aborted) {
            this.abortController.abort();
            this.disposing.dispatch();
        }
    }

    update() {
        this.updateModel();
        this.updated.dispatch();
        for (const srs of this.options.series) {
            for (const s of srs) {
                s.minmax = null;
                s.data._synced();
            }
        }
    }

    updateModel() {
        const series = this.options.series.map(srs => srs.filter(s => s.data.length > 0 )).filter(srs => srs.length > 0);
        if (series.length === 0) {
            return;
        }

        const o = this.options;

        {
            const maxDomain = Math.max(...series.flatMap(srs => srs.map(s => s.data[s.data.length - 1].x)));
            const minDomain = Math.min(...series.flatMap(srs => srs.map(s => s.data[0].x)));
            this.xRange = { max: maxDomain, min: minDomain };
            if (this.options.realTime || o.xRange === 'auto') {
                if (this.options.realTime) {
                    const currentDomain = this.xScale.domain();
                    const range = currentDomain[1] - currentDomain[0];
                    this.xScale.domain([maxDomain - range, maxDomain]);
                } else { // Auto
                    this.xScale.domain([minDomain, maxDomain]);
                }
            } else if (o.xRange) {
                this.xScale.domain([o.xRange.min, o.xRange.max])
            }
        }
        this.yRanges = new Array<MinMax>(o.yRanges.length);
        o.yRanges.forEach( (yRange, i) => {
            let min = Infinity;
            let max = -Infinity;
            o.series[i].forEach(s => {
                if (s.minmax === null) {
                    s.minmax = calcMinMaxY(s.data, 0, s.data.length);
                }
                if (s.minmax.min < min) min = s.minmax.min;
                if (s.minmax.max > max) max = s.minmax.max;
            });
            this.yRanges![i] = {min, max};

            if (yRange === 'auto') {
                this.yScales[i].domain([min, max]).nice();
            } else if (yRange) {
                this.yScales[i].domain([yRange.min, yRange.max]);
            }
        });
    }

    private redrawRequested = false;
    requestRedraw() {
        if (this.redrawRequested) {
            return;
        }
        this.redrawRequested = true;
        const signal = this.abortController.signal;
        requestAnimationFrame((time) => {
            this.redrawRequested = false;
            if (!signal.aborted) {
                this.update();
            }
        });
    }

    pxPoint(dataPoint: DataPoint) {
        return {
            x: this.xScale(dataPoint.x)!,
            ys: this.yScales.map((yScale) => yScale(dataPoint.y)!),
        }
    }
}
