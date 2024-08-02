import { TimeChartSeriesOptions, TooltipOptions, LineType } from "../options";
import { TimeChartPlugin } from ".";
import { indexOfSorted } from "../utils";
import core from "../core";

type ItemElements = { item: HTMLElement; example: HTMLElement; name: HTMLElement, value: HTMLElement }

export class Tooltip {
    tooltip: HTMLElement;

    xItem: ItemElements;
    items = new Map<TimeChartSeriesOptions, ItemElements>();
    itemContainer: HTMLElement;

    chartOptions;

    constructor(chart: core, public readonly options: TooltipOptions) {
        this.chartOptions = chart.options;

        const mouseOffset = 12;

        this.tooltip = document.createElement('chart-tooltip');

        const ls = this.tooltip.style;
        ls.position = 'absolute';
        ls.visibility = "hidden"

        const legendRoot = this.tooltip.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
:host {
    background: var(--background-overlay, white);
    border: 1px solid hsl(0, 0%, 80%);
    border-radius: 3px;
    padding: 2px 2px;
}
.item {
    user-select: none;
}
.out-of-range.item {
    display: none;
}
td {
    padding: 0px 5px;
}
.name {
    margin-right: 10px;
    max-width: 100px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}
.example {
    width: 6px;
    height: 6px;
}
.value {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-width: 100px;
    max-width: var(--max-width, 100px);
    text-align: right;
}
.x-not-aligned .value {
    opacity: 0.4;
}
`;
        legendRoot.appendChild(style);


        const table = document.createElement("table");

        this.xItem = this.createItemElements(this.options.xLabel);
        table.appendChild(this.xItem.item);

        legendRoot.appendChild(table);

        this.itemContainer = table;
        this.update();
        chart.el.shadowRoot!.appendChild(this.tooltip);

        chart.model.updated.on(() => this.update());

        chart.model.disposing.on(() => {
            chart.el.shadowRoot!.removeChild(this.tooltip);
        })

        chart.nearestPoint.updated.on(() => {
            if (!options.enabled || chart.nearestPoint.dataPoints.size == 0) {
                ls.visibility = "hidden";
                return;
            }

            ls.visibility = "visible";

            const p = chart.nearestPoint.lastPointerPos!;
            const tooltipRect = this.tooltip.getBoundingClientRect();
            let left = p.x - tooltipRect.width - mouseOffset;
            let top = p.y - tooltipRect.height - mouseOffset;

            if (left < 0)
                left = p.x + mouseOffset;

            if (top < 0)
                top = p.y + mouseOffset;

            ls.left = left + "px";
            ls.top = top + "px";

            // display X for the data point that is the closest to the pointer
            let minPointerDistance = Number.POSITIVE_INFINITY;
            let displayingX: number | null = null;
            for (const [s, d] of chart.nearestPoint.dataPoints) {
                const px = chart.model.pxPoint(d.dp);
                const dx = px.x - p.x;
                const dy = px.ys[s.yAxisN] - p.y;
                const dis = Math.sqrt(dx * dx + dy * dy);
                if (dis < minPointerDistance) {
                    minPointerDistance = dis;
                    displayingX = d.dp.x;
                }
            }

            const xFormatter = options.xFormatter;
            this.xItem.value.textContent = xFormatter(displayingX!);

            for (const srs of chart.options.series) {
                for (const s of srs) {
                    if (!s.visible)
                        continue;

                    let point = chart.nearestPoint.dataPoints.get(s);
                    let item = this.items.get(s);
                    if (!item) continue;
                    if (s.lineType == LineType.State) {
                        if (!s.labels) continue;
                        if (point) {
                            item.value.textContent = s.labels.get(point.dp.y) ?? "";
                            s.stepLocation = point.i;
                            //s.stepLocation = s.data.indexOf(point);
                        } else
                            item.value.textContent = "";
                        continue;
                    }
                    item.item.classList.toggle('out-of-range', !point);
                    if (point) {
                        item.value.textContent = point.dp.y.toLocaleString();
                        item.item.classList.toggle('x-not-aligned', point.dp.x !== displayingX);
                    }
                }
            }
        });
    }

    private createItemElements(label: string): ItemElements {
        const item = document.createElement('tr');
        item.className = 'item';
        const exampleTd = document.createElement('td');
        const example = document.createElement('div');
        example.className = 'example';
        exampleTd.appendChild(example)
        item.appendChild(exampleTd);
        const name = document.createElement('td');
        name.className = "name";
        name.textContent = label;
        item.appendChild(name);
        const value = document.createElement('td');
        value.className = "value";
        item.appendChild(value);

        return { item, example, name, value };
    }

    update() {
        for (const srs of this.chartOptions.series) {
            for (const s of srs) {
                if (s.lineType == LineType.vLine) continue;
                if (!this.items.has(s)) {
                    const itemElements = this.createItemElements(s.name);
                    this.itemContainer.appendChild(itemElements.item);
                    this.items.set(s, itemElements);
                }

                const item = this.items.get(s)!;
                item.example.style.backgroundColor = (s.color ?? this.chartOptions.color).toString();
                item.item.style.display = s.visible ? "" : "none";
            }
        }
    }
}

const defaultOptions: TooltipOptions = {
    enabled: false,
    xLabel: "X",
    xFormatter: x => x.toLocaleString(),
};

export class TimeChartTooltipPlugin implements TimeChartPlugin<Tooltip> {
    options: TooltipOptions;
    constructor(options?: Partial<TooltipOptions>) {
        if (!options)
            options = {};
        if (!defaultOptions.isPrototypeOf(options))
            Object.setPrototypeOf(options, defaultOptions);
        this.options = options as TooltipOptions;
    }

    apply(chart: core) {
        return new Tooltip(chart, this.options);
    }
}
