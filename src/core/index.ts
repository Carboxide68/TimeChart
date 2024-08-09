import { LineType, NoPlugin, ResolvedCoreOptions, TimeChartOptions, TimeChartOptionsBase, TimeChartPlugins, TimeChartSeriesOptions } from '../options';
import { quantizeColor } from '../utils';
import { rgb } from 'd3-color';
import { scaleTime } from 'd3-scale';
import { TimeChartPlugin } from '../plugins';
import { CanvasLayer } from './canvasLayer';
import { ContentBoxDetector } from "./contentBoxDetector";
import { NearestPointModel } from './nearestPoint';
import { RenderModel } from './renderModel';
import { SVGLayer } from './svgLayer';
import { DataPointsBuffer } from './dataPointsBuffer';


const defaultOptions = {
    pixelRatio: window.devicePixelRatio,
    lineWidth: 1,
    backgroundColor: rgb(0, 0, 0, 0),
    paddingTop: 10,
    paddingRight: 45,
    paddingLeft: 45,
    paddingBottom: 20,
    renderPaddingTop: 10,
    renderPaddingRight: 45,
    renderPaddingLeft: 45,
    renderPaddingBottom: 20,
    xRange: 'auto',
    yRanges: ['auto'],
    realTime: false,
    baseTime: 0,
    xScaleType: scaleTime,
    debugWebGL: false,
    forceWebGL1: false,
    legend: true,
} as const;

const defaultSeriesOptions = {
    name: '',
    color: null,
    visible: true,
    lineType: LineType.Line,
    opacity: null,
    stepLocation: 1.,
    inLegend: true,
    minmax: null,
} as const;

type TPluginStates<TPlugins> = { [P in keyof TPlugins]: TPlugins[P] extends TimeChartPlugin<infer TState> ? TState : never };

function completeSeriesOptions(s: Partial<TimeChartSeriesOptions>, series_index: number): TimeChartSeriesOptions {
    if (s.lineType == LineType.State) {
        s.data = s.data ? DataPointsBuffer._from_array(s.data.map( d => { return {x: d.x, y: quantizeColor(d.y) } })) : new DataPointsBuffer();
        if (s.labels) {
            let labelsProto = new Map<any, string>(Object.entries(s.labels as Object));
            s.labels = new Map<number, string>([]);
            labelsProto.forEach( (v, k) => s.labels!.set(quantizeColor(k), v));
        }
    } else
        s.data = s.data ? DataPointsBuffer._from_array(s.data) : new DataPointsBuffer();
    s.yAxisN = series_index;
    if (!s.order)
        switch (s.lineType ?? LineType.Line) {
            case LineType.Line:
            case LineType.NativeLine:
            case LineType.NativePoint:
            case LineType.Step:
                s.order = 1;
                break;
            case LineType.vLine:
                s.order = 3;
                break;
            case LineType.State:
                s.order = -1;
        };
    Object.setPrototypeOf(s, defaultSeriesOptions);
    return s as TimeChartSeriesOptions;
}

function completeOptions(el: Element, options?: TimeChartOptionsBase): ResolvedCoreOptions {
    const dynamicDefaults = {
        series: [[]] as TimeChartSeriesOptions[][],
        color: getComputedStyle(el).getPropertyValue('color'),
    }
    const o = Object.assign({}, dynamicDefaults, options);
    o.yRanges = o.series.map( (_, i) => (o.yRanges && o.yRanges[i]) ?? 'auto');
    o.series = o.series.map((srs, i) => srs.map((s) => completeSeriesOptions(s, i)));
    Object.setPrototypeOf(o, defaultOptions);
    return o as ResolvedCoreOptions;
}

export default class TimeChart<TPlugins extends TimeChartPlugins=NoPlugin> {
    protected readonly _options: ResolvedCoreOptions;
    get options() { return this._options; }

    readonly model: RenderModel;
    readonly canvasLayer: CanvasLayer;
    readonly svgLayer: SVGLayer;
    readonly contentBoxDetector: ContentBoxDetector;
    readonly nearestPoint: NearestPointModel;
    readonly plugins: TPluginStates<TPlugins>;
    disposed = false;

    constructor(public el: HTMLElement, options?: TimeChartOptions<TPlugins>) {
        const coreOptions = completeOptions(el, options);

        this.model = new RenderModel(coreOptions);
        const shadowRoot = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.innerText = `
:host {
    contain: size layout paint style;
    position: relative;
}`
        shadowRoot.appendChild(style);

        this.canvasLayer = new CanvasLayer(el, coreOptions, this.model);
        this.svgLayer = new SVGLayer(el, this.model);
        this.contentBoxDetector = new ContentBoxDetector(el, this.model, coreOptions);
        this.nearestPoint = new NearestPointModel(this.canvasLayer, this.model, coreOptions, this.contentBoxDetector);
        this._options = coreOptions;

        this.plugins = Object.fromEntries(
            Object.entries(options?.plugins ?? {}).map(([name, p]) => [name, p.apply(this)])
        ) as TPluginStates<TPlugins>;

        this.onResize();

        const resizeHandler = () => this.onResize();
        window.addEventListener('resize', resizeHandler);
        this.model.disposing.on(() => {
            window.removeEventListener('resize', resizeHandler);
            shadowRoot.removeChild(style);
        })
    }

    onResize() {
        this.model.resize(this.el.clientWidth, this.el.clientHeight);
    }

    update() {
        if (this.disposed) {
            throw new Error('Cannot update after dispose.');
        }

        // fix dynamic added series
        for (let j = 0; j < this.options.series.length; j++) {
            for (let i = 0; i < this.options.series[j].length; i++) {
                const s = this.options.series[j][i];
                if (!defaultSeriesOptions.isPrototypeOf(s)) {
                    this.options.series[j][i] = completeSeriesOptions(s, j);
                }
            }
        }

        this.model.requestRedraw();
    }

    syncX(domain: {min: number, max: number}) {
        this.options.xRange = 'synced';
        this.model.xDomain = domain;
    }

    dispose() {
        this.model.dispose();
        this.disposed = true;
    }
}
