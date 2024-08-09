import { EventDispatcher, MinMax, convert } from '../utils';
import { CapableElement, DIRECTION, dirOptions, ResolvedOptions } from "./options";
import { applyNewDomain, clamp, scaleK } from './utils';

export class ChartZoomWheel {
    public scaleUpdated = new EventDispatcher();

    constructor(private el: CapableElement, private options: ResolvedOptions) {
        const eventEl = options.eventElement;
        eventEl.addEventListener('wheel', ev => this.onWheel(ev));
    }

    private onWheel(event: WheelEvent) {
        event.preventDefault();

        let deltaX = event.deltaX;
        let deltaY = event.deltaY;
        switch (event.deltaMode) {
            case 1: // line
                deltaX *= 30;
                deltaY *= 30;
                break;
            case 2: // page
                deltaX *= 400;
                deltaY *= 400;
                break;
        }
        const transform = {
            [DIRECTION.X]: {
                translate: 0,
                zoom: 0,
            },
            [DIRECTION.Y]: {
                translate: 0,
                zoom: 0,
            }
        };
        if (event.ctrlKey || event.metaKey) { // zoom
            if (event.altKey) {
                transform[DIRECTION.X].zoom = deltaX;
                transform[DIRECTION.Y].zoom = deltaY;
            } else {
                transform[DIRECTION.X].zoom = (deltaX + deltaY);
            }
        } else { // translate
            if (event.altKey) {
                transform[DIRECTION.X].translate = deltaX;
                transform[DIRECTION.Y].translate = deltaY;
            } else {
                transform[DIRECTION.X].translate = (deltaX + deltaY);
            }
        }
        const boundingRect = this.el.getBoundingClientRect();
        const origin = {
            [DIRECTION.X]: event.clientX - boundingRect.left,
            [DIRECTION.Y]: event.clientY - boundingRect.top,
        }

        let changed = false;
        for (const { dir, op } of dirOptions(this.options)) {
            const domain = op.domain;
            const k = scaleK(op.domain, op.range);
            const trans = transform[dir];
            const transOrigin = convert(op.range, op.domain, origin[dir]);
            trans.translate *= k;
            trans.zoom *= 0.002;
            if (event.shiftKey) {
                trans.translate *= 5;
                trans.zoom *= 5;
            }

            const extent = domain.max - domain.min;
            const translateCap = 0.4 * extent;
            trans.translate = clamp(trans.translate, -translateCap, translateCap);

            const zoomCap = 0.5;
            trans.zoom = clamp(trans.zoom, -zoomCap, zoomCap);

            const newDomain = {
                min: domain.min + trans.translate + (domain.min - transOrigin) * trans.zoom,
                max: domain.max + trans.translate + (domain.max - transOrigin) * trans.zoom,
            };
            if (applyNewDomain(op, newDomain)) {
                changed = true;
            }
        }

        if (changed) {
            this.scaleUpdated.dispatch();
        }
    }
}
