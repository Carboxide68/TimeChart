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
        for (let tmp in options.series) {
            this.yScales.push(scaleLinear());
        }
        if (options.xRange !== 'auto' && options.xRange) {
            this.xScale.domain([options.xRange.min, options.xRange.max])
        }
        options.yRanges.forEach( (yRange, i) => {
            if (yRange !== 'auto' && yRange) {
                this.yScales[i].domain([yRange.min, yRange.max])
            }
        });
    }

    resized = new EventDispatcher<(width: number, height: number) => void>();
    resize(width: number, height: number) {
        const op = this.options;
        this.xScale.range([op.paddingLeft, width - op.paddingRight]);
        this.yScales.map((yScale) => (yScale.range([height - op.paddingBottom, op.paddingTop])));

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
                s.data._synced();
            }
        }
    }

    updateModel() {
        const series = this.options.series;
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

        this.yRanges = Array<MinMax>(o.yRanges.length);
        o.yRanges.forEach( (yRange, i) => {
            let mm: MinMax = {min: Infinity, max: -Infinity};
            for (const s of o.series[i]) {
                if (s.lineType === LineType.vLine) {
                    s.minmax = { min: Infinity, max: -Infinity };
                }
                let nmm = s.minmax;
                if (nmm === null || nmm === undefined) {
                    s.minmax = calcMinMaxY(s.data, 0, s.data.length);
                    nmm = s.minmax;
                }
                if (mm.min > nmm.min)
                    mm.min = nmm.min;
                if (mm.max < nmm.max)
                    mm.max = nmm.max;
            }
            this.yRanges![i] = mm;
            if (yRange === 'auto') {
                this.yScales[i].domain([mm.min, mm.max]);
            } else if (yRange) {
                this.yScales[i].domain([yRange.min, yRange.max])
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
