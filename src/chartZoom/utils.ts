import { ScaleLinear } from 'd3-scale';
import { ResolvedAxisOptions } from './options';

type MinMax = {min: number, max: number};
export function zip<T1, T2>(...rows: [T1[], T2[]]) {
    return [...rows[0]].map((_, c) => rows.map(row => row[c])) as [T1, T2][];
}

/**
 * least squares
 *
 * beta^T = [b, k]
 * X = [[1, x_1],
 *      [1, x_2],
 *      [1, x_3], ...]
 * Y^T = [y_1, y_2, y_3, ...]
 * beta = (X^T X)^(-1) X^T Y
 * @returns `{k, b}`
 */
export function linearRegression(data: { x: number, y: number }[]) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    const len = data.length;

    for (const p of data) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    }
    const det = (len * sumXX) - (sumX * sumX);
    const k = det === 0 ? 0 : ((len * sumXY) - (sumX * sumY)) / det;
    const b = (sumY - k * sumX) / len;
    return { k, b };
}

export function scaleK(domain: MinMax, range: MinMax) {
    return (domain.max - domain.min) / (range.max - range.min);
}

/**
 * @returns If domain changed
 */
export function applyNewDomain(op: ResolvedAxisOptions, domain: MinMax) {
    const inExtent = domain.max - domain.min;

    const prev = {min: op.domain.min, max: op.domain.max};
    if ((prev.max - prev.min) * inExtent <= 0) {
        // forbidden reverse direction.
        return false;
    }

    const extent = Math.min(op.maxDomainExtent, op.maxDomain - op.minDomain, Math.max(op.minDomainExtent, inExtent));
    const deltaE = (extent - inExtent) / 2;
    domain.min -= deltaE;
    domain.max += deltaE;

    const deltaO = Math.min(Math.max(op.minDomain - domain.min, 0), op.maxDomain - domain.max);
    domain.min += deltaO;
    domain.max += deltaO;

    const eps = extent * 1e-6;
    op.domain.min = domain.min;
    op.domain.max = domain.max;
    return Math.abs(domain.max - prev.max) > eps || Math.abs(domain.min - prev.min) > eps;
}

export function variance(data: number[]) {
    const mean = data.reduce((a, b) => a + b)/ data.length;
    return data.map(d => (d - mean) ** 2).reduce((a, b) => a + b) / data.length;
}

export function clamp(value: number, min: number, max: number) {
    if (value > max) {
        return max;
    } else if (value < min) {
        return min;
    }
    return value;
}
