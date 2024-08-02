import { ResolvedCoreOptions, TimeChartSeriesOptions, LineType } from '../options';
import { domainSearch, EventDispatcher } from '../utils';
import { CanvasLayer } from './canvasLayer';
import { ContentBoxDetector } from "./contentBoxDetector";
import { DataPoint, RenderModel } from './renderModel';

export class NearestPointModel {
    dataPoints = new Map<TimeChartSeriesOptions, {dp: DataPoint, i: number}>();
    lastPointerPos: null | {x: number, y: number} = null;

    updated = new EventDispatcher();

    constructor(
        private canvas: CanvasLayer,
        private model: RenderModel,
        private options: ResolvedCoreOptions,
        detector: ContentBoxDetector
    ) {
        detector.node.addEventListener('mousemove', ev => {
            const rect = canvas.canvas.getBoundingClientRect();
            this.lastPointerPos = {
                x: ev.clientX - rect.left,
                y: ev.clientY - rect.top,
            };
            this.adjustPoints();
        });
        detector.node.addEventListener('mouseleave', ev => {
            this.lastPointerPos = null;
            this.adjustPoints();
        });

        model.updated.on(() => this.adjustPoints());
    }

    adjustPoints() {
        if (this.lastPointerPos === null) {
            this.dataPoints.clear();
        } else {
            const domain = this.model.xScale.invert(this.lastPointerPos.x);
            for (let i = 0; i < this.options.series.length; i++) {
                const srs = this.options.series[i];
                for (const s of srs) {
                    if (s.data.length == 0 || !s.visible) {
                        this.dataPoints.delete(s);
                        continue;
                    }
                    const pos = domainSearch(s.data, 0, s.data.length, domain, d => d.x);
                    if (s.lineType == LineType.State && pos > 0) {
                        this.dataPoints.set(s, { dp: s.data[pos - 1], i: pos - 1});
                        continue;
                    }
                    const near: {dp: DataPoint, i: number}[] = [];
                    if (pos > 0) {
                        near.push({dp: s.data[pos - 1], i: pos - 1});
                    }
                    if (pos < s.data.length) {
                        near.push({ dp: s.data[pos], i: pos});
                    }
                    const sortKey = (a: typeof near[0]) => Math.abs(a.dp.x - domain);
                    near.sort((a, b) => sortKey(a) - sortKey(b));
                    const pxPoint = this.model.pxPoint(near[0].dp);
                    const width = this.canvas.canvas.clientWidth;
                    const height = this.canvas.canvas.clientHeight;

                    if (pxPoint.x <= width && pxPoint.x >= 0 &&
                        pxPoint.ys[i] <= height && pxPoint.ys[i] >= 0) {
                        this.dataPoints.set(s, near[0]);
                    } else {
                        this.dataPoints.delete(s);
                    }
                }
            }
        }
        this.updated.dispatch();
    }
}
