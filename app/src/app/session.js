// 40+ minute sessions are split into ~12 minute segments with an offered break (design.md §2.1).
export const SEGMENT_MS = 12 * 60 * 1000;

let segmentStart = Date.now();

export const segmentDue = () => Date.now() - segmentStart >= SEGMENT_MS;
export const resetSegment = () => { segmentStart = Date.now(); };
