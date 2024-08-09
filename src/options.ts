import TimeChart from './index';
import { ColorCommonInstance, ColorSpaceObject, rgb } from 'd3-color';
import { DataPointsBuffer } from './core/dataPointsBuffer';
import { DataPoint } from './core/renderModel';
import { TimeChartPlugin } from './plugins';
import * as zoomOptions from './chartZoom/options';

type ColorSpecifier = ColorSpaceObject | ColorCommonInstance | string

export interface AxisZoomOptions extends zoomOptions.AxisOptions {
    autoRange?: boolean;
}

export interface ResolvedAxisZoomOptions extends zoomOptions.ResolvedAxisOptions {
    autoRange: boolean;
}

export interface ZoomOptions {
    x?: AxisZoomOptions;
    ys?: AxisZoomOptions[];
}

export interface ResolvedZoomOptions {
    x?: ResolvedAxisZoomOptions;
    ys?: ResolvedAxisZoomOptions[];
}

interface ScaleBase {
    (x: number | {valueOf(): number}): number;
    domain(): number[] | Date[];
    range(): number[];
    copy(): this;
    domain(domain: Array<number>): this;
    range(range: ReadonlyArray<number>): this;
}

export interface TooltipOptions {
    enabled: boolean;
    xLabel: string;
    xFormatter: (x: number) => string;
}

type Range = { min: number, max: number } | 'auto' | null;

interface TimeChartRenderOptions {
    pixelRatio: number;
    lineWidth: number;
    backgroundColor: ColorSpecifier;
    color: ColorSpecifier;

    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;

    renderPaddingLeft: number;
    renderPaddingRight: number;
    renderPaddingTop: number;
    renderPaddingBottom: number;

    legend: boolean;
    tooltip: Partial<TooltipOptions>;

    xRange: Range | 'synced';
    yRanges: Range[];
    realTime: boolean;

    /** Milliseconds since `new Date(0)`. Every x in data are relative to this.
     *
     * Set this option and keep the absolute value of x small for higher floating point precision.
     **/
    baseTime: number;
    xScaleType: () => ScaleBase;

    debugWebGL: boolean;
}

export type TimeChartPlugins = Readonly<Record<string, TimeChartPlugin>>;
export type NoPlugin = Readonly<Record<string, never>>;

export type TimeChartOptions<TPlugins extends TimeChartPlugins> =
    TimeChartOptionsBase &
    (NoPlugin extends TPlugins ? {plugins?: Record<string, never>} : {plugins: TPlugins});

export interface TimeChartOptionsBase extends Partial<TimeChartRenderOptions> {
    series?: Partial<TimeChartSeriesOptions>[];
    zoom?: ZoomOptions;
}

export interface ResolvedCoreOptions extends TimeChartRenderOptions {
    series: TimeChartSeriesOptions[][];
}

export interface ResolvedOptions extends ResolvedCoreOptions {
    zoom: ResolvedZoomOptions;
}

export enum LineType {
    Line,
    Step,
    NativeLine,
    NativePoint,
    vLine,
    State,
};

export interface TimeChartSeriesOptions {
    data: DataPointsBuffer;
    lineWidth?: number;
    name: string;
    color?: ColorSpecifier;
    visible: boolean;
    opacity?: number;
    lineType: LineType;
    stepLocation: number;
    minmax?: { min: number, max: number };
    order: number,
    inLegend: boolean,
    labels: Map<number, string>,
    yAxisN: number,
}

export function resolveColorRGBA(color: ColorSpecifier): [number, number, number, number] {
    const rgbColor = typeof color === 'string' ? rgb(color) : rgb(color);
    return [rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255, rgbColor.opacity];
}
