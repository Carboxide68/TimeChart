import { ScaleLinear, scaleLinear } from "d3-scale";
import { ResolvedCoreOptions, LineType } from '../options';
import { EventDispatcher, MinMax, convert } from '../utils';

export interface DataPoint {
    x: number;
    y: number;
}

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
    xDomain: MinMax;
    xScreen: MinMax;
    yDomains: MinMax[];
    yScreen: MinMax;
    xRange: MinMax | null = null;
    yRanges: MinMax[] | null = null;
    
    constructor(private options: ResolvedCoreOptions) {
        this.xDomain = {min: 0, max: 0};
        this.xScreen = {min: 0, max: 0};
        this.yScreen = {min: 0, max: 0};
        this.yDomains = options.series.map(_ => ({min: 0, max: 0}));
        if (options.xRange !== 'auto' && options.xRange !== 'synced' && options.xRange) {
            this.xDomain = {min: options.xRange.min, max: options.xRange.max};
        }
        options.yRanges.forEach( (yRange, i) => {
            if (yRange !== 'auto' && yRange) {
                this.yDomains[i] = {min: yRange.min, max: yRange.max};
            }
        });
    }

    resized = new EventDispatcher<(width: number, height: number) => void>();
    resize(width: number, height: number) {
        const op = this.options;
        this.xScreen = {min: op.paddingLeft, max: width - op.paddingRight};
        this.yScreen = {min: height - op.paddingBottom, max: op.paddingTop};

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
        const series = this.options.series.map(srs => srs.filter(s => s.data.length > 0)).filter(srs => srs.length > 0);
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
                    const currentDomain = this.xDomain;
                    const range = currentDomain.max - currentDomain.min;
                    this.xDomain.min = maxDomain - range;
                    this.xDomain.max =  maxDomain;
                } else { // Auto
                    this.xDomain.min = minDomain;
                    this.xDomain.max = maxDomain;
                }
            } else if (o.xRange && o.xRange !== 'synced') {
                this.xDomain.min = o.xRange.min;
                this.xDomain.max = o.xRange.max;
            }
        }

        this.yRanges = Array<MinMax>(o.yRanges.length);
        o.yRanges.forEach( (yRange, i) => {
            let mm: MinMax = {min: Infinity, max: -Infinity};
            for (const s of o.series[i]) {
                if (s.lineType === LineType.vLine || s.lineType == LineType.State) {
                    s.minmax = { min: Infinity, max: -Infinity };
                }
                let nmm = s.minmax;
                if (nmm === null || nmm === undefined) {
                    s.minmax = calcMinMaxY(s.data, 0, s.data.length);
                    nmm = s.minmax;
                }
                mm.min = Math.min(mm.min, nmm.min);
                mm.max = Math.max(mm.max, nmm.max);
            }
            this.yRanges![i] = mm;
            if (yRange === 'auto') {
                this.yDomains[i].min = mm.min;
                this.yDomains[i].max = mm.max;
            } else if (yRange) {
                this.yDomains[i].min = yRange.min;
                this.yDomains[i].max = yRange.max;
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
            x: convert(this.xDomain, this.xScreen, dataPoint.x),
            ys: this.yDomains.map(domain => convert(domain, this.yScreen, dataPoint.y)),
        }
    }
}
