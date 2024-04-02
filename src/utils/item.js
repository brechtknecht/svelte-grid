import { makeMatrix, makeMatrixFromItemsIgnore, findCloseBlocks, findItemsById, makeMatrixFromItems } from "./matrix.js";
import { getColsCount, getRowsCount } from "./other.js";

export function getItemById(id, items) {
  return items.find((value) => value.id === id);
}

// Function to calculate the distance between two points
export function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function findFreeSpaceForItem(matrix, item, currentPosition) {
  const cols = matrix[0].length;
  const rows = matrix.length;
  let bestDistance = Infinity;
  let bestPosition = null;

  currentPosition = { x : item.x, y: item.y}

  // Find the closest empty space to the current position of the item.
  for (let y = 0; y < rows; y++) {
      for (let x = 0; x <= cols - item.w; x++) {
          let isSpaceFree = true;
          for (let i = 0; i < item.h; i++) {
              for (let j = 0; j < item.w; j++) {
                  if (y + i >= rows || matrix[y + i][x + j] !== undefined) {
                      isSpaceFree = false;
                      break;
                  }
              }
              if (!isSpaceFree) break;
          }

          if (isSpaceFree) {
              const distance = Math.abs(x - currentPosition.x) + Math.abs(y - currentPosition.y);
              if (distance < bestDistance) {
                  bestDistance = distance;
                  bestPosition = { x, y };
              }
          }
      }
  }

  // Move the item to the best position found, if any.
  if (bestPosition) {
      const { x, y } = bestPosition;
      // Calculate direction of movement needed
      const xDirection = currentPosition.x < x ? 1 : -1;
      const yDirection = currentPosition.y < y ? 1 : -1;

      // Move items out of the way if needed, row by row and column by column
      for (let movedY = currentPosition.y; yDirection > 0 ? movedY < y : movedY > y; movedY += yDirection) {
          for (let movedX = currentPosition.x; xDirection > 0 ? movedX < x : movedX > x; movedX += xDirection) {
              if (matrix[movedY][movedX] !== undefined) {
                  // Temporarily store the item being moved
                  const temp = matrix[movedY][movedX];
                  // Clear the space where the current item will go
                  matrix[movedY][movedX] = undefined;
                  // If the next space is out of bounds or occupied, loop to the other side of the row or column
                  const nextX = movedX + xDirection >= cols || movedX + xDirection < 0 ? currentPosition.x : movedX + xDirection;
                  const nextY = movedY + yDirection >= rows || movedY + yDirection < 0 ? currentPosition.y : movedY + yDirection;
                  // Move the item to the next space in the direction
                  matrix[nextY][nextX] = temp;
              }
          }
      }
      // Place the item in the best position
      for (let i = 0; i < item.h; i++) {
          for (let j = 0; j < item.w; j++) {
              matrix[y + i][x + j] = item.id; // Assuming each item has a unique ID
          }
      }
      return { y, x };
  }

  // If no space is available, return the original position.
  // This would mean the grid needs to be expanded or other items need to be moved.
  return currentPosition;
}


const getItem = (item, col) => {
  return { ...item[col], id: item.id };
};

const updateItem = (elements, active, position, col) => {
  return elements.map((value) => {
    if (value.id === active.id) {
      return { ...value, [col]: { ...value[col], ...position } };
    }
    return value;
  });
};

export function moveItemsAroundItem(active, items, cols, original) {
  // Get current item from the breakpoint
  const activeItem = getItem(active, cols);
  const ids = items.map((value) => value.id).filter((value) => value !== activeItem.id);

  const els = items.filter((value) => value.id !== activeItem.id);

  // Update items
  let newItems = updateItem(items, active, activeItem, cols);

  let matrix = makeMatrixFromItemsIgnore(newItems, ids, getRowsCount(newItems, cols), cols);
  let tempItems = newItems;

  // Exclude resolved elements ids in array
  let exclude = [];

  els.forEach((item) => {
    // Find position for element
    let position = findFreeSpaceForItem(matrix, item[cols]);
    // Exclude item
    exclude.push(item.id);

    tempItems = updateItem(tempItems, item, position, cols);

    // Recreate ids of elements
    let getIgnoreItems = ids.filter((value) => exclude.indexOf(value) === -1);

    // Update matrix for next iteration
    matrix = makeMatrixFromItemsIgnore(tempItems, getIgnoreItems, getRowsCount(tempItems, cols), cols);
  });

  // Return result
  return tempItems;
}



export function moveItem(active, items, cols, original, $altKeyDown, detail, cursor) {
  const EDGE_DISTANCE_THRESHOLD = 5;
  // Get current item from the breakpoint
  let item = getItem(active, cols);

  let shadow = detail.shadow
  
  // Set position and size to the fixed fullscreen size
  if ($altKeyDown) {
    item.y = 0;
    item.h = 10;
    shadow.y = 0;
    shadow.h = 10
  } 

  // Create matrix from the items except the active
  let matrix = makeMatrixFromItemsIgnore(items, [item.id], getRowsCount(items, cols), cols);
  
  // Getting the ids of items under active Array<String>
  const closeBlocks = findCloseBlocks(items, matrix, item);
  
  // Getting the objects of items under active Array<Object>
  let closeObj = findItemsById(closeBlocks, items);
  
  // Getting whether any of these items is fixed
  const fixed = closeObj.find((value) => value[cols].fixed);

  // If found fixed, reset the active to its original position and all closest edges
  if (fixed) {
    resetAllClosestEdges(items);
    return items;
  }

  // Create matrix of items except close elements
  matrix = makeMatrixFromItemsIgnore(items, closeBlocks, getRowsCount(items, cols), cols);

  // Adapt closeObj to the expected structure by flattening it and removing the breakpoint
  const adaptedCloseObj = adaptObjStructure(closeObj, cols);

  // Then call findClosestEdge with the adapted closeObj
  const { closestEdgeType, closestEdgeElementId, closestEdgeDistance } = findClosestEdge(item, adaptedCloseObj, cursor);

  const extractedClosestEdge = extractClosestEdge(closestEdgeType, closestEdgeElementId, closestEdgeDistance, EDGE_DISTANCE_THRESHOLD, item)

  // Update both the item with its new closest edge and the target item
  items = updateItemWithClosestEdge(items, extractedClosestEdge, {
    elementId: closestEdgeElementId,
    type: closestEdgeType,
  });

  // Update items with the modified item
  items = updateItem(items, active, item, cols);

  // No need to return closest edge info separately; it's now part of the items
  return items;
}


export function updateItemWithClosestEdge(items, updatedItemInfo, closestEdgeInfo) {
  return items.map(item => {
      item[20].closestEdgeInfo = null
      item[20].providesClosestEdge = null
      if (item.id === updatedItemInfo.id) {
          // Update the moving item with the closest edge information.
          return { 
              ...item, 
              [20]: { ...item[20], closestEdge: updatedItemInfo.closestEdge } // Update closest edge info for the moving item.
          };
      }

      if (item.id === closestEdgeInfo.elementId) {
          // Update the target item to indicate it provides a closest edge.
          return { 
              ...item, 
              [20]: { ...item[20], providesClosestEdge: {
                  from: updatedItemInfo.id,
                  edgeType: closestEdgeInfo.type,
              }} 
          };
      }

      return item; // Return all other items unchanged.
  });
}





export function extractClosestEdge(closestEdgeType, closestEdgeElementId, closestEdgeDistance, EDGE_DISTANCE_THRESHOLD, item) {
  // If closest edge information is found and within threshold, update the item directly
  let tempItem = item;
  if (closestEdgeType && closestEdgeDistance <= EDGE_DISTANCE_THRESHOLD) {
    console.log(`Closest Edge: ${closestEdgeType}, Element ID: ${closestEdgeElementId}, Distance: ${closestEdgeDistance}`);
    // Update the item's closest edge info directly
    tempItem.closestEdge = {
      type: closestEdgeType,
      elementId: closestEdgeElementId,
      distance: closestEdgeDistance
    };
  } else {
    // Optionally reset closest edge info for all items if no relevant edge is found
    tempItem.closestEdge = null;
    tempItem.providesClosestEdge = null
  }

  return tempItem
}



export function findClosestEdge(draggedItem, closeObj, cursor) {
  console.log("DETAIIHL: ", cursor)
  let closestEdgeDistance = Infinity;
  let closestEdgeType = null;
  let closestEdgeElementId = null;

  const draggedElementCenter = {
      x: draggedItem.x + draggedItem.w / 2,
      y: draggedItem.y + draggedItem.h / 2,
  };

  closeObj.forEach(item => {
      // Define the edges of the current item
      const edges = {
          top: { x: item.x + item.w / 2, y: item.y },
          right: { x: item.x + item.w, y: item.y + item.h / 2 },
          bottom: { x: item.x + item.w / 2, y: item.y + item.h },
          left: { x: item.x, y: item.y + item.h / 2 },
      };

      // Check each edge
      Object.entries(edges).forEach(([edgeType, edgePosition]) => {
          const distance = calculateDistance(draggedElementCenter.x, draggedElementCenter.y, edgePosition.x, edgePosition.y);
          if (distance < closestEdgeDistance) {
              closestEdgeDistance = distance;
              closestEdgeType = edgeType;
              closestEdgeElementId = item.id;
          }
      });
  });

  // console.log(`Closest Edge: ${closestEdgeType}, Element ID: ${closestEdgeElementId}, Distance: ${closestEdgeDistance}`);
  return { closestEdgeType, closestEdgeElementId, closestEdgeDistance };
}

export function resetAllClosestEdges(items, cols) {
  // Iterate over each item and reset its closestEdge info
  items.forEach(item => {
    item = item[cols]

    if(item.closestEdge || item.providesClosestEdge) {
      item.closestEdge = null;
          item.providesClosestEdge = null
      }
  });

  return items
}



// Helper function
export function normalize(items, col) {
  let result = items.slice();

  result.forEach((value) => {
    const getItem = value[col];
    if (!getItem.static) {
      result = moveItem(getItem, result, col, { ...getItem });
    }
  });

  return result;
}

function normalizeNegativeCoords(items, cols) {
  // Find the item with the most negative x value.
  const mostNegativeX = items.reduce((minX, item) => Math.min(minX, item[cols].x), 0);

  // If the most negative x value is less than 0, we need to shift all items to the right.
  if (mostNegativeX < 0) {
    const shiftDistance = Math.abs(mostNegativeX);
    items.forEach(item => {
      item[cols].x += shiftDistance; // Shift each item to the right.
    });
  }
}


export function adaptObjStructure(obj, cols) {
  return obj.map(item => {
    const key = cols.toString();
    if(item[key]) {
      return { ...item[key], id: item.id };
    }
    return null;
  }).filter(item => item !== null);
}


// Helper function
export function adjust(items, col) {
  let matrix = makeMatrix(getRowsCount(items, col), col);

  const order = items.toSorted((a, b) => {
    const aItem = a[col];
    const bItem = b[col];

    return aItem.x - bItem.x || aItem.y - bItem.y;
  });

  return order.reduce((acc, item) => {
    let position = findFreeSpaceForItem(matrix, item[col]);

    acc.push({
      ...item,
      [col]: {
        ...item[col],
        ...position,
      },
    });

    matrix = makeMatrixFromItems(acc, getRowsCount(acc, col), col);

    return acc;
  }, []);
}

export function getUndefinedItems(items, col, breakpoints) {
  return items
    .map((value) => {
      if (!value[col]) {
        return value.id;
      }
    })
    .filter(Boolean);
}

export function getClosestColumn(items, item, col, breakpoints) {
  return breakpoints
    .map(([_, column]) => item[column] && column)
    .filter(Boolean)
    .reduce(function (acc, value) {
      const isLower = Math.abs(value - col) < Math.abs(acc - col);

      return isLower ? value : acc;
    });
}

export function getClosestRow(items, item, row, breakpoints) {
  return breakpoints
    .map(([_, rowDefinition]) => item[rowDefinition] && rowDefinition)
    .filter(Boolean)
    .reduce(function (acc, value) {
      const isLower = Math.abs(value - row) < Math.abs(acc - row);

      return isLower ? value : acc;
    });
}


export function specifyUndefinedColumns(items, col, breakpoints) {
  let matrix = makeMatrixFromItems(items, getRowsCount(items, col), col);

  const getUndefinedElements = getUndefinedItems(items, col, breakpoints);

  let newItems = [...items];

  getUndefinedElements.forEach((elementId) => {
    const getElement = items.find((item) => item.id === elementId);

    const closestColumn = getClosestColumn(items, getElement, col, breakpoints);

    const position = findFreeSpaceForItem(matrix, getElement[closestColumn]);

    const newItem = {
      ...getElement,
      [col]: {
        ...getElement[closestColumn],
        ...position,
      },
    };

    newItems = newItems.map((value) => (value.id === elementId ? newItem : value));

    matrix = makeMatrixFromItems(newItems, getRowsCount(newItems, col), col);
  });
  return newItems;
}


export function specifyUndefinedRows(items, row, breakpoints) {
  // Assuming makeMatrixFromItems and other utility functions are adapted for horizontal layouts
  let matrix = makeMatrixFromItems(items, row, getColsCount(items, row));

  const getUndefinedElements = getUndefinedItems(items, row, breakpoints);

  let newItems = [...items];

  getUndefinedElements.forEach((elementId) => {
    const getElement = items.find((item) => item.id === elementId);

    // getClosestRow should be a function that determines the closest row for an item, similar to getClosestColumn
    const closestRow = getClosestRow(items, getElement, row, breakpoints);

    // findFreeSpaceForItem needs to be adapted to find space in a row context
    const position = findFreeSpaceForItem(matrix, getElement[closestRow], row);

    const newItem = {
      ...getElement,
      [row]: {
        ...getElement[closestRow],
        ...position,
      },
    };

    newItems = newItems.map((item) => (item.id === elementId ? newItem : item));

    // Rebuild the matrix after updating each item to ensure the free space calculation accounts for newly placed items
    matrix = makeMatrixFromItems(newItems, row, getColsCount(newItems, row));
  });

  return newItems;
}


export function placeItems(active, items, cols, $commandKeyDown, minHeight = 3) {
  // Get current item from the breakpoint
  let item = active[cols];
  let closestEdge = item.closestEdge;

  if (closestEdge) {
      let edgeProvider = getItemById(closestEdge.elementId, items)[cols];
      console.log("edgeprovider", edgeProvider);

      // Adjust item's position and dimensions based on the closest edge
      switch (closestEdge.type) {
          case 'left':
              item.x = edgeProvider.x - item.w;
              item.y = edgeProvider.y;
              if(!$commandKeyDown) {
                item.h = edgeProvider.h; // Adjust height to match edge provider
                // item.w = edgeProvider.w; // Adjust width to match edge provider
              }
              break;
          case 'right':
              item.x = edgeProvider.x + edgeProvider.w;
              item.y = edgeProvider.y;
              if(!$commandKeyDown) {
                item.h = edgeProvider.h; // Adjust height to match edge provider
                // item.w = edgeProvider.w; // Adjust width to match edge provider
              }
              break;
          case 'top':
              item.x = edgeProvider.x;
              item.y = edgeProvider.y - item.h;
              item.w = edgeProvider.w; // Adjust width to match edge provider
              break;
          case 'bottom':
              item.x = edgeProvider.x;
              item.y = edgeProvider.y + edgeProvider.h;
              item.w = edgeProvider.w; // Adjust width to match edge provider
              break;
          default:
              console.log('Unknown edge type:', closestEdge.type);
      }

      // DO THE HEIGHT CHECKS HERE AND MANIPULATE AS NESSECARY
      if (closestEdge.type === 'top' || closestEdge.type === 'bottom') {
          // Calculate the total available height
          let totalHeight = item.h + edgeProvider.h;
          
          if (totalHeight > 6) {
              // If exceeding max height, adjust both heights
              console.log("Exceeded max Height")
              let adjustedHeight = Math.max(minHeight, 6 / 2);
              item.h = adjustedHeight;
              edgeProvider.h = adjustedHeight;
              // Additional logic to update edgeProvider's position if needed
              if (closestEdge.type === 'top') {
                  edgeProvider.y = item.y + item.h; // Move edgeProvider down
              } else {
                  item.y = edgeProvider.y + edgeProvider.h; // Adjust item's y to maintain position
              }
          }
      }

      let itemsBeforePush = items

      items = pushOverlappingItems(items, cols, closestEdge, item);

      // After pushing overlapping items, we log the difference
      const diff = items.map((item, index) => {
        if (item.x !== itemsBeforePush[index].x || item.y !== itemsBeforePush[index].y) {
          return {
            id: item.id,
            from: { x: itemsBeforePush[index].x, y: itemsBeforePush[index].y },
            to: { x: item.x, y: item.y }
          };
        } else {
          return null;
        }
      }).filter(item => item !== null);

      console.log('Differences after pushOverlappingItems:', diff);

      // Update the item in the items array
      items = updateItem(items, active, item, cols);
      
      // Reset all closest edges
      items = resetAllClosestEdges(items, cols);
  }
  return items;
}

function pushOverlappingItems(items, cols, closestEdge, droppedItem) {
  const MAX_LOOPS = 10
  // Initial sorting to ensure items are processed in order.
  items.sort((a, b) => a[cols].x - b[cols].x);

  let overlaps = true;
  let loop = 0


  while (overlaps && loop < MAX_LOOPS){
    loop++
    const overlappingPairs = checkForOverlaps(items);
    console.log("overlapping pairs", overlappingPairs)
    console.log("droppeditem", droppedItem)
      if (overlappingPairs.length === 0) {
          overlaps = false;
          continue;
      }

      // Processing overlaps based on the minimal adjustment principle.
      overlappingPairs.forEach(({item1: item1Id, item2: item2Id}) => {
          const index1 = items.findIndex(item => item.id === item1Id);
          const index2 = items.findIndex(item => item.id === item2Id);
          const item1 = items[index1][cols];
          const item2 = items[index2][cols];

          // Determine overlap size
          let overlapSize = (item1.x + item1.w) - item2.x;
          console.log("overlap size", overlapSize)

          // Check direction of item movement to decide which way to push
          if (closestEdge.type === 'right') {
              // item1 was originally to the left of item2, push item2 right
              pushRight(items, index2, overlapSize, cols, droppedItem);
          } else if(closestEdge.type === 'left') {
              console.log("moving to left")
              // item1 was originally to the right of item2, push item1 left
              pushLeft(items, index1, overlapSize, cols, droppedItem);
          }
      });
      
      normalizeNegativeCoords(items, cols);

      // Re-sort items after adjustments
      items.sort((a, b) => a[cols].x - b[cols].x);
  }

  return items;
}

function pushRight(items, startIndex, distance, cols, droppedItem) {
  console.log("pushing right", {items, startIndex, distance})
  for (let i = startIndex; i < items.length; i++) {
      if(items[i][cols].id === droppedItem.id) {
        console.log("dropped ID detected")
        i--
        items[i][cols].x += distance;
        return
      }
      items[i][cols].x += distance;
  }
}

function pushLeft(items, startIndex, distance, cols, droppedItem) {
  for (let i = startIndex; i >= 0; i--) {
    if(items[i][cols].id === droppedItem.id) {
      console.log("dropped ID detected")
      i++
      items[i][cols].x -= distance;
      return
    }
      items[i][cols].x -= distance;
  }
}


function checkForOverlaps(items) {
  // This will store pairs of item IDs that overlap
  let overlappingPairs = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      let item1 = items[i]['20'];
      let item2 = items[j]['20'];

      if (isOverlapping(item1, item2)) {
        overlappingPairs.push({item1: items[i].id, item2: items[j].id});
      }
    }
  }

  return overlappingPairs;
}

function isOverlapping(item1, item2) {
  if (item1.x + item1.w <= item2.x || item2.x + item2.w <= item1.x) {
    return false;
  }
  
  if (item1.y + item1.h <= item2.y || item2.y + item2.h <= item1.y) {
    return false;
  }
  
  return true;
}






