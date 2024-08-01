import { ResolvedCoreOptions, TimeChartSeriesOptions, LineType } from '../options';
import { domainSearch, EventDispatcher } from '../utils';
import { CanvasLayer } from './canvasLayer';
import { ContentBoxDetector } from "./contentBoxDetector";
import { DataPoint, RenderModel } from './renderModel';

export class NearestPointModel {
    dataPoints = new Map<TimeChartSeriesOptions, DataPoint>();
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
                        this.dataPoints.set(s, s.data[pos - 1]);
                        continue;
                    }
                    const near: DataPoint[] = [];
                    if (pos > 0) {
                        near.push(s.data[pos - 1]);
                    }
                    if (pos < s.data.length) {
                        near.push(s.data[pos]);
                    }
                    const sortKey = (a: typeof near[0]) => Math.abs(a.x - domain);
                    near.sort((a, b) => sortKey(a) - sortKey(b));
                    const pxPoint = this.model.pxPoint(near[0]);
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
