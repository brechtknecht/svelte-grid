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



export function moveItem(active, items, cols, original, $commandKeyDown, detail) {
  // Get current item from the breakpoint
  const item = getItem(active, cols);
  
  // Set position and size to the fixed fullscreen size
  if($commandKeyDown) {
    item.y = 0;
    item.h = 10;
  }

  // Create matrix from the items except the active
  let matrix = makeMatrixFromItemsIgnore(items, [item.id], getRowsCount(items, cols), cols);
  
  // Getting the ids of items under active Array<String>
  const closeBlocks = findCloseBlocks(items, matrix, item);
  
  // Getting the objects of items under active Array<Object>
  let closeObj = findItemsById(closeBlocks, items);
  
  // Getting whether any of these items is fixed
  const fixed = closeObj.find((value) => value[cols].fixed);

  // If found fixed, reset the active to its original position
  if (fixed) return items;

  // Adapt closeObj to the expected structure by flattening it and removing the breakpoint
  const adaptedCloseObj = closeObj.map(item => {
    const key = cols.toString();
    if(item[key]) {
      return { ...item[key], id: item.id };
    }
    return null;
  }).filter(item => item !== null);

  // Then call findClosestEdge with the adapted closeObj
  const { closestEdgeType, closestEdgeElementId, closestEdgeDistance } = findClosestEdge(item, adaptedCloseObj);

  if(closestEdgeType) { 
    console.log(`Closest edge is ${closestEdgeType} of element ${closestEdgeElementId} at distance ${closestEdgeDistance}.`);
  }

  // Inside your moveItem function, after finding the closest edge
  if(closestEdgeElementId != null) { // Ensure there's a closest edge found
    active.closestEdge = {
        type: closestEdgeType,
        elementId: closestEdgeElementId,
        distance: closestEdgeDistance
    };
  } else {
    resetClosestEdgeInfo(active); // Reset if no closest edge is found
  }


  // Update items based on the closest edge information if necessary
  // This is where you might adjust the item's position based on the closest edge
  // For simplicity, the example does not include this logic

  // Your existing logic for updating and moving items can remain here
  // Ensure that any adjustments based on the closest edge are applied before finalizing the item's new position

  // Return updated items array
  return items;
}


export function findClosestEdge(draggedItem, closeObj) {
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

export function resetClosestEdgeInfo(item) {
  if(item.closestEdge) {
      item.closestEdge = {
          type: null,
          elementId: null,
          distance: Infinity
      };
  }
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





export function moveItemOLD(active, items, cols, original, $commandKeyDown, detail) {
  // Get current item from the breakpoint
  
  const item = getItem(active, cols);
  
  // Set position and size to the fixed fullscreen size
  if($commandKeyDown) {
    item.y = 0
    item.h = 10
  }

  // Create matrix from the items expect the active
  let matrix = makeMatrixFromItemsIgnore(items, [item.id], getRowsCount(items, cols), cols);
  // Getting the ids of items under active Array<String>
  const closeBlocks = findCloseBlocks(items, matrix, item);
  // Getting the objects of items under active Array<Object>
  let closeObj = findItemsById(closeBlocks, items);
  // Getting whenever of these items is fixed
  const fixed = closeObj.find((value) => value[cols].fixed);

  // If found fixed, reset the active to its original position
  if (fixed) return items;

  // Update items
  items = updateItem(items, active, item, cols);

  // Create matrix of items expect close elements
  matrix = makeMatrixFromItemsIgnore(items, closeBlocks, getRowsCount(items, cols), cols);

  // Create temp vars
  let tempItems = items;
  let tempCloseBlocks = closeBlocks;

  // Exclude resolved elements ids in array
  let exclude = [];   

  // Iterate over close elements under active item
  closeObj.forEach((item) => {
    console.log("CloseItems", closeObj)

    let activeItem = getItemById(closeObj.id, closeObj);
    console.log("Close Items HTML", activeItem)

    item.closestCorner = true
    

    // Find position for element
    // let position = findFreeSpaceForItem(matrix, item[cols]);
    // Exclude item
    // exclude.push(item.id);

    // Assign the position to the element in the column
    // tempItems = updateItem(tempItems, item, position, cols);

    // Recreate ids of elements
    // let getIgnoreItems = tempCloseBlocks.filter((value) => exclude.indexOf(value) === -1);

    // Update matrix for next iteration
    // matrix = makeMatrixFromItemsIgnore(tempItems, getIgnoreItems, getRowsCount(tempItems, cols), cols);
  });

  // Return result
  return tempItems;
}