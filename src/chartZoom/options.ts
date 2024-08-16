import { ScaleLinear } from "d3-scale";

type MinMax = {min: number, max: number};
export enum DIRECTION {
    UNKNOWN, X, Y,
}

export interface Point {
    [DIRECTION.X]: number;
    [DIRECTION.Y]: number;
}

export interface AxisOptions {
    domain: MinMax;
    range: MinMax;
    minDomain?: number;
    maxDomain?: number;
    minDomainExtent?: number;
    maxDomainExtent?: number;
}

export interface ResolvedAxisOptions {
    domain: MinMax;
    range: MinMax;
    minDomain: number;
    maxDomain: number;
    minDomainExtent: number;
    maxDomainExtent: number;
}

export interface ResolvedOptions {
    x?: ResolvedAxisOptions;
    ys?: ResolvedAxisOptions[];
    panMouseButtons: number;
    touchMinPoints: number;
    eventElement: CapableElement;
}

export interface ChartZoomOptions {
    x?: AxisOptions;
    ys?: AxisOptions[];
    panMouseButtons?: number;
    touchMinPoints?: number;
    eventElement?: CapableElement;
}

export interface CapableElement extends Element, ElementCSSInlineStyle {
    addEventListener<K extends keyof GlobalEventHandlersEventMap>(type: K, listener: (this: CapableElement, ev: GlobalEventHandlersEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
};

export function dirOptions(options: ResolvedOptions) {
    return [
        { dir: DIRECTION.X, op: options.x },
        ...(options.ys ?? [undefined]).map(y => ({ dir: DIRECTION.Y, op: y })),
    ].filter(i => i.op !== undefined) as {dir: DIRECTION.X | DIRECTION.Y, op: ResolvedAxisOptions}[];
}
