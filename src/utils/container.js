import { getRowsCount } from "./other.js";

export function getContainerHeight(items, yPerPx, cols) {
  return getRowsCount(items, cols) * yPerPx;
}

export function getContainerWidth(items, xPerPx, rows) {
  return getRowsCount(items, rows) * xPerPx;
}
